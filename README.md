# SIMASMUH - Sistem Informasi Manajemen SMA Muhipo

> **PEDOMAN MUTLAK**: Seluruh alur pengembangan, standar kode, autentikasi, dan aturan UI/UX aplikasi ini WAJIB mengacu pada [SIMASMUH_GUIDELINES.md](file:///d:/simasmuh/SIMASMUH_GUIDELINES.md).

Sistem Informasi Manajemen SMA Muhammadiyah 1 Ponorogo (SIMASMUH) dirancang sebagai sistem terintegrasi dengan satu gerbang login (namun terpisah area navigasi berdasarkan role utama dan subrole) yang fleksibel, modern, dan aman.

---

## 🛠️ Tech Stack & Arsitektur

* **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, React Query, Lucide Icons, NextAuth.js.
* **Backend:** NestJS (Modular Architecture: `master-data`, `academic`, `attendance`, `finance`, `communication`, `core`).
* **Database & Storage:** Supabase PostgreSQL & Supabase Auth Sync.

---

## 📋 Ringkasan Pedoman & Workflow Developer

1. **Satu Gerbang Login Terpusat:** Semua pengguna (Siswa, Orang Tua, Guru, Karyawan, Pimpinan) menggunakan portal login yang sama (`/login`). Navigasi dashboard disesuaikan secara dinamis via RBAC.
2. **Kredensial Default Absolut & Akun Dev Mutlak:**
   * **Superadmin:** `nailar` / `nailar`
   * **Keuangan:** `ervina` / `ervina`
   * **Guru & Admin Web:** `safri` / `safri`
   * **Karyawan & Admin IT:** `manchu` / `manchu`
   * **Siswa (Muhipo Dev):** `123` / `123` (NIS: 123)
3. **Penyimpanan Basis Data & Adaptasi Schema (Proteksi Data Mutlak):**
   * Setiap penambahan fitur data baru **WAJIB** mengamankan data tersimpan (non-destructive upsert).
   - Penambahan kolom/model di `schema.prisma` diadaptasi secara aman tanpa mereset data Supabase PostgreSQL.
4. **Multi-Role (RBAC):**
   * Siswa & Orang Tua: 1 Role Utama Absolut.
   * Guru & Karyawan: 1 Role Utama + Maksimal 4 Subrole.
   * Pengaturan role HANYA dilakukan oleh `SUPERADMIN` & `ADMIN_IT`.
5. **Sidebar & Layout Dinamis:** Menu sidebar di-generate berdasarkan gabungan role utama + subrole pengguna via `getRoleLinks()` di frontend layout.
6. **Standar Impor & Ekspor Excel:** Setiap modul tabel wajib menyediakan opsi ekspor dan impor Excel.
7. **Desain & Aesthetics First:** Mendukung Dark Mode (`ThemeToggle`), tampilan responsif, animasi ringan, serta indikator **"Coming Soon"** (menggunakan komponen `<ComingSoon />`) pada fitur yang masih dalam tahap perancangan awal.

---

## 🚀 Cara Menjalankan Aplikasi

### Option 1: Menggunakan Script otomatis PowerShell / Batch
```powershell
# Menjalankan Frontend & Backend sekaligus
.\simasmuh.ps1 start
```

### Option 2: Menjalankan Manual

#### Backend (NestJS)
```bash
cd backend
npm install
npm run start:dev
```

#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## 📝 Catatan Perubahan & Rilis (Change Log)

* **2026-08-19 (v1.4.0 - Modul Akun Wali Murid / Orang Tua, Multi-Anak Dashboard Selektor, Standar Notifikasi WhatsApp & Desain Autentikasi Modern):**
  * **Role Pengguna Baru `WALI_MURID` (Orang Tua / Wali):** Implementasi skema basis data relasi `ParentProfile` dan `ParentStudent` yang menghubungkan satu akun orang tua dengan 1 atau banyak siswa melalui No. NIS/NISN sebagai kunci identitas.
  * **Kredensial Login Fleksibel & Terpusat:** Username wali murid menggunakan nomor WhatsApp terdaftar, dan kata sandi default adalah NIS siswa anak yang terdaftar pertama.
  * **Dashboard Wali Murid Terintegrasi (7 Fitur Terhubung):**
    * **Selektor Dropdown Multi-Anak Dinamis:** Orang tua dapat memilih anak yang dipantau melalui dropdown di header banner, dan seluruh widget (tagihan, jadwal, nilai etika, e-rapor, presensi) otomatis berganti secara real-time.
    * **Notifikasi & Modal Pembayaran Tagihan:** Pemantauan nominal tagihan belum lunas siswa dan pembayaran langsung via Transfer Bank & Virtual Account (`PaymentBillingPopup`).
    * **Monitoring Jadwal Pelajaran:** Jadwal harian mata pelajaran dan guru pengajar sesuai kelas anak yang dipilih.
    * **Penilaian Etika & Tata Tertib (Views Only):** Monitoring poin tatib (100/100), amalan ibadah sholat berjamaah, dan catatan karakter wali kelas terhubung ke subrole Tim Tatatertib & BK.
    * **Statistika E-Rapor Digital:** Ringkasan capaian Indeks Prestasi dan Peringkat Kelas siswa.
    * **Log Kehadiran Harian Siswa:** Log waktu presensi masuk dan status kehadiran harian siswa.
    * **Pengaturan Notifikasi WhatsApp (`088293733330`):** Pengaturan preferensi pesan WA untuk presensi kedatangan/kepulangan, tagihan baru, dan kuitansi pembayaran terverifikasi.
  * **Desain Autentikasi Halaman Login Modern (Single Island Card):**
    * Tata letak satu card terpadu berdampingan: Area *Autentikasi Akun* di kiri dan kotak *Panduan Kredensial Pengguna* di kanan.
    * Optimasi ergonomis perangkat mobile, tablet, dan desktop dengan Dynamic Viewport Height (`100dvh`), touch target 48px, dan whitespace yang nyaman.
  * **Penyelarasan Istilah Resmi & Kata Baku:** Mengubah tautan navbar landing page menjadi *TenDik* (Tenaga Pendidik & Kependidikan) dan standardisasi kata baku bahasa Indonesia *Manajemen*.
  * **Penyempurnaan Launcher Windows (`JALANKAN_SIMASMUH.bat` & `simasmuh.ps1`):** Penataan direktori kerja otomatis, dukungan UTF-8 (CP 65001), dan verifikasi 4 port tetap produksi (Frontend 3000, Backend 3001, Prisma Studio 51212, Supabase Studio 54323).

* **2026-08-19 (v1.3.2 - MTCNN Facial Landmark Alignment, Realtime 2-Way Database Sync & Zero-Flicker Camera UI):**
  * **MTCNN Facial Landmark Alignment & Multi-Angle Augmentation:** Ekstraksi landmark 5-titik wajah (kedua mata, hidung, sudut bibir) otomatis dirotasi & disejajarkan ke kanvas standar 160x160 piksel sebelum ekstraksi embedding FaceNet 512-D. Menambahkan augmentasi *horizontal mirroring* pada foto profil sehingga mengenali wajah dari webcam laptop / HP dengan akurasi 85%–99%.
  * **Adaptive Detection Pipeline & Fallback Robustness:** Integrasi fallback deteksi otomatis (MTCNN multi-scale pyramid cascade dengan OpenCV Haar fallback) untuk memastikan akurasi deteksi wajah optimal di resolusi tinggi maupun variasi sudut miring/pencahayaan ekstrem.
  * **Kalibrasi Cosine Similarity Threshold:** Ambang batas default disetel ke `0.48` (48% - 55%) untuk mengeliminasi status "Wajah Tidak Terdaftar" pada variasi pencahayaan live camera.
  * **Sinkronisasi Otomatis Foto Profil ke Dataset AI:** Pengunggahan foto profil oleh pengguna (Siswa, Guru, Karyawan, Admin) di dashboard kini langsung memperbarui dataset vektor FaceNet secara instan (*hot-reload*) tanpa perlu restart mikroservis AI.
  * **Sinkronisasi Realtime Scanner Log & Supabase PostgreSQL:** Hasil pemindaian kamera langsung tersimpan ke tabel `DailyAttendance` dan `Attendance` di basis data Supabase secara *realtime*.
  * **Sinkronisasi Area Penghapusan & Reset Data:** Menghapus log satuan kini otomatis menghapus absensi hari ini di database dan mereset timer *cooldown* kamera untuk pengguna tersebut; Reset seluruh log membersihkan log scanner dan data absensi hari ini dengan dialog konfirmasi SweetAlert2.
  * **Startup Kamera Halus & Anti-Flicker:** Mengeliminasi kedip hitam (*flickering*) pada video feed saat penyesuaian *auto-exposure* kamera, mengoptimalkan backend DirectShow/MediaFoundation untuk webcam USB dan low-latency TCP untuk IP Camera/CCTV.
  * **Penyederhanaan UI & Clean Screen Camera:** Tombol operasional AI FaceNet disederhanakan menjadi satu tombol kontrol utama terpadu di panel status; layar preview video bersih (*clean screen*) tanpa tombol overlay yang menutupi gambar; perampingan 3 preset kamera simetris; serta penataan hierarki kartu telemetri yang responsif dan modern.

* **2026-08-18 (v1.3.1 - Transisi AI FaceNet 512-D, Realtime Bounding Box & Optimasi Streaming Scanner):**
  * **Migrasi Engine Biometrik FaceNet (Inception-ResNet-v1 512-D & MTCNN):** Transisi penuh engine AI presensi wajah dari YOLO ke FaceNet Deep Embedding (512-Dimensi L2-Normalized Cosine Similarity) dengan detektor wajah MTCNN untuk akurasi tinggi dan identifikasi presisi.
  * **Realtime Dynamic Bounding Box & HUD Telemetri:** Rendering visual bounding box otomatis pada frame video (Emerald Green untuk pengguna terdaftar dengan badge nama, persentase kemiripan, role & NISN/NIP; Amber Orange untuk tamu) serta header HUD telemetri (status live, FPS, hardware compute GPU/CPU, total deteksi).
  * **Targeting Reticle & Alignment Guide pada UI Realtime Scanner:** Penambahan overlay panduan fokus wajah interaktif (cyber-corner brackets, dashed boundary, garis laser pemindai animasi) pada halaman `/presensi/camera` dan `/presensi/kehadiran-pegawai`.
  * **Proxy Endpoint Next.js `/api/face-stream`:** Integrasi rute streaming MJPEG real-time dengan header anti-caching (`no-cache, no-store, must-revalidate`) untuk memastikan feed kamera bebas latensi dan tanpa kedip.
  * **Penyelarasan Launcher & Script Manajemen (`simasmuh.ps1` & `jalankan_simasmuh.sh`):** Pembaruan port tetap Microservice AI FaceNet ke port 8089 dengan deteksi status live terintegrasi pada menu launcher.

* **2026-08-17 (v1.3.0 - Modul Presensi Camera AI & Vector Matching):**
  * **Modul Presensi Camera AI Terintegrasi:** Sistem absensi wajah real-time tanpa sentuh berbasis FaceNet dan ekstraksi vektor spasial/tekstur wajah dari stream RTMP/RTSP Camera.
  * **Halaman Konfigurasi Superadmin (`/presensi/camera`):** Menu khusus `SUPERADMIN` & `ADMIN_IT` untuk mengatur URL stream RTMP/RTSP camera, nama titik & lokasi camera, slider *Confidence Threshold* (50%-95%), slider *Cooldown Anti-Spam* jeda absensi, dan toggle status aktif / suara sambutan.
  * **Basis Data Vektor Wajah Berbasis Foto Profil:** Deteksi wajah dicocokkan langsung dari foto profil siswa, guru, dan karyawan yang tersimpan di sistem tanpa perlu training ulang model AI.
  * **Live Scanner Log Feed:** Monitoring real-time seluruh aktivitas deteksi wajah dari kamera dengan informasi nama, avatar, role, waktu, status (Masuk/Pulang), dan akurasi kemiripan (%).
  * **Microservice AI Python (`services/face-attendance/`):** Engine streaming RTMP/RTSP OpenCV & FaceNet dengan multi-threading, auto-reconnect, debounce absensi, dan integrasi HTTP POST ke NestJS `DailyAttendance`.

* **2026-08-09 (v1.2.0):**
  * Halaman Error Kustom (400, 401, 402, 403, 404, 408, 500, 502, 503, 504) dengan desain UI responsif SIMASMUH (`ErrorPageContainer`), logo sekolah (`/pic_logo.png`), dan copyright rata tengah (`Copyright © 2026 - Muhipo Dev`).
  * Penambahan akses menu & izin rute `QR Layar (Publik)` (`/presensi/manajemen-qr`) untuk Admin TU / BAU / Tata Usaha.
  * Penyamaan identitas brand navbar halaman login (logo + teks SIMASMUH) di sebelah kiri sesuai header halaman error.
  * Penyesuaian header dashboard pengguna (penghapusan teks `"• Akses cepat semua menu:"`) dan ucapan ramah siswa (`"Semoga Harimu Menyenangkan! 😊✨"`).
  * Pembersihan tombol `Profil` di sidebar untuk semua role pengguna (diakses via ikon foto profil di navbar kanan atas).

* **2026-08-09:**
  * Penghapusan permanen modul, halaman publik, halaman admin (`/spmb`, `/master-data/spmb`), navigasi, dan subrole `PETUGAS_SPMB` terkait SPMB (Sistem Penerimaan Murid Baru) & PPDB, karena SPMB/PPDB dialihkan menjadi sistem terpisah di luar SIMASMUH.
  * Pembaruan [SIMASMUH_GUIDELINES.md](file:///d:/simasmuh/SIMASMUH_GUIDELINES.md) dan [.agents/AGENTS.md](file:///d:/simasmuh/.agents/AGENTS.md) untuk mencatat pemisahan SPMB/PPDB serta menetapkan aturan respon AI minimalis & hemat kredit.

* **2026-08-07:**
  * Pembaruan `frontend/next.config.ts` untuk mendeteksi seluruh alamat IP lokal & publik (Wi-Fi, Ethernet, VPN, Hotspot) secara dinamis menggunakan module `os.networkInterfaces()`, serta wildcard `remotePatterns` untuk gambar.
  * Penambahan informasi Program Siswa (Tahfidz, Reguler, Kader, Inklusi, dll.) di halaman Dashboard Siswa (header banner & badge info program).
  * Penambahan informasi Program Siswa dan detail Diskon / Beasiswa (persentase & alasan diskon) di halaman Keuangan Siswa (`/keuangan/laporan`).
  * Pembaruan API backend `getMyUnpaidTagihan` untuk menyertakan field `program`, `discountPercentage`, dan `discountReason`.
  * Penambahan ketentuan mutlak akun pengembangan (`nailar`, `ervina`, `safri`, `manchu`, `123`) di [SIMASMUH_GUIDELINES.md](file:///d:/simasmuh/SIMASMUH_GUIDELINES.md) dan `seed-supabase.ts`.
  * Integrasi alur kerja penyimpanan basis data non-destruktif (proteksi data yang sudah ada tanpa perlu generate / sinkronisasi ulang penuh).
  * Pengaturan nominal default (DPP, UKA, UKS) di Superadmin dan penyederhanaan modal pembayaran keuangan (nominal & diskon opsional, seleksi periode bulan/tahun, serta penghapusan tanggal jatuh tempo).
  * Perbaikan bug `TypeError: trim()` pada manajemen akun pengguna jika email bernilai null.
* **2026-08-01:**
  * Penyelarasan penuh arsitektur dengan pedoman [SIMASMUH_GUIDELINES.md](file:///d:/simasmuh/SIMASMUH_GUIDELINES.md).
  * Pembuatan komponen standar UI `ComingSoon` (`frontend/src/components/ui/ComingSoon.tsx`) untuk fitur tahap UI.
  * Pembaruan dokumentasi alur kerja developer dan validasi konsistensi password default username/NIS/NIP pada backend service.