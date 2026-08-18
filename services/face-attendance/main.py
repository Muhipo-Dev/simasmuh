import os
import signal
import socket
import sys
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
    print("[INFO] SIMASMUH Face Attendance Service (FaceNet) Starting...")
    import threading
    # Jalankan sync dataset di background thread agar server langsung siap melayani request & status check
    sync_thread = threading.Thread(target=engine.sync_database_from_backend, daemon=True)
    sync_thread.start()
    
    yield
    worker.stop()
    print("[INFO] SIMASMUH Face Attendance Service Stopped.")

app = FastAPI(
    title="SIMASMUH Face Attendance Service (FaceNet)",
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
        "model": "FaceNet Inception-ResNet-v1 (512-D) + MTCNN",
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
        "fps": worker.current_fps,
        "threshold": cfg.threshold if cfg else 0.7,
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
        "message": f"Sinkronisasi FaceNet selesai: {total} total pengguna, {active_vectors} profil berfoto siap dideteksi.",
        "total_users": total,
        "active_vectors": active_vectors,
    }

@app.post("/stream/start")
def start_stream():
    worker.start()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah dimulai", "status": worker.stream_status, "is_running": True}

@app.post("/stream/stop")
def stop_stream():
    worker.stop()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah dihentikan", "status": worker.stream_status, "is_running": False}

@app.post("/stream/restart")
def restart_stream():
    worker.restart()
    return {"success": True, "message": "Worker RTSP/RTMP Stream telah direstart dengan konfigurasi terbaru", "status": worker.stream_status, "is_running": True}

@app.post("/terminate")
def terminate_service():
    """Menghentikan proses Python microservice secara total."""
    worker.stop()
    import threading
    def _delayed_exit():
        import time
        time.sleep(0.5)
        os._exit(0)
    threading.Thread(target=_delayed_exit, daemon=True).start()
    return {"success": True, "message": "Proses Microservice FaceNet dimatikan total."}

if __name__ == "__main__":
    # Cek apakah port sudah aktif
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    is_port_busy = (sock.connect_ex(('127.0.0.1', SERVICE_PORT)) == 0)
    sock.close()

    if is_port_busy:
        print(f"[INFO] Port {SERVICE_PORT} sudah aktif dan digunakan oleh microservice AI.")
        try:
            res = requests.get(f"http://localhost:{SERVICE_PORT}/status", timeout=2)
            if res.status_code == 200:
                print(f"[INFO] Microservice AI Face Attendance aktif merespons di http://localhost:{SERVICE_PORT}")
        except Exception:
            pass
        sys.exit(0)

    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
