from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from config import BACKEND_URL, SERVICE_PORT, fetch_backend_config
from face_engine import FaceRecognitionEngine
from worker import AttendanceWorker

engine = FaceRecognitionEngine(backend_url=BACKEND_URL)
worker = AttendanceWorker(engine=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] SIMASMUH Face Attendance Service Starting...")
    engine.sync_database_from_backend()
    cfg = fetch_backend_config()
    if cfg.is_active:
        worker.start()
    yield
    worker.stop()
    print("[INFO] SIMASMUH Face Attendance Service Stopped.")

app = FastAPI(
    title="SIMASMUH Face Attendance Service (YOLOv11)",
    version="1.0.0",
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
        "model": "YOLOv11 + Vector Extractor",
        "status": worker.stream_status,
        "fps": worker.current_fps,
        "users_in_cache": len(engine.user_database),
        "total_scans_today": worker.total_scans_today,
    }

@app.get("/status")
def get_status():
    cfg = fetch_backend_config()
    return {
        "is_running": worker.is_running,
        "stream_status": worker.stream_status,
        "stream_url": cfg.stream_url,
        "camera_name": cfg.camera_name,
        "fps": worker.current_fps,
        "threshold": cfg.threshold,
        "cooldown_minutes": cfg.cooldown_minutes,
        "users_cached": len(engine.user_database),
        "total_scans_today": worker.total_scans_today,
    }

@app.get("/video_feed")
def video_feed():
    """Endpoint HTTP MJPEG streaming real-time live capture YOLOv11."""
    if not worker.is_running:
        worker.start()
    return StreamingResponse(
        worker.generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/sync-profiles")
def sync_profiles():
    total, active_vectors = engine.sync_database_from_backend()
    return {
        "success": True,
        "message": f"Sinkronisasi selesai: {total} total pengguna, {active_vectors} profil berfoto siap dideteksi.",
        "total_users": total,
        "active_vectors": active_vectors,
    }

@app.post("/stream/start")
def start_stream():
    worker.start()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah dimulai", "status": worker.stream_status}

@app.post("/stream/stop")
def stop_stream():
    worker.stop()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah dihentikan", "status": worker.stream_status}

@app.post("/stream/restart")
def restart_stream():
    worker.restart()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah direstart dengan konfigurasi terbaru", "status": worker.stream_status}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
