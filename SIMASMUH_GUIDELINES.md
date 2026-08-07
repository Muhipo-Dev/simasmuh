# PEDOMAN DAN ATURAN MUTLAK PENGEMBANGAN SIMASMUH

Dokumen ini berisi aturan mutlak, ruang lingkup, dan pedoman utama dalam pengembangan aplikasi **SIMASMUH** (Sistem Informasi Manajemen SMA Muhipo). Dokumen ini harus selalu menjadi acuan bagi developer dan AI dalam setiap tahap pengembangan aplikasi di masa depan agar aplikasi tetap terstruktur, rapi, aman, dan dapat diskalakan.

---

## 1. Identitas & Tujuan Aplikasi
* **Nama Aplikasi:** SIMASMUH (Sistem Informasi Manajemen SMA Muhipo).
* **Institusi:** SMA Muhammadiyah 1 Ponorogo.
* **Target Pengguna:** Guru, Karyawan, Siswa, Orang Tua Wali, Pimpinan Sekolah beserta jajarannya.
* **Tujuan Utama:** Memecahkan masalah manajemen data (UI/UX yang sebelumnya kurang menarik, sistem kurang aman, fitur terpisah-pisah) menjadi satu kesatuan sistem terintegrasi dengan satu gerbang login (namun terpisah area untuk siswa/ortu dan guru/karyawan) yang mudah digunakan pengguna dan mudah dipelihara developer.

## 2. Arsitektur, Infrastruktur & Database
* **SaaS & Supabase:** Aplikasi berbasis SaaS. Semua basis data (termasuk penyimpanan data dan manajemen pengguna/login) menggunakan **Supabase**.
* **Konsistensi Autentikasi (Mutlak):** Sistem autentikasi antara Backend, Frontend, dan Supabase harus **selalu sama, sinkron, dan konsisten**. Dilarang mengubah alur atau arsitektur autentikasi secara plin-plan kecuali ada keadaan sangat mendesak (urgent) dan WAJIB atas persetujuan developer.
* **Koneksi & Sinkronisasi:** Sinkronisasi antara Frontend, Backend, dan Supabase adalah prioritas utama. Validasi data dan tipe data harus diperhatikan agar tidak terjadi error pada database atau kontroler saat ada penambahan fitur.
* **Struktur File & Folder:** File dan folder aplikasi harus terus dirapikan dan ditata ulang secara berkala jika ada penambahan fitur besar. Jika ada pemindahan folder, pastikan route dan dependensi di dalam file fitur diperbarui secara otomatis.
* **Controller yang Kokoh:** Arsitektur controller dan pengarahan sistem (routing) harus dirancang dengan sangat matang untuk mengantisipasi penambahan fitur yang rumit, terutama fitur logika perhitungan keuangan/penggajian.

## 3. Ruang Lingkup Fitur
### Manajemen Data Inti
Data yang wajib dimanajemen meliputi, namun tidak terbatas pada:
* Data Siswa, Guru & Karyawan, Pegawai.
* Data Keuangan (Penggajian, Pembayaran Siswa).
* Data Akademik: Mata Pelajaran, Jadwal Pelajaran, Penilaian/Raport.
* Data Operasional: Ketertiban, Bimbingan Konseling (BK), Keamanan, Piket, Ekstrakurikuler, Inventaris (Sarpras).
* Data Publikasi: Berita dan Informasi.

### In Scope (MVP - Minimum Viable Product)
* Setiap pengguna memiliki **Dashboard** khusus yang tombol dan fiturnya menyesuaikan role masing-masing.
* **Dashboard Analitik/Statistika:** Hanya dapat diakses oleh Admin IT, Superadmin, Kepala Sekolah, dan Keuangan (khusus analitik keuangan).
* Data analitik/statistika di frontend **wajib akurat** dan sesuai dengan fakta input di backend.

### Out of Scope (Pengembangan Lanjutan Spesifik)
* Sistem pembayaran dan pencatatan riwayat keuangan antara Siswa dan Keuangan yang jelas.
* Sistem Penilaian Terintegrasi: Jurnal Mengajar Guru -> Penilaian Harian -> Otomasi Raport Digital.
* Integrasi jadwal pelajaran kompleks yang dapat diimpor dari file **aSc Timetables**.

### Fitur Standar di Semua Modul
* Setiap tabel data di dalam aplikasi wajib memiliki fitur **Ekspor dan Impor Excel** untuk memudahkan pengelolaan oleh pengguna.

## 4. Manajemen Akun & Hak Akses (Role-Based Access Control)
* **Otoritas Akun:** Semua pengguna dan role HANYA dapat diubah oleh **Superadmin** dan **Admin IT**.
* **Satu Halaman Login:** SEMUA pengguna (termasuk Siswa, Orang Tua, Guru, dan Karyawan) mutlak menggunakan SATU halaman login yang sama. Perbedaan hak akses dan fitur hanya akan terlihat di halaman Dashboard sesuai dengan role masing-masing setelah berhasil login.
* **Kredensial Default (Username & Password):** Secara *default*, password awal setiap pengguna adalah sama dengan *username*-nya.
  * **Siswa:** *Username* menggunakan Nomor Induk Siswa (NIS).
  * **Guru & Karyawan:** *Username* menggunakan Nomor Induk Pegawai (NIP) secara *default*, namun mereka diberikan kebebasan untuk menggunakan *username custom* atau nama pribadi mereka melalui fitur manajemen akun.
