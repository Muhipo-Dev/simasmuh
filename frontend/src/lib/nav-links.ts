import { 
  LayoutDashboard, Users, UserSquare2, CalendarDays, ClipboardCheck, 
  GraduationCap, BookOpen, Settings, LogOut, Menu, UserCog, QrCode, 
  DoorOpen, UserCircle2, Megaphone, Wallet, Receipt, X, MoreHorizontal, 
  Banknote, FileText, Image as ImageIcon, Award, FileCheck,
  ShieldAlert, Sparkles, ShieldCheck, UserCheck, HeartHandshake,
  Library, BookMarked, Mail, Contact, Package, Boxes, Camera, BellRing, Database,
  Clock
} from 'lucide-react'

// 1. Superadmin & Admin IT (Kontrol Penuh Sistem & Master Data)
export const superadminLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Guru', href: '/master-data/guru', icon: Users, group: 'Master Data' },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2, group: 'Master Data' },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users, group: 'Master Data' },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen, group: 'Master Data' },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Master Data' },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Master Data' },
  { name: 'Layar QR Presensi', href: '/presensi/manajemen-qr', icon: QrCode, group: 'Pengaturan Sistem' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Pengaturan Sistem' },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Pengaturan Sistem' },
  { name: 'Izin Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays, group: 'Pengaturan Sistem' },
  { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Pengaturan Sistem' },
  { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon, group: 'Pengaturan Sistem' },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog, group: 'Pengaturan Sistem' },
  { name: 'Pengumuman Sistem', href: '/pengaturan/pengumuman-sistem', icon: BellRing, group: 'Pengaturan Sistem' },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi', icon: Mail, group: 'Pengaturan Sistem' },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings, group: 'Pengaturan Sistem' },
]

// 2. Admin TU / BAU (Tata Usaha & Administrasi Umum)
export const bauLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Arsip & Persuratan', href: '/fitur/persuratan', icon: Mail, group: 'Tata Usaha' },
  { name: 'Inventaris & Aset', href: '/fitur/inventaris', icon: Package, group: 'Tata Usaha' },
  { name: 'Buku Tamu', href: '/fitur/buku-tamu', icon: Contact, group: 'Tata Usaha' },
  { name: 'Kegiatan Sekolah', href: '/fitur/kegiatan', icon: Sparkles, group: 'Tata Usaha' },
  { name: 'Notulensi Rapat', href: '/fitur/notulensi-rapat', icon: FileText, group: 'Tata Usaha' },
  { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Tata Usaha' },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2, group: 'Master Data' },
  { name: 'Guru', href: '/master-data/guru', icon: Users, group: 'Master Data' },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users, group: 'Master Data' },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen, group: 'Master Data' },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Master Data' },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Master Data' },
  { name: 'Layar QR Presensi', href: '/presensi/manajemen-qr', icon: QrCode, group: 'Administrasi' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote, group: 'Administrasi' },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Administrasi' },
  { name: 'Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays, group: 'Administrasi' },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog, group: 'Administrasi' },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi', icon: Mail, group: 'Administrasi' },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings, group: 'Administrasi' },
]

