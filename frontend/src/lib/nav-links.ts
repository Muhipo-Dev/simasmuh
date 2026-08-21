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
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'QR Layar (Publik)', href: '/presensi/manajemen-qr', icon: QrCode },
  { name: 'Presensi Camera AI', href: '/presensi/camera', icon: Camera },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Cuti Pegawai (SDM)', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog },
  { name: 'Kelola Notifikasi', href: '/pengaturan/notifikasi', icon: BellRing },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const bauLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Wali Murid', href: '/master-data/wali-murid', icon: Users },
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'QR Layar (Publik)', href: '/presensi/manajemen-qr', icon: QrCode },
  { name: 'Presensi Camera AI', href: '/presensi/camera', icon: Camera },
  { name: 'Izin Keluar Pegawai', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Cuti Pegawai (SDM)', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Buku Tamu', href: '/fitur/buku-tamu', icon: Contact },
  { name: 'Arsip & Persuratan', href: '/fitur/persuratan', icon: Mail },
  { name: 'Inventaris & Aset', href: '/fitur/inventaris', icon: Package },
  { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog },
  { name: 'Kelola Notifikasi', href: '/pengaturan/notifikasi', icon: BellRing },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const guruLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Jadwal', href: '/akademik/jadwal-mengajar', icon: CalendarDays },
  { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
]

export const siswaLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Jadwal', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Keuangan', href: '/keuangan/laporan', icon: Wallet },
  { name: 'Etika & Tatib', href: '/akademik/etika-tatib', icon: ShieldCheck },
  { name: 'E-Rapor', href: '/akademik/e-rapor', icon: GraduationCap },
]

export const waliMuridLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Izin Siswa', href: '/presensi/izin-siswa', icon: ClipboardCheck },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Tagihan & SPP', href: '/keuangan/laporan', icon: Wallet },
  { name: 'Etika & Tatib', href: '/akademik/etika-tatib', icon: ShieldCheck },
  { name: 'E-Rapor Siswa', href: '/akademik/e-rapor', icon: GraduationCap },
  { name: 'Notifikasi WA', href: '/pengaturan/notifikasi-wali', icon: BellRing },
]

export const pegawaiLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Izin Cuti', href: '/presensi/cuti', icon: CalendarDays },
]

