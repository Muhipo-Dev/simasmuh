# SIMASMUH - Sistem Informasi Manajemen SMA Muhipo

Sistem Informasi Manajemen SMA Muhammadiyah 1 Ponorogo (SIMASMUH) adalah platform tata kelola dan ekosistem digital sekolah terintegrasi satu pintu (*Single Sign-On Authentication*) yang dirancang untuk mendukung operasional akademik, kesiswaan, kepegawaian, keuangan, presensi biometrik cerdas, serta komunikasi terpadu antara sekolah, tenaga pendidik/kependidikan, siswa, dan orang tua / wali murid secara aman, modern, dan real-time.

---

## 🛠️ Tech Stack & Arsitektur

* **Frontend Web Application:**
  * **Framework:** Next.js (App Router, Turbopack, React 19) & TypeScript.
  * **Styling & UI:** TailwindCSS, Radix UI Primitives, Lucide Icons, Framer Motion animations.
  * **State & Data Fetching:** TanStack React Query & NextAuth.js.
  * **Visual & Theme:** Dark/Light adaptive theme system (`next-themes`), Glassmorphism UI tokens, dan Mobile-First Responsive Ergonomics.

* **Backend API & Core Services:**
  * **Framework:** NestJS (Modular Architecture & RESTful API Engine).
  * **Modules:** `master-data` (Pengguna, Siswa, Guru, Wali Murid, Kelas, Mapel), `academic` (Jadwal, E-Rapor, Penilaian, Jurnal Mengajar/Wali Kelas, Etika/Tatib), `attendance` (Presensi Harian, Pegawai, Siswa, Scan QR, Face Recognition), `finance` (Tagihan, Pembayaran, Penggajian, LPJ, Laporan), `communication` (Pengumuman, Banner, WhatsApp Gateway Engine), `core` (Auth RBAC, System Logging & Compression).
  * **ORM & Data Modeling:** Prisma ORM.

* **Database & Cloud Storage:**
  * **Primary Database:** Supabase PostgreSQL & Prisma Studio ERD Inspector.
  * **Object Storage:** Supabase Storage (Bukti Pembayaran, Foto Profil, Dokumen LPJ, Arsip Log Terkompresi Gzip).

* **Microservices & AI Biometrics:**
  * **AI Face Attendance Service:** OpenCV & FaceNet Deep Embedding 512-D (Inception-ResNet-v1 & MTCNN Facial Landmark Alignment) Python Microservice.
  * **WhatsApp Gateway Service:** Node.js & Baileys Multi-Device WhatsApp Socket Engine untuk notifikasi presensi, keuangan, dan pengumuman instan.

---

## 📝 Catatan Perubahan & Rilis (Change Log)

* **2026-08-20 (v1.5.1 - Redesain Tata Letak Login Glassmorphic Sejajar, Pemisahan Konfigurasi Helpdesk & Nomor Notifikasi WhatsApp):**
  * **Redesain & Penyelarasan Layout Halaman Login (`/login`):**
    * Penyelarasan tata letak desktop 2 kolom yang sejajar proporsional (`items-stretch` & height balance) antara form login dan panel petunjuk kredensial.
    * Pembaruan hierarki visual dengan form login di sebelah kiri dan panduan petunjuk kredensial peran (Siswa, Wali Murid, Guru/Staff) di sebelah kanan.
    * Penerapan styling *glassmorphism* transparan terpadu pada card login, input field placeholder, dan tombol submit beraksen glow modern.
  * **Pemisahan Pengaturan Nomor Helpdesk vs Gateway Notifikasi:**
    * Penambahan kolom `helpdeskPhone` pada skema Prisma `Setting` untuk mengelola nomor kontak bantuan/helpdesk login secara terpusat oleh Superadmin di menu **Pengaturan Sekolah / Sistem** (`/pengaturan/sistem`).
    * Gateway pengiriman pesan notifikasi otomatis tetap terisolasi dan dikelola terpisah di menu **Pengaturan Notifikasi** (`/pengaturan/notifikasi`) (`whatsappSenderNumber`).
    * Tampilan nomor dan tautan langsung WhatsApp Helpdesk (`wa.me`) di halaman login terhubung secara dinamis dengan database konfigurasi sistem.
  * **Penyempurnaan Mobile Ergonomics:**
    * Accordion interaktif "Petunjuk Kredensial Pengguna" yang responsif dan ringkas pada perangkat layar kecil/smartphone lengkap dengan informasi helpdesk resmi.

