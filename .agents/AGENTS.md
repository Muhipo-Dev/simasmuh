# Workspace Rules - SIMASMUH

## Direct Execution & Concise Output Standard

0. **Standar Mutlak Pembacaan Aturan (MANDATORY STEP 0)**:
   - **Wajib Membaca & Menegakkan AGENTS.md**: Secara *default*, sebelum memulai mengubah, mengedit, memperbaiki, atau membuat kode baru pada modul/fitur apapun di proyek SIMASMUH, AI Agent **MUTLAK WAJIB MEMBACA & MEMATUHI SELURUH ATURAN DI `AGENTS.md` TERLEBIH DAHULU** sebelum mengeksekusi instruksi dan membuat kode aplikasinya.
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
7. **Standar Mutlak Notifikasi Resmi (In-App Dashboard & Email SMTP) (STRICT)**:
   - **Tampil di Dashboard Seluruh Pengguna**: Setiap notifikasi (presensi/absen, lembar disposisi persuratan, tagihan & bukti verifikasi keuangan, perizinan, update akademik/rapor, jurnal mengajar, dan pengumuman resmi) **MUTLAK DITAMPILKAN LANGSUNG DI DASHBOARD PENGGUNA** sesuai perannya (Pegawai, Guru, Siswa, dan Wali Murid) secara *real-time*.
   - **Pengiriman Melalui Email Resmi (SMTP)**: Seluruh notifikasi sistem dikirimkan langsung ke alamat email aktif pengguna secara handal dan aman melalui layanan SMTP Email resmi SIMASMUH.
8. **Standar Akun & Peran Pengguna Wali Murid (Orang Tua / Wali)**:
   - **Peran & Relasi**: Pengguna dengan role `WALI_MURID` adalah akun orang tua/wali murid yang dapat terhubung dengan 1 atau lebih siswa di sistem melalui relasi `ParentProfile` dan `ParentStudent`.
   - **Koneksi Identitas Siswa**: No. NIS atau NISN menjadi kunci penghubung antara data wali murid dan siswa yang diwalikan.
   - **Sinkronisasi Nama**: Nama lengkap wali murid tersinkronisasi dari biodata orang tua siswa (nama ayah/ibu/wali) atau dapat disesuaikan manual oleh superadmin.
   - **Notifikasi & Laporan**: Akun email wali murid digunakan sebagai tujuan resmi pengiriman notifikasi email otomatis untuk presensi harian, update status perkembangan siswa, dan tagihan keuangan sekolah.
