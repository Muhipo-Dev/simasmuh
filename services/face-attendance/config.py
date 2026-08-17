import os
import requests
from pydantic import BaseModel

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
API_KEY = os.getenv("API_KEY", "siakad_secret_api_key_2026")
API_SECRET = os.getenv("API_SECRET", "simasmuh_face_token_secret_2026")
SERVICE_PORT = int(os.getenv("PORT", "8005"))

class FaceServiceConfig(BaseModel):
    stream_url: str = "0"  # 0 for default webcam, or "rtmp://..." / "rtsp://..."
    camera_name: str = "Camera Gerbang Utama"
    location: str = "Gerbang Depan Sekolah"
    threshold: float = 0.70
    cooldown_minutes: int = 10
    is_active: bool = True
    welcome_voice: bool = True

def fetch_backend_config() -> FaceServiceConfig:
    try:
        headers = {"x-api-key": API_KEY}
        res = requests.get(f"{BACKEND_URL}/face-attendance/config", headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            return FaceServiceConfig(
                stream_url=data.get("streamUrl", "0"),
                camera_name=data.get("cameraName", "Camera Gerbang Utama"),
                location=data.get("location", "Gerbang Depan"),
                threshold=float(data.get("threshold", 0.70)),
                cooldown_minutes=int(data.get("cooldownMinutes", 10)),
                is_active=bool(data.get("isActive", True)),
                welcome_voice=bool(data.get("welcomeVoice", True)),
            )
    except Exception as e:
        print(f"[WARN] Failed to fetch config from backend: {e}, using local defaults.")
    return FaceServiceConfig()