export const kepalaSekolahLinks = [
  { name: 'Dashboard Eksekutif', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR Presensi', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Presensi Pegawai', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Presensi Siswa', href: '/presensi/kehadiran-siswa', icon: UserCheck },
  { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen },
  { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays },
  { name: 'Laporan Keuangan', href: '/keuangan/pemasukan', icon: Wallet },
  { name: 'Guru & Tendik', href: '/master-data/guru', icon: Users },
  { name: 'Data Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Rombel & Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'Pengumuman', href: '/informasi/pengumuman', icon: Megaphone },
]

// Pengecekan Hak Akses Rute Ketat Berdasarkan Role & Sub-Role
export function isPathAllowedForRoles(pathname: string, roles: string[]): boolean {
  // Superadmin & Admin IT memiliki akses penuh ke seluruh rute
  if (roles.includes('SUPERADMIN') || roles.includes('ADMIN_IT')) return true

  // Dashboard utama dan halaman profil umum selalu diizinkan untuk semua user login
  if (pathname === '/dashboard' || pathname === '/profil' || pathname === '/pengaturan/profil') return true

  // Scan QR presensi umum
  if (pathname === '/presensi/scan-qr') return true

  const isKepalaSekolah = roles.includes('KEPALA_SEKOLAH')
  const isBau = roles.includes('ADMIN_TU') || roles.includes('BAU') || roles.includes('TATA_USAHA')
  const isKeuangan = roles.includes('KEUANGAN')
  const isGuru = roles.includes('GURU') || roles.includes('WALI_KELAS')
  const isWaliKelas = roles.includes('WALI_KELAS')
  const isPegawai = roles.includes('PEGAWAI') || roles.includes('KARYAWAN')
  const isSiswa = roles.includes('SISWA')
  const isWaliMurid = roles.includes('WALI_MURID') || roles.includes('ORANG_TUA') || roles.includes('PARENT')
  const isTatib = roles.includes('KETERTIBAN')
  const isSdm = roles.includes('KEPEGAWAIAN')
  const isAdminWeb = roles.includes('ADMIN_WEB')
  const isBk = roles.includes('BK_BP')
  const isPustakawan = roles.includes('PUSTAKAWAN')
  const isGuruTahfidz = roles.includes('GURU_TAHFIDZ')
  const isPersuratan = roles.includes('PERSURATAN')

  // 1. Modul Manajemen Akun & Pengaturan Sistem
  if (pathname.startsWith('/master-data/pengguna')) {
    return isBau // Superadmin, Admin IT, dan Admin TU (BAU)
  }
  if (pathname.startsWith('/pengaturan/sistem') || pathname.startsWith('/presensi/manajemen-qr') || pathname.startsWith('/presensi/camera')) {
    return isBau || isKepalaSekolah
  }

  // 2. Modul Keuangan
  if (pathname.startsWith('/keuangan/')) {
    // Siswa & Wali Murid HANYA boleh mengakses laporan/tagihan pribadi (/keuangan/laporan)
    if (pathname.startsWith('/keuangan/laporan')) {
      return isSiswa || isWaliMurid || isKeuangan || isBau || isKepalaSekolah
    }
    // Modul pemasukan, pengeluaran, penggajian, lpj, verifikasi pembayaran, pengaturan biaya HANYA untuk KEUANGAN, BAU, KEPALA_SEKOLAH (supervisi)
    return isKeuangan || isBau || isKepalaSekolah
  }

  // 3. Modul Master Data Siswa, Guru, Kelas, Mapel
  if (pathname.startsWith('/master-data/siswa')) {
    return isBau || isKepalaSekolah || isGuru || isWaliKelas
  }
  if (pathname.startsWith('/master-data/guru') || pathname.startsWith('/master-data/kelas') || pathname.startsWith('/master-data/mata-pelajaran')) {
    return isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/master-data/wali-murid')) {
    return isBau
  }

  // 4. Modul Akademik
  if (pathname.startsWith('/akademik/jadwal-pelajaran')) {
    return isBau || isKepalaSekolah || isGuru || isSiswa || isWaliMurid
  }
  if (pathname.startsWith('/akademik/jadwal-mengajar') || pathname.startsWith('/akademik/jurnal-mengajar') || pathname.startsWith('/akademik/penilaian')) {
    return isGuru || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/jurnal-wali-kelas')) {
    return isWaliKelas || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/e-rapor')) {
    return isGuru || isWaliKelas || isSiswa || isWaliMurid || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/akademik/etika-tatib')) {
    return isTatib || isBk || isGuru || isSiswa || isWaliMurid || isBau || isKepalaSekolah
  }

  // 5. Modul Presensi
  if (pathname.startsWith('/presensi/kehadiran-pegawai') || pathname.startsWith('/presensi/jurnal-karyawan')) {
    return isGuru || isPegawai || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/kehadiran-siswa')) {
    return isGuru || isWaliKelas || isSiswa || isWaliMurid || isBau || isKepalaSekolah || isTatib
  }
  if (pathname.startsWith('/presensi/izin-keluar')) {
    // Izin keluar pegawai hanya untuk guru/pegawai/BAU/Kepala Sekolah
    return isGuru || isPegawai || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/izin-siswa')) {
    // Izin siswa untuk Wali Murid, Tim Ketertiban (Tatib), Guru, dan BAU
    return isWaliMurid || isTatib || isGuru || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/presensi/cuti')) {
    return isGuru || isPegawai || isSdm || isBau || isKepalaSekolah
  }

  // 6. Modul Fitur Sub-Role Khusus (/fitur/[slug])
  if (pathname.startsWith('/fitur/')) {
    const slug = pathname.replace('/fitur/', '').split('/')[0]
    if (slug === 'buku-tamu') return isBau || isKepalaSekolah
    if (slug === 'persuratan') return isPersuratan || isBau || isKepalaSekolah
    if (slug === 'inventaris') return isBau || isKepalaSekolah
    if (slug === 'kepegawaian') return isSdm || isBau || isKepalaSekolah
    if (slug === 'ketertiban') return isTatib || isBau || isKepalaSekolah
    if (slug === 'bk-bp') return isBk || isBau || isKepalaSekolah
    if (slug === 'perpustakaan') return isPustakawan || isBau || isKepalaSekolah
    if (slug === 'tahfidz') return isGuruTahfidz || isBau || isKepalaSekolah
    if (slug === 'kebersihan') return roles.includes('KEBERSIHAN') || isBau || isKepalaSekolah
    if (slug === 'keamanan') return roles.includes('KEAMANAN') || isBau || isKepalaSekolah
    if (slug === 'ekstrakulikuler') return roles.includes('PEMBINA_EKSTRA') || roles.includes('PEMBINA_EXTRA') || isBau || isKepalaSekolah
    return isBau || isKepalaSekolah
  }

  // 7. Modul Informasi & Banner
  if (pathname.startsWith('/informasi/banner')) {
    return isAdminWeb || isBau || isKepalaSekolah
  }
  if (pathname.startsWith('/informasi/pengumuman') || pathname.startsWith('/berita')) {
    return true // Berita/pengumuman dapat dibaca semua
  }

  // 8. Pengaturan Notifikasi
  if (pathname.startsWith('/pengaturan/notifikasi-wali')) {
    return isWaliMurid || isBau
  }
  if (pathname.startsWith('/pengaturan/notifikasi')) {
    return isBau || isKepalaSekolah
  }

  // Fallback: izinkan jika link rute ada di daftar tautan resmi pengguna
  const allowedLinks = getRoleLinks(roles[0] || 'GURU', roles[1], roles[2], roles[3])
  return allowedLinks.some(l => pathname.startsWith(l.href))
}

export function getRoleLinks(role: string, subRole?: string, subRole2?: string, subRole3?: string) {
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
  } else if (role === 'WALI_MURID' || role === 'ORANG_TUA' || role === 'PARENT') {
    addLinks(waliMuridLinks)
  } else if (role === 'PEGAWAI' || role === 'KARYAWAN') {
    addLinks(pegawaiLinks)
  } else {
    // Default fallback
    addLinks([
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode }
    ])
  }

  // Apply SubRole links
  const applySubRoleLinks = (roleName?: string) => {
    if (!roleName) return
    if (roleName === 'ADMIN_TU' || roleName === 'BAU' || roleName === 'TATA_USAHA') {
      addLinks(bauLinks)
    } else if (roleName === 'WALI_KELAS') {
      addLinks([
        { name: 'Manajemen Siswa Kelas', href: '/master-data/siswa', icon: UserSquare2 },
        { name: 'Presensi & Izin Siswa', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
        { name: 'Verifikasi Izin Siswa', href: '/presensi/izin-siswa', icon: UserCheck },
        { name: 'Jurnal Kelas', href: '/akademik/jurnal-wali-kelas', icon: BookOpen },
      ])
    } else if (roleName === 'KEUANGAN') {
      addLinks([
        { name: 'Penggajian Pegawai', href: '/keuangan/penggajian', icon: Banknote },
        { name: 'Keuangan Masuk', href: '/keuangan/pemasukan', icon: Wallet },
        { name: 'Keuangan Keluar', href: '/keuangan/pengeluaran', icon: Receipt },
        { name: 'Pengaturan Biaya & Diskon', href: '/keuangan/pengaturan', icon: Settings }
      ])
    } else if (roleName === 'PEGAWAI' || roleName === 'KARYAWAN') {
      addLinks([
        { name: 'Jurnal Karyawan', href: '/presensi/jurnal-karyawan', icon: BookOpen },
        { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
      ])
    } else if (roleName === 'GURU') {
      addLinks([
        { name: 'Jadwal Mengajar', href: '/akademik/jadwal-mengajar', icon: CalendarDays },
        { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen },
        { name: 'Izin Keluar', href: '/presensi/izin-keluar', icon: DoorOpen },
      ])
    } else if (roleName === 'ADMIN_WEB') {
      addLinks([
        { name: 'Berita & Informasi', href: '/informasi/pengumuman', icon: Megaphone },
        { name: 'Banner Utama', href: '/informasi/banner', icon: ImageIcon }
      ])
    } else if (roleName === 'PEMBINA_EKSTRA' || roleName === 'PEMBINA_EXTRA') {
      addLinks([
        { name: 'Ekstrakulikuler', href: '/fitur/ekstrakulikuler', icon: Award }
      ])
    } else if (roleName === 'KETERTIBAN') {
      addLinks([
        { name: 'Ketertiban', href: '/fitur/ketertiban', icon: ShieldAlert },
        { name: 'Izin Siswa & Dispensasi', href: '/presensi/izin-siswa', icon: ClipboardCheck },
      ])
    } else if (roleName === 'KEBERSIHAN') {
      addLinks([
        { name: 'Kebersihan', href: '/fitur/kebersihan', icon: Sparkles }
      ])
    } else if (roleName === 'KEAMANAN') {
      addLinks([
        { name: 'Keamanan', href: '/fitur/keamanan', icon: ShieldCheck }
      ])
    } else if (roleName === 'KEPEGAWAIAN') {
      addLinks([
        { name: 'Kepegawaian', href: '/fitur/kepegawaian', icon: UserCheck },
        { name: 'Izin Cuti Pegawai', href: '/presensi/cuti', icon: CalendarDays },
      ])
    } else if (roleName === 'BK_BP') {
      addLinks([
        { name: 'BK / BP', href: '/fitur/bk-bp', icon: HeartHandshake }
      ])
    } else if (roleName === 'PUSTAKAWAN') {
      addLinks([
        { name: 'Perpustakaan', href: '/fitur/perpustakaan', icon: Library }
      ])
    } else if (roleName === 'GURU_TAHFIDZ') {
      addLinks([
        { name: 'Guru Tahfidz', href: '/fitur/tahfidz', icon: BookMarked }
      ])
    } else if (roleName === 'PERSURATAN') {
      addLinks([
        { name: 'Persuratan', href: '/fitur/persuratan', icon: Mail }
      ])
    } else if (roleName === 'KEPALA_SEKOLAH') {
      addLinks(kepalaSekolahLinks)
    } else if (roleName === 'ADMIN_IT' || roleName === 'SUPERADMIN') {
      addLinks(superadminLinks)
    }
  }

  applySubRoleLinks(role)
  applySubRoleLinks(subRole)
  applySubRoleLinks(subRole2)
  applySubRoleLinks(subRole3)

  // Pastikan tombol Profil selalu difilter untuk semua pengguna tanpa terkecuali
  return currentLinks.filter(link => link.href !== '/pengaturan/profil' && link.name !== 'Profil')
}