9. **Standar Mutlak Penamaan Ringkas & Responsive Layout (Mobile, Tablet, Desktop)**:
   - **Judul & Deskripsi Ringkas**: Seluruh judul fitur, modul, tab, kolom tabel, dan deskripsi wajib menggunakan bahasa yang singkat, padat, lugas, profesional, serta bebas dari kata-kata panjang atau embel-embel berlebihan yang tidak perlu.
   - **Efisiensi & Responsivitas Layout**: Seluruh tata letak halaman (Desktop, Tablet, Mobile) wajib diatur secara presisi hemat ruang layar (compact & padat). Gunakan grid/flex responsif (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3/4`), batasi lebar kolom perihal/keterangan dengan `truncate` / `line-clamp`, serta sederhanakan tombol aksi pada tabel/card menggunakan icon/button ringkas agar nyaman digunakan di semua ukuran layar.
10. **Standar Mutlak Rute Dinamis & Adaptif (Adaptive Network & Tunnel Routing)**:
    - **Resolusi Host Domain & IP**: Seluruh pengarahan rute (NextAuth redirect, Next.js rewrite proxy, dan `getBackendUrl()`) **MUTLAK SELALU ADAPTIF** mengikuti protokol (`http/https`), IP server lokal (LAN/Wi-Fi), maupun domain tunnel eksternal yang sedang digunakan oleh pengakses.
    - **Tanpa Hardcoded Redirect Domain**: Dilarang keras melakukan pengalihan paksa (*hardcoded redirect*) ke satu hostname/domain spesifik (seperti `simasmuh.razagopo.my.id`). Setiap perbaikan atau penambahan rute baru di masa depan wajib mengikuti standar ini tanpa terkecuali.
11. **Peniadaan Hero Banner Status Fitur / Placeholder (STRICT)**:
    - Setiap ada penambahan atau perubahan fitur/modul baru, **DILARANG** menampilkan banner besar pengantar/placeholder (seperti hero box status fitur "Aktif Siap Pakai", kartu rencana modul terencana, badge status rancangan, atau deskripsi redundan).
    - Halaman wajib langsung menyajikan antarmuka kerja interaktif fungsional (tabel data, filter, card kegiatan/data, form aksi, atau tombol operasional) secara bersih, ringkas, dan to the point.
12. **Standar Mutlak Format Penamaan Kelas (Romawi spasi Angka)**:
    - **Format Resmi**: Seluruh data kelas untuk data jangka panjang dan data relasi di sistem SIMASMUH dan CBT MUHIPO wajib menggunakan format: `[Romawi Kelas] [Angka Kelas]` (contoh: `X 1`, `X 2`, `XI 2`, `XII 2`, dst).
    - **Konsistensi Relasi & Sinkronisasi**: Dilarang menggunakan pemisah tanda hubung (seperti `X-1`), format penjurusan lama pada nama kelas (seperti `X IPA 1`), atau format lainnya.
    - **Placeholder & Template Excel**: Seluruh placeholder input, modal form, parser Excel, contoh baris template import siswa & kelas, serta sinkronisasi nilai/asesmen wajib seragam mengacu pada format standar ini.
13. **Standar Mutlak Peniadaan Data Dummy & Sinkronisasi Dinamis Basis Data (STRICT)**:
    - **Peniadaan Data Tiruan / Dummy**: Dilarang keras menyematkan data tiruan/dummy, array statis mock, atau angka hardcoded di frontend maupun backend untuk fitur apapun (termasuk fitur baru yang sedang dikembangkan).
    - **100% Sinkronisasi Dinamis Supabase / PostgreSQL**: Seluruh elemen antarmuka (tabel data, kartu statistik/widget count, grafik chart, kurva analitik, diagram tren, dropdown relasi, filter, dan riwayat) wajib 100% dikalkulasi dan tersinkronisasi dinamis secara langsung dari data riil basis data melalui endpoint API NestJS resmi.
    - **Grafik & Kurva Data Riil**: Seluruh visualisasi grafik (garis kurva, bar chart, donat distribusi, tren presensi, analitik keuangan, performa akademik, dll) wajib mengolah data riil di database. Jika belum terdapat riwayat atau transaksi, visualisasi wajib menampilkan titik awal nol (`0`) atau *empty state chart* tanpa kurva ilustratif/fiktif.
    - **Empty State yang Bersih**: Jika belum ada data yang dibuat atau dicatat oleh pengguna, sistem wajib menyajikan angka `0` atau *empty state* yang bersih (contoh: "Belum ada data surat tercatat") tanpa menyisipkan data rekaan atau angka perkiraan.
14. **Standar Mutlak UI/UX Presisi, Tata Letak Rapi, & Multi-Perangkat Responsif Layar Sentuh (STRICT)**:
    - **Presisi Tata Letak & Visual Rapi**: Seluruh tata letak antarmuka wajib rapi, konsisten, proporsional, dan presisi tinggi. Menggunakan hierarki visual yang jelas, jarak elemen (*spacing/gap*) yang harmonis, serta keterbacaan tipografi dan kontras warna yang nyaman di semua mode (Light & Dark Mode).
    - **Ergonomi & Kesempurnaan Multi-Perangkat (Desktop, Tablet, Mobile)**:
      - **Desktop**: Pemanfaatan ruang kerja yang luas secara efisien dengan grid multi-kolom dan tabel interaktif yang kaya fungsi.
      - **Tablet**: Transisi layout 2–3 kolom yang adaptif dan nyaman digunakan baik pada orientasi potret maupun lanskap.
      - **Mobile (Smartphone)**: Tata letak vertikal padat, drawer/sheet yang mulus, tabel dengan scroll horizontal lembut atau kartu responsif, serta bebas dari elemen yang terpotong/overflow horizontal.
    - **Optimalisasi Layar Sentuh (Touchscreen & Mobile-Friendly)**:
      - Seluruh elemen interaktif (tombol, badge filter, toggle switcher, tab, dan ikon aksi) wajib memiliki area sentuh yang nyaman untuk jari (*touch target* minimal 40–44px) dengan jarak aman antar elemen guna mencegah salah tekan.
      - Input form, modal, dropdown select, dan dialog dirancang ergonomis serta responsif terhadap ketukan layar sentuh di smartphone maupun tablet.
15. **Standar Mutlak Presisi Tabel Data & Proporsi Kolom-Baris Multi-Perangkat (STRICT)**:
    - **Proporsionalitas Lebar Kotak Kolom & Baris**: Seluruh tabel data wajib mengalokasikan lebar kolom secara presisi dan proporsional sesuai jenis data (contoh: kolom nomor `w-12`, tanggal & badge status `w-28`, tombol aksi `w-32/w-36`, sedangkan teks nama/perihal `min-w-[200px] max-w-[400px] flex-1`).
    - **Peniadaan Area Kosong Berlebih & Offset**: Dilarang membiarkan kolom melar berlebihan (*wasted whitespace*) ataupun kolom tertekan sempit tidak wajar yang menyebabkan offset layout. Teks panjang wajib dibatasi dengan `truncate` / `line-clamp` dan dilengkapi tooltip `title`.
    - **Scroll Horizontal Halus & Responsif di Semua Perangkat**: Pembungkus tabel wajib menggunakan container `overflow-x-auto` yang lembut dan presisi tanpa memotong konten pada perangkat mobile, tablet, maupun layar desktop lebar.
16. **Standar Mutlak Searchbar, Filter, & Checkbox Seleksi pada Seluruh Tabel (STRICT)**:
    - **Searchbar & Tombol Filter Bersebelahan**: Seluruh bentuk tabel data dan seluruh layanan yang menggunakan tabel diwajibkan memiliki Searchbar (kolom input pencarian data) yang di sampingnya langsung terdapat Tombol Filter (dropdown/filter kategori, status, tanggal, atau atribut data terkait) secara rapi dan terintegrasi.
    - **Checkbox Seleksi (Select All & Row Select)**: Seluruh tabel data wajib dilengkapi dengan kolom Checkbox Seleksi di sisi paling kiri:
      - Checkbox di header tabel untuk memilih/membatalkan semua baris (*Select All / Deselect All*).
      - Checkbox di setiap baris data untuk seleksi individual (*Row Selection*).
      - Indikator baris terpilih serta aksi massal (*bulk action bar*) saat terdapat baris yang diseleksi.
17. **Larangan Menjalankan Dev Server (`npm run dev`) Saat Pengujian / Testing (STRICT)**:
    - AI Agent **DILARANG KERAS** menjalankan perintah dev server seperti `npm run dev`, `next dev`, atau perintah interactive long-running sejenis saat melakukan pengujian, verifikasi kode, atau pengecekan error.
    - Untuk verifikasi dan pengetesan kualitas/tipe kode, AI Agent **MUTLAK WAJIB** menggunakan validasi build produksi (`npm run build` atau `npx tsc --noEmit`) yang bersifat non-blocking, selesai secara otomatis, dan memastikan integritas TypeScript serta Turbopack secara menyeluruh.
18. **Standar Mutlak Spasi, Jarak Antar Layout, Pembatasan Lebar-Panjang, & Padding Celah Harmonis (STRICT)**:
    - **Jarak Antar Komponen / Layout (Spacing & Gap Hierarchy)**:
      - Setiap pembungkus tata letak (navbar, header, sidebar, grid konten, card, modal, footer) wajib memiliki jarak antar elemen (`gap` atau `space-y`) yang jelas, konsisten, dan tidak boleh saling berdempetan/menumpuk.
      - Gunakan hierarki celah terstandar: `gap-1.5` / `gap-2` untuk ikon & badge kecil, `gap-3` / `gap-4` untuk baris form & tombol aksi, `gap-4` / `gap-6` untuk kartu/grid kolom, serta `space-y-4` / `space-y-6` antar seksi konten halaman.
    - **Pembatasan Lebar & Panjang Maksimum (Container Constraints & Truncation)**:
      - Kontainer halaman wajib memiliki batas lebar terukur (`max-w-7xl` atau `2xl:max-w-[1440px] mx-auto`) untuk mencegah tata letak melar tak berbatas di layar ultra-wide.
      - Seluruh elemen teks dinamis (nama pengguna, judul perihal, deskripsi, tautan navigasi) **MUTLAK DIBATASI** dengan pembatas lebar (`max-w-[...]`) yang dipadukan dengan `truncate` atau `line-clamp` untuk mencegah pemotongan paksa, pembengkakan baris, atau pergeseran tombol navigasi.
    - **Padding & Margin Celah Aman (Safe Margin & Inner Padding)**:
      - Seluruh kartu konten, dropdown menu, dialog modal, dan kontainer utama wajib menerapkan inner padding terukur (`p-3 sm:p-4 md:p-6` atau `px-4 sm:px-6 lg:px-8 py-4 sm:py-6`) sehingga isi konten tidak menempel ke tepi batas visual (*no boundary collisions*).
      - Navigasi atas (Navbar) dan bawah (Bottom Bar) wajib menyertakan celah aman tepi layar (`pl-safe pr-safe` / `safe-area-inset-bottom`) dan padding horizontal terdistribusi seimbang.
    - **Harmoni Visual, Responsif, & Bebas Tabrakan**:
      - Penggunaan `shrink-0` dan `flex-1` / `min-w-0` wajib dikombinasikan secara presisi pada flex container agar komponen penting (seperti tombol aksi, avatar, icon) tidak gepeng dan komponen fleksibel (menu navigasi, judul teks) memiliki ruang napas yang lapang dan proporsional di semua ukuran layar (Mobile, Tablet, Laptop, Desktop).
19. **Standar Mutlak Anti AI-Slop, Keunikan Desain Institusional, Responsif, & Low-Resource (STRICT)**:
    - **Peniadaan Total Ciri Khas AI-Slop**:
      - Dilarang keras menggunakan kombinasi visual generic AI-slop (seperti gradien pelangi/ungu-merah muda pekat yang bertumpuk-tumpuk, border bersinar tebal berlebihan yang menyilaukan mata, efek floating berkilau semu, atau ornamen dekoratif fiktif yang tidak fungsional).
      - Seluruh antarmuka (UI/UX) wajib tampil dengan estetika institusional modern: bersih (*clean*), berwibawa (*authoritative*), berbasis kontras neutral slate, tipografi tegas (*Inter/Outfit/Geist*), serta aksen warna institusi yang harmonis.
    - **Keunikan & Orisinalitas Desain**:
      - Setiap modul, modal popup, kartu ringkasan, dan tabel data dirancang unik sesuai fungsi spesifiknya tanpa layout klise bawaan template instan.
      - Memadukan layout ergonomis yang intuitif dengan micro-interactions yang mulus dan natural.
    - **Ringan & Hemat Sumber Daya (Low-Resource & Fast Loading)**:
      - Desain dan kode wajib sangat ringan, efisien, dan dioptimalkan agar dapat berjalan lancar (*60 FPS*) pada perangkat dengan spesifikasi rendah (*low-end smartphone / PC sekolah / tablet POS*).
      - Hindari animasi berat yang membebani GPU/CPU, minimalisasi re-render yang tidak perlu, dan gunakan teknik CSS performa tinggi (GPU-accelerated transforms, `backdrop-filter` ringan, dan container queries).
