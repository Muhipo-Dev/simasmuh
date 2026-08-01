# SIMASMUH - Sistem Informasi Manajemen SMA Muhipo

> **PEDOMAN MUTLAK**: Seluruh alur pengembangan, standar kode, autentikasi, dan aturan UI/UX aplikasi ini WAJIB mengacu pada [SIMASMUH_GUIDELINES.md](file:///c:/Users/Raza%20Gopo/Downloads/siakad-coba/SIMASMUH_GUIDELINES.md).

Sistem Informasi Manajemen SMA Muhammadiyah 1 Ponorogo (SIMASMUH) dirancang sebagai sistem terintegrasi dengan satu gerbang login (namun terpisah area navigasi berdasarkan role utama dan subrole) yang fleksibel, modern, dan aman.

---

## 🛠️ Tech Stack & Arsitektur

* **Frontend:** Next.js (App Router), TypeScript, TailwindCSS, React Query, Lucide Icons, NextAuth.js.
* **Backend:** NestJS (Modular Architecture: `master-data`, `academic`, `attendance`, `finance`, `communication`, `core`).
* **Database & Storage:** Supabase PostgreSQL & Supabase Auth Sync.

---

## 📋 Ringkasan Pedoman & Workflow Developer

1. **Satu Gerbang Login Terpusat:** Semua pengguna (Siswa, Orang Tua, Guru, Karyawan, Pimpinan) menggunakan portal login yang sama (`/login`). Navigasi dashboard disesuaikan secara dinamis via RBAC.
2. **Kredensial Default Absolut:**
   * **Siswa:** Password default = **NIS**.
   * **Guru & Karyawan:** Password default = **NIP / Username**.
3. **Multi-Role (RBAC):**
   * Siswa & Orang Tua: 1 Role Utama Absolut.
   * Guru & Karyawan: 1 Role Utama + Maksimal 4 Subrole.
   * Pengaturan role HANYA dilakukan oleh `SUPERADMIN` & `ADMIN_IT`.
4. **Sidebar & Layout Dinamis:** Menu sidebar di-generate berdasarkan gabungan role utama + subrole pengguna via `getRoleLinks()` di frontend layout.
5. **Standar Impor & Ekspor Excel:** Setiap modul tabel wajib menyediakan opsi ekspor dan impor Excel.
6. **Desain & Aesthetics First:** Mendukung Dark Mode (`ThemeToggle`), tampilan responsif, animasi ringan, serta indikator **"Coming Soon"** (menggunakan komponen `<ComingSoon />`) pada fitur yang masih dalam tahap perancangan awal.

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

* **2026-08-01:**
  * Penyelarasan penuh arsitektur dengan pedoman [SIMASMUH_GUIDELINES.md](file:///c:/Users/Raza%20Gopo/Downloads/siakad-coba/SIMASMUH_GUIDELINES.md).
  * Pembuatan komponen standar UI `ComingSoon` (`frontend/src/components/ui/ComingSoon.tsx`) untuk fitur tahap UI.
  * Pembaruan dokumentasi alur kerja developer dan validasi konsistensi password default username/NIS/NIP pada backend service.