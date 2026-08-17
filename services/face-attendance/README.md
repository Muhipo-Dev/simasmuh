# SIMASMUH Face Attendance Service (YOLOv11 + Camera RTMP)

Layanan microservice absensi wajah real-time berbasis AI YOLOv11 untuk SIMASMUH.

## Fitur Utama:
1. **RTMP/RTSP Ingest**: Mendukung streaming video dari IP Camera, OBS, atau webcam lokal.
2. **YOLOv11 Face Detection**: Pelacakan posisi wajah berkecepatan tinggi dengan auto-fallback.
3. **Profile Vector Matching**: Pencocokan wajah otomatis terhadap foto profil pengguna di SIMASMUH tanpa training ulang.
4. **Anti-Spam Cooldown**: Mencegah dobel presensi dalam rentang waktu yang dapat diatur oleh Superadmin.
5. **Auto Record ke Daily Attendance**: Terhubung langsung ke API NestJS SIMASMUH.

## Persyaratan:
- Python 3.10+
- `pip install -r requirements.txt`

## Cara Menjalankan:
```bash
python main.py
```
Service akan berjalan pada `http://localhost:8005`.
