import os
import time
import threading
import cv2
import numpy as np
import requests
from typing import Dict, Optional, List, Tuple
from config import BACKEND_URL, API_SECRET, FaceServiceConfig, fetch_backend_config
from face_engine import FaceRecognitionEngine


class AttendanceWorker:
    def __init__(self, engine: FaceRecognitionEngine):
        self.engine = engine
        self.config: FaceServiceConfig = fetch_backend_config()
        self.is_running = False
        self.stop_event = threading.Event()
        self.capture_thread: Optional[threading.Thread] = None
        self.ai_thread: Optional[threading.Thread] = None
        self.last_attendance_time: Dict[str, float] = {}  # userId -> timestamp
        self.current_fps: float = 0.0
        self.stream_status: str = "OFFLINE"
        self.total_scans_today: int = 0
        
        self.latest_raw_frame: Optional[np.ndarray] = None
        self.latest_frame: Optional[np.ndarray] = None
        self.active_detections: List[Dict] = []
        self.registered_count: int = 0
        self.guest_count: int = 0
        
        self.frame_lock = threading.Lock()
        self.detection_lock = threading.Lock()

    def start(self):
        if self.is_running:
            return
        self.config = fetch_backend_config()
        self.stop_event.clear()
        self.is_running = True
        self.stream_status = "INITIALIZING"
        
        # 1. Thread pembacaan kamera realtime (18-20 FPS smooth & nyaman dilihat)
        self.capture_thread = threading.Thread(target=self._run_capture_loop, daemon=True)
        self.capture_thread.start()
        
        # 2. Thread inferensi biometrik FaceNet asynchronous (CPU eco-mode tanpa membebani thread video)
        self.ai_thread = threading.Thread(target=self._run_ai_loop, daemon=True)
        self.ai_thread.start()
        
        print(f"[INFO] Worker FaceNet CPU Eco Pipeline dimulai pada stream: {self.config.stream_url}")

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
        print("[INFO] Worker FaceNet Camera dihentikan.")

    def restart(self):
        print("[INFO] Merestart worker capture untuk sinkronisasi konfigurasi terbaru...")
        self.stop()
        time.sleep(0.2)
        self.start()

    def reset_cooldown(self, user_id: str = None, all_users: bool = False):
        """Mereset timer cooldown deteksi presensi agar wajah dapat langsung dicatat ulang."""
        if all_users or not user_id:
            self.last_attendance_time.clear()
            self.total_scans_today = 0
            print("[INFO] Semua timer cooldown presensi kamera berhasil direset.")
        else:
            self.last_attendance_time.pop(user_id, None)
            print(f"[INFO] Timer cooldown presensi untuk user '{user_id}' berhasil direset.")
        return True

    def _create_placeholder_frame(self, title: str, subtitle: str) -> np.ndarray:
        """Membuat canvas grafis visual HUD qHD (960x540) saat stream sedang standby/reconnecting."""
        canvas = np.zeros((540, 960, 3), dtype=np.uint8)
        canvas[:] = (18, 15, 26)
        
        # Subtle Grid lines
        for y in range(45, 540, 45):
            cv2.line(canvas, (0, y), (960, y), (28, 24, 40), 1)
        for x in range(45, 960, 45):
            cv2.line(canvas, (x, 0), (x, 540), (28, 24, 40), 1)

        # Title Header
        cv2.putText(canvas, "SIMASMUH AI - FACENET BIOMETRIC ENGINE", (60, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (255, 255, 255), 2, cv2.LINE_AA)
        camera_label = self.config.camera_name.upper() if self.config else "CAMERA"
        cv2.putText(canvas, f"CAMERA POINT: {camera_label}", (60, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (180, 180, 230), 1, cv2.LINE_AA)
        
        # Status Card Box
        cv2.rectangle(canvas, (60, 180), (900, 340), (32, 26, 48), -1)
        cv2.rectangle(canvas, (60, 180), (900, 340), (95, 80, 150), 2)
        cv2.putText(canvas, title, (90, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 235, 160), 2, cv2.LINE_AA)
        cv2.putText(canvas, subtitle, (90, 290), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (215, 215, 235), 1, cv2.LINE_AA)

        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        stream_src = self.config.stream_url if self.config else "0"
        cv2.putText(canvas, f"SYSTEM TIME: {time_str}  |  SOURCE: {stream_src}", (60, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (140, 140, 175), 1, cv2.LINE_AA)
        
        return canvas

    def _run_capture_loop(self):
        """Thread capture & rendering stabil qHD (960x540) 24 FPS responsif."""
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
                # 1. Coba indeks kamera utama (misal 0), lalu fallback ke indeks 1 jika indeks 0 gagal
                indices_to_try = [src] if src != 0 else [0, 1]
                backends = [cv2.CAP_DSHOW, cv2.CAP_ANY] if os.name == 'nt' else [cv2.CAP_V4L2, cv2.CAP_ANY]
                
                for idx in indices_to_try:
                    for backend in backends:
                        try:
                            c = cv2.VideoCapture(idx, backend)
                            if c is not None and c.isOpened():
                                # Set resolusi 960x540 & buffer
                                try:
                                    c.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
                                    c.set(cv2.CAP_PROP_FRAME_HEIGHT, 540)
                                    c.set(cv2.CAP_PROP_FPS, 24)
                                    c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                                except Exception:
                                    pass
                                
                                # Verifikasi pembacaan frame awal
                                ret_test, test_frame = c.read()
                                if ret_test and test_frame is not None and test_frame.size > 0:
                                    print(f"[INFO] Webcam USB berhasil dibuka pada indeks {idx} (Backend: {backend})")
                                    return c
                                else:
                                    c.release()
                        except Exception as e_open:
                            print(f"[DEBUG] Gagal buka webcam {idx} backend {backend}: {e_open}")
                return None

            elif isinstance(src, str) and any(src.startswith(proto) for proto in ["rtsp://", "rtmp://", "http://", "https://"]):
                # Konfigurasi FFMPEG RTSP ultra low-latency (tanpa buffering, max_delay 0)
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;0|probesize;32768|analyzeduration;0|stimeout;3000000"
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
                    if c is not None and c.isOpened():
                        try:
                            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                        ret_test, test_frame = c.read()
                        if ret_test and test_frame is not None and test_frame.size > 0:
                            print(f"[INFO] RTSP / Network Stream ultra low-latency terhubung ke: {src}")
                            return c
                except Exception as e_rtsp:
                    print(f"[DEBUG] CAP_FFMPEG RTSP error: {e_rtsp}")

                # Fallback default CAP_ANY untuk RTSP/HTTP
                try:
                    c = cv2.VideoCapture(src)
                    if c is not None and c.isOpened():
                        try:
                            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                        ret_test, test_frame = c.read()
                        if ret_test and test_frame is not None and test_frame.size > 0:
                            print(f"[INFO] RTSP / Network Stream berhasil terhubung (fallback default): {src}")
                            return c
                except Exception as e_fallback:
                    print(f"[DEBUG] Fallback RTSP error: {e_fallback}")
                return None

            else:
                try:
                    c = cv2.VideoCapture(src)
                    if c is not None and c.isOpened():
                        ret_test, test_frame = c.read()
                        if ret_test and test_frame is not None and test_frame.size > 0:
                            return c
                except Exception:
                    pass
                return None

        cap = None
        consecutive_failures = 0
        prev_time = time.time()
        frame_counter = 0
        last_valid_frame = None

        while not self.stop_event.is_set() and self.is_running:
            current_src = self.config.stream_url if self.config else "0"
            src_val, is_num = _parse_src(current_src)

            if src_val == "BROWSER_WEBCAM":
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                self.stream_status = "BROWSER_WEBCAM_STANDBY"
                self.current_fps = 0
                with self.frame_lock:
                    self.latest_frame = self._create_placeholder_frame(
                        "MODE WEBCAM BROWSER AKTIF",
                        "Video kamera berjalan langsung melalui browser client untuk latensi ultra-rendah.",
                    )
                time.sleep(0.5)
                continue

            if cap is None:
                self.stream_status = f"CONNECTING ({current_src})"
                with self.frame_lock:
                    self.latest_frame = self._create_placeholder_frame(
                        "MENGHUBUNGKAN SUMBER KAMERA...",
                        f"Mencoba membuka stream {current_src}...",
                    )
                cap = _open_capture(src_val, is_num)
                if cap is None or not cap.isOpened():
                    self.stream_status = "FAILED_TO_CONNECT"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame(
                            "TIDAK DAPAT MENGHUBUNGKAN KAMERA",
                            f"Pastikan URL stream RTSP/Webcam ({current_src}) aktif.",
                        )
                    time.sleep(1.5)
                    continue

            try:
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    consecutive_failures += 1
                    if consecutive_failures > 5:
                        self.stream_status = "NO_SIGNAL"
                        with self.frame_lock:
                            self.latest_frame = self._create_placeholder_frame(
                                "SINYAL STREAM TERPUTUS",
                                f"Mencoba menyambung kembali ({consecutive_failures}/35)...",
                            )
                    
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

                # Hitung FPS
                now = time.time()
                if now - prev_time >= 1.0:
                    self.current_fps = round(frame_counter / (now - prev_time), 1)
                    frame_counter = 0
                    prev_time = now

                # Standarisasi output ke resolusi jernih 960x540 (qHD 16:9 widescreen)
                h_f, w_f = frame.shape[:2]
                if w_f != 960 or h_f != 540:
                    frame = cv2.resize(frame, (960, 540), interpolation=cv2.INTER_AREA)

                last_valid_frame = frame
                with self.frame_lock:
                    self.latest_raw_frame = frame

                annotated_frame = frame.copy()
                h_frame, w_frame = annotated_frame.shape[:2]

                with self.detection_lock:
                    raw_detections = list(self.active_detections)
                    reg_cnt = self.registered_count
                    guest_cnt = self.guest_count

                # Render Bounding Box Wajah
                for det in raw_detections:
                    if now - det.get("timestamp", 0) > 1.2:
                        continue

                    x1, y1, x2, y2 = det["box"]
                    is_registered = det["is_registered"]
                    label = det["label"]
                    sub_label = det.get("sub_label", "")

                    box_w = max(12, x2 - x1)
                    box_h = max(12, y2 - y1)

                    if is_registered:
                        primary_color = (46, 204, 113)
                        tag_bg_color = (30, 140, 75)
                    else:
                        primary_color = (0, 195, 255)
                        tag_bg_color = (0, 130, 180)

                    # 1. Kotak Bounding Box (Tipis & Elegan)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), primary_color, 1)
                    
                    # 2. Corner Accents
                    c_len = max(5, min(14, box_w // 4))
                    cv2.line(annotated_frame, (x1, y1), (x1 + c_len, y1), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y1), (x1, y1 + c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y1), (x2 - c_len, y1), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y1), (x2, y1 + c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y2), (x1 + c_len, y2), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x1, y2), (x1, y2 - c_len), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y2), (x2 - c_len, y2), (255, 255, 255), 1)
                    cv2.line(annotated_frame, (x2, y2), (x2, y2 - c_len), (255, 255, 255), 1)

                    # 3. Label Tag yang proporsional & kompak
                    display_text = f"{label} | {sub_label}" if sub_label else label
                    (tw, th), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
                    
                    tag_h = th + 6
                    tag_w = tw + 10

                    if y1 - tag_h >= 40:
                        tag_y1 = y1 - tag_h
                        tag_y2 = y1
                    else:
                        tag_y1 = y1
                        tag_y2 = y1 + tag_h

                    tag_x1 = max(4, min(w_frame - tag_w - 4, x1))
                    tag_x2 = tag_x1 + tag_w

                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), tag_bg_color, -1)
                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), primary_color, 1)
                    cv2.putText(annotated_frame, display_text, (tag_x1 + 5, tag_y2 - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (255, 255, 255), 1, cv2.LINE_AA)

                # =========================================================================
                # Header Top HUD Overlay Bar (qHD 960x540 - Ringan, Bersih & Bebas Tabrakan)
                # =========================================================================
                total_faces = len(raw_detections)
                time_str = time.strftime("%H:%M:%S")

                # Bar background
                cv2.rectangle(annotated_frame, (0, 0), (w_frame, 36), (16, 12, 24), -1)
                cv2.line(annotated_frame, (0, 36), (w_frame, 36), (70, 58, 95), 1)

                # 1. Left: Live Status Badge
                cv2.circle(annotated_frame, (18, 18), 5, (46, 204, 113), -1, cv2.LINE_AA)
                cv2.putText(annotated_frame, "LIVE CAMERA", (30, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (46, 204, 113), 2, cv2.LINE_AA)

                # 2. Right: FPS & Clock pill
                right_text = f"FPS: {self.current_fps}  •  {time_str}"
                (rw, rh), _ = cv2.getTextSize(right_text, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
                rx = max(w_frame - rw - 16, 16)
                cv2.rectangle(annotated_frame, (rx - 8, 6), (w_frame - 8, 30), (28, 22, 42), -1)
                cv2.rectangle(annotated_frame, (rx - 8, 6), (w_frame - 8, 30), (65, 55, 90), 1)
                cv2.putText(annotated_frame, right_text, (rx, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (200, 205, 230), 1, cv2.LINE_AA)

                # 3. Center: Deteksi Count
                if total_faces > 0:
                    center_text = f"Deteksi: {total_faces} Wajah ({reg_cnt} Terdaftar)"
                else:
                    center_text = "Menunggu Wajah Terdeteksi"

                (cw, ch), _ = cv2.getTextSize(center_text, cv2.FONT_HERSHEY_SIMPLEX, 0.46, 1)
                cx = (w_frame - cw) // 2

                if cx < 160 or cx + cw > rx - 15:
                    cx = 165

                cv2.putText(annotated_frame, center_text, (cx, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1, cv2.LINE_AA)

                with self.frame_lock:
                    self.latest_frame = annotated_frame

                # Yield thread execution tanpa artificial sleep agar buffer hardware tidak menumpuk
                time.sleep(0.001)

            except Exception as loop_err:
                print(f"[ERROR] Capture loop exception: {loop_err}")
                time.sleep(0.05)

        if cap:
            try:
                cap.release()
            except Exception:
                pass
        self.stream_status = "OFFLINE"

    def _run_ai_loop(self):
        """Thread inferensi biometrik FaceNet berjalan asynchronous di background dengan mode CPU hemat daya."""
        print("[INFO] AI Inference Loop FaceNet CPU Eco-Mode aktif.")
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

                # Deteksi wajah dengan FaceNet / MTCNN teroptimasi
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

                    # Threshold sensitivitas (default 0.58)
                    threshold = self.config.threshold if self.config else 0.58
                    match_result = self.engine.match_face(face_crop, threshold=threshold)

                    if match_result:
                        reg_count += 1
                        user_record, similarity = match_result
                        pct = int(similarity * 100)
                        
                        new_detections.append({
                            "box": (x, y, x + w, y + h),
                            "is_registered": True,
                            "label": f"{user_record.name} ({pct}%)",
                            "sub_label": f"{user_record.role} - {user_record.identifier}",
                            "similarity": similarity,
                            "user_record": user_record,
                            "timestamp": now,
                        })

                        if ai_frame_counter % 2 == 0:
                            self._process_attendance(user_record, similarity, face_crop=face_crop)
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
                        })

                with self.detection_lock:
                    self.active_detections = new_detections
                    self.registered_count = reg_count
                    self.guest_count = guest_count

                # Jeda inferensi hemat daya CPU: jika tidak ada wajah, istirahatkan CPU lebih lama (~4 FPS idle, ~6-7 FPS active)
                time.sleep(0.12 if faces else 0.25)

            except Exception as ai_err:
                print(f"[ERROR] AI Inference exception: {ai_err}")
                time.sleep(0.2)

    def generate_mjpeg_stream(self):
        """Generator frame MJPEG real-time ultra low-latency (25-30 FPS responsif tanpa delay buffer)."""
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 74]
        while True:
            frame_to_send = None
            with self.frame_lock:
                if self.latest_frame is not None:
                    frame_to_send = self.latest_frame

            if frame_to_send is None:
                if self.is_running:
                    frame_to_send = self._create_placeholder_frame(
                        "MEMULAI ENGINE FACENET...",
                        "Menginisialisasi capture kamera & FaceNet biometric detector...",
                    )
                else:
                    frame_to_send = self._create_placeholder_frame(
                        "AI STREAM STANDBY / NONAKTIF",
                        "Nyalakan microservice melalui tombol di dashboard untuk memulai stream.",
                    )

            ret, buffer = cv2.imencode('.jpg', frame_to_send, encode_params)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n'
                       b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.025)

    def _process_attendance(self, user_record, similarity: float, face_crop: Optional[np.ndarray] = None):
        user_id = user_record.user_id
        now = time.time()
        cooldown_mins = self.config.cooldown_minutes if self.config else 10
        cooldown_sec = cooldown_mins * 60

        last_time = self.last_attendance_time.get(user_id, 0)
        if now - last_time < cooldown_sec:
            return

        self.last_attendance_time[user_id] = now
        self.total_scans_today += 1
        print(f"[ATTENDANCE SCAN] Terdeteksi: {user_record.name} ({user_record.role}) | Kemiripan: {round(similarity*100, 1)}%")

        # Buat snapshot thumbnail JPEG Base64 dari potongan wajah hasil deteksi realtime
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
                "cameraLocation": self.config.location if self.config else "Gerbang",
                "snapshot": snapshot_b64,
            }
            res = requests.post(f"{BACKEND_URL}/face-attendance/record", json=payload, headers=headers, timeout=4)
            if res.status_code in (200, 201):
                res_data = res.json()
                print(f"[SUCCESS] Presensi tercatat: {res_data.get('message')}")
            else:
                print(f"[WARN] Backend status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Gagal kirim presensi ke backend: {e}")
