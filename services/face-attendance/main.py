import os
import signal
import socket
import sys
import time
import base64
import cv2
import numpy as np
import requests
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from config import BACKEND_URL, SERVICE_PORT, fetch_backend_config
from face_engine import FaceRecognitionEngine
from worker import AttendanceWorker

engine = FaceRecognitionEngine(backend_url=BACKEND_URL)
worker = AttendanceWorker(engine=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] SIMASMUH Face Attendance Service (FaceNet CPU Eco) Starting...")
    import threading
    sync_thread = threading.Thread(target=engine.sync_database_from_backend, daemon=True)
    sync_thread.start()
    
    yield
    worker.stop()
    print("[INFO] SIMASMUH Face Attendance Service Stopped.")

app = FastAPI(
    title="SIMASMUH Face Attendance Service (FaceNet CPU Eco)",
    version="1.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "SIMASMUH Face Attendance Service",
        "model": "FaceNet Inception-ResNet-v1 (512-D) + MTCNN",
        "device": engine.device_name,
        "status": worker.stream_status,
        "is_running": worker.is_running,
        "fps": worker.current_fps,
        "users_in_cache": len(engine.user_database),
        "total_scans_today": worker.total_scans_today,
    }

@app.get("/status")
def get_status():
    cfg = worker.config
    return {
        "is_online": True,
        "is_running": worker.is_running,
        "stream_status": worker.stream_status,
        "stream_url": cfg.stream_url if cfg else "0",
        "camera_name": cfg.camera_name if cfg else "Camera",
        "device": engine.device_name,
        "fps": worker.current_fps,
        "threshold": cfg.threshold if cfg else 0.58,
        "cooldown_minutes": cfg.cooldown_minutes if cfg else 10,
        "users_cached": len(engine.user_database),
        "total_scans_today": worker.total_scans_today,
    }

@app.get("/video_feed")
def video_feed():
    """Endpoint HTTP MJPEG streaming real-time live capture FaceNet."""
    return StreamingResponse(
        worker.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Access-Control-Allow-Origin": "*",
        }
    )

@app.post("/sync-profiles")
def sync_profiles():
    total, active_vectors = engine.sync_database_from_backend()
    return {
        "success": True,
        "message": f"Sinkronisasi FaceNet selesai: {total} total pengguna, {active_vectors} profil berfoto aktif siap dideteksi.",
        "total_users": total,
        "active_vectors": active_vectors,
    }

class ScanFrameRequest(BaseModel):
    image: str  # base64 data url or raw base64

@app.post("/scan_frame")
def scan_frame(payload: ScanFrameRequest):
    """Endpoint untuk menerima frame kamera dari client/browser, mendeteksi wajah dengan MTCNN + FaceNet, dan memicu absensi otomatis."""
    try:
        data = payload.image
        if "," in data:
            data = data.split(",", 1)[1]
        img_bytes = base64.b64decode(data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None or frame.size == 0:
            return {"faces": []}

        h_frame, w_frame = frame.shape[:2]
        faces = engine.detect_faces(frame)
        results = []

        for (x, y, w, h) in faces:
            if w < 18 or h < 18:
                continue
            
            pad_y = int(h * 0.1)
            pad_x = int(w * 0.1)
            y1 = max(0, y - pad_y)
            y2 = min(h_frame, y + h + pad_y)
            x1 = max(0, x - pad_x)
            x2 = min(w_frame, x + w + pad_x)
            face_crop = frame[y1:y2, x1:x2]

            threshold = worker.config.threshold if worker.config else 0.58
            match_res = engine.match_face(face_crop, threshold=threshold)

            if match_res:
                user_rec, sim = match_res
                pct = int(sim * 100)
                worker._process_attendance(user_rec, sim)
                results.append({
                    "box": [int(x), int(y), int(w), int(h)],
                    "is_registered": True,
                    "name": user_rec.name,
                    "role": user_rec.role,
                    "identifier": user_rec.identifier,
                    "confidence": round(sim, 2),
                    "label": f"{user_rec.name} ({pct}%)",
                    "sub_label": f"{user_rec.role} - {user_rec.identifier}",
                })
            else:
                results.append({
                    "box": [int(x), int(y), int(w), int(h)],
                    "is_registered": False,
                    "name": "Tamu / Orang Asing",
                    "role": "Tamu",
                    "identifier": "",
                    "confidence": 0.0,
                    "label": "Tamu / Orang Asing",
                    "sub_label": "Wajah Belum Terdaftar",
                })

        return {"faces": results, "width": w_frame, "height": h_frame}
    except Exception as e:
        return {"faces": [], "error": str(e)}

@app.post("/stream/start")
def start_stream():
    worker.start()
    return {"success": True, "message": "Worker Stream Kamera telah dimulai", "status": worker.stream_status, "is_running": True}

@app.post("/stream/stop")
def stop_stream():
    worker.stop()
    return {"success": True, "message": "Worker Stream Kamera telah dihentikan", "status": worker.stream_status, "is_running": False}

@app.post("/stream/restart")
def restart_stream():
    worker.restart()
    return {"success": True, "message": "Worker Stream Kamera telah direstart", "status": worker.stream_status, "is_running": True}

@app.post("/terminate")
def terminate_service():
    """Menghentikan proses Python microservice."""
    worker.stop()
    import threading
    def _delayed_exit():
        time.sleep(0.5)
        os._exit(0)
    threading.Thread(target=_delayed_exit, daemon=True).start()
    return {"success": True, "message": "Proses Microservice FaceNet dimatikan total."}

if __name__ == "__main__":
    print(f"[INFO] Menjalankan Uvicorn server pada 0.0.0.0:{SERVICE_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT, log_level="info")
