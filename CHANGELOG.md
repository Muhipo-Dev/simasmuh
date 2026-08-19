# CHANGELOG - SIMASMUH

Semua catatan perubahan dan pembaruan sistem SIMASMUH didokumentasikan di berkas ini.

---

## [2026-08-19] - FaceNet Biometric AI, Realtime Database Sync & Camera Engine Optimization

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Ekstraktor Biometrik FaceNet & MTCNN Landmark Alignment
- **MTCNN Landmark Alignment**: Mengintegrasikan ekstraksi landmark wajah (mata, hidung, mulut) otomatis ke kanvas terstandarisasi 160x160 piksel untuk menghasilkan vektor 512-D berakurasi tinggi.
- **Horizontal Mirroring Augmentation**: Augmentasi refleksi horizontal pada foto profil saat registrasi agar kamera mirror/webcam HP langsung cocok 100%.
- **Kalibrasi Cosine Similarity**: Standar ambang batas (*threshold*) dikalibrasi ke presisi optimal `0.48` (48% - 55%) untuk mengeliminasi *false negative* ("Wajah Tidak Terdaftar").

#### 2. Sinkronisasi Otomatis Foto Profil ke Dataset FaceNet
- **Instant Vector Sync**: Saat pengguna (Siswa, Guru, Karyawan, Admin) mengunggah foto profil di dashboard, sistem langsung menyinkronkan foto dari penyimpanan lokal/Supabase ke basis data vektor FaceNet secara instan tanpa perlu restart mikroservis.
- Endpoint baru `POST /face-attendance/sync-user` dan `POST /face-attendance/sync-dataset`.

#### 3. Sinkronisasi Realtime Scanner Log & Supabase PostgreSQL
- **Two-Way Database Sync**: Hasil deteksi wajah otomatis tercatat ke tabel `DailyAttendance` (dan data absensi siswa) di Supabase secara *realtime*.
- **Area Penghapusan & Reset Data**:
  - Penghapusan log satuan kini langsung menghapus catatan presensi hari ini di database dan mereset timer *cooldown* kamera untuk user tersebut.
  - Reset seluruh log mengosongkan antrean log dan menghapus catatan presensi hari ini di database secara sinkron dengan konfirmasi SweetAlert2.
- Endpoint `DELETE /face-attendance/logs/:id` dan `POST /face-attendance/logs/clear` dengan dukungan parameter `resetDb`.
- Endpoint `POST /reset-cooldown` pada mikroservis FaceNet AI.

#### 4. Perbaikan Startup Kamera & Anti-Flickering
- **Zero-Flicker Stream**: Menghapus transisi kartu placeholder instan pada frame drop sesaat saat kamera menyesuaikan *auto-exposure*.
- **Multi-Backend Low-Latency Capture**:
  - Webcam USB: DirectShow (`CAP_DSHOW`) & Media Foundation (`CAP_MSMF`) dengan buffer size 1.
  - CCTV / IP Camera: Parameter FFmpeg TCP low-latency (`rtsp_transport;tcp|buffer_size;1048576|stimeout;3000000`).
- **Proxy Stream Next.js**: Menambahkan rewrite proxy `/api/face-stream` ke microservice AI port 8089.
- **Debounced Error Handling**: Loading spinner halus saat inisialisasi dan pencegahan unmount komponen kamera.

#### 5. Pembaruan Antarmuka (UI/UX)
- **Kontrol Tunggal**: Tombol "Nyalakan / Matikan AI" disederhanakan menjadi satu tombol utama di atas informasi CPU pada header.
- **Clean Preview Screen**: Menghapus tombol-tombol overlay yang menutupi layar pemutar video kamera.
- **Penyederhanaan Preset Kamera**: Menghapus pilihan RTMP dan file video lokal, memusatkan konfigurasi pada 3 standar utama: Webcam Browser, IP Camera RTSP (CCTV), dan Webcam USB Server.
