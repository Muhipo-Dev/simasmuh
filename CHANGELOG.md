# CHANGELOG - SIMASMUH

Semua catatan perubahan dan pembaruan sistem SIMASMUH didokumentasikan di berkas ini.

---

## [2026-08-21] - v1.5.3: Modul Penilaian Adab, Etika, Ibadah, Tata Tertib & Bimbingan Konseling (BK) Terintegrasi

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Sistem Penilaian Karakter, Adab & Buku Saku Digital Terintegrasi
- **Model Basis Data `CharacterAssessment`**:
  - Pencatatan terstruktur: Kategori (`ADAB_ETIKA`, `IBADAH`, `KEDISIPLINAN`, `PRESTASI_PENGHARGAAN`, `PELANGGARAN`), Tipe (`POSITIF`, `NEGATIF`, `RUTIN`, `CATATAN_KONSELING`), Delta Poin, Evaluator, Tindak Lanjut, dan Status Pembinaan.
  - Terintegrasi penuh dengan akun siswa (`Student`), akun guru penilai (`User`: Wali Kelas, Tim Tatib, Guru BK, Kesiswaan), dan relasi orang tua (`ParentStudent`).
- **Layanan Backend & Endpoint REST API (`CharacterAssessmentsModule`)**:
  - `GET /character-assessments`: Pencarian & filter multi-parameter (kategori, kelas, rentang tanggal).
  - `GET /character-assessments/dashboard-stats`: Statistik agregat harian & mingguan untuk dashboard Tatib & BK.
  - `GET /character-assessments/student/:studentId/summary`: Akumulasi skor kedisiplinan (100 Poin), predikat ibadah sholat, dan riwayat bimbingan individual siswa.
  - `POST /character-assessments`, `PUT /character-assessments/:id`, `DELETE /character-assessments/:id`.

#### 2. Standar Notifikasi Ganda (In-App Notification & WhatsApp Otomatis)
- Setiap pencatatan evaluasi karakter, pelanggaran tata tertib, atau apresiasi prestasi otomatis mengirimkan notifikasi ganda:
  - Notifikasi langsung ke akun siswa dan wali murid di aplikasi (In-App Notification).
  - Pesan resmi otomatis melalui WhatsApp Gateway ke nomor orang tua/wali murid dan siswa dengan format detail nama, NIS, kelas, kategori, poin, dan tindak lanjut pembinaan.

#### 3. Panel Interaktif Pengelolaan Tatib & BK (`InteractiveCharacterAssessmentManagement`)
- Antarmuka manajemen terintegrasi di halaman sub-role **Ketertiban** (`/fitur/ketertiban`) dan **BK/BP** (`/fitur/bk-bp`):
  - Kartu ringkasan total pelanggaran, prestasi teladan, amalan ibadah sholat, dan sesi konseling BK.
  - Filter pencarian cepat, seleksi kelas, dialog input evaluasi dengan preset poin otomatis, serta fitur ekspor laporan ke format Excel (`.xlsx`).

#### 4. Integrasi Dashboard Siswa, Wali Murid & Eksekutif Kepala Sekolah
- **Dashboard Siswa & Wali Murid**: Kartu Buku Saku Adab & Tatib di Dashboard Utama dan Halaman Rinci (`/akademik/etika-tatib`) menampilkan skor kedisiplinan live, predikat ibadah, catatan wali kelas, dan daftar riwayat pembinaan secara realtime.
- **Dashboard Eksekutif Kepala Sekolah**: Penambahan tab filter **Adab & Tata Tertib** serta metrik monitoring pelanggaran, prestasi teladan, ibadah sholat, dan total evaluasi karakter terintegrasi pada overview eksekutif.

---

## [2026-08-21] - v1.5.2: Server Time Synchronization (UTC+7 / Asia/Jakarta) & Supabase Log Decommissioning

### 🚀 Fitur Baru & Peningkatan Utama

#### 1. Algoritma Sinkronisasi Tanggal & Waktu Terpusat (UTC+7 / Asia/Jakarta / Bangkok)
- **NodeJS Global TZ Init**: Inisialisasi zona waktu proses backend ke `Asia/Jakarta` (`process.env.TZ = 'Asia/Jakarta'`) di `main.ts` sebelum bootstrap aplikasi.
- **Backend Timezone Utility (`timezone.util.ts`)**:
  - `getNowUtc7()`, `getTimeStringUtc7()`, `getDateStringUtc7()`, `getStartOfDayUtc7()`, `getEndOfDayUtc7()`.
  - Format terstandarisasi Bahasa Indonesia (`formatDateIndonesia`, `formatDateTimeIndonesia`).
  - Metadata waktu server lengkap (`getServerTimeInfo`) mencakup host server, lokasi instalasi sekolah, offset menit, dan uptime.
- **API Endpoints**:
  - `GET /api-backend/settings/server-time`: Mengembalikan metadata waktu dan konfigurasi server.
  - `GET /api-backend/settings/time-sync`: Endpoint estimasi latensi round-trip (NTP-style clock sync).

