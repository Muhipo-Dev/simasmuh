import os
import requests
from pydantic import BaseModel

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
API_KEY = os.getenv("API_KEY", "siakad_secret_api_key_2026")
API_SECRET = os.getenv("API_SECRET", "simasmuh_face_token_secret_2026")
SERVICE_PORT = int(os.getenv("PORT", "8089"))

from typing import List, Dict, Optional

class SingleCamConfig(BaseModel):
    id: str = "cam-1"
    name: str = "Kamera 1"
    stream_source_type: str = "RTSP"
    stream_url: str = "BROWSER_WEBCAM"
    location: str = "Gerbang Depan"
    is_active: bool = True

class FaceServiceConfig(BaseModel):
    stream_url: str = "BROWSER_WEBCAM"  # "BROWSER_WEBCAM", 0 for default webcam, or "rtsp://..."
    camera_name: str = "Camera AI Presensi"
    location: str = "Gerbang Depan Sekolah"
    cameras: List[SingleCamConfig] = []
    # Detection threshold (cosine similarity)
    threshold: float = 0.70
    cooldown_minutes: int = 15
    is_active: bool = True
    welcome_voice: bool = True
    auto_attendance: bool = True
    continuous_scan_no_delay: bool = True
    show_public_stream: bool = True
    show_public_logs: bool = True

def fetch_backend_config() -> FaceServiceConfig:
    try:
        headers = {"x-api-key": API_KEY}
        res = requests.get(f"{BACKEND_URL}/face-attendance/config", headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            raw_cams = data.get("cameras", [])
            cams_list = []
            if isinstance(raw_cams, list):
                for c in raw_cams:
                    cams_list.append(SingleCamConfig(
                        id=str(c.get("id", "cam-1")),
                        name=str(c.get("name", "Kamera")),
                        stream_source_type=str(c.get("streamSourceType", "RTSP")),
                        stream_url=str(c.get("streamUrl", "0")),
                        location=str(c.get("location", "Area")),
                        is_active=bool(c.get("isActive", True))
                    ))

            return FaceServiceConfig(
                stream_url=data.get("streamUrl", "BROWSER_WEBCAM"),
                camera_name=data.get("cameraName", "Camera AI Presensi"),
                location=data.get("location", "Gerbang Depan Sekolah"),
                cameras=cams_list,
                threshold=float(data.get("threshold", 0.70)),
                cooldown_minutes=int(data.get("cooldownMinutes", 15)),
                is_active=bool(data.get("isActive", True)),
                welcome_voice=bool(data.get("welcomeVoice", True)),
                auto_attendance=bool(data.get("autoAttendance", True)),
                continuous_scan_no_delay=bool(data.get("continuousScanNoDelay", True)),
                show_public_stream=bool(data.get("showPublicStream", True)),
                show_public_logs=bool(data.get("showPublicLogs", True)),
            )
    except Exception as e:
        print(f"[WARN] Failed to fetch config from backend: {e}, using defaults.")
    return FaceServiceConfig()
