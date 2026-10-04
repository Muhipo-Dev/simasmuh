import os
import time
import threading
import cv2
import numpy as np
import requests
from typing import Dict, Optional, List, Tuple
from config import BACKEND_URL, API_SECRET, FaceServiceConfig, SingleCamConfig, fetch_backend_config
from face_engine import FaceRecognitionEngine


class SingleCameraWorker:
    """Worker capture dan deteksi untuk 1 kamera independen."""
    def __init__(self, cam_id: str, cam_name: str, stream_url: str, location: str, engine: FaceRecognitionEngine, global_worker):
        self.cam_id = cam_id
        self.cam_name = cam_name
        self.stream_url = stream_url
        self.location = location
        self.engine = engine
        self.global_worker = global_worker
        self.is_running = False
        self.stop_event = threading.Event()
        self.capture_thread: Optional[threading.Thread] = None
        self.ai_thread: Optional[threading.Thread] = None
        self.current_fps: float = 0.0
        self.stream_status: str = "INITIALIZING"
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_frame: Optional[np.ndarray] = self._create_placeholder_frame("MENGHUBUNGKAN KAMERA...", f"Menyiapkan koneksi {self.stream_url}...")
        self.active_detections: List[Dict] = []
        self.registered_count: int = 0
        self.guest_count: int = 0
        self.frame_lock = threading.Lock()
        self.detection_lock = threading.Lock()

    def start(self):
        if self.is_running:
            return
        self.stop_event.clear()
        self.is_running = True
        self.stream_status = "INITIALIZING"
        self.capture_thread = threading.Thread(target=self._run_capture_loop, daemon=True)
        self.capture_thread.start()
        self.ai_thread = threading.Thread(target=self._run_ai_loop, daemon=True)
        self.ai_thread.start()
        print(f"[INFO] MultiCam Worker [{self.cam_id} - {self.cam_name}] aktif pada URL: {self.stream_url}")

    def stop(self):
        self.is_running = False
        self.stop_event.set()
        self.stream_status = "STOPPED"
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=1.0)
        if self.ai_thread and self.ai_thread.is_alive():
            self.ai_thread.join(timeout=1.0)
        self.capture_thread = None
        self.ai_thread = None
        with self.frame_lock:
            self.latest_raw_frame = None
            self.latest_frame = None
        with self.detection_lock:
            self.active_detections = []

    def _create_placeholder_frame(self, title: str, subtitle: str) -> np.ndarray:
        canvas = np.zeros((540, 960, 3), dtype=np.uint8)
        canvas[:] = (18, 15, 26)
        for y in range(45, 540, 45):
            cv2.line(canvas, (0, y), (960, y), (28, 24, 40), 1)
        for x in range(45, 960, 45):
            cv2.line(canvas, (x, 0), (x, 540), (28, 24, 40), 1)

        cv2.putText(canvas, f"SIMASMUH AI - {self.cam_name.upper()}", (60, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(canvas, f"TITIK KAMERA: {self.location.upper()} (ID: {self.cam_id})", (60, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (180, 180, 230), 1, cv2.LINE_AA)
        
        cv2.rectangle(canvas, (60, 180), (900, 340), (32, 26, 48), -1)
        cv2.rectangle(canvas, (60, 180), (900, 340), (95, 80, 150), 2)
        cv2.putText(canvas, title, (90, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 235, 160), 2, cv2.LINE_AA)
        cv2.putText(canvas, subtitle, (90, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (215, 215, 235), 1, cv2.LINE_AA)

        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(canvas, f"SYSTEM TIME: {time_str}  |  SOURCE: {self.stream_url}", (60, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (140, 140, 175), 1, cv2.LINE_AA)
        return canvas

    def _run_capture_loop(self):
        def _parse_src(src_val):
            if not src_val:
                return 0, True
            if isinstance(src_val, str):
                s = src_val.strip()
                if s.upper() == "BROWSER_WEBCAM":
                    return "BROWSER_WEBCAM", False
                if s.isdigit():
                    return int(s), True
                return s, False
            elif isinstance(src_val, int):
                return src_val, True
            return src_val, False

        def _open_capture(src, is_num):
            if src == "BROWSER_WEBCAM":
                return None
            if is_num:
                indices_to_try = [src] if src != 0 else [0, 1]
                backends = [cv2.CAP_DSHOW, cv2.CAP_ANY] if os.name == 'nt' else [cv2.CAP_V4L2, cv2.CAP_ANY]
                for idx in indices_to_try:
                    for backend in backends:
                        try:
                            c = cv2.VideoCapture(idx, backend)
                            if c is not None and c.isOpened():
                                try:
                                    c.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
                                    c.set(cv2.CAP_PROP_FRAME_HEIGHT, 540)
                                    c.set(cv2.CAP_PROP_FPS, 24)
                                    c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                                except Exception:
                                    pass
                                ret_test, test_frame = c.read()
                                if ret_test and test_frame is not None and test_frame.size > 0:
                                    return c
                                else:
                                    c.release()
                        except Exception:
                            pass
                return None
            elif isinstance(src, str) and any(src.startswith(proto) for proto in ["rtsp://", "rtsps://", "rtmp://", "http://", "https://"]):
                # 1. Coba koneksi RTSP via TCP (Standar CCTV Modern / Tapo / Hikvision / Dahua)
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                    "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;500000|stimeout;3000000|timeout;3000000"
                )
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
                    if c is not None and c.isOpened():
                        try:
                            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                        # Beri kesempatan pembacaan frame awal untuk decode keyframe
                        for _ in range(25):
                            ret_test, test_frame = c.read()
                            if ret_test and test_frame is not None and test_frame.size > 0:
                                print(f"[INFO] Camera {self.cam_id} RTSP terhubung (TCP): {src}")
                                return c
                            time.sleep(0.04)
                        c.release()
                except Exception as e:
                    print(f"[DEBUG] Camera {self.cam_id} TCP attempt error: {e}")

                # 2. Coba fallback koneksi RTSP via UDP (CCTV Lama / Jaringan NVR)
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                    "rtsp_transport;udp|fflags;nobuffer|flags;low_delay|stimeout;3000000|timeout;3000000"
                )
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
                    if c is not None and c.isOpened():
                        try:
                            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                        for _ in range(25):
                            ret_test, test_frame = c.read()
                            if ret_test and test_frame is not None and test_frame.size > 0:
                                print(f"[INFO] Camera {self.cam_id} RTSP terhubung (UDP): {src}")
                                return c
                            time.sleep(0.04)
                        c.release()
                except Exception as e:
                    print(f"[DEBUG] Camera {self.cam_id} UDP attempt error: {e}")

                # 3. Coba fallback koneksi Generic OpenCV tanpa opsi khusus
                try:
                    os.environ.pop("OPENCV_FFMPEG_CAPTURE_OPTIONS", None)
                    c = cv2.VideoCapture(src)
                    if c is not None and c.isOpened():
                        try:
                            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                        for _ in range(25):
                            ret_test, test_frame = c.read()
                            if ret_test and test_frame is not None and test_frame.size > 0:
                                print(f"[INFO] Camera {self.cam_id} RTSP terhubung (Default Backend): {src}")
                                return c
                            time.sleep(0.04)
                        c.release()
                except Exception as e:
                    print(f"[DEBUG] Camera {self.cam_id} Default Backend attempt error: {e}")
                return None
            else:
                try:
                    c = cv2.VideoCapture(src)
                    if c is not None and c.isOpened():
                        return c
                except Exception:
                    pass
                return None

        cap = None
        active_src = None
        consecutive_failures = 0
        prev_time = time.time()
        frame_counter = 0

        while not self.stop_event.is_set() and self.is_running:
            current_src = self.stream_url
            src_val, is_num = _parse_src(current_src)

            # Jika konfigurasi URL kamera berubah saat loop berjalan, lepas capture lama
            if current_src != active_src and cap is not None:
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
                active_src = None

            if src_val == "BROWSER_WEBCAM":
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                    active_src = None
                self.stream_status = "BROWSER_WEBCAM_STANDBY"
                self.current_fps = 0
                with self.frame_lock:
                    self.latest_frame = self._create_placeholder_frame("MODE WEBCAM BROWSER AKTIF", "Video diproses langsung melalui browser perangkat scanning.")
                time.sleep(0.5)
                continue

            if cap is None:
                self.stream_status = f"CONNECTING ({current_src})"
                with self.frame_lock:
                    self.latest_frame = self._create_placeholder_frame("MENGHUBUNGKAN KAMERA...", f"Membuka stream {current_src}...")
                cap = _open_capture(src_val, is_num)
                if cap is None or not cap.isOpened():
                    self.stream_status = "FAILED_TO_CONNECT"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame("GAGAL MENGHUBUNGKAN KAMERA", f"Pastikan RTSP ({current_src}) online & dapat diakses.")
                    time.sleep(2.0)
                    continue
                active_src = current_src

            try:
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    consecutive_failures += 1
                    if consecutive_failures > 5:
                        self.stream_status = "NO_SIGNAL"
                        with self.frame_lock:
                            self.latest_frame = self._create_placeholder_frame("SINYAL TERPUTUS", f"Reconnecting ({consecutive_failures}/35)...")
                    if consecutive_failures > 35:
                        try:
                            if cap:
                                cap.release()
                        except Exception:
                            pass
                        cap = None
                        consecutive_failures = 0
                        time.sleep(0.5)
                    else:
                        time.sleep(0.04)
                    continue

                consecutive_failures = 0
                self.stream_status = "LIVE_STREAMING"
                frame_counter += 1

                now = time.time()
                if now - prev_time >= 1.0:
                    self.current_fps = round(frame_counter / (now - prev_time), 1)
                    frame_counter = 0
                    prev_time = now

                h_f, w_f = frame.shape[:2]
                if w_f != 960 or h_f != 540:
                    frame = cv2.resize(frame, (960, 540), interpolation=cv2.INTER_AREA)

                with self.frame_lock:
                    self.latest_raw_frame = frame

                annotated_frame = frame.copy()
                h_frame, w_frame = annotated_frame.shape[:2]

                with self.detection_lock:
                    raw_detections = list(self.active_detections)
                    reg_cnt = self.registered_count

                for det in raw_detections:
                    if now - det.get("timestamp", 0) > 3.6:
                        continue
                    x1, y1, x2, y2 = det["box"]
                    x1 = max(0, min(w_frame - 10, int(x1)))
                    y1 = max(0, min(h_frame - 10, int(y1)))
                    x2 = max(x1 + 10, min(w_frame, int(x2)))
                    y2 = max(y1 + 10, min(h_frame, int(y2)))
                    is_registered = det["is_registered"]
                    label = det["label"]
                    sub_label = det.get("sub_label", "")
                    box_w = max(12, x2 - x1)
                    box_h = max(12, y2 - y1)
                    primary_color = (46, 204, 113) if is_registered else (0, 195, 255)
                    tag_bg_color = (30, 140, 75) if is_registered else (0, 130, 180)

                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), primary_color, 1)
                    c_len = max(5, min(14, box_w // 4))
                    cv2.line(annotated_frame, (x1, y1), (x1 + c_len, y1), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y1), (x1, y1 + c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y1), (x2 - c_len, y1), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y1), (x2, y1 + c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y2), (x1 + c_len, y2), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y2), (x1, y2 - c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y2), (x2 - c_len, y2), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y2), (x2, y2 - c_len), (255, 255, 255), 1)

                    display_text = f"{label} | {sub_label}" if sub_label else label
                    (tw, th), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
                    tag_h = th + 6
                    tag_w = tw + 10
                    tag_y1 = y1 - tag_h if y1 - tag_h >= 40 else y1
                    tag_y2 = y1 if y1 - tag_h >= 40 else y1 + tag_h
                    tag_x1 = max(4, min(w_frame - tag_w - 4, x1))
                    tag_x2 = tag_x1 + tag_w
                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), tag_bg_color, -1)
                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), primary_color, 1)
                    cv2.putText(annotated_frame, display_text, (tag_x1 + 5, tag_y2 - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (255, 255, 255), 1, cv2.LINE_AA)

                # HUD Top Bar
                total_faces = len(raw_detections)
                time_str = time.strftime("%H:%M:%S")
                cv2.rectangle(annotated_frame, (0, 0), (w_frame, 36), (16, 12, 24), -1)
                cv2.line(annotated_frame, (0, 36), (w_frame, 36), (70, 58, 95), 1)
                cv2.circle(annotated_frame, (18, 18), 5, (46, 204, 113), -1, cv2.LINE_AA)
                cv2.putText(annotated_frame, f"{self.cam_name.upper()} ({self.location.upper()})", (30, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (46, 204, 113), 2, cv2.LINE_AA)

                right_text = f"FPS: {self.current_fps} • {time_str}"
                (rw, rh), _ = cv2.getTextSize(right_text, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
                rx = max(w_frame - rw - 16, 16)
                cv2.rectangle(annotated_frame, (rx - 8, 6), (w_frame - 8, 30), (28, 22, 42), -1)
                cv2.rectangle(annotated_frame, (rx - 8, 6), (w_frame - 8, 30), (65, 55, 90), 1)
                cv2.putText(annotated_frame, right_text, (rx, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (200, 205, 230), 1, cv2.LINE_AA)

                center_text = f"Deteksi: {total_faces} Wajah ({reg_cnt} Terdaftar)" if total_faces > 0 else "Menunggu Wajah Terdeteksi"
                (cw, ch), _ = cv2.getTextSize(center_text, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
                cx = (w_frame - cw) // 2
                if cx > 200 and cx + cw < rx - 15:
                    cv2.putText(annotated_frame, center_text, (cx, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1, cv2.LINE_AA)

                with self.frame_lock:
                    self.latest_frame = annotated_frame

                time.sleep(0.001)
            except Exception as e_cap:
                time.sleep(0.05)

        if cap:
            try:
                cap.release()
            except Exception:
                pass
        self.stream_status = "OFFLINE"

    def _run_ai_loop(self):
        ai_frame_counter = 0
        while self.is_running:
            try:
                target_frame = None
                with self.frame_lock:
                    if self.latest_raw_frame is not None:
                        target_frame = self.latest_raw_frame.copy()

                if target_frame is None:
                    time.sleep(0.05)
                    continue

                ai_frame_counter += 1
                h_frame, w_frame = target_frame.shape[:2]
                now = time.time()

                faces = self.engine.detect_faces(target_frame)
                new_detections = []
                reg_count = 0
                guest_count = 0

                for (x, y, w, h) in faces:
                    if w < 18 or h < 18:
                        continue
                    pad_y = int(h * 0.1)
                    pad_x = int(w * 0.1)
                    y1 = max(0, y - pad_y)
                    y2 = min(h_frame, y + h + pad_y)
                    x1 = max(0, x - pad_x)
                    x2 = min(w_frame, x + w + pad_x)
                    face_crop = target_frame[y1:y2, x1:x2]

                    threshold = max(0.90, self.global_worker.config.threshold) if (self.global_worker.config and self.global_worker.config.threshold is not None) else 0.90
                    match_result = self.engine.match_face(face_crop, threshold=threshold)

                    if match_result:
                        user_record = match_result["record"]
                        similarity = match_result["confidence"]
                        is_twin = match_result.get("is_twin_ambiguous", False)
                        pct = int(similarity * 100)
                        reg_count += 1
                        new_detections.append({
                            "box": (x, y, x + w, y + h),
                            "is_registered": True,
                            "label": f"{user_record.name} ({pct}%)",
                            "sub_label": f"{user_record.role} - {user_record.identifier}",
                            "similarity": similarity,
                            "user_record": user_record,
                            "timestamp": now,
                            "is_twin": is_twin,
                        })
                        if not is_twin and getattr(self.global_worker.config, 'auto_attendance', False) and ai_frame_counter % 2 == 0:
                            self.global_worker._process_attendance(user_record, similarity, face_crop=face_crop, camera_name=f"{self.cam_name} ({self.location})")
                    else:
                        guest_count += 1
                        new_detections.append({
                            "box": (x, y, x + w, y + h),
                            "is_registered": False,
                            "label": "Tamu / Orang Asing",
                            "sub_label": "Wajah Belum Terdaftar",
                            "similarity": 0.0,
                            "user_record": None,
                            "timestamp": now,
                            "is_twin": False,
                        })

                with self.detection_lock:
                    self.active_detections = new_detections
                    self.registered_count = reg_count
                    self.guest_count = guest_count

                if faces:
                    time.sleep(0.40)
                else:
                    time.sleep(0.10)
            except Exception as e_ai:
                time.sleep(0.10)

    def generate_mjpeg_stream(self):
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 74]
        while True:
            frame_to_send = None
            with self.frame_lock:
                if self.latest_frame is not None:
                    frame_to_send = self.latest_frame
            if frame_to_send is None:
                frame_to_send = self._create_placeholder_frame("KAMERA STANDBY", "Kamera sedang memuat stream...")
            ret, buffer = cv2.imencode('.jpg', frame_to_send, encode_params)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.025)


class AttendanceWorker:
    def __init__(self, engine: FaceRecognitionEngine):
        self.engine = engine
        self.config: FaceServiceConfig = fetch_backend_config()
        self.is_running = False
        self.stop_event = threading.Event()
        self.last_attendance_time: Dict[str, float] = {}  # userId -> timestamp
        self.last_scan_time: float = 0.0
        self.total_scans_today: int = 0
        self.sub_workers: Dict[str, SingleCameraWorker] = {}

    def _sync_sub_workers(self):
        """Membuat/menyesuaikan sub-worker per kamera sesuai daftar config.cameras."""
        cams = self.config.cameras if (self.config and self.config.cameras) else []
        if not cams:
            # Fallback jika cameras kosong: gunakan stream_url utama sebagai cam-1
            main_url = self.config.stream_url if self.config else "BROWSER_WEBCAM"
            main_name = self.config.camera_name if self.config else "Kamera 1"
            main_loc = self.config.location if self.config else "Gerbang Depan Sekolah"
            cams = [SingleCamConfig(
                id="cam-1",
                name=main_name,
                stream_source_type="RTSP" if main_url.startswith("rtsp") else "BROWSER_WEBCAM",
                stream_url=main_url,
                location=main_loc,
                is_active=True
            )]

        active_cam_ids = set()
        for c in cams:
            cid = str(c.id)
            active_cam_ids.add(cid)
            if cid not in self.sub_workers:
                sub = SingleCameraWorker(
                    cam_id=cid,
                    cam_name=c.name,
                    stream_url=c.stream_url,
                    location=c.location,
                    engine=self.engine,
                    global_worker=self
                )
                self.sub_workers[cid] = sub
                if self.is_running and c.is_active:
                    sub.start()
            else:
                sub = self.sub_workers[cid]
                sub.cam_name = c.name
                sub.location = c.location
                old_url = sub.stream_url
                sub.stream_url = c.stream_url
                
                # Jika stream_url berubah atau kamera diaktifkan/dinonaktifkan
                if old_url != c.stream_url and sub.is_running:
                    print(f"[INFO] URL Kamera {cid} diperbarui dari '{old_url}' ke '{c.stream_url}', me-restart sub-worker...")
                    sub.stop()
                    if c.is_active and self.is_running:
                        sub.start()
                elif self.is_running and c.is_active and not sub.is_running:
                    sub.start()
                elif (not c.is_active or not self.is_running) and sub.is_running:
                    sub.stop()

        # Matikan sub worker yang sudah dihapus dari daftar
        for cid in list(self.sub_workers.keys()):
            if cid not in active_cam_ids:
                self.sub_workers[cid].stop()
                del self.sub_workers[cid]

    @property
    def current_fps(self) -> float:
        fps_list = [w.current_fps for w in self.sub_workers.values() if w.is_running]
        return max(fps_list) if fps_list else 0.0

    @property
    def stream_status(self) -> str:
        if not self.is_running:
            return "STOPPED"
        statuses = [w.stream_status for w in self.sub_workers.values()]
        if any(s == "LIVE_STREAMING" for s in statuses):
            return "LIVE_STREAMING"
        if any(s.startswith("CONNECTING") for s in statuses):
            return "CONNECTING"
        return statuses[0] if statuses else "INITIALIZING"

    def start(self):
        if self.is_running:
            return
        self.config = fetch_backend_config()
        self.stop_event.clear()
        self.is_running = True
        self._sync_sub_workers()
        print(f"[INFO] Multi-Camera Attendance Worker aktif dengan {len(self.sub_workers)} kamera terhubung.")

    def refresh_config(self):
        """Memperbarui konfigurasi kamera & threshold secara dinamis dari backend."""
        try:
            self.config = fetch_backend_config()
            self._sync_sub_workers()
        except Exception as e:
            print(f"[WARN] Gagal memperbarui konfigurasi AI worker: {e}")

    def stop(self):
        self.is_running = False
        self.stop_event.set()
        for sub in self.sub_workers.values():
            sub.stop()
        print("[INFO] Multi-Camera Attendance Worker dimatikan.")

    def restart(self):
        print("[INFO] Merestart worker capture untuk sinkronisasi konfigurasi multi-kamera terbaru...")
        self.stop()
        time.sleep(0.2)
        self.start()

    def reset_cooldown(self, user_id: str = None, all_users: bool = False):
        if all_users or not user_id:
            self.last_attendance_time.clear()
            self.last_scan_time = 0.0
            self.total_scans_today = 0
            print("[INFO] Semua timer cooldown presensi kamera berhasil direset.")
        else:
            self.last_attendance_time.pop(user_id, None)
            self.last_scan_time = 0.0
            print(f"[INFO] Timer cooldown presensi untuk user '{user_id}' berhasil direset.")
        return True

    def get_sub_worker(self, cam_id: str = "cam-1") -> Optional[SingleCameraWorker]:
        if cam_id in self.sub_workers:
            return self.sub_workers[cam_id]
        if self.sub_workers:
            return next(iter(self.sub_workers.values()))
        return None

    def generate_mjpeg_stream(self, cam_id: str = "cam-1"):
        sub = self.get_sub_worker(cam_id)
        if sub:
            yield from sub.generate_mjpeg_stream()
            return
        # Fallback dummy stream
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 74]
        canvas = np.zeros((540, 960, 3), dtype=np.uint8)
        canvas[:] = (18, 15, 26)
        cv2.putText(canvas, f"KAMERA '{cam_id}' BELUM TERSEDIA", (80, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
        ret, buf = cv2.imencode('.jpg', canvas, encode_params)
        frame_bytes = buf.tobytes()
        while True:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.5)

    def _process_attendance(self, user_record, similarity: float, face_crop: Optional[np.ndarray] = None, force: bool = False, camera_name: Optional[str] = None) -> Optional[Dict]:
        user_id = user_record.user_id
        now = time.time()
        
        # 1. Validasi syarat presensi: kemiripan biometrik terkalibrasi wajib di atas batas threshold (wajib minimal 0.90 / 90%)
        req_threshold = max(0.90, self.config.threshold) if (self.config and self.config.threshold is not None) else 0.90
        if similarity < req_threshold and not force:
            return None

        # 2. Debounce Scanner Antrian (responsif & cepat untuk pergantian antrian siswa antar detik)
        SCANNER_COOLDOWN_SEC = 0.5
        if not force and now - self.last_scan_time < SCANNER_COOLDOWN_SEC:
            return None

        # 3. Debounce per User (cegah multiple request duplikat beruntun dalam 2 detik)
        # Logika bisnis cooldown datang (MASUK) & pulang (PULANG) dikelola penuh secara akurat oleh database NestJS Backend
        USER_DEBOUNCE_SEC = 2.0
        last_time = self.last_attendance_time.get(user_id, 0)
        if not force and now - last_time < USER_DEBOUNCE_SEC:
            return None

        self.last_scan_time = now
        self.last_attendance_time[user_id] = now
        self.total_scans_today += 1
        cam_label = camera_name or (self.config.location if self.config else "Gerbang")
        print(f"[ATTENDANCE SCAN] Terdeteksi di [{cam_label}]: {user_record.name} ({user_record.role}) | Kemiripan: {round(similarity*100, 1)}%")

        snapshot_b64 = None
        if face_crop is not None and face_crop.size > 0:
            try:
                import base64
                thumb = cv2.resize(face_crop, (240, 240), interpolation=cv2.INTER_AREA)
                ret_s, buf_s = cv2.imencode('.jpg', thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
                if ret_s:
                    snapshot_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_s).decode('utf-8')
            except Exception as e_snap:
                print(f"[WARN] Gagal membuat snapshot thumbnail wajah: {e_snap}")

        try:
            from config import API_KEY
            headers = {"x-api-key": API_KEY}
            payload = {
                "userId": user_id,
                "confidence": round(similarity, 3),
                "secretKey": API_SECRET,
                "cameraLocation": cam_label,
                "snapshot": snapshot_b64,
            }
            res = requests.post(f"{BACKEND_URL}/face-attendance/record", json=payload, headers=headers, timeout=4)
            if res.status_code in (200, 201):
                res_data = res.json()
                print(f"[SUCCESS] Presensi tercatat: {res_data.get('message')}")
                return {
                    "success": True,
                    "message": res_data.get("message", "Presensi berhasil dicatat"),
                    "scanType": res_data.get("scanType", "HADIR"),
                    "data": res_data,
                }
            else:
                print(f"[WARN] Backend status {res.status_code}: {res.text}")
                return {
                    "success": False,
                    "message": f"Server merespon status {res.status_code}",
                    "scanType": "UNKNOWN",
                }
        except Exception as e:
            print(f"[ERROR] Gagal kirim presensi ke backend: {e}")
            return {
                "success": False,
                "message": f"Gagal menghubungi server backend: {e}",
                "scanType": "ERROR",
            }
