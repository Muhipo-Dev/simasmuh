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

from typing import Optional
from config import BACKEND_URL, SERVICE_PORT, fetch_backend_config
from face_engine import FaceRecognitionEngine
from worker import AttendanceWorker

engine = FaceRecognitionEngine(backend_url=BACKEND_URL)
worker = AttendanceWorker(engine=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] SIMASMUH Face Attendance Service (Bio-Fusion AI Engine) Starting...")
    import threading
    sync_thread = threading.Thread(target=engine.sync_database_from_backend, daemon=True)
    sync_thread.start()
    
    # Periksa konfigurasi server backend, jika is_active == True jalankan streaming capture worker
    try:
        cfg = fetch_backend_config()
        if cfg and cfg.is_active:
            print("[INFO] Konfigurasi server isActive=True: Menjalankan worker AI Stream di latar belakang...")
            worker.start()
        else:
            print("[INFO] Konfigurasi server isActive=False: Worker AI Standby.")
    except Exception as e:
        print(f"[WARN] Inisialisasi awal stream worker: {e}")

    yield
    worker.stop()
    print("[INFO] SIMASMUH Face Attendance Service Stopped.")

app = FastAPI(
    title="SIMASMUH Face Attendance Service (Bio-Fusion AI)",
    version="1.2.0",
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
        "model": "SIMASMUH Bio-Fusion AI (Dual-Stream Inception-ResNet-v1 + MTCNN 5-Point Alignment + Periocular Disambiguation)",
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
        "stream_url": cfg.stream_url if cfg else "BROWSER_WEBCAM",
        "camera_name": cfg.camera_name if cfg else "Camera AI Presensi",
        "device": engine.device_name,
        "fps": worker.current_fps,
        "threshold": cfg.threshold if cfg else 0.70,
        "cooldown_minutes": cfg.cooldown_minutes if cfg else 15,
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
@app.get("/sync-profiles")
@app.post("/sync")
@app.get("/sync")
def sync_profiles():
    total, active_vectors = engine.sync_database_from_backend(force_refresh=True)
    return {
        "success": True,
        "message": f"Sinkronisasi FaceNet selesai: {total} total pengguna, {active_vectors} profil berfoto aktif siap dideteksi.",
        "total_users": total,
        "active_vectors": active_vectors,
    }

class SyncUserRequest(BaseModel):
    userId: str
    name: str = ""
    role: str = "SISWA"
    identifier: str = ""
    avatarUrl: Optional[str] = None
    localPath: Optional[str] = None

@app.post("/sync-user")
def sync_user(payload: SyncUserRequest):
    """Menyinkronkan satu profil pengguna secara langsung ke FaceNet setelah upload foto."""
    success, msg = engine.sync_single_user(payload.dict())
    return {
        "success": success,
        "message": msg,
        "total_users": len(engine.user_database),
        "active_vectors": sum(1 for rec in engine.user_database.values() if rec.embedding is not None),
    }

class ResetCooldownRequest(BaseModel):
    userId: Optional[str] = None
    all: bool = False

@app.post("/reset-cooldown")
def reset_cooldown_endpoint(payload: ResetCooldownRequest = ResetCooldownRequest()):
    """Mereset interval cooldown deteksi kamera pada AI worker."""
    worker.reset_cooldown(user_id=payload.userId, all_users=payload.all)
    return {
        "success": True,
        "message": "Cooldown timer presensi kamera berhasil direset.",
    }

class ScanFrameRequest(BaseModel):
    image: str  # base64 data url or raw base64
    recordAttendance: bool = True

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

        req_threshold = worker.config.threshold if (worker.config and worker.config.threshold is not None) else 0.70

        # Ambang batas mutlak pencatatan presensi: 91% (0.91)
        # Bounding box & pengenalan wajah valid (>= 91%) dapat langsung merekam presensi
        ATTENDANCE_MIN_CONFIDENCE = 0.91

        for (x, y, w, h) in faces:
            if w < 12 or h < 12:
                continue
            
            pad_y = int(h * 0.12)
            pad_x = int(w * 0.12)
            y1 = max(0, y - pad_y)
            y2 = min(h_frame, y + h + pad_y)
            x1 = max(0, x - pad_x)
            x2 = min(w_frame, x + w + pad_x)
            face_crop = frame[y1:y2, x1:x2]

            match_res = engine.match_face(face_crop, threshold=req_threshold)

            if match_res:
                user_rec = match_res["record"]
                sim = match_res["confidence"]
                is_twin = match_res.get("is_twin_ambiguous", False)
                twin_candidates = match_res.get("twin_candidates")
                pct = int(sim * 100)
                att_res = None

                # Rekam presensi HANYA jika:
                # 1. payload.recordAttendance == True (tombol SENTUH ditekan)
                # 2. Bukan kasus kembar ambigu
                # 3. Confidence terkalibrasi >= 91% (ATTENDANCE_MIN_CONFIDENCE)
                if payload.recordAttendance and not is_twin and sim >= ATTENDANCE_MIN_CONFIDENCE:
                    att_res = worker._process_attendance(user_rec, sim, face_crop=face_crop, force=True)

                # Flag apakah confidence memenuhi syarat pencatatan presensi
                meets_attendance_threshold = sim >= ATTENDANCE_MIN_CONFIDENCE

                results.append({
                    "box": [int(x), int(y), int(w), int(h)],
                    "is_registered": True,
                    "userId": user_rec.user_id,
                    "name": user_rec.name,
                    "role": user_rec.role,
                    "identifier": user_rec.identifier,
                    "avatarUrl": user_rec.avatar_url,
                    "confidence": round(sim, 2),
                    "label": f"{user_rec.name} ({pct}%)" if not is_twin else f"{user_rec.name} (Kembar/Mirip)",
                    "sub_label": f"{user_rec.role} - {user_rec.identifier}",
                    "attendance": att_res,
                    "is_twin_ambiguous": is_twin,
                    "twin_candidates": twin_candidates,
                    "meets_attendance_threshold": meets_attendance_threshold,
                })
            else:
                results.append({
                    "box": [int(x), int(y), int(w), int(h)],
                    "is_registered": False,
                    "userId": None,
                    "name": "Tamu / Orang Asing",
                    "role": "Tamu",
                    "identifier": "",
                    "confidence": 0.0,
                    "label": "Tamu / Orang Asing",
                    "sub_label": "Wajah Belum Terdaftar",
                    "attendance": None,
                    "is_twin_ambiguous": False,
                    "twin_candidates": None,
                    "meets_attendance_threshold": False,
                })

        return {"faces": results, "width": w_frame, "height": h_frame}
    except Exception as e:
        return {"faces": [], "error": str(e)}

class ConfirmAttendanceRequest(BaseModel):
    userId: str
    confidence: float = 0.95

@app.post("/confirm_attendance")
def confirm_attendance(payload: ConfirmAttendanceRequest):
    """Endpoint untuk konfirmasi presensi manual instan jika terjadi disambiguasi siswa kembar / wajah mirip."""
    user_rec = engine.user_database.get(payload.userId)
    if not user_rec:
        raise HTTPException(status_code=404, detail="Profil pengguna tidak ditemukan")
    att_res = worker._process_attendance(user_rec, payload.confidence, force=True)
    return {
        "success": True,
        "message": f"Presensi {user_rec.name} berhasil diverifikasi!",
        "attendance": att_res,
        "user": {
            "userId": user_rec.user_id,
            "name": user_rec.name,
            "role": user_rec.role,
            "identifier": user_rec.identifier,
            "avatarUrl": user_rec.avatar_url,
        }
    }

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
