import { 
  LayoutDashboard, Users, UserSquare2, CalendarDays, ClipboardCheck, 
  GraduationCap, BookOpen, Settings, LogOut, Menu, UserCog, QrCode, 
  DoorOpen, UserCircle2, Megaphone, Wallet, Receipt, X, MoreHorizontal, 
  Banknote, FileText, Image as ImageIcon, Award, FileCheck,
  ShieldAlert, Sparkles, ShieldCheck, UserCheck, HeartHandshake,
  Library, BookMarked, Mail, Contact, Package, Boxes, Camera, BellRing, Database
} from 'lucide-react'

export const superadminLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Layar QR Presensi', href: '/presensi/manajemen-qr', icon: QrCode },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone },
  { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog },
  { name: 'Pengumuman Sistem', href: '/pengaturan/pengumuman-sistem', icon: BellRing },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi', icon: Mail },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const bauLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Arsip & Persuratan', href: '/fitur/persuratan', icon: Mail },
  { name: 'Inventaris & Aset', href: '/fitur/inventaris', icon: Package },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Layar QR Presensi', href: '/presensi/manajemen-qr', icon: QrCode },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Buku Tamu', href: '/fitur/buku-tamu', icon: Contact },
  { name: 'Kegiatan Sekolah', href: '/fitur/kegiatan', icon: Sparkles },
  { name: 'Notulensi Rapat', href: '/fitur/notulensi-rapat', icon: FileText },
  { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi', icon: Mail },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const guruLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Disposisi Surat', href: '/fitur/disposisi', icon: FileCheck },
  { name: 'Jadwal Mengajar', href: '/akademik/jadwal-mengajar', icon: CalendarDays },
  { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen },
  { name: 'Catatan Kedisiplinan', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

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

export const pegawaiLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Disposisi Surat', href: '/fitur/disposisi', icon: FileCheck },
  { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

export const kepalaSekolahLinks = [
  { name: 'Dashboard Eksekutif', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'E-Sign & Persuratan', href: '/fitur/persuratan', icon: FileCheck },
  { name: 'Data Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Data Guru & Pegawai', href: '/master-data/guru', icon: Users },
  { name: 'Data Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Data Mapel', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award },
  { name: 'Inventaris & Sarpras', href: '/fitur/inventaris', icon: Package },
  { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

export const keuanganAllLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Masuk', href: '/keuangan/pemasukan', icon: Wallet },
  { name: 'Keuangan Keluar', href: '/keuangan/pengeluaran', icon: Receipt },
  { name: 'Virtual Account BNI', href: '/keuangan/virtual-account', icon: Database },
  { name: 'Penggajian Pegawai', href: '/keuangan/penggajian', icon: Banknote },
  { name: 'Pengaturan Biaya & Diskon', href: '/keuangan/pengaturan', icon: Settings },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

export const keuanganMasukLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Masuk', href: '/keuangan/pemasukan', icon: Wallet },
  { name: 'Virtual Account BNI', href: '/keuangan/virtual-account', icon: Database },
  { name: 'Pengaturan Biaya & Diskon', href: '/keuangan/pengaturan', icon: Settings },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText },
  { name: 'Slip Gaji', href: '/keuangan/slip-gaji', icon: Banknote },
  { name: 'Notifikasi Email', href: '/pengaturan/notifikasi-pengguna', icon: Mail },
]

export const keuanganKeluarLinks = [
  { name: 'Dashboard Keuangan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Absen', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Keuangan Keluar', href: '/keuangan/pengeluaran', icon: Receipt },
  { name: 'Laporan Keuangan', href: '/keuangan/laporan', icon: FileText },
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
    // Laporan Keuangan — Keuangan All, Masuk, Keluar
    if (pathname.startsWith('/keuangan/laporan')) {
      return isKeuanganPure
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
  const isKeuanganAll = roles.includes('KEUANGAN_ALL') || roles.includes('SUPERVISOR_KEUANGAN')
  const isKeuanganMasuk = roles.includes('KEUANGAN_MASUK')
  const isKeuanganKeluar = roles.includes('KEUANGAN_KELUAR')
  const isKeuanganPure = roles.includes('KEUANGAN') || isKeuanganAll || isKeuanganMasuk || isKeuanganKeluar
  const isGuru = roles.includes('GURU') || roles.includes('WALI_KELAS')
  const isWaliKelas = roles.includes('WALI_KELAS')
  const isPegawai = roles.includes('PEGAWAI') || roles.includes('KARYAWAN')
  const isSiswa = roles.includes('SISWA')
  const isWaliMurid = roles.includes('WALI_MURID')
  const isTatib = roles.includes('KETERTIBAN')
  const isHumasSdm = roles.includes('KEPEGAWAIAN') || roles.includes('SDM') || roles.includes('WAKA_HUMAS_SDM') || roles.includes('HUMAS_SDM')
  const isAdminWeb = roles.includes('ADMIN_WEB') || isHumasSdm
  const isBk = roles.includes('BK_BP')
  const isPustakawan = roles.includes('PUSTAKAWAN')
  const isGuruTahfidz = roles.includes('GURU_TAHFIDZ')
  const isPersuratan = roles.includes('PERSURATAN')

  // 1. Modul Manajemen Akun & Pengaturan Sistem — HANYA Admin TU / BAU & Superadmin
  if (pathname.startsWith('/master-data/pengguna') || pathname.startsWith('/pengaturan/sistem') || pathname.startsWith('/presensi/manajemen-qr') || pathname.startsWith('/presensi/camera')) {
    return isBau || roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }



  // 3. Modul Master Data Siswa, Guru, Kelas, Mapel — BAU, Superadmin & Kepala Sekolah/Guru/Wali Kelas/BK/Humas SDM
  if (pathname.startsWith('/master-data/siswa')) {
    return isBau || isKepalaSekolah || isGuru || isWaliKelas || isBk
  }
  if (pathname.startsWith('/master-data/guru')) {
    return isBau || isKepalaSekolah || isHumasSdm
  }
  if (pathname.startsWith('/master-data/kelas') || pathname.startsWith('/master-data/mata-pelajaran')) {
    return isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/master-data/wali-murid')) {
    return isBau
  }

  // 4. Modul Akademik
  if (pathname.startsWith('/akademik/jadwal-pelajaran')) {
    return isBau || isKepalaSekolah || isGuru || isSiswa
  }
  if (pathname.startsWith('/akademik/nilai-semester')) {
    return isSiswa || isWaliMurid || isGuru || isWaliKelas || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/jadwal-mengajar') || pathname.startsWith('/akademik/jurnal-mengajar') || pathname.startsWith('/akademik/penilaian')) {
    return isGuru || isBau
  }
  if (pathname.startsWith('/akademik/jurnal-wali-kelas')) {
    return isWaliKelas || isBau
  }
  if (pathname.startsWith('/akademik/e-rapor')) {
    return isGuru || isWaliKelas || isSiswa || isWaliMurid || isBau
  }
  if (pathname.startsWith('/akademik/etika-tatib')) {
    return isTatib || isBk || isGuru || isSiswa || isWaliMurid || isBau
  }

  // 5. Modul Presensi
  if (pathname.startsWith('/presensi/kehadiran-pegawai') || pathname.startsWith('/presensi/jurnal-karyawan')) {
    return isGuru || isPegawai || isBau || isHumasSdm
  }
  if (pathname.startsWith('/presensi/kehadiran-siswa')) {
    return isWaliKelas || isSiswa || isWaliMurid || isBau
  }
  if (pathname.startsWith('/presensi/izin-keluar')) {
    return isGuru || isPegawai || isBau || isHumasSdm
  }
  if (pathname.startsWith('/presensi/izin-siswa')) {
    return isWaliMurid || isSiswa || isWaliKelas || isTatib || isBk
  }
  if (pathname.startsWith('/presensi/dispensasi')) {
    return isTatib || isBau || isKepalaSekolah || isSiswa || isWaliMurid || isWaliKelas || isBk
  }
  if (pathname.startsWith('/presensi/cuti')) {
    return isGuru || isPegawai || isBau || isTatib || isWaliKelas || isHumasSdm
  }

  // 6. Modul Fitur Sub-Role Khusus (/fitur/[slug])
  if (pathname.startsWith('/fitur/')) {
    const slug = pathname.replace('/fitur/', '').split('/')[0]
    if (slug === 'disposisi') return isGuru || isPegawai || isBau || isKepalaSekolah
    if (slug === 'persuratan') return isPersuratan || isBau || isKepalaSekolah || isGuru || isPegawai
    if (slug === 'inventaris') return isBau || isKepalaSekolah
    if (slug === 'kepegawaian') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'buku-tamu') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'kegiatan' || slug === 'kegiatan-sekolah') return isHumasSdm || isBau || isKepalaSekolah || isGuru || isPegawai
    if (slug === 'notulensi-rapat' || slug === 'notulensi') return isHumasSdm || isBau || isKepalaSekolah
    if (slug === 'ketertiban' || slug === 'catatan-kedisiplinan') return isTatib || isBk || isGuru || isWaliKelas || isBau
    if (slug === 'bk-bp') return isBk || isTatib || isBau
    if (slug === 'perpustakaan') return isPustakawan || isBau
    if (slug === 'tahfidz') return isGuruTahfidz || isBau
    if (slug === 'kebersihan') return roles.includes('KEBERSIHAN') || isBau
    if (slug === 'keamanan') return roles.includes('KEAMANAN') || isBau
    if (slug === 'ekstrakulikuler') return roles.includes('PEMBINA_EKSTRA') || roles.includes('PEMBINA_EXTRA') || isBau
    return isBau
  }

  // 7. Modul Informasi & Banner (Admin Web & Humas SDM)
  if (pathname.startsWith('/informasi/banner')) {
    return isAdminWeb || isHumasSdm || isBau
  }
  if (pathname.startsWith('/informasi/pengumuman') || pathname.startsWith('/berita')) {
    return true // Berita/pengumuman umum & Admin Web
  }

  // 8. Modul Khusus Pengumuman Sistem — HANYA Superadmin & Admin IT
  if (pathname.startsWith('/pengaturan/pengumuman-sistem')) {
    return roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')
  }

  // 9. Pengaturan Notifikasi
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

  // Apply SubRole links dengan Subgrup Kategori Terstruktur
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
        { name: 'Poin Kedisiplinan Siswa', href: '/fitur/catatan-kedisiplinan', icon: ShieldAlert, group: 'Tim Ketertiban' },
        { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award, group: 'Tim Ketertiban' },
        { name: 'Izin Siswa', href: '/presensi/izin-siswa', icon: ClipboardCheck, group: 'Tim Ketertiban' },
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
        { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone, group: 'Pengelola Website' },
        { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon, group: 'Pengelola Website' },
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
        { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen, group: 'Tugas Karyawan' },
        { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen, group: 'Tugas Karyawan' },
      ])
    } else if (roleName === 'GURU') {
      addLinks([
        { name: 'Jadwal Mengajar', href: '/akademik/jadwal-mengajar', icon: CalendarDays, group: 'Tugas Guru' },
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
