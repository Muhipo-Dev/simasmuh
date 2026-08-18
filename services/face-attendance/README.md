# SIMASMUH Face Attendance Service (FaceNet Deep Learning)

Layanan microservice absensi wajah real-time berbasis AI FaceNet (Inception-ResNet-v1 + MTCNN) untuk SIMASMUH.

## Fitur Utama:
1. **FaceNet Deep Embeddings (512-D)**: Ekstraksi fitur biometrik wajah presisi tinggi berbasis arsitektur Inception-ResNet-v1 (pretrained VGGFace2).
2. **MTCNN & Multi-Scale Face Detection**: Deteksi dan pelacakan posisi wajah berkecepatan tinggi dengan auto-fallback Haar Cascade.
3. **RTMP/RTSP/Webcam Ingest**: Mendukung streaming video dari IP Camera, OBS, HTTP streaming, atau webcam USB/laptop lokal.
4. **Vector Metric Matching**: Pencocokan kemiripan kosinus (Cosine Similarity) terhadap foto profil pengguna di SIMASMUH tanpa training ulang.
5. **Anti-Spam Cooldown**: Mencegah dobel presensi dalam rentang waktu yang dapat diatur via dashboard.
6. **Auto Record ke Daily Attendance**: Terhubung langsung ke backend API NestJS SIMASMUH.

## Persyaratan:
- Python 3.10+
- `pip install -r requirements.txt`

## Cara Menjalankan:
```bash
python main.py
```
Service akan berjalan pada `http://localhost:8089`.