* **2026-08-20 (v1.5.0 - Waiting Room Virtual Queue, Manajemen Sesi & Perangkat Aktif, Serta Penguatan Keamanan & Layout Terpadu):**
  * **Sistem Virtual Queue / Waiting Room Otomatis (`WaitingRoomModule` & `WaitingRoomProvider`):**
    * Implementasi mekanisme antrean virtual cerdas saat sistem mengalami lonjakan traffic tinggi (Ujian, PPDB, atau pengumuman serentak).
    * Backend NestJS middleware (`WaitingRoomMiddleware`) dengan manajemen antrean berbasis token JWT, estimasi waktu tunggu real-time, dan auto-admission ketika kapasitas tersedia.
    * Tampilan antrean frontend (`WaitingRoomProvider`) yang elegan dengan visual progres interaktif, estimasi waktu tunggu, dan auto-redirect begitu giliran tiba.
  * **Manajemen Sesi & Perangkat Aktif (Device Session Tracking & Unlink):**
    * Fitur pelacakan perangkat dan riwayat login pengguna lengkap dengan deteksi tipe perangkat (Mobile/Desktop/Tablet), OS/Browser, IP Address, lokasi perkiraan, serta stempel waktu login terakhir.
    * Kemampuan putus sesi jarak jauh (*Unlink / Logout Other Devices*) dari halaman Pengaturan Profil (`/pengaturan/profil`) untuk keamanan akun.
    * Penambahan model database `UserSession` di Prisma ORM untuk mengelola token aktif dan validasi sesi server-side.
  * **Penyempurnaan Autentikasi NextAuth & Session Caching:**
    * Perbaikan dan standardisasi handler NextAuth.js App Router (`route.ts`) untuk kompatibilitas penuh.
    * Persistensi cache sesi pengguna di sisi frontend guna memastikan respon navigasi instan dan transisi halaman bebas kedip.
  * **Unifikasi Komponen Layout Global & Redesain Halaman Login:**
    * Refaktorisasi komponen layout inti (`AppNavbar`, `AppFooter`, `AppSidebar`) menjadi modul reusable terpadu di folder `@/components/layout`.
    * Redesain UI halaman login dengan tata letak modern berorientasi kontras tinggi, navigasi cepat, dan estetika premium yang responsif.
  * **Penyelarasan Unit Test & Stabilitas Modul:**
    * Perbaikan dan penyesuaian seluruh pengujian unit test pada modul `attendance/staff-journals` dan `core/waiting-room`.

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
  * Pembaruan panduan sistem untuk mencatat pemisahan SPMB/PPDB serta menetapkan aturan respon AI minimalis & hemat kredit.

* **2026-08-07:**
  * Pembaruan `frontend/next.config.ts` untuk mendeteksi seluruh alamat IP lokal & publik (Wi-Fi, Ethernet, VPN, Hotspot) secara dinamis menggunakan module `os.networkInterfaces()`, serta wildcard `remotePatterns` untuk gambar.
  * Penambahan informasi Program Siswa (Tahfidz, Reguler, Kader, Inklusi, dll.) di halaman Dashboard Siswa (header banner & badge info program).
  * Penambahan informasi Program Siswa dan detail Diskon / Beasiswa (persentase & alasan diskon) di halaman Keuangan Siswa (`/keuangan/laporan`).
  * Pembaruan API backend `getMyUnpaidTagihan` untuk menyertakan field `program`, `discountPercentage`, dan `discountReason`.
  * Integrasi alur kerja penyimpanan basis data non-destruktif (proteksi data yang sudah ada tanpa perlu generate / sinkronisasi ulang penuh).
  * Pengaturan nominal default (DPP, UKA, UKS) di Superadmin dan penyederhanaan modal pembayaran keuangan (nominal & diskon opsional, seleksi periode bulan/tahun, serta penghapusan tanggal jatuh tempo).
  * Perbaikan bug `TypeError: trim()` pada manajemen akun pengguna jika email bernilai null.

* **2026-08-01:**
  * Penyelarasan penuh arsitektur dan modularisasi sistem.
  * Pembuatan komponen standar UI `ComingSoon` (`frontend/src/components/ui/ComingSoon.tsx`) untuk fitur tahap UI.
  * Pembaruan dokumentasi alur kerja developer dan validasi konsistensi password default username/NIS/NIP pada backend service.