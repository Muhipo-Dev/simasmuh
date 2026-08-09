import { 
  LayoutDashboard, Users, UserSquare2, CalendarDays, ClipboardCheck, 
  GraduationCap, BookOpen, Settings, LogOut, Menu, UserCog, QrCode, 
  DoorOpen, UserCircle2, Megaphone, Wallet, Receipt, X, MoreHorizontal, 
  Banknote, FileText, Image as ImageIcon, Award, FileCheck,
  ShieldAlert, Sparkles, ShieldCheck, UserCheck, HeartHandshake,
  Library, BookMarked, Mail, Contact, Package, Boxes
} from 'lucide-react'

export const superadminLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'e-Rapor', href: '/akademik/e-rapor', icon: Award },
  { name: 'QR Layar (Publik)', href: '/presensi/manajemen-qr', icon: QrCode },
  { name: 'Manajemen Akun', href: '/master-data/pengguna', icon: UserCog },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const bauLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
  { name: 'Guru', href: '/master-data/guru', icon: Users },
  { name: 'Kelas', href: '/master-data/kelas', icon: BookOpen },
  { name: 'Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap },
  { name: 'Jadwal Pelajaran', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'e-Rapor', href: '/akademik/e-rapor', icon: Award },
  { name: 'Buku Tamu (BAU)', href: '/fitur/buku-tamu', icon: Contact },
  { name: 'Arsip & Persuratan', href: '/fitur/persuratan', icon: Mail },
  { name: 'Inventaris & Aset', href: '/fitur/inventaris', icon: Package },
  { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck },
  { name: 'Pengaturan', href: '/pengaturan/sistem', icon: Settings },
]

export const guruLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Jadwal', href: '/akademik/jadwal-mengajar', icon: CalendarDays },
  { name: 'Jurnal Mengajar', href: '/akademik/jurnal-mengajar', icon: BookOpen },
  { name: 'e-Rapor', href: '/akademik/e-rapor', icon: Award },
  { name: 'Izin', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Profil', href: '/pengaturan/profil', icon: UserCircle2 },
]

export const siswaLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-siswa', icon: ClipboardCheck },
  { name: 'Jadwal', href: '/akademik/jadwal-pelajaran', icon: CalendarDays },
  { name: 'e-Rapor', href: '/akademik/e-rapor', icon: Award },
  { name: 'Keuangan', href: '/keuangan/laporan', icon: Wallet },
  { name: 'Profil', href: '/pengaturan/profil', icon: UserCircle2 },
]

export const pegawaiLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode },
  { name: 'Log Presensi', href: '/presensi/kehadiran-pegawai', icon: ClipboardCheck },
  { name: 'Jurnal Pegawai', href: '/presensi/jurnal-karyawan', icon: BookOpen },
  { name: 'Izin', href: '/presensi/izin-keluar', icon: DoorOpen },
  { name: 'Profil', href: '/pengaturan/profil', icon: UserCircle2 },
]

export const superAdminOnlyPaths = [
  '/master-data/pengguna', '/master-data/mata-pelajaran',
  '/master-data/siswa', '/master-data/kelas', '/master-data/guru', '/pengaturan/sistem', '/presensi/manajemen-qr'
]

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
  } else if (role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA') {
    addLinks(bauLinks)
  } else if (role === 'GURU') {
    addLinks(guruLinks)
  } else if (role === 'SISWA') {
    addLinks(siswaLinks)
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
        { name: 'Siswa', href: '/master-data/siswa', icon: UserSquare2 },
        { name: 'Jurnal Kelas', href: '/akademik/jurnal-wali-kelas', icon: BookOpen }
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
        { name: 'Ketertiban', href: '/fitur/ketertiban', icon: ShieldAlert }
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
        { name: 'Kepegawaian', href: '/fitur/kepegawaian', icon: UserCheck }
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
    } else if (roleName === 'ADMIN_IT' || roleName === 'SUPERADMIN') {
      addLinks(superadminLinks)
    }
  }

  applySubRoleLinks(role)
  applySubRoleLinks(subRole)
  applySubRoleLinks(subRole2)
  applySubRoleLinks(subRole3)

  return currentLinks
}

