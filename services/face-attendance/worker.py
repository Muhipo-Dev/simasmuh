import time
import threading
import cv2
import requests
from typing import Dict, Optional
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

    def start(self):
        if self.is_running:
            return
        self.config = fetch_backend_config()
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print(f"[INFO] Worker RTMP Face Attendance dimulai pada stream: {self.config.stream_url}")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=3)
        self.stream_status = "STOPPED"
        print("[INFO] Worker RTMP Face Attendance dihentikan.")

    def _run_loop(self):
        stream_src = self.config.stream_url
        if stream_src.isdigit():
            stream_src = int(stream_src)

        cap = cv2.VideoCapture(stream_src)
        
        # Buffer low-latency untuk RTMP/RTSP
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

            # Deteksi Wajah setiap 2 frame untuk efisiensi CPU/GPU
            if frame_counter % 2 == 0:
                faces = self.engine.detect_faces(frame)
                for (x, y, w, h) in faces:
                    if w < 50 or h < 50:
                        continue
                    
                    # Crop wajah
                    y1 = max(0, y)
                    y2 = min(frame.shape[0], y + h)
                    x1 = max(0, x)
                    x2 = min(frame.shape[1], x + w)
                    face_crop = frame[y1:y2, x1:x2]

                    match_result = self.engine.match_face(face_crop, threshold=self.config.threshold)
                    if match_result:
                        user_record, similarity = match_result
                        self._process_attendance(user_record, similarity)

            time.sleep(0.01)

        cap.release()
        self.stream_status = "OFFLINE"

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
            payload = {
                "userId": user_id,
                "confidence": round(similarity, 3),
                "secretKey": API_SECRET,
                "cameraLocation": self.config.location,
            }
            res = requests.post(f"{BACKEND_URL}/api/face-attendance/record", json=payload, timeout=4)
            if res.status_code == 200 or res.status_code == 201:
                res_data = res.json()
                print(f"[SUCCESS] Presensi tercatat: {res_data.get('message')}")
            else:
                print(f"[WARN] Backend returned status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[ERROR] Gagal mengirim payload absensi ke backend: {e}")