// 3. Guru (Tugas Akademik Mengajar)
export const guruLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Disposisi Surat', href: '/fitur/disposisi', icon: FileCheck },
  { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Tugas Guru' },
  { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Tugas Guru' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 4. Siswa
export const siswaLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Nilai Semester', href: '/akademik/nilai-semester', icon: GraduationCap },
  { name: 'Log Izin Saya', href: '/presensi/izin-siswa', icon: ClipboardCheck },
  { name: 'Log Dispensasi', href: '/presensi/dispensasi', icon: Award },
  { name: 'Keuangan', href: '/keuangan/laporan', icon: Wallet },
  { name: 'Etika & Tatib', href: '/akademik/etika-tatib', icon: ShieldCheck },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 5. Wali Murid
export const waliMuridLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Nilai Semester', href: '/akademik/nilai-semester', icon: GraduationCap },
  { name: 'Izin Sakit / Siswa', href: '/presensi/izin-siswa', icon: ClipboardCheck },
  { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award },
  { name: 'Tagihan & SPP', href: '/keuangan/laporan', icon: Wallet },
  { name: 'Etika & Tatib', href: '/akademik/etika-tatib', icon: ShieldCheck },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-wali', icon: Mail },
]

// 6. Pegawai / Karyawan
export const pegawaiLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Disposisi Surat', href: '/fitur/disposisi', icon: FileCheck },
  { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen, group: 'Tugas Pegawai' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 7. Kepala Sekolah (Supervisi Log Aktivitas Sekolah & E-Sign Persuratan)
export const kepalaSekolahLinks = [
  { name: 'Dashboard Eksekutif', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi Guru & Staf', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck, group: 'Supervisi Log Presensi' },
  { name: 'Log Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Supervisi Log Presensi' },
  { name: 'Disposisi Surat', href: '/fitur/disposisi', icon: FileCheck, group: 'Supervisi & E-Sign' },
  { name: 'E-Sign & Persuratan', href: '/fitur/persuratan', icon: Mail, group: 'Supervisi & E-Sign' },
  { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Supervisi Akademik' },
  { name: 'Supervisi Jurnal Guru', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Supervisi Akademik' },
  { name: 'Supervisi Jurnal Wali Kelas', href: '/akademik/jurnal-wali-kelas', icon: BookOpen, group: 'Supervisi Akademik' },
  { name: 'Rekap Nilai Semester', href: '/akademik/nilai-semester', icon: GraduationCap, group: 'Supervisi Akademik' },
  { name: 'Log Karakter & Tatib', href: '/akademik/etika-tatib', icon: ShieldCheck, group: 'Supervisi Kesiswaan' },
  { name: 'Data Rombel & Kelas', href: '/master-data/kelas', icon: BookOpen, group: 'Supervisi Data' },
  { name: 'Data Guru & Pegawai', href: '/master-data/guru', icon: Users, group: 'Supervisi Data' },
  { name: 'Data Siswa & Induk', href: '/master-data/siswa', icon: UserSquare2, group: 'Supervisi Data' },
  { name: 'Data Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, group: 'Supervisi Data' },
  { name: 'Supervisi Sarpras & Aset', href: '/fitur/inventaris', icon: Package, group: 'Supervisi Umum' },
  { name: 'Supervisi Kepegawaian', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Supervisi Umum' },
  { name: 'Agenda & Kegiatan', href: '/fitur/kegiatan-sekolah', icon: CalendarDays, group: 'Supervisi Umum' },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: Wallet, group: 'Supervisi Keuangan' },
  { name: 'Slip Gaji Pribadi', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar Kampus', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 8. Keuangan Penuh (Keuangan All / Supervisor Keuangan)
export const keuanganAllLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Masuk', href: '/keuangan/pemasukan', icon: Wallet, group: 'Keuangan Sekolah' },
  { name: 'Keuangan Keluar', href: '/keuangan/pengeluaran', icon: Receipt, group: 'Keuangan Sekolah' },
  { name: 'Virtual Account BNI', href: '/keuangan/virtual-account', icon: Database, group: 'Keuangan Sekolah' },
  { name: 'Penggajian Pegawai', href: '/keuangan/penggajian', icon: Banknote, group: 'Keuangan Sekolah' },
  { name: 'Pengaturan Biaya & Diskon', href: '/keuangan/pengaturan', icon: Settings, group: 'Keuangan Sekolah' },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText, group: 'Keuangan Sekolah' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 9. Keuangan Masuk
export const keuanganMasukLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Masuk', href: '/keuangan/pemasukan', icon: Wallet, group: 'Keuangan Masuk' },
  { name: 'Virtual Account BNI', href: '/keuangan/virtual-account', icon: Database, group: 'Keuangan Masuk' },
  { name: 'Pengaturan Biaya & Diskon', href: '/keuangan/pengaturan', icon: Settings, group: 'Keuangan Masuk' },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText, group: 'Keuangan Masuk' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// 10. Keuangan Keluar
export const keuanganKeluarLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Keluar', href: '/keuangan/pengeluaran', icon: Receipt, group: 'Keuangan Keluar' },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText, group: 'Keuangan Keluar' },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

// Pengecekan Hak Akses Rute Ketat Berdasarkan Role & Sub-Role
export function isPathAllowedForRoles(pathname: string, roles: string[]): boolean {
  // 1. Modul Keuangan (MUTLAK: Superadmin, Admin IT, Admin TU/BAU DILARANG mengakses seluruh panel keuangan, KECUALI slip-gaji)
  if (pathname.startsWith('/keuangan/')) {
    // Slip Gaji — Diizinkan untuk setiap staf/pengguna sistem (kecuali SISWA dan WALI_MURID)
    if (pathname.startsWith('/keuangan/slip-gaji')) {
      return !roles.includes('SISWA') && !roles.includes('WALI_MURID')
    }
    // Laporan Keuangan untuk Siswa / Wali Murid
    if (pathname.startsWith('/keuangan/laporan') && (roles.includes('SISWA') || roles.includes('WALI_MURID'))) {
      return true
    }

    const isKeuanganAll = roles.includes('KEUANGAN_ALL') || roles.includes('SUPERVISOR_KEUANGAN')
    const isKeuanganMasuk = roles.includes('KEUANGAN_MASUK')
    const isKeuanganKeluar = roles.includes('KEUANGAN_KELUAR')
    const isKeuanganPure = roles.includes('KEUANGAN') || isKeuanganAll || isKeuanganMasuk || isKeuanganKeluar

    // Keuangan Masuk (Hanya staf Keuangan Masuk & Keuangan All)
    if (pathname.startsWith('/keuangan/pemasukan') || pathname.startsWith('/keuangan/virtual-account') || pathname.startsWith('/keuangan/pengaturan') || pathname.startsWith('/keuangan/verifikasi-pembayaran')) {
      return isKeuanganAll || isKeuanganMasuk || roles.includes('KEUANGAN')
    }
    // Keuangan Keluar (Hanya staf Keuangan Keluar & Keuangan All)
    if (pathname.startsWith('/keuangan/pengeluaran') || pathname.startsWith('/keuangan/lpj')) {
      return isKeuanganAll || isKeuanganKeluar || roles.includes('KEUANGAN')
    }
    // Penggajian Pegawai — HANYA Keuangan All
    if (pathname.startsWith('/keuangan/penggajian')) {
      return isKeuanganAll || roles.includes('KEUANGAN')
    }
    // Laporan Keuangan — Keuangan All, Masuk, Keluar, dan Kepala Sekolah (Supervisi Eksekutif)
    if (pathname.startsWith('/keuangan/laporan')) {
      return isKeuanganPure || roles.includes('KEPALA_SEKOLAH')
    }
    return isKeuanganPure
  }

  // Superadmin & Admin IT memiliki akses penuh ke rute non-keuangan
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

  const isKepalaSekolah = roles.includes('KEPALA_SEKOLAH')
  const isBau = roles.includes('ADMIN_TU') || roles.includes('BAU') || roles.includes('TATA_USAHA')
  const isGuru = roles.includes('GURU')
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
  const isPersuratan = roles.includes('PERSURATAN')
  const isKurikulum = roles.includes('KURIKULUM')
  const isGuruPiket = roles.includes('GURU_PIKET')

  // 1. Modul Manajemen Akun & Pengaturan Sistem — HANYA Admin TU / BAU & Superadmin
  if (pathname.startsWith('/master-data/pengguna') || pathname.startsWith('/pengaturan/sistem') || pathname.startsWith('/presensi/manajemen-qr') || pathname.startsWith('/presensi/camera')) {
    return isBau || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }

  // 2. Modul Master Data Siswa, Guru, Kelas, Mapel
  if (pathname.startsWith('/master-data/siswa')) {
    return isBau || isKepalaSekolah || isGuru || isWaliKelas || isBk || isKurikulum
  }
  if (pathname.startsWith('/master-data/guru')) {
    return isBau || isKepalaSekolah || isHumasSdm || isKurikulum
  }
  if (pathname.startsWith('/master-data/kelas') || pathname.startsWith('/master-data/mata-pelajaran')) {
    return isBau || isKepalaSekolah || isKurikulum
  }
  if (pathname.startsWith('/master-data/wali-murid')) {
    return isBau
  }

  // 3. Modul Akademik
  if (pathname.startsWith('/akademik/jadwal-pelajaran')) {
    return isBau || isKepalaSekolah || isGuru || isSiswa || isKurikulum || isGuruPiket
  }
  if (pathname.startsWith('/akademik/nilai-semester')) {
    return isSiswa || isWaliMurid || isGuru || isWaliKelas || isBau || isKepalaSekolah || isKurikulum
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
    return isGuru || isPegawai || isBau || isHumasSdm || isGuruPiket || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/izin-siswa')) {
    return isWaliMurid || isSiswa || isWaliKelas || isTatib || isBk || isGuruPiket
  }
  if (pathname.startsWith('/presensi/dispensasi')) {
    return isTatib || isBau || isKepalaSekolah || isSiswa || isWaliMurid || isWaliKelas || isBk
  }
  if (pathname.startsWith('/presensi/cuti')) {
    return isGuru || isPegawai || isBau || isTatib || isWaliKelas || isHumasSdm || isKepalaSekolah
  }

  // 5. Modul Fitur Sub-Role Khusus (/fitur/[slug])
  if (pathname.startsWith('/fitur/')) {
    const slug = pathname.replace('/fitur/', '').split('/')[0]
    if (slug === 'disposisi') return isGuru || isPegawai || isBau || isKepalaSekolah
    if (slug === 'persuratan') return isPersuratan || isBau || isKepalaSekolah
    if (slug === 'inventaris') return isBau || isKepalaSekolah
    if (slug === 'kepegawaian') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'buku-tamu') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'kegiatan' || slug === 'kegiatan-sekolah') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'notulensi-rapat' || slug === 'notulensi') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'ketertiban' || slug === 'catatan-kedisiplinan') return isTatib || isBk || isGuru || isWaliKelas || isBau
    if (slug === 'bk-bp') return isBk || isTatib || isBau
    if (slug === 'perpustakaan') return isPustakawan || isBau
    if (slug === 'tahfidz') return isGuruTahfidz || isBau
    if (slug === 'kebersihan') return roles.includes('KEBERSIHAN') || isBau
    if (slug === 'keamanan') return roles.includes('KEAMANAN') || isBau
    if (slug === 'ekstrakulikuler') return roles.includes('PEMBINA_EKSTRA') || roles.includes('PEMBINA_EXTRA') || isBau
    if (slug === 'kurikulum') return isKurikulum || isBau || isKepalaSekolah
    if (slug === 'guru-piket') return isGuruPiket || isBau || isKepalaSekolah
    return isBau
  }

  // 6. Modul Informasi & Banner
  if (pathname.startsWith('/informasi/banner')) {
    return isAdminWeb || isHumasSdm || isBau
  }
  if (pathname.startsWith('/informasi/pengumuman') || pathname.startsWith('/berita')) {
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

export function getRoleLinks(role: string, subRole?: string, subRole2?: string, subRole3?: string, subRole4?: string, subRole5?: string) {
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
  } else if (role === 'GURU') {
    addLinks(guruLinks)
  } else if (role === 'SISWA') {
    addLinks(siswaLinks)
  } else if (role === 'WALI_MURID') {
    addLinks(waliMuridLinks)
  } else if (role === 'PEGAWAI' || role === 'KARYAWAN') {
    addLinks(pegawaiLinks)
  } else if (role === 'KEUANGAN_ALL' || role === 'SUPERVISOR_KEUANGAN') {
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

  // Apply SubRole links dengan Subgrup Kategori Terstruktur Sesuai Peran
  const applySubRoleLinks = (roleName?: string) => {
    if (!roleName || roleName === role) return

    if (roleName === 'WALI_KELAS') {
      addLinks([
        { name: 'Manajemen Siswa', href: '/master-data/siswa', icon: UserSquare2, group: 'Tugas Wali Kelas' },
        { name: 'Presensi Kelas Harian', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Tugas Wali Kelas' },
        { name: 'Jurnal Kelas', href: '/akademik/jurnal-wali-kelas', icon: BookOpen, group: 'Tugas Wali Kelas' },
        { name: 'Izin Siswa', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Tugas Wali Kelas' },
      ])
    } else if (roleName === 'KETERTIBAN') {
      addLinks([
        { name: 'Poin Kedisiplinan Siswa', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Tim Kedisiplinan' },
        { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award, group: 'Tim Kedisiplinan' },
        { name: 'Izin Siswa', href: '/presensi/izin-siswa', icon: ClipboardCheck, group: 'Tim Kedisiplinan' },
      ])
    } else if (roleName === 'BK_BP' || roleName === 'BK') {
      addLinks([
        { name: 'BK & Konseling', href: '/fitur/bk-bp', icon: HeartHandshake, group: 'Bimbingan Konseling' },
        { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Bimbingan Konseling' },
        { name: 'Izin Siswa', href: '/presensi/izin-siswa', icon: ClipboardCheck, group: 'Bimbingan Konseling' },
      ])
    } else if (roleName === 'KEPEGAWAIAN' || roleName === 'SDM' || roleName === 'WAKA_HUMAS_SDM' || roleName === 'HUMAS_SDM') {
      addLinks([
        { name: 'Kepegawaian & SDM', href: '/fitur/kepegawaian', icon: UserCheck, group: 'Humas & Kepegawaian' },
        { name: 'Buku Tamu', href: '/fitur/buku-tamu', icon: Contact, group: 'Humas & Kepegawaian' },
        { name: 'Kegiatan Sekolah', href: '/fitur/kegiatan', icon: Sparkles, group: 'Humas & Kepegawaian' },
        { name: 'Notulensi Rapat', href: '/fitur/notulensi-rapat', icon: FileText, group: 'Humas & Kepegawaian' },
        { name: 'Data Guru & Pegawai', href: '/master-data/guru', icon: Users, group: 'Humas & Kepegawaian' },
        { name: 'Manajemen Izin Cuti', href: '/presensi/cuti', icon: CalendarDays, group: 'Humas & Kepegawaian' },
        { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Humas & Kepegawaian' },
        { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon, group: 'Humas & Kepegawaian' },
      ])
    } else if (roleName === 'KURIKULUM') {
      addLinks([
        { name: 'Manajemen Kurikulum', href: '/fitur/kurikulum', icon: GraduationCap, group: 'Tim Kurikulum' },
        { name: 'Struktur Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: BookOpen, group: 'Tim Kurikulum' },
        { name: 'Jadwal Pelajaran KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, group: 'Tim Kurikulum' },
        { name: 'Rekap Nilai Semester', href: '/akademik/nilai-semester', icon: Award, group: 'Tim Kurikulum' },
      ])
    } else if (roleName === 'GURU_PIKET') {
      addLinks([
        { name: 'Log Guru Piket', href: '/fitur/guru-piket', icon: Clock, group: 'Guru Piket' },
        { name: 'Izin Siswa Gerbang', href: '/presensi/izin-siswa', icon: DoorOpen, group: 'Guru Piket' },
        { name: 'Presensi KBM Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck, group: 'Guru Piket' },
      ])
    } else if (roleName === 'PERSURATAN') {
      addLinks([
        { name: 'Arsip & Persuratan', href: '/fitur/persuratan', icon: Mail, group: 'Layanan Persuratan' },
      ])
    } else if (roleName === 'PUSTAKAWAN') {
      addLinks([
        { name: 'Perpustakaan', href: '/fitur/perpustakaan', icon: Library, group: 'Perpustakaan' },
      ])
    } else if (roleName === 'GURU_TAHFIDZ') {
      addLinks([
        { name: 'Guru Tahfidz', href: '/fitur/tahfidz', icon: BookMarked, group: 'Program Tahfidz' },
      ])
    } else if (roleName === 'PEMBINA_EKSTRA' || roleName === 'PEMBINA_EXTRA') {
      addLinks([
        { name: 'Ekstrakulikuler', href: '/fitur/ekstrakulikuler', icon: Award, group: 'Ekstrakulikuler' },
      ])
    } else if (roleName === 'ADMIN_WEB') {
      addLinks([
        { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Admin Web' },
        { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon, group: 'Admin Web' },
      ])
    } else if (roleName === 'KEBERSIHAN') {
      addLinks([
        { name: 'Kebersihan', href: '/fitur/kebersihan', icon: Sparkles, group: 'Layanan Lingkungan' },
      ])
    } else if (roleName === 'KEAMANAN') {
      addLinks([
        { name: 'Keamanan', href: '/fitur/keamanan', icon: ShieldCheck, group: 'Layanan Keamanan' },
      ])
    } else if (roleName === 'ADMIN_TU' || roleName === 'BAU' || roleName === 'TATA_USAHA') {
      addLinks(bauLinks.map(l => ({ ...l, group: 'Tata Usaha (BAU)' })))
    } else if (roleName === 'KEUANGAN_ALL' || roleName === 'SUPERVISOR_KEUANGAN') {
      addLinks(keuanganAllLinks.map(l => ({ ...l, group: 'Panel Keuangan' })))
    } else if (roleName === 'KEUANGAN_MASUK') {
      addLinks(keuanganMasukLinks.map(l => ({ ...l, group: 'Keuangan Masuk' })))
    } else if (roleName === 'KEUANGAN_KELUAR') {
      addLinks(keuanganKeluarLinks.map(l => ({ ...l, group: 'Keuangan Keluar' })))
    } else if (roleName === 'PEGAWAI' || roleName === 'KARYAWAN') {
      addLinks([
        { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen, group: 'Tugas Pegawai' },
        { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Tugas Pegawai' },
      ])
    } else if (roleName === 'GURU') {
      addLinks([
        { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen, group: 'Tugas Guru' },
        { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Tugas Guru' },
        { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Tugas Guru' },
      ])
    }
  }

  applySubRoleLinks(subRole)
  applySubRoleLinks(subRole2)
  applySubRoleLinks(subRole3)
  applySubRoleLinks(subRole4)
  applySubRoleLinks(subRole5)

  // Pastikan tombol Profil selalu difilter untuk semua pengguna tanpa terkecuali
  return currentLinks.filter(link => link.href !== '/pengaturan/profil' && link.name !== 'Profil')
}
