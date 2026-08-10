# Workspace Rules - SIMASMUH

## Direct Execution & Concise Output Standard

1. **Langsung Eksekusi**: Setiap perintah permintaan perubahan/fitur/desain/database harus segera dieksekusi secara langsung.
2. **Tanpa Code Snippet di Chat**: Untuk menghemat konsumsi kredit/token, **TIDAK PERLU** menampilkan potongan kode / diff di pesan percakapan chat.
3. **Format Ringkasan**: Cukup tampilkan update status pekerjaan, laporan ringkas, tautan file yang diubah (`[filename](file:///path/to/file)`), artefak, dan hasil terminal.
4. **Respon Minimalis hemat kredit**: Semua respon AI dalam percakapan ini HANYA berupa respon artefak dan laporan akhir output tanpa penjelas teks panjang/bertele-tele.
5. **Prisma & Database Preservation Standard (STRICT)**:
   - `npx prisma db push` atau `npx prisma generate` **TIDAK BOLEH** dijalankan jika hanya menambah/mengubah data. Perintah tersebut **HANYA** diperbolehkan berjalan ketika terdapat perubahan struktur skema baru (model/kolom baru).
   - **TIDAK BOLEH** menjalankan perintah database, script seed, atau penambahan data yang mereset, menggantikan, menghapus, atau menimpa data eksisting di database (`--accept-data-loss` dan `seed reset` dilarang keras). Data eksisting wajib dilindungi utuh.
