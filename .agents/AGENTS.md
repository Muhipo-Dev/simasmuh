# Workspace Rules - SIMASMUH

## Direct Execution & Concise Output Standard

1. **Langsung Eksekusi**: Setiap perintah permintaan perubahan/fitur/desain/database harus segera dieksekusi secara langsung.
2. **Tanpa Code Snippet di Chat**: Untuk menghemat konsumsi kredit/token, **TIDAK PERLU** menampilkan potongan kode / diff di pesan percakapan chat.
3. **Format Ringkasan**: Cukup tampilkan update status pekerjaan, laporan ringkas, tautan file yang diubah (`[filename](file:///path/to/file)`), artefak, dan hasil terminal.
4. **Respon Minimalis hemat kredit**: Semua respon AI dalam percakapan ini HANYA berupa respon artefak dan laporan akhir output tanpa penjelas teks panjang/bertele-tele.
5. **Prisma & Database Preservation Standard (STRICT)**:
   - `npx prisma db push` atau `npx prisma generate` **TIDAK BOLEH** dijalankan jika hanya menambah/mengubah data. Perintah tersebut **HANYA** diperbolehkan berjalan ketika terdapat perubahan struktur skema baru (model/kolom baru).
   - **TIDAK BOLEH** menjalankan perintah database, script seed, atau penambahan data yang mereset, menggantikan, menghapus, atau menimpa data eksisting di database (`--accept-data-loss` dan `seed reset` dilarang keras). Data eksisting wajib dilindungi utuh.
   - **Proteksi Row Level Security (RLS) Menyeluruh**: Seluruh tabel di basis data public SIMASMUH dilindungi dengan Row Level Security (RLS) aktif dan backend policy untuk memastikan seluruh elemen data terjaga keamanannya dan tidak dapat dihapus/di-reset oleh generator otomatis AI saat ada modifikasi struktur data baru.
   - **KETENTUAN MUTLAK**: Ketika ada perubahan dari AI, jangan mengganggu isi data tabel, kolom, atau barisnya. Cukup pengguna di dashboard yang dapat melakukan CRUD. Tugas AI hanya mengubah struktur tanpa mengganggu isi dan dilarang melakukan regenerasi basis data yang menghapus data lama (seperti akun superadmin nailar, siswa, atau guru) karena hal tersebut membuang waktu.
6. **Ketentuan Mutlak Startup Layanan & Standar Port Tetap**:
   - Setiap kali SIMASMUH dijalankan di lingkungan manapun, launcher wajib memastikan dan menjalankan 4 layanan secara bersamaan dengan port tetap:
     - **Frontend Web Next.js**: `http://localhost:3000`
     - **Backend API NestJS**: `http://localhost:3001`
     - **Prisma Studio**: `http://localhost:51212`
     - **Supabase Studio (Docker)**: `http://localhost:54323` (Database: `54322`, API: `54321`)
7. **Standar Notifikasi Ganda (In-App & WhatsApp) & Keharusan Nomor Telepon**:
   - Setiap fitur yang mengharuskan adanya notifikasi (seperti presensi/absen, tagihan keuangan, bukti & verifikasi pembayaran, informasi berita/pengumuman, perizinan, ataupun fitur masa depan lainnya), seluruh notifikasi selain wajib dikirim ke akun pengguna di sistem (In-App notification), **WAJIB** dikirimkan juga notifikasinya melalui WhatsApp.
   - Setiap data pengguna (Siswa, Guru, Karyawan/Pegawai, dan Orang Tua/Wali) tabel data dirinya diwajibkan menggunakan nomor telepon yang aktif WhatsApp.
   - Nomor pengirim resmi sistem ke pengguna adalah: `088293733330`.
   - Data pengguna baru maupun eksisting wajib menyertakan nomor telepon WhatsApp (nomor dummy `088293733330` disediakan sebagai fallback pengembangan jika pengguna belum memasukkan nomor).
8. **Standar Akun & Peran Pengguna Wali Murid (Orang Tua / Wali)**:
   - **Peran & Relasi**: Pengguna dengan role `WALI_MURID` adalah akun orang tua/wali murid yang dapat terhubung dengan 1 atau lebih siswa di sistem melalui relasi `ParentProfile` dan `ParentStudent`.
   - **Koneksi Identitas Siswa**: No. NIS atau NISN menjadi kunci penghubung antara data wali murid dan siswa yang diwalikan.
   - **Kredensial Login**: Username wali murid adalah nomor telepon aktif WhatsApp, dan kata sandi awalnya adalah NIS dari siswa yang terhubung.
   - **Sinkronisasi Nama**: Nama lengkap wali murid tersinkronisasi dari biodata orang tua siswa (nama ayah/ibu/wali) atau dapat disesuaikan manual oleh superadmin.
   - **Notifikasi & Laporan**: Nomor telepon wali murid digunakan sebagai tujuan resmi pengiriman notifikasi WhatsApp otomatis untuk presensi harian, update status perkembangan siswa, dan tagihan keuangan sekolah.