* **Role Siswa & Orang Tua:** Hanya memiliki 1 role absolut (Siswa atau Orang Tua). Tidak bisa digabung atau ditambahkan subrole. Fitur di dashboard sangat spesifik untuk mereka.
* **Role Guru & Karyawan:** 
  * Wajib memiliki **1 Role Utama**.
  * Dapat memiliki hingga maksimal **4 Subrole Tambahan**.
  * *Daftar Role:* Superadmin, Admin IT, Admin Web, Pegawai, Guru, BK/BP, Wali Kelas, Kurikulum, Kesiswaan, Sarana Prasarana, Bendahara/Keuangan, Kebersihan, SDM Kepegawaian, Pembina Ekstrakulikuler, Pustakawan, Keamanan, Guru Tahfidz (dan lain-lain menyusul).
* **Sidebar Dinamis:** Menu sidebar untuk tiap akun di-generate secara otomatis berdasarkan gabungan dari Role Utama dan Subrole yang dimiliki. (Contoh: Role Superadmin memiliki CRUD Master, jika ditambah subrole Guru, maka mendapat menu tambahan Jurnal Mengajar dan Penilaian).

## 5. Akun Login Pengembangan Mutlak (Mandatory Dev Credentials)
Untuk kebutuhan pengujian dan pengembangan aplikasi secara konsisten, akun-akun berikut **MUTLAK SELALU ADA dan TERPELIHARA** dalam sistem dan script *seeding* database:
1. **Superadmin**: Username `nailar`, Password `nailar` (Role: `SUPERADMIN`).
2. **Keuangan**: Username `ervina`, Password `ervina` (Role: `GURU`, SubRole: `KEUANGAN`).
3. **Guru & Admin Web**: Username `safri`, Password `safri` (Role: `ADMIN_WEB`).
4. **Karyawan & Admin IT**: Username `manchu`, Password `manchu` (Role: `ADMIN_IT`).
5. **Siswa**: Username `123`, Password `123`, NIS `123` (Role: `SISWA`, Nama: `Muhipo Dev`).

> **Aturan Mutlak Dev Accounts**: Kelima akun ini tidak boleh terhapus atau tertimpa data asal-asalan saat ada perubahan schema atau *re-seed*.

---

## 6. Cara Kerja Penyimpanan Basis Data & Adaptasi Schema (Non-Destructive DB Upsert)
* **Keamanan Data Yang Sudah Ada (Proteksi Mutlak)**: Saat ada penambahan fitur baru, perbaikan bug, atau pembaruan schema Prisma/Supabase, **DILARANG KERAS** menghapus, memformat, atau memicu *reset* data produksi yang sudah tersimpan (`prisma db push --force-reset` atau `TRUNCATE`).
* **Pendekatan Incremental & Incremental Seeding**:
  - Script seeding (`seed-supabase.ts`) Wajib menggunakan alur non-destruktif (`upsert`, `findFirst`/`findUnique` sebelum `create` atau `update`).
  - Selalu amankan data transaksional dan master yang sudah diinput oleh pengguna.
* **Audit & Adaptasi Schema Berkelanjutan**:
  - Sebelum membuat tabel atau kolom baru, periksa kembali schema Prisma (`schema.prisma`) dan Supabase untuk melihat apakah kolom/fitur tersebut sudah dapat ditampung oleh relasi/model yang ada.
  - Apabila memerlukan perubahan schema (penambahan/perubahan/penghapusan kolom), lakukan `npx prisma db push` secara aman tanpa menurunkan data, lalu jalankan `npx prisma generate` untuk memperbarui Prisma Client.
  - Lakukan pemeriksaan ganda (*double check*) pada `DTO`, `Service`, `Controller`, dan komponen Frontend agar data yang baru diadaptasi tersinkronisasi 100% dari basis data hingga UI.

---

## 7. UI/UX dan Styling
* **Aesthetics First:** Tampilan harus "WOW", premium, menarik, responsif, dan nyaman di berbagai perangkat.
* **Anti-AI Styling Default:** Gunakan Custom CSS yang dikombinasikan dengan modifikasi framework (jangan hanya bergantung pada utility class Tailwind yang kaku/biasa). Pastikan ada interaktivitas (animasi ringan, hover effects, transisi) agar sistem terasa hidup.
* Jangan gunakan template atau warna default yang terkesan murahan.
* **Fitur Baru (Tahap UI):** Jika ada penambahan fitur baru yang baru selesai pada tahap pembuatan tampilan awal (layout/UI) dan belum berfungsi penuh, WAJIB menambahkan teks atau *placeholder* keterangan **"Coming Soon"** (Segera Hadir) pada halaman/fitur tersebut.

---

## 8. Alur Kerja Developer (Workflow Aturan Main)
* **Bersih dan Efisien:** Dilarang menambahkan file/kode yang tidak berguna atau *dead code*. Jaga performa agar tetap ringan dan aman.
* **Logging:** Catat setiap log perubahan sistem dan log error agar terdokumentasi dengan baik, mempermudah perbaikan dan *debugging*.
* **Rebuild & Restart:** Setelah selesai menambahkan atau mengedit fitur (berdasarkan permintaan), SEGERA identifikasi error, perbaiki, lalu lakukan *rebuild* dan *restart* aplikasi untuk memastikan semua berjalan normal.
* **Dokumentasi (README.md):** Selalu perbarui file `README.md` atau catatan perubahan lainnya sebelum melakukan push ke repositori.
* **Git & GitHub:** Setiap selesai membangun sebuah fitur atau bagian penting, selalu lakukan `git add`, `git commit` (dengan pesan yang deskriptif dan mencerminkan apa yang diupdate), lalu `git push` ke GitHub.

---
*Dokumen ini merupakan kontrak pengembangan yang harus dibaca, dipahami, dan diaplikasikan dalam setiap penulisan kode untuk SIMASMUH.*
