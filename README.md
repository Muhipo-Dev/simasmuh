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

* **2026-08-17 (v1.3.0 - Modul Presensi Camera AI & Vector Matching):**
  * **Modul Presensi Camera AI Terintegrasi:** Sistem absensi wajah real-time tanpa sentuh berbasis YOLOv11 dan ekstraksi vektor spasial/tekstur wajah dari stream RTMP/RTSP Camera.
  * **Halaman Konfigurasi Superadmin (`/presensi/camera`):** Menu khusus `SUPERADMIN` & `ADMIN_IT` untuk mengatur URL stream RTMP/RTSP camera, nama titik & lokasi camera, slider *Confidence Threshold* (50%-95%), slider *Cooldown Anti-Spam* jeda absensi, dan toggle status aktif / suara sambutan.
  * **Basis Data Vektor Wajah Berbasis Foto Profil:** Deteksi wajah dicocokkan langsung dari foto profil siswa, guru, dan karyawan yang tersimpan di sistem tanpa perlu training ulang model AI.
  * **Live Scanner Log Feed:** Monitoring real-time seluruh aktivitas deteksi wajah dari kamera dengan informasi nama, avatar, role, waktu, status (Masuk/Pulang), dan akurasi kemiripan (%).
  * **Microservice AI Python (`services/face-attendance/`):** Engine streaming RTMP/RTSP OpenCV & YOLOv11 dengan multi-threading, auto-reconnect, debounce absensi, dan integrasi HTTP POST ke NestJS `DailyAttendance`.

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