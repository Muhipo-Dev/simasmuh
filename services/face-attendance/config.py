import os
import requests
from pydantic import BaseModel

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
API_KEY = os.getenv("API_KEY", "siakad_secret_api_key_2026")
API_SECRET = os.getenv("API_SECRET", "simasmuh_face_token_secret_2026")
SERVICE_PORT = int(os.getenv("PORT", "8089"))

class FaceServiceConfig(BaseModel):
    stream_url: str = "BROWSER_WEBCAM"  # "BROWSER_WEBCAM", 0 for default webcam, or "rtsp://..."
    camera_name: str = "Camera AI Presensi"
    location: str = "Gerbang Depan Sekolah"
    # Detection threshold (cosine similarity)
    threshold: float = 0.70
    cooldown_minutes: int = 15
    is_active: bool = True
    welcome_voice: bool = True

def fetch_backend_config() -> FaceServiceConfig:
    try:
        headers = {"x-api-key": API_KEY}
        res = requests.get(f"{BACKEND_URL}/face-attendance/config", headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return FaceServiceConfig(
                stream_url=data.get("streamUrl", "BROWSER_WEBCAM"),
                camera_name=data.get("cameraName", "Camera AI Presensi"),
                location=data.get("location", "Gerbang Depan Sekolah"),
                threshold=float(data.get("threshold", 0.70)),
                cooldown_minutes=int(data.get("cooldownMinutes", 15)),
                is_active=bool(data.get("isActive", True)),
                welcome_voice=bool(data.get("welcomeVoice", True)),
            )
    except Exception as e:
        print(f"[WARN] Failed to fetch config from backend: {e}, using defaults.")
    return FaceServiceConfig()