#### 2. Kalibrasi Realtime Server Clock di Frontend (Next.js)
- **Modul `frontend/src/lib/time-sync.ts`**:
  - Penghitungan kompensasi time drift browser terhadap waktu server (`t0`, `t1`, `t2`, `t3`).
  - Hook React `useRealtimeServerClock` dengan tick real-time per detik dan sinkronisasi berkala.
  - Format helper `formatDateWib`, `formatTimeWib`, `formatDateTimeWib`.
- **UI & Panel Interaktif**:
  - **Live Clock Panel di Pengaturan Sistem** (`/pengaturan/sistem`): Menampilkan jam digital live WIB, hari/tanggal, zona waktu, lokasi server, latensi jaringan, dan tombol kalibrasi instan.
  - **Navbar Header Live Clock**: Badge Live Server Time UTC+7 (WIB) pada navbar atas dashboard (`layout.tsx`).

#### 3. Decommissioning & Pembersihan Modul Log Sistem Supabase
- Penghapusan modul pencatatan log sistem Supabase (`SystemLogService`, `SupabaseStorageService`, cron arsip, dan interceptor HTTP) untuk optimasi efisiensi sistem dan menyederhanakan arsitektur pemeliharaan.

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

#### 6. Persistensi Penuh Siklus Hidup Microservice di Sisi Server
- **Server-Wide Persistence**: Pengaturan ON/OFF AI Microservice oleh Superadmin kini tersimpan permanen di disk server (`isActive` pada `face-attendance-config.json`).
- **Independen dari Sesi Pengguna**: Ketika Superadmin menyalakan AI Microservice dan melakukan logout / menutup browser, Microservice AI Python tetap terus berjalan aktif di server melayani presensi dan kamera.
- **Siklus Standby Saat Dimatikan**: Jika Superadmin mematikan AI Microservice, sistem menyimpan status non-aktif dan melepaskan resource CPU/RAM ke mode Standby.
- **Autonomous Booting via OnModuleInit**: Backend NestJS secara otomatis memeriksa dan menghidupkan proses Python AI worker saat startup server jika konfigurasi `isActive: true`.

#### 7. Integrasi Publik Real-Time Stream & Log Presensi (`/presensi-view`)
- **Saklar Publikasi di Panel Superadmin**: Penambahan opsi `showPublicStream` dan `showPublicLogs` pada halaman kamera dashboard untuk mengontrol tayangan live stream dan feed log presensi.
- **Tampilan Real-Time Responsif**: Halaman `/presensi-view` otomatis menampilkan feed stream kamera live dan scanner log wajah secara realtime dengan interval polling 2000-2500ms.
- **Layout Adaptif**: Grid menyesuaikan secara otomatis (Split 7:5, Full Width, atau disembunyikan rapi) mengikuti preferensi server yang dikonfigurasi Superadmin.

#### 8. Optimasi Aliran Kamera Ultra Rendah Latensi (*Zero Delay*)
- **Pembersihan Antrean Buffer Kamera**: Menghapus jeda *artificial sleep* pada loop penangkapan frame OpenCV (`cap.read()`) sehingga buffer frame hardware selalu kosong (`buffer_size=1`) dan tidak terjadi penumpukan *delay* akumulatif.
- **Konfigurasi FFMPEG RTSP Low-Latency**: Mengaktifkan flag `fflags;nobuffer|flags;low_delay|max_delay;0|probesize;32768|analyzeduration;0` pada koneksi IP Camera / CCTV RTSP.
- **Fast MJPEG Encoding & Streaming Headers**: Kompresi frame JPEG cepat (Quality: 74) dengan penyisipan header `X-Accel-Buffering: no` dan `Content-Length` untuk mencegah *buffering* pada perantara proxy / Next.js.

#### 9. Indikator Status & Banner Notifikasi AI Nonaktif di `/presensi-view`
- **Banner Peringatan Khusus**: Menampilkan kartu notifikasi adaptif (*Amber Banner*) di halaman publik `/presensi-view` saat AI Microservice FaceNet dimatikan oleh Superadmin.
- **Visual Placeholder & Scanner Status**: Mengubah kanvas kamera dan kartu scanner log secara terpadu dengan ikon `PowerOff` dan status `STANDBY / OFF (Diatur Admin)` agar pengguna memahami bahwa layanan sedang diistirahatkan oleh administrator.

#### 10. Integrasi Notifikasi Ganda WhatsApp Otomatis untuk Presensi Kamera AI
- **WhatsApp Notification Integration**: Setiap kali sistem kamera AI FaceNet berhasil memindai dan mencatat presensi (Masuk atau Pulang), sistem secara otomatis mengirimkan notifikasi resmi WhatsApp ke nomor pengguna dan/atau nomor orang tua/wali siswa secara *real-time*.
- **Informasi Lengkap**: Pesan mencakup status presensi, nama, peran/kelas, jam akurat WIB, tanggal, dan metode presensi (*Face Recognition AI Camera*).
- **Nomor Pengirim Resmi**: Menggunakan nomor resmi sistem `088293733330` dan terintegrasi dengan tabel log `WhatsAppLog`.
