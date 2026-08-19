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
        self.stream_status = "STOPPED"
        if self.capture_thread and self.capture_thread.is_alive():
            self.capture_thread.join(timeout=1.5)
        if self.ai_thread and self.ai_thread.is_alive():
            self.ai_thread.join(timeout=1.5)
            
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
        time.sleep(0.3)
        self.start()

    def _create_placeholder_frame(self, title: str, subtitle: str) -> np.ndarray:
        """Membuat canvas grafis visual HUD saat stream sedang standby/reconnecting."""
        canvas = np.zeros((480, 640, 3), dtype=np.uint8)
        canvas[:] = (18, 15, 24)
        
        # Subtle Grid lines
        for y in range(40, 480, 40):
            cv2.line(canvas, (0, y), (640, y), (28, 24, 38), 1)
        for x in range(40, 640, 40):
            cv2.line(canvas, (x, 0), (x, 480), (28, 24, 38), 1)

        cv2.putText(canvas, "SIMASMUH AI - FACENET BIOMETRIC ENGINE", (75, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        camera_label = self.config.camera_name.upper() if self.config else "CAMERA"
        cv2.putText(canvas, f"CAMERA: {camera_label}", (75, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 220), 1)
        
        # Status Card Box
        cv2.rectangle(canvas, (75, 180), (565, 270), (35, 30, 50), -1)
        cv2.rectangle(canvas, (75, 180), (565, 270), (100, 80, 160), 1)
        cv2.putText(canvas, title, (95, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (0, 230, 150), 2)
        cv2.putText(canvas, subtitle, (95, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 220), 1)

        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        stream_src = self.config.stream_url if self.config else "0"
        cv2.putText(canvas, f"TIME: {time_str} | STREAM: {stream_src}", (75, 390), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130, 130, 160), 1)
        
        return canvas

    def _run_capture_loop(self):
        """Thread capture & rendering stabil pada 18-20 FPS hemat daya."""
        def _parse_src(src_val):
            if isinstance(src_val, str) and src_val.strip().isdigit():
                return int(src_val.strip()), True
            elif isinstance(src_val, int):
                return src_val, True
            return src_val, False

        def _open_capture(src, is_num):
            if is_num:
                # 1. DirectShow (Windows)
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_DSHOW)
                    if c.isOpened():
                        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        c.set(cv2.CAP_PROP_FPS, 20)
                        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        return c
                except Exception:
                    pass
                # 2. Windows Media Foundation
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_MSMF)
                    if c.isOpened():
                        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        c.set(cv2.CAP_PROP_FPS, 20)
                        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        return c
                except Exception:
                    pass
                # 3. Fallback
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_ANY)
                    if c.isOpened():
                        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        return c
                except Exception:
                    pass
                return None
            elif isinstance(src, str) and (src.startswith("rtsp://") or src.startswith("rtmp://") or src.startswith("http://") or src.startswith("https://")):
                import os
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;1000000|probesize;1000000|stimeout;5000000"
                try:
                    c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
                    if not c.isOpened():
                        c = cv2.VideoCapture(src)
                    return c
                except Exception:
                    return None
            else:
                try:
                    return cv2.VideoCapture(src)
                except Exception:
                    return None

        cap = None
        consecutive_failures = 0
        prev_time = time.time()
        frame_counter = 0
        active_src = None

        while self.is_running:
            try:
                current_raw_src = self.config.stream_url if self.config else "0"
                parsed_src, is_num = _parse_src(current_raw_src)

                # Buka ulang capture jika konfigurasi diganti
                if parsed_src != active_src and cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                    active_src = parsed_src

                if cap is None or not cap.isOpened():
                    self.stream_status = f"CONNECTING ({parsed_src})"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame(
                            "MENGHUBUNGKAN SUMBER KAMERA...",
                            f"Membuka '{parsed_src}'. Pastikan kamera/stream aktif.",
                        )
                    try:
                        cap = _open_capture(parsed_src, is_num)
                    except Exception:
                        cap = None
                    
                    if cap is None or not cap.isOpened():
                        time.sleep(0.8)
                        continue

                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    consecutive_failures += 1
                    self.stream_status = f"STANDBY: Sinyal Kamera ({parsed_src})"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame(
                            "MENUNGGU SINYAL VIDEO...",
                            f"Frame kosong dari '{parsed_src}'. Sinkronisasi...",
                        )
                    
                    if consecutive_failures > 6:
                        try:
                            if cap:
                                cap.release()
                        except Exception:
                            pass
                        cap = None
                        time.sleep(0.8)
                    else:
                        time.sleep(0.05)
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

                # Pastikan resolusi nyaman & standar 640x480
                h_f, w_f = frame.shape[:2]
                if w_f != 640 or h_f != 480:
                    frame = cv2.resize(frame, (640, 480))

                with self.frame_lock:
                    self.latest_raw_frame = frame

                annotated_frame = frame.copy()
                h_frame, w_frame = annotated_frame.shape[:2]

                with self.detection_lock:
                    detections = list(self.active_detections)
                    reg_cnt = self.registered_count
                    guest_cnt = self.guest_count

                # Render Bounding Box Wajah
                for det in detections:
                    if now - det.get("timestamp", 0) > 0.8:
                        continue

                    x1, y1, x2, y2 = det["box"]
                    is_registered = det["is_registered"]
                    label = det["label"]
                    sub_label = det.get("sub_label", "")

                    box_w = max(10, x2 - x1)
                    box_h = max(10, y2 - y1)

                    if is_registered:
                        # Emerald Green untuk pengguna terdaftar di database
                        primary_color = (46, 204, 113)
                        tag_bg_color = (35, 150, 85)
                    else:
                        # Amber / Cyan-Yellow untuk Tamu / Orang Asing
                        primary_color = (0, 195, 255)
                        tag_bg_color = (0, 135, 185)

                    # 1. Kotak Bounding Box
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), primary_color, 2)
                    
                    # 2. Corner Accents
                    c_len = max(6, min(16, box_w // 4))
                    cv2.line(annotated_frame, (x1, y1), (x1 + c_len, y1), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x1, y1), (x1, y1 + c_len), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x2, y1), (x2 - c_len, y1), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x2, y1), (x2, y1 + c_len), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x1, y2), (x1 + c_len, y2), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x1, y2), (x1, y2 - c_len), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x2, y2), (x2 - c_len, y2), (255, 255, 255), 2)
                    cv2.line(annotated_frame, (x2, y2), (x2, y2 - c_len), (255, 255, 255), 2)

                    # 3. Label Tag
                    display_text = f"{label} | {sub_label}" if sub_label else label
                    (tw, th), _ = cv2.getTextSize(display_text, cv2.FONT_HERSHEY_SIMPLEX, 0.38, 1)
                    
                    tag_h = th + 10
                    tag_w = tw + 14

                    if y1 - tag_h >= 34:
                        tag_y1 = y1 - tag_h
                        tag_y2 = y1
                    else:
                        tag_y1 = y1
                        tag_y2 = y1 + tag_h

                    tag_x1 = max(2, min(w_frame - tag_w - 2, x1))
                    tag_x2 = tag_x1 + tag_w

                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), tag_bg_color, -1)
                    cv2.rectangle(annotated_frame, (tag_x1, tag_y1), (tag_x2, tag_y2), primary_color, 1)
                    cv2.putText(annotated_frame, display_text, (tag_x1 + 6, tag_y2 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1, cv2.LINE_AA)

                # Header Top HUD Overlay Bar
                total_faces = len(detections)
                time_str = time.strftime("%H:%M:%S")

                cv2.rectangle(annotated_frame, (0, 0), (w_frame, 32), (18, 14, 24), -1)
                cv2.line(annotated_frame, (0, 32), (w_frame, 32), (55, 45, 75), 1)

                cv2.putText(annotated_frame, "LIVE CAMERA", (12, 21), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (46, 204, 113), 1, cv2.LINE_AA)
                cv2.circle(annotated_frame, (115, 17), 4, (46, 204, 113), -1)

                compute_dev = getattr(self.engine, 'device_name', 'CPU Eco')
                center_text = f"Deteksi: {total_faces} Wajah ({reg_cnt} Terdaftar, {guest_cnt} Tamu) | {compute_dev}"
                cv2.putText(annotated_frame, center_text, (max(130, w_frame // 2 - 145), 21), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (235, 235, 245), 1, cv2.LINE_AA)

                right_text = f"FPS: {self.current_fps} | {time_str}"
                cv2.putText(annotated_frame, right_text, (max(w_frame - 165, 300), 21), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 205), 1, cv2.LINE_AA)

                with self.frame_lock:
                    self.latest_frame = annotated_frame

                # Jeda frame stabil (18-20 FPS) hemat CPU
                time.sleep(0.048)

            except Exception as loop_err:
                print(f"[ERROR] Capture loop exception: {loop_err}")
                time.sleep(0.2)

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
                    time.sleep(0.1)
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
                            self._process_attendance(user_record, similarity)
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

                # Rate limiting inferensi CPU: ~7-8 FPS agar CPU dingin dan perangkat tidak panas
                time.sleep(0.12 if faces else 0.18)

            except Exception as ai_err:
                print(f"[ERROR] AI Inference exception: {ai_err}")
                time.sleep(0.2)

    def generate_mjpeg_stream(self):
        """Generator frame MJPEG stabil (18-20 FPS) dengan kompresi hemat bandwidth."""
        while True:
            frame_to_send = None
            with self.frame_lock:
                if self.latest_frame is not None:
                    frame_to_send = self.latest_frame.copy()

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

            ret, buffer = cv2.imencode('.jpg', frame_to_send, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.048)

    def _process_attendance(self, user_record, similarity: float):
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

        try:
            from config import API_KEY
            headers = {"x-api-key": API_KEY}
            payload = {
                "userId": user_id,
                "confidence": round(similarity, 3),
                "secretKey": API_SECRET,
                "cameraLocation": self.config.location if self.config else "Gerbang",
            }
            res = requests.post(f"{BACKEND_URL}/face-attendance/record", json=payload, headers=headers, timeout=4)
            if res.status_code in (200, 201):
                res_data = res.json()
                print(f"[SUCCESS] Presensi tercatat: {res_data.get('message')}")
            else:
                print(f"[WARN] Backend status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Gagal kirim presensi ke backend: {e}")
