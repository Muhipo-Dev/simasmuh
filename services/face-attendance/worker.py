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
        
        self.frame_lock = threading.Lock()
        self.detection_lock = threading.Lock()

    def start(self):
        if self.is_running:
            return
        self.config = fetch_backend_config()
        self.is_running = True
        self.stream_status = "INITIALIZING"
        
        # 1. Thread pembacaan kamera realtime (20 FPS smooth rendering)
        self.capture_thread = threading.Thread(target=self._run_capture_loop, daemon=True)
        self.capture_thread.start()
        
        # 2. Thread inferensi biometrik FaceNet asynchronous (tanpa memblokir frame video)
        self.ai_thread = threading.Thread(target=self._run_ai_loop, daemon=True)
        self.ai_thread.start()
        
        print(f"[INFO] Worker FaceNet Asynchronous Pipeline dimulai pada stream: {self.config.stream_url}")

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
        print("[INFO] Worker FaceNet Live Camera dihentikan.")

    def restart(self):
        print("[INFO] Merestart worker capture untuk pergantian mode/sumber stream...")
        self.stop()
        time.sleep(0.3)
        self.start()

    def _create_placeholder_frame(self, title: str, subtitle: str) -> np.ndarray:
        """Membuat canvas grafis visual HUD saat stream sedang standby/reconnecting."""
        canvas = np.zeros((480, 640, 3), dtype=np.uint8)
        canvas[:] = (18, 15, 24)
        
        # Grid lines
        for y in range(40, 480, 40):
            cv2.line(canvas, (0, y), (640, y), (28, 24, 38), 1)
        for x in range(40, 640, 40):
            cv2.line(canvas, (x, 0), (x, 480), (28, 24, 38), 1)

        # Center frame box
        cv2.rectangle(canvas, (50, 60), (590, 420), (70, 50, 110), 2)
        
        # Target corner marks
        cv2.line(canvas, (50, 60), (80, 60), (0, 215, 255), 3)
        cv2.line(canvas, (50, 60), (50, 90), (0, 215, 255), 3)
        cv2.line(canvas, (590, 60), (560, 60), (0, 215, 255), 3)
        cv2.line(canvas, (590, 60), (590, 90), (0, 215, 255), 3)
        cv2.line(canvas, (50, 420), (80, 420), (0, 215, 255), 3)
        cv2.line(canvas, (50, 420), (50, 390), (0, 215, 255), 3)
        cv2.line(canvas, (590, 420), (560, 420), (0, 215, 255), 3)
        cv2.line(canvas, (590, 420), (590, 390), (0, 215, 255), 3)

        cv2.putText(canvas, "SIMASMUH AI - FACENET BIOMETRIC ENGINE", (75, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        camera_label = self.config.camera_name.upper() if self.config else "CAMERA"
        cv2.putText(canvas, f"CAMERA: {camera_label}", (75, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 220), 1)
        
        # Status Box
        cv2.rectangle(canvas, (75, 180), (565, 270), (35, 30, 50), -1)
        cv2.rectangle(canvas, (75, 180), (565, 270), (100, 80, 160), 1)
        cv2.putText(canvas, title, (95, 215), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (0, 230, 150), 2)
        cv2.putText(canvas, subtitle, (95, 248), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 220), 1)

        time_str = time.strftime("%Y-%m-%d %H:%M:%S")
        stream_src = self.config.stream_url if self.config else "0"
        cv2.putText(canvas, f"TIME: {time_str} | STREAM: {stream_src}", (75, 390), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130, 130, 160), 1)
        
        return canvas

    def _run_capture_loop(self):
        """Thread capture & rendering berkecepatan 20 FPS stabil."""
        def _parse_src(src_val):
            if isinstance(src_val, str) and src_val.strip().isdigit():
                return int(src_val.strip()), True
            elif isinstance(src_val, int):
                return src_val, True
            return src_val, False

        def _open_capture(src, is_num):
            if is_num:
                c = cv2.VideoCapture(src, cv2.CAP_DSHOW)
                if not c.isOpened():
                    c = cv2.VideoCapture(src)
                if c.isOpened():
                    try:
                        c.set(cv2.CAP_PROP_FPS, 20)
                        c.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                        c.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    except Exception:
                        pass
                return c
            elif isinstance(src, str) and (src.startswith("rtsp://") or src.startswith("rtmp://") or src.startswith("http://") or src.startswith("https://")):
                import os
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;1000000|probesize;1000000|stimeout;5000000"
                c = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
                if not c.isOpened():
                    c = cv2.VideoCapture(src)
                try:
                    c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                except Exception:
                    pass
                return c
            else:
                return cv2.VideoCapture(src)

        cap = None
        consecutive_failures = 0
        prev_time = time.time()
        frame_counter = 0
        active_src = None

        while self.is_running:
            try:
                current_raw_src = self.config.stream_url if self.config else "0"
                parsed_src, is_num = _parse_src(current_raw_src)

                # Jika sumber kamera diubah dari dashboard, buka koneksi baru
                if parsed_src != active_src and cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                    cap = None
                    active_src = parsed_src

                # 1. Buka capture device jika belum terhubung
                if cap is None or not cap.isOpened():
                    self.stream_status = f"CONNECTING ({parsed_src})"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame(
                            "MENGHUBUNGKAN SUMBER KAMERA...",
                            f"Mencoba membuka sumber '{parsed_src}'. Pastikan webcam / RTSP aktif.",
                        )
                    try:
                        cap = _open_capture(parsed_src, is_num)
                    except Exception:
                        cap = None
                    
                    if cap is None or not cap.isOpened():
                        time.sleep(0.8)
                        continue

                # 2. Baca frame dari sumber video
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    consecutive_failures += 1
                    self.stream_status = f"STANDBY: Sinyal Kamera ({parsed_src})"
                    with self.frame_lock:
                        self.latest_frame = self._create_placeholder_frame(
                            "MENUNGGU SINYAL VIDEO...",
                            f"Frame kosong dari '{parsed_src}'. Mencoba sinkronisasi ulang...",
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

                # 3. Hitung FPS realtime
                now = time.time()
                if now - prev_time >= 1.0:
                    self.current_fps = round(frame_counter / (now - prev_time), 1)
                    frame_counter = 0
                    prev_time = now

                # 4. Simpan raw frame untuk AI Thread
                with self.frame_lock:
                    self.latest_raw_frame = frame

                # 5. Render anotasi bounding box dari active_detections (Bebas Kedip & Sangat Jelas)
                annotated_frame = frame.copy()
                h_frame, w_frame = annotated_frame.shape[:2]

                with self.detection_lock:
                    detections = list(self.active_detections)
                    reg_cnt = self.registered_count

                # Gambar seluruh bounding box yang aktif
                for det in detections:
                    # Persistensi deteksi (tampil selama frame aktif belum kadaluarsa > 2.0 detik)
                    if now - det.get("timestamp", 0) > 2.0:
                        continue

                    x1, y1, x2, y2 = det["box"]
                    is_registered = det["is_registered"]
                    label = det["label"]
                    sub_label = det["sub_label"]

                    box_w = max(10, x2 - x1)
                    box_h = max(10, y2 - y1)

                    if is_registered:
                        primary_color = (46, 204, 113)  # Emerald Green (BGR)
                    else:
                        primary_color = (0, 165, 255)   # Amber Orange (BGR)

                    # Bounding Box Wajah (Tebal & Terlihat Jelas)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), primary_color, 2)
                    
                    # 4 Sudut Pojok Aksen Putih Tebal
                    c_len = max(8, min(20, box_w // 4))
                    # Top-Left
                    cv2.line(annotated_frame, (x1, y1), (x1 + c_len, y1), (255, 255, 255), 3)
                    cv2.line(annotated_frame, (x1, y1), (x1, y1 + c_len), (255, 255, 255), 3)
                    # Top-Right
                    cv2.line(annotated_frame, (x2, y1), (x2 - c_len, y1), (255, 255, 255), 3)
                    cv2.line(annotated_frame, (x2, y1), (x2, y1 + c_len), (255, 255, 255), 3)
                    # Bottom-Left
                    cv2.line(annotated_frame, (x1, y2), (x1 + c_len, y2), (255, 255, 255), 3)
                    cv2.line(annotated_frame, (x1, y2), (x1, y2 - c_len), (255, 255, 255), 3)
                    # Bottom-Right
                    cv2.line(annotated_frame, (x2, y2), (x2 - c_len, y2), (255, 255, 255), 3)
                    cv2.line(annotated_frame, (x2, y2), (x2 - c_len, y2), (255, 255, 255), 3)

                    # Dimensi Badge Pill Label
                    badge_h = 36
                    badge_w = max(box_w + 16, max(len(label), len(sub_label)) * 7 + 22)
                    badge_x1 = max(4, min(w_frame - badge_w - 4, x1 - 4))
                    badge_x2 = min(w_frame - 4, badge_x1 + badge_w)

                    # Posisi Badge Pill: Jika dekat batas atas (y1 < 55), render di BAWAH box
                    if y1 < 55:
                        b_y1 = y2 + 4
                        b_y2 = min(h_frame - 4, y2 + 4 + badge_h)
                    else:
                        b_y1 = max(34, y1 - badge_h - 4)
                        b_y2 = max(34 + badge_h, y1 - 4)

                    # Background Pill Badge (Solid & Rapi)
                    cv2.rectangle(annotated_frame, (badge_x1, b_y1), (badge_x2, b_y2), (22, 18, 28), -1)
                    cv2.rectangle(annotated_frame, (badge_x1, b_y1), (badge_x2, b_y2), primary_color, 2)
                    
                    # Teks Label
                    cv2.putText(annotated_frame, label, (badge_x1 + 8, b_y1 + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 1, cv2.LINE_AA)
                    cv2.putText(annotated_frame, sub_label, (badge_x1 + 8, b_y1 + 29), cv2.FONT_HERSHEY_SIMPLEX, 0.35, primary_color, 1, cv2.LINE_AA)

                # 6. Header Top HUD Overlay Bar (Rapi & Tidak Bertumpuk)
                total_faces = len(detections)
                time_str = time.strftime("%H:%M:%S")

                # Top Bar Banner Background
                cv2.rectangle(annotated_frame, (0, 0), (w_frame, 32), (18, 14, 24), -1)
                cv2.line(annotated_frame, (0, 32), (w_frame, 32), (55, 45, 75), 1)

                # Kolom Kiri: Status Live
                cv2.putText(annotated_frame, "LIVE CAMERA", (12, 21), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (46, 204, 113), 1, cv2.LINE_AA)
                cv2.circle(annotated_frame, (115, 17), 4, (46, 204, 113), -1)

                # Kolom Tengah: Info Deteksi & Hardware
                compute_dev = getattr(self.engine, 'device_name', 'GPU')
                center_text = f"Deteksi: {total_faces} Wajah ({reg_cnt} Terdaftar) | {compute_dev}"
                cv2.putText(annotated_frame, center_text, (max(130, w_frame // 2 - 130), 21), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (235, 235, 245), 1, cv2.LINE_AA)

                # Kolom Kanan: FPS & Jam
                right_text = f"FPS: {self.current_fps} | {time_str}"
                cv2.putText(annotated_frame, right_text, (max(w_frame - 165, 300), 21), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 180, 205), 1, cv2.LINE_AA)

                with self.frame_lock:
                    self.latest_frame = annotated_frame

                time.sleep(0.04)

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
        """Thread inferensi biometrik FaceNet berjalan asynchronous di background."""
        print("[INFO] AI Inference Loop FaceNet aktif.")
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

                # Deteksi wajah dengan FaceNet MTCNN
                faces = self.engine.detect_faces(target_frame)
                new_detections = []
                reg_count = 0

                for (x, y, w, h) in faces:
                    if w < 16 or h < 16:
                        continue

                    y1 = max(0, y)
                    y2 = min(h_frame, y + h)
                    x1 = max(0, x)
                    x2 = min(w_frame, x + w)
                    face_crop = target_frame[y1:y2, x1:x2]

                    # Cocokkan vektor FaceNet 512-D
                    threshold = self.config.threshold if self.config else 0.7
                    match_result = self.engine.match_face(face_crop, threshold=threshold)

                    if match_result:
                        reg_count += 1
                        user_record, similarity = match_result
                        pct = int(similarity * 100)
                        
                        new_detections.append({
                            "box": (x1, y1, x2, y2),
                            "is_registered": True,
                            "label": f"{user_record.name} ({pct}%)",
                            "sub_label": f"{user_record.role} - {user_record.identifier}",
                            "similarity": similarity,
                            "user_record": user_record,
                            "timestamp": now,
                        })

                        # Catat presensi untuk pengguna terdaftar
                        if ai_frame_counter % 2 == 0:
                            self._process_attendance(user_record, similarity)
                    else:
                        new_detections.append({
                            "box": (x1, y1, x2, y2),
                            "is_registered": False,
                            "label": "Wajah Terdeteksi",
                            "sub_label": "Tamu / Belum Terdaftar",
                            "similarity": 0.0,
                            "user_record": None,
                            "timestamp": now,
                        })

                with self.detection_lock:
                    self.active_detections = new_detections
                    self.registered_count = reg_count

                time.sleep(0.04)

            except Exception as ai_err:
                print(f"[ERROR] AI Inference exception: {ai_err}")
                time.sleep(0.1)

    def generate_mjpeg_stream(self):
        """Generator frame MJPEG stabil (20 FPS) untuk kenyamanan visual & latensi rendah."""
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

            # Encode frame JPEG dengan kompresi kualitas 80% (tajam & nyaman dilihat)
            ret, buffer = cv2.imencode('.jpg', frame_to_send, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.045)

    def _process_attendance(self, user_record, similarity: float):
        user_id = user_record.user_id
        now = time.time()
        cooldown_mins = self.config.cooldown_minutes if self.config else 10
        cooldown_sec = cooldown_mins * 60

        # Debounce: Cek apakah user sudah diabsen dalam waktu cooldown
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
                print(f"[WARN] Backend returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Gagal mengirim payload absensi ke backend: {e}")
