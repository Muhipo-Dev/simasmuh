import { 
  LayoutDashboard, Users, UserSquare2, CalendarDays, ClipboardCheck, 
  GraduationCap, BookOpen, Settings, LogOut, Menu, UserCog, QrCode, 
  DoorOpen, UserCircle2, Megaphone, Wallet, Receipt, X, MoreHorizontal, 
  Banknote, FileText, Image as ImageIcon, Award, FileCheck,
  ShieldAlert, Sparkles, ShieldCheck, UserCheck, HeartHandshake,
  Library, BookMarked, Mail, Contact, Package, Boxes, Camera, BellRing, Database,
  Clock, CreditCard, Archive, Inbox, Send, BookCheck, HardDrive, FolderKanban,
  Trophy, HeartPulse, Stethoscope
} from 'lucide-react'

// 1. Superadmin & Admin IT (Kontrol Penuh Sistem, Master Data, & Pengaturan Advance)
export const superadminLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Master Data
  { name: 'Pendidik & Tendik', href: '/master-data/guru', icon: Users, group: 'Master Data' },
  { name: 'Peserta Didik', href: '/master-data/siswa', icon: UserSquare2, group: 'Master Data' },
  { name: 'Buku Induk', href: '/master-data/buku-induk', icon: BookMarked, group: 'Master Data' },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users, group: 'Master Data' },
  { name: 'Rombongan Belajar', href: '/master-data/kelas', icon: BookOpen, group: 'Master Data' },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Master Data' },
  { name: 'Jadwal Akademik', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Master Data' },

  // Pengaturan Advance & Sistem
  { name: 'Pusat Berkas & Storage', href: '/fitur/file-explorer', icon: HardDrive, group: 'Konfigurasi Lanjutan' },
  { name: 'Terminal Presensi QR', href: '/presensi/manajemen-qr', icon: QrCode, group: 'Konfigurasi Lanjutan' },
  { name: 'Manajemen Pengguna', href: '/master-data/pengguna', icon: UserCog, group: 'Konfigurasi Lanjutan' },
  { name: 'Biometrik FaceNet AI', href: '/facenetai', icon: Camera, group: 'Konfigurasi Lanjutan' },
  { name: 'Pengumuman Sistem', href: '/pengaturan/pengumuman-sistem', icon: BellRing, group: 'Konfigurasi Lanjutan' },
  { name: 'Konfigurasi Notifikasi', href: '/pengaturan/notifikasi', icon: Mail, group: 'Konfigurasi Lanjutan' },
  { name: 'Pengaturan Sistem', href: '/pengaturan/sistem', icon: Settings, group: 'Konfigurasi Lanjutan' },
  { name: 'Publikasi & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Konfigurasi Lanjutan' },
  { name: 'Banner Portal', href: '/informasi/banner', icon: ImageIcon, group: 'Konfigurasi Lanjutan' },
  { name: 'Prestasi Siswa', href: '/informasi/prestasi', icon: Trophy, group: 'Konfigurasi Lanjutan' },

  // Layanan Pribadi Pegawai (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 2. Admin TU / BAU (Tata Usaha & Administrasi Perkantoran)
export const bauLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Layanan Tata Usaha & Administrasi
  { name: 'Surat Masuk', href: '/fitur/surat-masuk', icon: Inbox, group: 'Administrasi & Persuratan' },
  { name: 'Surat Keluar', href: '/fitur/surat-keluar', icon: Send, group: 'Administrasi & Persuratan' },
  { name: 'Arsip Dokumen', href: '/fitur/arsip', icon: Archive, group: 'Administrasi & Persuratan' },
  { name: 'Pusat Berkas & Storage', href: '/fitur/file-explorer', icon: HardDrive, group: 'Administrasi & Persuratan' },
  { name: 'Inventaris & Sarpras', href: '/fitur/inventaris', icon: Package, group: 'Administrasi & Persuratan' },
  { name: 'Buku Tamu Instansi', href: '/fitur/buku-tamu', icon: Contact, group: 'Administrasi & Persuratan' },
  { name: 'Agenda Korporasi', href: '/fitur/kegiatan', icon: Sparkles, group: 'Administrasi & Persuratan' },
  { name: 'Risalah Rapat', href: '/fitur/notulensi-rapat', icon: FileText, group: 'Administrasi & Persuratan' },
  { name: 'Manajemen SDM & Tendik', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Administrasi & Persuratan' },

  // Master Data
  { name: 'Buku Induk Registrasi', href: '/master-data/buku-induk', icon: BookMarked, group: 'Master Data' },
  { name: 'Peserta Didik', href: '/master-data/siswa', icon: UserSquare2, group: 'Master Data' },
  { name: 'Pendidik & Tendik', href: '/master-data/guru', icon: Users, group: 'Master Data' },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users, group: 'Master Data' },
  { name: 'Rombongan Belajar', href: '/master-data/kelas', icon: BookOpen, group: 'Master Data' },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Master Data' },
  { name: 'Jadwal Akademik', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Master Data' },

  // Administrasi Sistem
  { name: 'Terminal Presensi QR', href: '/presensi/manajemen-qr', icon: QrCode, group: 'Operasional Sistem' },
  { name: 'Manajemen Pengguna', href: '/master-data/pengguna', icon: UserCog, group: 'Operasional Sistem' },
  { name: 'Konfigurasi Notifikasi', href: '/pengaturan/notifikasi', icon: Mail, group: 'Operasional Sistem' },
  { name: 'Pengaturan Sistem', href: '/pengaturan/sistem', icon: Settings, group: 'Operasional Sistem' },

  // Layanan Pribadi Pegawai (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 3. Guru (Layanan Pembelajaran & Pengajaran)
export const guruLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Operasional Akademik Guru
  { name: 'Jurnal Pembelajaran', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Operasional Akademik' },
  { name: 'Perangkat Ajar', href: '/akademik/perangkat-ajar', icon: FileText, group: 'Operasional Akademik' },
  { name: 'Jadwal Mengajar', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Operasional Akademik' },
  { name: 'Rekam Disiplin Siswa', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Operasional Akademik' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 3b. Guru Honorer / Guru Panggilan (Pegawai Kontrak Sangat Sementara)
export const honorerLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },

  // Operasional Akademik Khusus Guru Panggilan
  { name: 'Jurnal Pembelajaran', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Operasional Akademik' },
  { name: 'Jadwal Mengajar', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Operasional Akademik' },
  { name: 'Presensi Kelas Binaan', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Operasional Akademik' },

  // Layanan Mandiri
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 4. Pegawai / Karyawan (Tendik)
export const pegawaiLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Kinerja Operasional Pegawai
  { name: 'Jurnal Kinerja Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen, group: 'Kinerja Operasional' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 5. Siswa (Portal Peserta Didik)
export const siswaLinks = [
  // Fitur Utama & Akademik
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Kehadiran', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Kartu Tanda Pelajar', href: '/pengaturan/profil#kartu-pelajar', icon: CreditCard },

  // Layanan Akademik Siswa
  { name: 'Buku Induk Mandiri', href: '/siswa/buku-induk', icon: BookMarked, group: 'Layanan Akademik' },
  { name: 'Jadwal Pembelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Layanan Akademik' },
  { name: 'Portofolio Prestasi', href: '/informasi/prestasi', icon: Trophy, group: 'Layanan Akademik' },
  { name: 'Pengembangan Diri', href: '/siswa/ekstrakurikuler', icon: Sparkles, group: 'Layanan Akademik' },

  // Layanan Mandiri / Administrasi Siswa (Paling Bawah)
  { name: 'Permohonan Izin', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Dispensasi', href: '/presensi/dispensasi', icon: Award, group: 'Layanan Mandiri' },
  { name: 'Tagihan & Keuangan', href: '/keuangan/laporan', icon: Wallet, group: 'Layanan Mandiri' },
  { name: 'Tata Tertib & Etika', href: '/akademik/etika-tatib', icon: ShieldCheck, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 6. Wali Murid (Portal Orang Tua / Wali)
export const waliMuridLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },

  // Monitoring Perkembangan Siswa
  { name: 'Portofolio Prestasi', href: '/informasi/prestasi', icon: Trophy, group: 'Monitoring Perkembangan' },
  { name: 'Tata Tertib Sekolah', href: '/akademik/etika-tatib', icon: ShieldCheck, group: 'Monitoring Perkembangan' },

  // Layanan Mandiri & Tagihan (Paling Bawah)
  { name: 'Permohonan Izin Siswa', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award, group: 'Layanan Mandiri' },
  { name: 'Informasi Tagihan & SPP', href: '/keuangan/laporan', icon: Wallet, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Wali', href: '/pengaturan/notifikasi-wali', icon: Mail, group: 'Layanan Mandiri' },
]

// 7. Kepala Sekolah (Eksekutif & Supervisi Terpadu)
export const kepalaSekolahLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi GTK', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Otorisasi & E-Sign Persuratan
  { name: 'Surat Masuk', href: '/fitur/surat-masuk', icon: Inbox, group: 'Otorisasi & Dokumen' },
  { name: 'Tanda Tangan Digital', href: '/fitur/surat-keluar', icon: Send, group: 'Otorisasi & Dokumen' },
  { name: 'Arsip Dokumen Institusi', href: '/fitur/arsip', icon: Archive, group: 'Otorisasi & Dokumen' },

  // Modul Supervisi Terpadu Pimpinan
  { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi Eksekutif' },
  { name: 'Supervisi KBM & Jurnal Mengajar', href: '/akademik/supervisi-jurnal', icon: BookOpen, group: 'Supervisi Eksekutif' },
  { name: 'Supervisi Izin & Dispensasi Siswa', href: '/kesiswaan/supervisi-izin-dispensasi', icon: ClipboardCheck, group: 'Supervisi Eksekutif' },
  { name: 'Supervisi Perangkat Pembelajaran', href: '/akademik/perangkat-ajar', icon: FileText, group: 'Supervisi Eksekutif' },
  { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Supervisi Eksekutif' },
  { name: 'Supervisi Jurnal Perwalian', href: '/akademik/jurnal-wali-kelas', icon: BookOpen, group: 'Supervisi Eksekutif' },

  // Kesiswaan & Tata Kelola
  { name: 'Monitoring Prestasi Siswa', href: '/informasi/prestasi', icon: Trophy, group: 'Kesiswaan & Karakter' },
  { name: 'Program Ekstrakurikuler', href: '/akademik/ekstrakurikuler', icon: Sparkles, group: 'Kesiswaan & Karakter' },
  { name: 'Kedisiplinan & Tata Tertib', href: '/akademik/etika-tatib', icon: ShieldCheck, group: 'Kesiswaan & Karakter' },

  // Data & Tata Kelola
  { name: 'Data Rombongan Belajar', href: '/master-data/kelas', icon: BookOpen, group: 'Data & Tata Kelola' },
  { name: 'Data Pendidik & Tendik', href: '/master-data/guru', icon: Users, group: 'Data & Tata Kelola' },
  { name: 'Data Peserta Didik', href: '/master-data/siswa', icon: UserSquare2, group: 'Data & Tata Kelola' },
  { name: 'Buku Induk Registrasi', href: '/master-data/buku-induk', icon: BookMarked, group: 'Data & Tata Kelola' },
  { name: 'Kurikulum & Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Data & Tata Kelola' },
  { name: 'Supervisi Aset & Sarpras', href: '/fitur/inventaris', icon: Package, group: 'Tata Kelola Operasional' },
  { name: 'Supervisi Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Tata Kelola Operasional' },
  { name: 'Agenda Kegiatan Korporasi', href: '/fitur/kegiatan-sekolah', icon: CalendarDays, group: 'Tata Kelola Operasional' },
  { name: 'Laporan Finansial', href: '/keuangan/laporan', icon: Wallet, group: 'Tata Kelola Operasional' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 8. Keuangan Penuh (Finance & Accounting)
export const keuanganAllLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Panel Manajemen Keuangan
  { name: 'Penerimaan Kas & SPP', href: '/keuangan/pemasukan', icon: Wallet, group: 'Manajemen Finansial' },
  { name: 'Pengeluaran & Belanja', href: '/keuangan/pengeluaran', icon: Receipt, group: 'Manajemen Finansial' },
  { name: 'Integrasi Virtual Account', href: '/keuangan/virtual-account', icon: Database, group: 'Manajemen Finansial' },
  { name: 'Verifikasi Bukti Transaksi', href: '/keuangan/file-explorer', icon: HardDrive, group: 'Manajemen Finansial' },
  { name: 'Penggajian & Payroll', href: '/keuangan/penggajian', icon: Banknote, group: 'Manajemen Finansial' },
  { name: 'Tarif & Skema Biaya', href: '/keuangan/pengaturan', icon: Settings, group: 'Manajemen Finansial' },
  { name: 'Laporan Arus Kas & Finansial', href: '/keuangan/laporan', icon: FileText, group: 'Manajemen Finansial' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 9. Keuangan Masuk (Accounts Receivable)
export const keuanganMasukLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Fitur Keuangan Masuk
  { name: 'Penerimaan Kas & SPP', href: '/keuangan/pemasukan', icon: Wallet, group: 'Penerimaan Kas' },
  { name: 'Integrasi Virtual Account', href: '/keuangan/virtual-account', icon: Database, group: 'Penerimaan Kas' },
  { name: 'Verifikasi Bukti Bayar', href: '/keuangan/file-explorer', icon: HardDrive, group: 'Penerimaan Kas' },
  { name: 'Tarif & Skema Biaya', href: '/keuangan/pengaturan', icon: Settings, group: 'Penerimaan Kas' },
  { name: 'Laporan Penerimaan', href: '/keuangan/laporan', icon: FileText, group: 'Penerimaan Kas' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// 10. Keuangan Keluar (Accounts Payable & Disbursement)
export const keuanganKeluarLinks = [
  // Utama & Akses Cepat
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck },

  // Fitur Keuangan Keluar
  { name: 'Pengeluaran & Belanja', href: '/keuangan/pengeluaran', icon: Receipt, group: 'Pengeluaran Kas' },
  { name: 'Verifikasi Bukti Belanja', href: '/keuangan/file-explorer', icon: HardDrive, group: 'Pengeluaran Kas' },
  { name: 'Laporan Pengeluaran', href: '/keuangan/laporan', icon: FileText, group: 'Pengeluaran Kas' },

  // Layanan Pribadi (Paling Bawah)
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Layanan Mandiri' },
  { name: 'Tunjangan Harian', href: '/keuangan/tunjangan-harian', icon: Clock, group: 'Layanan Mandiri' },
  { name: 'Izin Keluar Kantor', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Layanan Mandiri' },
  { name: 'Pengajuan Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Layanan Mandiri' },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, group: 'Layanan Mandiri' },
]

// Pengecekan Hak Akses Rute Ketat Berdasarkan Role & Sub-Role
export function isPathAllowedForRoles(pathname: string, roles: string[]): boolean {
  // Pegawai Honorer / Guru Panggilan: Hanya boleh mengakses Dashboard, Jadwal, Jurnal Mengajar, Presensi Siswa, dan Notifikasi Akun
  const isHonorer = roles.includes('HONORER')
  if (isHonorer) {
    if (
      pathname.startsWith('/keuangan/') ||
      pathname.startsWith('/presensi/kehadiran-pegawai') ||
      pathname.startsWith('/presensi/scan-qr') ||
      pathname.startsWith('/presensi/cuti') ||
      pathname.startsWith('/presensi/izin-keluar') ||
      pathname.startsWith('/presensi/jurnal-karyawan') ||
      pathname.startsWith('/presensi/manajemen-qr') ||
      pathname.startsWith('/fitur/kepegawaian') ||
      pathname.startsWith('/master-data/guru') ||
      pathname.startsWith('/master-data/pengguna')
    ) {
      return false
    }
    if (
      pathname === '/dashboard' ||
      pathname === '/profil' ||
      pathname === '/pengaturan/profil' ||
      pathname === '/pengaturan/notifikasi-pengguna' ||
      pathname.startsWith('/akademik/jurnal-mengajar') ||
      pathname.startsWith('/akademik/jadwal-pelajaran') ||
      pathname.startsWith('/presensi/kehadiran-siswa')
    ) {
      return true
    }
  }

  // 1. Modul Keuangan (MUTLAK: Superadmin, Admin IT, Admin TU/BAU DILARANG mengakses seluruh panel keuangan, KECUALI slip-gaji dan tunjangan-harian)
  if (pathname.startsWith('/keuangan/')) {
    // Slip Gaji & Tunjangan Harian — Diizinkan untuk setiap staf/pengguna sistem (kecuali SISWA, WALI_MURID, dan HONORER)
    if (pathname.startsWith('/keuangan/slip-gaji') || pathname.startsWith('/keuangan/tunjangan-harian')) {
      return !roles.includes('SISWA') && !roles.includes('WALI_MURID') && !roles.includes('HONORER')
    }
    // Laporan Keuangan untuk Siswa / Wali Murid
    if (pathname.startsWith('/keuangan/laporan') && (roles.includes('SISWA') || roles.includes('WALI_MURID'))) {
      return true
    }

    const isKeuanganAll = roles.includes('KEUANGAN_ALL') || roles.includes('SUPERVISOR_KEUANGAN')
    const isKeuanganMasuk = roles.includes('KEUANGAN_MASUK')
    const isKeuanganKeluar = roles.includes('KEUANGAN_KELUAR')
    const isKeuanganPure = roles.includes('KEUANGAN') || isKeuanganAll || isKeuanganMasuk || isKeuanganKeluar

    // File Explorer Bukti Bayar Keuangan
    if (pathname.startsWith('/keuangan/file-explorer')) {
      return isKeuanganPure || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
    }

    // Keuangan Masuk (Hanya staf Keuangan Masuk & Keuangan All)
    if (pathname.startsWith('/keuangan/pemasukan') || pathname.startsWith('/keuangan/virtual-account') || pathname.startsWith('/keuangan/pengaturan') || pathname.startsWith('/keuangan/verifikasi-pembayaran')) {
      return isKeuanganAll || isKeuanganMasuk || roles.includes('KEUANGAN')
    }
    // Keuangan Keluar (Hanya staf Keuangan Keluar & Keuangan All)
    if (pathname.startsWith('/keuangan/pengeluaran') || pathname.startsWith('/keuangan/lpj')) {
      return isKeuanganAll || isKeuanganKeluar || roles.includes('KEUANGAN')
    }
    // Penggajian Pegawai & Payroll — HANYA Keuangan Lengkap / Keuangan All (KEUANGAN_ALL / SUPERVISOR_KEUANGAN / KEUANGAN)
    if (pathname.startsWith('/keuangan/penggajian')) {
      return isKeuanganAll || roles.includes('KEUANGAN')
    }
    // Laporan Keuangan — Keuangan All, Masuk, Keluar, dan Kepala Sekolah (Supervisi Eksekutif)
    if (pathname.startsWith('/keuangan/laporan')) {
      return isKeuanganPure || roles.includes('KEPALA_SEKOLAH')
    }
    return isKeuanganPure
  }

  const isKepalaSekolah = roles.includes('KEPALA_SEKOLAH')
  const isBau = roles.includes('ADMIN_TU') || roles.includes('BAU') || roles.includes('TATA_USAHA')
  const isGuru = roles.includes('GURU') || roles.includes('HONORER')
  const isWaliKelas = roles.includes('WALI_KELAS')
  const isPegawai = roles.includes('PEGAWAI') || roles.includes('KARYAWAN')
  const isSiswa = roles.includes('SISWA')
  const isWaliMurid = roles.includes('WALI_MURID')
  const isTatib = roles.includes('KETERTIBAN')
  const isHumasSdm = roles.includes('KEPEGAWAIAN') || roles.includes('SDM') || roles.includes('WAKA_HUMAS_SDM') || roles.includes('HUMAS_SDM')
  const isAdminWeb = roles.includes('ADMIN_WEB') || isHumasSdm
  const isBk = roles.includes('BK_BP') || roles.includes('BK')
  const isPustakawan = roles.includes('PUSTAKAWAN')
  const isGuruTahfidz = roles.includes('GURU_TAHFIDZ')
  const isIsmuba = roles.includes('ISMUBA') || roles.includes('WAKA_ISMUBA')
  const isPersuratan = roles.includes('PERSURATAN')
  const isKurikulum = roles.includes('KURIKULUM') || roles.includes('WAKA_KURIKULUM')
  const isKesiswaan = roles.includes('KESISWAAN') || roles.includes('WAKA_KESISWAAN')
  const isSarpras = roles.includes('SARPRAS') || roles.includes('WAKA_SARPRAS')
  const isWaka = isKurikulum || isKesiswaan || isHumasSdm || isIsmuba || isSarpras || roles.some(r => r.startsWith('WAKA_') || r.includes('WAKA'))
  const isGuruPiket = roles.includes('GURU_PIKET')

  // 2. Modul Supervisi GTK & Supervisi Kesiswaan (MUTLAK KHUSUS PIMPINAN: Kepala Sekolah & Seluruh WAKA)
  if (
    pathname.startsWith('/akademik/supervisi-akademik') ||
    pathname.startsWith('/akademik/supervisi-jurnal') ||
    pathname.startsWith('/kesiswaan/supervisi-izin-dispensasi')
  ) {
    return isKepalaSekolah || isWaka || isKurikulum || isHumasSdm || isIsmuba || isKesiswaan || isSarpras
  }

  // Superadmin & Admin IT memiliki akses penuh ke rute umum non-keuangan & non-supervisi pimpinan
  if (roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')) return true

  // Dashboard utama dan halaman profil umum selalu diizinkan untuk semua user login
  if (
    pathname === '/dashboard' ||
    pathname === '/profil' ||
    pathname === '/pengaturan/profil' ||
    pathname === '/pengaturan/notifikasi-pengguna' ||
    pathname === '/pengaturan/notifikasi-wali'
  ) return true

  // Scan QR presensi umum
  if (pathname === '/presensi/scan-qr') return true

  // 1. Modul Manajemen Akun & Pengaturan Sistem — Admin TU / BAU, Humas SDM & Superadmin
  if (pathname.startsWith('/master-data/pengguna')) {
    return isBau || isHumasSdm || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }
  if (
    pathname.startsWith('/pengaturan/sistem') || 
    pathname.startsWith('/presensi/manajemen-qr') || 
    pathname.startsWith('/presensi/camera') ||
    pathname.startsWith('/fitur/file-explorer') ||
    pathname.startsWith('/pengaturan/file-explorer')
  ) {
    return isBau || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }

  // 2. Modul Master Data Siswa, Guru, Kelas, Mapel, Buku Induk
  if (pathname.startsWith('/siswa/buku-induk')) {
    return isSiswa || isBau || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }
  if (pathname.startsWith('/master-data/buku-induk')) {
    return isBau || isKepalaSekolah || isWaliKelas || isKurikulum || isBk || isWaka
  }
  if (pathname.startsWith('/master-data/siswa')) {
    return isBau || isKepalaSekolah || isGuru || isWaliKelas || isBk || isKurikulum || isWaka
  }
  if (pathname.startsWith('/master-data/guru')) {
    return isBau || isKepalaSekolah || isHumasSdm || isKurikulum || isIsmuba || isWaka
  }
  if (pathname.startsWith('/master-data/kelas') || pathname.startsWith('/master-data/mata-pelajaran')) {
    return isBau || isKepalaSekolah || isKurikulum || isWaka
  }
  if (pathname.startsWith('/master-data/wali-murid')) {
    return isBau
  }

  // 3. Modul Akademik & Jadwal Pelajaran
  if (pathname.startsWith('/akademik/jadwal-pelajaran')) {
    return isBau || isKepalaSekolah || isGuru || isSiswa || isKurikulum || isGuruPiket || isWaka
  }
  if (pathname.startsWith('/akademik/perangkat-ajar')) {
    return isGuru || isKurikulum || isKepalaSekolah || isBau || isWaka || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }
  if (pathname.startsWith('/akademik/jurnal-mengajar/tambah')) {
    // Pengisian jurnal ajar HANYA untuk Guru Pengampu
    return isGuru
  }
  if (pathname.startsWith('/akademik/jadwal-mengajar') || pathname.startsWith('/akademik/jurnal-mengajar') || pathname.startsWith('/akademik/penilaian')) {
    return isGuru || isBau || isKurikulum || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/jurnal-wali-kelas')) {
    return isWaliKelas || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/e-rapor')) {
    return isGuru || isWaliKelas || isSiswa || isWaliMurid || isBau || isKurikulum || isKepalaSekolah
  }
  if (pathname.startsWith('/siswa/ekstrakurikuler')) {
    return isSiswa || isGuru || isBau || isKepalaSekolah || isWaka || isWaliMurid
  }
  if (pathname.startsWith('/akademik/ekstrakurikuler')) {
    return isKesiswaan || isWaka || isKepalaSekolah || isBau || isGuru || roles.includes('PEMBINA_EKSTRA') || roles.includes('PEMBINA_EXTRA')
  }
  if (pathname.startsWith('/akademik/etika-tatib')) {
    return isTatib || isBk || isGuru || isSiswa || isWaliMurid || isBau || isKepalaSekolah
  }

  // 4. Modul Presensi & Jurnal Harian
  if (pathname.startsWith('/presensi/jurnal-karyawan')) {
    // HANYA untuk Pegawai/Karyawan
    return isPegawai || isBau
  }
  if (pathname.startsWith('/presensi/kehadiran-pegawai')) {
    return isGuru || isPegawai || isBau || isHumasSdm || isGuruPiket || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/kehadiran-siswa')) {
    return isWaliKelas || isSiswa || isWaliMurid || isBau || isGuruPiket || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/izin-keluar')) {
    return isGuru || isPegawai || isBau || isHumasSdm || isGuruPiket || isKepalaSekolah || isWaka
  }
  if (pathname.startsWith('/presensi/izin-siswa')) {
    return isWaliMurid || isSiswa || isWaliKelas || isTatib || isBk || isGuruPiket || isKesiswaan || isWaka || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/dispensasi')) {
    return isTatib || isBau || isKepalaSekolah || isSiswa || isWaliMurid || isWaliKelas || isBk || isKesiswaan || isWaka
  }
  if (pathname.startsWith('/presensi/cuti')) {
    return isGuru || isPegawai || isBau || isTatib || isWaliKelas || isHumasSdm || isKepalaSekolah || isWaka
  }

  // 5. Modul Fitur Sub-Role Khusus (/fitur/[slug])
  if (pathname.startsWith('/fitur/')) {
    const slug = pathname.replace('/fitur/', '').split('/')[0]
    if (slug === 'disposisi') return isGuru || isPegawai || isBau || isKepalaSekolah || isIsmuba || isWaka
    if (slug === 'persuratan' || slug === 'surat-masuk' || slug === 'surat-keluar' || slug === 'arsip' || slug === 'e-archive') return isPersuratan || isBau || isKepalaSekolah || isWaka
    if (slug === 'inventaris') return isBau || isKepalaSekolah || isSarpras || isWaka
    if (slug === 'kepegawaian') return isHumasSdm || isBau || isKepalaSekolah || isWaka
    if (slug === 'buku-tamu') return isHumasSdm || isBau || isKepalaSekolah || isWaka
    if (slug === 'kegiatan' || slug === 'kegiatan-sekolah') return isHumasSdm || isIsmuba || isBau || isKepalaSekolah || isWaka || isKesiswaan
    if (slug === 'notulensi-rapat' || slug === 'notulensi') return isHumasSdm || isBau || isKepalaSekolah || isWaka
    if (slug === 'ketertiban' || slug === 'catatan-kedisiplinan') return isTatib || isBk || isGuru || isWaliKelas || isBau || isKesiswaan || isWaka || isKepalaSekolah
    if (slug === 'bk-bp') return isBk || isTatib || isBau || isKesiswaan || isWaka || isKepalaSekolah
    if (slug === 'perpustakaan') return isPustakawan || isBau || isWaka
    if (slug === 'tahfidz') return isGuruTahfidz || isIsmuba || isBau || isKepalaSekolah || isWaka
    if (slug === 'ismuba' || slug === 'waka-ismuba') return isIsmuba || isBau || isKepalaSekolah || isWaka
    if (slug === 'kebersihan') return roles.includes('KEBERSIHAN') || isBau || isWaka
    if (slug === 'keamanan') return roles.includes('KEAMANAN') || isBau || isWaka
    if (slug === 'ekstrakulikuler' || slug === 'ekstrakurikuler') return roles.includes('PEMBINA_EKSTRA') || roles.includes('PEMBINA_EXTRA') || isBau || isKesiswaan || isWaka
    if (slug === 'kesehatan-sekolah' || slug === 'uks') return roles.includes('KESEHATAN_SEKOLAH') || roles.includes('UKS') || isBau || isKepalaSekolah || isWaka
    if (slug === 'kurikulum') return isKurikulum || isBau || isKepalaSekolah || isWaka
    if (slug === 'guru-piket') return isGuruPiket || isBau || isKepalaSekolah || isWaka
    return isBau || isWaka || isKepalaSekolah
  }

  // 6. Modul Informasi & Banner
  if (pathname.startsWith('/informasi/banner')) {
    return isAdminWeb || isHumasSdm || isBau
  }
  if (pathname.startsWith('/informasi/prestasi') || pathname.startsWith('/informasi/pengumuman') || pathname.startsWith('/berita')) {
    return true
  }

  // 7. Modul Khusus Pengumuman Sistem — HANYA Superadmin & Admin IT
  if (pathname.startsWith('/pengaturan/pengumuman-sistem')) {
    return roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }

  // 8. Pengaturan Notifikasi
  if (pathname.startsWith('/pengaturan/notifikasi-wali')) {
    return isWaliMurid || isBau
  }
  if (pathname.startsWith('/pengaturan/notifikasi')) {
    return isBau
  }

  // Fallback: izinkan jika link rute ada di daftar tautan resmi pengguna
  const allowedLinks = getRoleLinks(roles[0] || 'GURU', roles[1], roles[2], roles[3], roles[4], roles[5])
  return allowedLinks.some(l => pathname.startsWith(l.href))
}

export function getRoleLinks(role: string, subRole?: string, subRole2?: string, subRole3?: string, subRole4?: string, subRole5?: string, username?: string) {
  let currentLinks: any[] = []
  
  const addLinks = (links: any[]) => {
    links.forEach(l => {
      if (!currentLinks.some(e => e.href === l.href)) {
        currentLinks.push(l)
      }
    })
  }

  // Set base links by main role
  if (role === 'SUPERADMIN' || role === 'ADMIN_IT') {
    addLinks(superadminLinks)
  } else if (role === 'KEPALA_SEKOLAH') {
    addLinks(kepalaSekolahLinks)
  } else if (role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA') {
    addLinks(bauLinks)
  } else if (role === 'HONORER') {
    addLinks(honorerLinks)
  } else if (role === 'GURU') {
    addLinks(guruLinks)
  } else if (role === 'SISWA') {
    addLinks(siswaLinks)
  } else if (role === 'WALI_MURID') {
    addLinks(waliMuridLinks)
  } else if (role === 'PEGAWAI' || role === 'KARYAWAN') {
    addLinks(pegawaiLinks)
  } else if (role === 'KEUANGAN' || role === 'KEUANGAN_ALL' || role === 'SUPERVISOR_KEUANGAN') {
    addLinks(keuanganAllLinks)
  } else if (role === 'KEUANGAN_MASUK') {
    addLinks(keuanganMasukLinks)
  } else if (role === 'KEUANGAN_KELUAR') {
    addLinks(keuanganKeluarLinks)
  } else {
    // Default fallback
    addLinks([
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
    ])
  }

  // Apply SubRole links dengan Subgrup Kategori Terstruktur Sesuai Peran (Supervisi & Corporate Standard)
  const applySubRoleLinks = (roleName?: string) => {
    if (!roleName || roleName === role) return

    if (roleName === 'WALI_KELAS') {
      addLinks([
        { name: 'Data Siswa Binaan', href: '/master-data/siswa', icon: UserSquare2, group: 'Tugas Perwalian' },
        { name: 'Presensi Kelas Binaan', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Tugas Perwalian' },
        { name: 'Jurnal Perwalian', href: '/akademik/jurnal-wali-kelas', icon: BookOpen, group: 'Tugas Perwalian' },
        { name: 'Dispensasi & Izin Binaan', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Tugas Perwalian' },
      ])
    } else if (roleName === 'KETERTIBAN') {
      addLinks([
        { name: 'Supervisi Izin & Dispensasi Siswa', href: '/kesiswaan/supervisi-izin-dispensasi', icon: ClipboardCheck, group: 'Supervisi Kesiswaan & Disiplin' },
        { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Supervisi Kesiswaan & Disiplin' },
        { name: 'Verifikasi Dispensasi', href: '/presensi/dispensasi', icon: Award, group: 'Supervisi Kesiswaan & Disiplin' },
        { name: 'Monitoring Perizinan', href: '/presensi/izin-siswa', icon: ClipboardCheck, group: 'Supervisi Kesiswaan & Disiplin' },
      ])
    } else if (roleName === 'BK_BP' || roleName === 'BK') {
      addLinks([
        { name: 'Supervisi Izin & Dispensasi Siswa', href: '/kesiswaan/supervisi-izin-dispensasi', icon: ClipboardCheck, group: 'Supervisi Bimbingan Konseling' },
        { name: 'Layanan Konseling (BK)', href: '/fitur/bk-bp', icon: HeartHandshake, group: 'Supervisi Bimbingan Konseling' },
        { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Supervisi Bimbingan Konseling' },
        { name: 'Monitoring Perizinan', href: '/presensi/izin-siswa', icon: ClipboardCheck, group: 'Supervisi Bimbingan Konseling' },
      ])
    } else if (roleName === 'KEPEGAWAIAN' || roleName === 'SDM' || roleName === 'WAKA_HUMAS_SDM' || roleName === 'HUMAS_SDM') {
      addLinks([
        { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi Humas & SDM' },
        { name: 'Manajemen Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Supervisi Humas & SDM' },
        { name: 'Otorisasi Akun Guru & Tendik', href: '/master-data/pengguna', icon: ShieldCheck, group: 'Supervisi Humas & SDM' },
        { name: 'Otorisasi Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays, group: 'Supervisi Humas & SDM' },
        { name: 'Monitoring Prestasi Siswa', href: '/informasi/prestasi', icon: Trophy, group: 'Supervisi Humas & SDM' },
        { name: 'Buku Tamu Instansi', href: '/fitur/buku-tamu', icon: Contact, group: 'Supervisi Humas & SDM' },
        { name: 'Agenda Korporasi & Acara', href: '/fitur/kegiatan', icon: Sparkles, group: 'Supervisi Humas & SDM' },
        { name: 'Risalah Rapat Korporasi', href: '/fitur/notulensi-rapat', icon: FileText, group: 'Supervisi Humas & SDM' },
        { name: 'Data Pendidik & Tendik', href: '/master-data/guru', icon: Users, group: 'Supervisi Humas & SDM' },
        { name: 'Publikasi & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Supervisi Humas & SDM' },
        { name: 'Banner Portal', href: '/informasi/banner', icon: ImageIcon, group: 'Supervisi Humas & SDM' },
      ])
    } else if (roleName === 'KURIKULUM' || roleName === 'WAKA_KURIKULUM') {
      addLinks([
        { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi Kurikulum' },
        { name: 'Supervisi KBM & Jurnal Mengajar', href: '/akademik/supervisi-jurnal', icon: BookOpen, group: 'Supervisi Kurikulum' },
        { name: 'Supervisi Perangkat Pembelajaran', href: '/akademik/perangkat-ajar', icon: FileText, group: 'Supervisi Kurikulum' },
        { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Supervisi Kurikulum' },
        { name: 'Tata Kelola Kurikulum', href: '/fitur/kurikulum', icon: GraduationCap, group: 'Supervisi Kurikulum' },
        { name: 'Struktur Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: BookOpen, group: 'Supervisi Kurikulum' },
      ])
    } else if (roleName === 'WAKA_KESISWAAN' || roleName === 'KESISWAAN') {
      addLinks([
        { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi Kesiswaan' },
        { name: 'Supervisi Izin & Dispensasi Siswa', href: '/kesiswaan/supervisi-izin-dispensasi', icon: ClipboardCheck, group: 'Supervisi Kesiswaan' },
        { name: 'Monitoring Prestasi Siswa', href: '/informasi/prestasi', icon: Trophy, group: 'Supervisi Kesiswaan' },
        { name: 'Supervisi Ekstrakurikuler', href: '/akademik/ekstrakurikuler', icon: Sparkles, group: 'Supervisi Kesiswaan' },
        { name: 'Kedisiplinan & Tata Tertib', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Supervisi Kesiswaan' },
      ])
    } else if (roleName === 'WAKA_SARPRAS' || roleName === 'SARPRAS') {
      addLinks([
        { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi Sarana & Prasarana' },
        { name: 'Supervisi Aset & Sarpras', href: '/fitur/inventaris', icon: Package, group: 'Supervisi Sarana & Prasarana' },
      ])
    } else if (roleName === 'ISMUBA' || roleName === 'WAKA_ISMUBA') {
      addLinks([
        { name: 'Supervisi Akademik & Kinerja GTK', href: '/akademik/supervisi-akademik', icon: BookCheck, group: 'Supervisi ISMUBA' },
        { name: 'Supervisi Program Tahfidz', href: '/fitur/tahfidz', icon: BookCheck, group: 'Supervisi ISMUBA' },
        { name: 'Tata Kelola ISMUBA', href: '/fitur/ismuba', icon: BookMarked, group: 'Supervisi ISMUBA' },
        { name: 'Agenda Kajian & Karakter', href: '/fitur/kegiatan', icon: Sparkles, group: 'Supervisi ISMUBA' },
        { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck, group: 'Supervisi ISMUBA' },
      ])
    } else if (roleName === 'GURU_PIKET') {
      addLinks([
        { name: 'Log Piket Harian', href: '/fitur/guru-piket', icon: Clock, group: 'Piket Operasional' },
        { name: 'Perizinan Gerbang Siswa', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Piket Operasional' },
        { name: 'Presensi Pembelajaran KBM', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Piket Operasional' },
      ])
    } else if (roleName === 'PERSURATAN') {
      addLinks([
        { name: 'Surat Masuk', href: '/fitur/surat-masuk', icon: Inbox, group: 'Administrasi Persuratan' },
        { name: 'Disposisi', href: '/fitur/disposisi', icon: FileCheck, group: 'Administrasi Persuratan' },
        { name: 'Surat Keluar', href: '/fitur/surat-keluar', icon: Send, group: 'Administrasi Persuratan' },
        { name: 'Arsip Dokumen Digital', href: '/fitur/arsip', icon: Archive, group: 'Administrasi Persuratan' },
      ])
    } else if (roleName === 'PUSTAKAWAN') {
      addLinks([
        { name: 'Perpustakaan & Sumber Belajar', href: '/fitur/perpustakaan', icon: Library, group: 'Layanan Perpustakaan' },
      ])
    } else if (roleName === 'GURU_TAHFIDZ') {
      addLinks([
        { name: 'Program Tahfidz', href: '/fitur/tahfidz', icon: BookMarked, group: 'Program Tahfidz' },
      ])
    } else if (roleName === 'PEMBINA_EKSTRA' || roleName === 'PEMBINA_EXTRA') {
      addLinks([
        { name: 'Ekstrakurikuler', href: '/fitur/ekstrakulikuler', icon: Award, group: 'Pengembangan Siswa' },
      ])
    } else if (roleName === 'ADMIN_WEB') {
      addLinks([
        { name: 'Publikasi & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Publikasi Portal' },
        { name: 'Banner Portal', href: '/informasi/banner', icon: ImageIcon, group: 'Publikasi Portal' },
      ])
    } else if (roleName === 'KEBERSIHAN') {
      addLinks([
        { name: 'Kebersihan & Sanitasi', href: '/fitur/kebersihan', icon: Sparkles, group: 'Layanan Fasilitas' },
      ])
    } else if (roleName === 'KEAMANAN') {
      addLinks([
        { name: 'Keamanan & Ketertiban', href: '/fitur/keamanan', icon: ShieldCheck, group: 'Layanan Keamanan' },
      ])
    } else if (roleName === 'KESEHATAN_SEKOLAH' || roleName === 'UKS') {
      addLinks([
        { name: 'Layanan Kesehatan (UKS)', href: '/fitur/kesehatan-sekolah', icon: HeartPulse, group: 'Layanan Kesehatan' },
      ])
    } else if (roleName === 'ADMIN_TU' || roleName === 'BAU' || roleName === 'TATA_USAHA') {
      addLinks(bauLinks.map(l => ({ ...l, group: 'Administrasi & Persuratan' })))
    } else if (roleName === 'KEUANGAN' || roleName === 'KEUANGAN_ALL' || roleName === 'SUPERVISOR_KEUANGAN') {
      addLinks(keuanganAllLinks.map(l => ({ ...l, group: 'Manajemen Finansial' })))
    } else if (roleName === 'KEUANGAN_MASUK') {
      addLinks(keuanganMasukLinks.map(l => ({ ...l, group: 'Penerimaan Kas' })))
    } else if (roleName === 'KEUANGAN_KELUAR') {
      addLinks(keuanganKeluarLinks.map(l => ({ ...l, group: 'Pengeluaran Kas' })))
    } else if (roleName === 'PEGAWAI' || roleName === 'KARYAWAN') {
      addLinks([
        { name: 'Jurnal Kinerja Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen, group: 'Kinerja Operasional' },
      ])
    } else if (roleName === 'GURU') {
      addLinks([
        { name: 'Jurnal Pembelajaran', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Operasional Akademik' },
        { name: 'Rekam Disiplin Siswa', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Operasional Akademik' },
      ])
    }
  }

  applySubRoleLinks(subRole)
  applySubRoleLinks(subRole2)
  applySubRoleLinks(subRole3)
  applySubRoleLinks(subRole4)
  applySubRoleLinks(subRole5)

  // Filter profil
  const filtered = currentLinks.filter(link => link.href !== '/pengaturan/profil' && link.name !== 'Profil')

  // Pastikan urutan:
  // 1. Paling Atas: Fitur umum yang sering digunakan (Dashboard, Log Presensi, Presensi QR, Disposisi / tanpa group)
  // 2. Di Tengah: Fitur role & subrole (Master Data, Supervisi, Operasional, Administrasi, dll.)
  // 3. Paling Bawah: Layanan Mandiri (Slip Gaji, Tunjangan Harian, Izin, Cuti, Notifikasi)
  const topGeneral = filtered.filter(l => !l.group)
  const middleRoleFeatures = filtered.filter(l => l.group && l.group !== 'Layanan Mandiri')
  const bottomPersonal = filtered.filter(l => l.group === 'Layanan Mandiri')

  return [...topGeneral, ...middleRoleFeatures, ...bottomPersonal]
}
