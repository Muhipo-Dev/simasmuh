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
        self.thread: Optional[threading.Thread] = None
        self.last_attendance_time: Dict[str, float] = {}  # userId -> timestamp
        self.current_fps: float = 0.0
        self.stream_status: str = "OFFLINE"
        self.total_scans_today: int = 0
        self.latest_frame: Optional[np.ndarray] = None
        self.lock = threading.Lock()

    def start(self):
        if self.is_running:
            return
        self.config = fetch_backend_config()
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print(f"[INFO] Worker RTSP/RTMP Live Camera dimulai pada stream: {self.config.stream_url}")

    def stop(self):
        self.is_running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=3)
        self.thread = None
        self.stream_status = "STOPPED"
        print("[INFO] Worker RTSP/RTMP Live Camera dihentikan.")

    def restart(self):
        print("[INFO] Merestart worker capture untuk pergantian mode/sumber stream...")
        self.stop()
        time.sleep(0.5)
        self.start()

    def _run_loop(self):
        stream_src = self.config.stream_url
        if stream_src.isdigit():
            stream_src = int(stream_src)

        cap = cv2.VideoCapture(stream_src)
        
        # Buffer low-latency untuk RTSP/RTMP
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not cap.isOpened():
            self.stream_status = f"ERROR: Tidak dapat membuka {stream_src}"
            self.is_running = False
            return

        self.stream_status = "LIVE_STREAMING"
        prev_time = time.time()
        frame_counter = 0

        while self.is_running:
            ret, frame = cap.read()
            if not ret or frame is None:
                self.stream_status = "RECONNECTING..."
                time.sleep(2)
                cap = cv2.VideoCapture(stream_src)
                continue

            self.stream_status = "LIVE_STREAMING"
            frame_counter += 1

            # Hitung FPS
            now = time.time()
            if now - prev_time >= 1.0:
                self.current_fps = round(frame_counter / (now - prev_time), 1)
                frame_counter = 0
                prev_time = now

            annotated_frame = frame.copy()
            h_frame, w_frame = frame.shape[:2]

            # Deteksi Wajah setiap 2 frame untuk efisiensi komputasi
            faces = self.engine.detect_faces(frame)
            for (x, y, w, h) in faces:
                if w < 40 or h < 40:
                    continue
                
                # Crop wajah
                y1 = max(0, y)
                y2 = min(h_frame, y + h)
                x1 = max(0, x)
                x2 = min(w_frame, x + w)
                face_crop = frame[y1:y2, x1:x2]

                match_result = self.engine.match_face(face_crop, threshold=self.config.threshold)
                
                if match_result:
                    user_record, similarity = match_result
                    pct = int(similarity * 100)
                    label = f"{user_record.name} ({pct}%)"
                    sub_label = f"{user_record.role} • {user_record.identifier}"
                    
                    # Kotak Hijau/Cyan untuk Wajah Teridentifikasi
                    color = (46, 204, 113)  # Emerald green (BGR)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Background text pill
                    cv2.rectangle(annotated_frame, (x1, max(0, y1 - 38)), (x1 + max(len(label), len(sub_label)) * 9 + 10, y1), color, -1)
                    cv2.putText(annotated_frame, label, (x1 + 5, y1 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
                    cv2.putText(annotated_frame, sub_label, (x1 + 5, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)

                    if frame_counter % 2 == 0:
                        self._process_attendance(user_record, similarity)
                else:
                    # Kotak Kuning/Biru untuk Wajah Belum Dikenali
                    color = (0, 215, 255)  # Amber gold (BGR)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                    cv2.rectangle(annotated_frame, (x1, max(0, y1 - 20)), (x1 + 130, y1), color, -1)
                    cv2.putText(annotated_frame, "Face Detected", (x1 + 5, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

            # Tambahkan info HUD di pojok atas frame
            hud_text = f"LIVE | FPS: {self.current_fps} | {self.config.camera_name}"
            time_str = time.strftime("%H:%M:%S")
            cv2.putText(annotated_frame, f"{hud_text} - {time_str}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            cv2.putText(annotated_frame, f"{hud_text} - {time_str}", (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1)

            with self.lock:
                self.latest_frame = annotated_frame

            time.sleep(0.01)

        cap.release()
        self.stream_status = "OFFLINE"

    def generate_mjpeg_stream(self):
        """Generator frame MJPEG untuk live stream web browser."""
        while self.is_running:
            with self.lock:
                if self.latest_frame is None:
                    time.sleep(0.05)
                    continue
                ret, buffer = cv2.imencode('.jpg', self.latest_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                if not ret:
                    continue
                frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.04)

    def _process_attendance(self, user_record, similarity: float):
        user_id = user_record.user_id
        now = time.time()
        cooldown_sec = self.config.cooldown_minutes * 60

        # Debounce: Cek apakah user sudah diabsen dalam waktu cooldown
        last_time = self.last_attendance_time.get(user_id, 0)
        if now - last_time < cooldown_sec:
            return

        self.last_attendance_time[user_id] = now
        self.total_scans_today += 1
        print(f"[ATTENDANCE SCAN] Terdeteksi: {user_record.name} ({user_record.role}) | Kemiripan: {round(similarity*100, 1)}%")

        # Kirim HTTP POST ke Backend NestJS SIMASMUH
        try:
            from config import API_KEY
            headers = {"x-api-key": API_KEY}
            payload = {
                "userId": user_id,
                "confidence": round(similarity, 3),
                "secretKey": API_SECRET,
                "cameraLocation": self.config.location,
            }
            res = requests.post(f"{BACKEND_URL}/face-attendance/record", json=payload, headers=headers, timeout=4)
            if res.status_code in (200, 201):
                res_data = res.json()
                print(f"[SUCCESS] Presensi tercatat: {res_data.get('message')}")
            else:
                print(f"[WARN] Backend returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Gagal mengirim payload absensi ke backend: {e}")
