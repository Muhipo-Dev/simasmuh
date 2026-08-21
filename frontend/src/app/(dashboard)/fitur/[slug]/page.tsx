'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Award, ShieldAlert, Sparkles, ShieldCheck, UserCheck, 
  HeartHandshake, Library, BookMarked, Mail, Clock, 
  ArrowLeft, CheckCircle2, Construction, Sparkle, Layers, ChevronRight,
  Contact, Package, Boxes, Search, PlusCircle, Download, FileText, Pencil, Trash2,
  Building2, Users, Loader2, Phone, Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { InteractiveCharacterAssessmentManagement } from '@/components/academic/InteractiveCharacterAssessmentManagement'

type GuestEntry = {
  id: string
  namaTamu: string
  instansi: string
  kategori: 'STUDI_TIRU' | 'PEJABAT' | 'ALUMNI_IJAZAH' | 'VENDOR_UMUM'
  tujuan: string
  dituju: string
  tanggal: string
  waktu: string
  status: 'TIBA' | 'PROSES' | 'SELESAI'
  kontak: string
  catatan: string
}

type FeatureConfig = {
  title: string
  roleName: string
  category: string
  icon: any
  gradient: string
  badgeColor: string
  description: string
  modules: { title: string; desc: string; status: 'SEGERA_HADIR' | 'DALAM_PENGEMBANGAN' | 'TAHAP_DESAIN' }[]
}

const FEATURE_MAP: Record<string, FeatureConfig> = {
  'buku-tamu': {
    title: 'Buku Tamu & Kunjungan (BAU)',
    roleName: 'BAU (Badan Administrasi Umum)',
    category: 'Badan Administrasi Umum & Relasi Publik',
    icon: Contact,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400',
    description: 'Modul pengelolaan & registrasi kedatangan tamu sekolah (Tamu Studi Tiru, Pejabat/Dinas, Alumni Pengurusan Ijazah/Legalisir, dan Vendor/Umum).',
    modules: [
      { title: 'Tamu Studi Tiru & Studi Banding', desc: 'Pendataan rombongan studi banding dari sekolah/lembaga lain beserta fasilitas pelayanannya.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Tamu Pejabat & Kunjungan Dinas', desc: 'Registrasi tamu dinas kementerian, majelis dikdasmen, pemda, dan kepolisian.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Tamu Alumni & Pengurusan Ijazah / Legalisir', desc: 'Layanan alumni untuk verifikasi kelulusan, penyerahan ijazah, dan legalisir transkrip.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Tamu General / Vendor & Penawaran', desc: 'Catatan log kunjungan vendor perorangan, penawaran kerjasama, dan tamu umum.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  inventaris: {
    title: 'Inventaris & Aset Sekolah (BAU)',
    roleName: 'ADMIN TATA USAHA / BAU',
    category: 'Sarana Prasarana & Aset',
    icon: Package,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul pendataan sarana prasarana sekolah, registrasi kode inventaris, audit kondisi fisik barang (Baik, Rusak Ringan, Rusak Berat), dan penanggung jawab lokasi.',
    modules: [
      { title: 'Pendataan Kode Aset & Barcode', desc: 'Pencatatan inventaris barang masuk, spesifikasi, dan pelabelan kode unik.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Audit Kondisi & Kerusakan Barang', desc: 'Monitoring berkas ketersediaan barang dan tingkat kerusakan untuk perbaikan/penghapusan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penanggung Jawab Ruangan & Unit Work', desc: 'Penetapan PJ ruangan laboratorium, kantor, ruang kelas, dan fasilitas umum.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Stock Opname & Laporan Aset Periodik', desc: 'Rekapitulasi total nilai aset sekolah dan barang inventaris aktif.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  ekstrakulikuler: {
    title: 'Pembina Ekstrakulikuler',
    roleName: 'PEMBINA EKSTRAKULIKULER',
    category: 'Pengembangan Siswa & Bakat',
    icon: Award,
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400',
    description: 'Modul khusus untuk Pembina Ekstrakulikuler dalam mengelola pendaftaran anggota, jadwal latihan harian, absensi keaktifan, dan pencatatan raihan prestasi siswa.',
    modules: [
      { title: 'Pendaftaran & Data Anggota Ekskul', desc: 'Pendataan siswa yang bergabung beserta pilihan ekskul utama & pilihan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Jadwal & Presensi Keaktifan', desc: 'Pencatatan absensi peserta ekskul dan rekap kehadiran periodik.', status: 'SEGERA_HADIR' },
      { title: 'Rekapitulasi Prestasi & Piagam', desc: 'Input pencapaian kejuaraan, sertifikat, dan piagam tingkat daerah hingga nasional.', status: 'TAHAP_DESAIN' },
      { title: 'Laporan Kegiatan Pembina', desc: 'Penyusunan jurnal kegiatan ekskul dan evaluasi perkembangan minat siswa.', status: 'SEGERA_HADIR' },
    ]
  },
  ketertiban: {
    title: 'Tim Ketertiban & Kedisiplinan',
    roleName: 'KETERTIBAN',
    category: 'Kesiswaan & Tata Tertib',
    icon: ShieldAlert,
    gradient: 'from-rose-600 via-red-600 to-pink-600',
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-400',
    description: 'Modul pemantauan kedisiplinan siswa, rekapitulasi poin pelanggaran & apresiasi, penerbitan surat teguran/SP, serta koordinasi otomatis dengan BK/BP.',
    modules: [
      { title: 'Pencatatan Poin Kedisiplinan', desc: 'Input cepat pelanggaran atau apresiasi siswa secara terstruktur.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Rekapitulasi & Level Pelanggaran', desc: 'Klasifikasi poin siswa ringan, sedang, hingga berat secara otomatis.', status: 'SEGERA_HADIR' },
      { title: 'Generator Surat Peringatan (SP)', desc: 'Cetak dan terbitkan Surat Peringatan 1, 2, 3 sesuai ambang batas poin.', status: 'TAHAP_DESAIN' },
      { title: 'Notifikasi Otomatis Wali & Orang Tua', desc: 'Kirim notifikasi langsung saat terdapat catatan kedisiplinan baru.', status: 'SEGERA_HADIR' },
    ]
  },
  kebersihan: {
    title: 'Manajemen Kebersihan Lingkungan',
    roleName: 'KEBERSIHAN',
    category: 'Sarana Prasarana & Lingkungan',
    icon: Sparkles,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul pengawasan kebersihan area sekolah, penugasan tim piket kebersihan lingkungan, inspeksi berkala ruang kelas & fasilitas umum.',
    modules: [
      { title: 'Jadwal Inspeksi Area & Kelas', desc: 'Penjadwalan verifikasi kebersihan gedung, kelas, dan fasilitas umum.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penilaian Kerapian & Kebersihan', desc: 'Sistem scoring harian kebersihan kelas untuk lomba atau evaluasi bulanan.', status: 'TAHAP_DESAIN' },
      { title: 'Laporan Kerusakan & Pembersihan Extra', desc: 'Pengajuan kebutuhan alat kebersihan atau perbaikan area yang kotor.', status: 'SEGERA_HADIR' },
    ]
  },
  keamanan: {
    title: 'Pos Keamanan Sekolah',
    roleName: 'KEAMANAN',
    category: 'Keamanan & Pengawasan Kampus',
    icon: ShieldCheck,
    gradient: 'from-blue-600 via-indigo-600 to-slate-700',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400',
    description: 'Modul buku tamu digital, pencatatan log keluar-masuk kendaraan/tamu, pengawasan izin keluar siswa & staf di gerbang utama, serta catatan insiden.',
    modules: [
      { title: 'Buku Tamu Digital & Scan ID', desc: 'Registrasi tamu masuk sekolah beserta verifikasi identitas & keperluan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Verifikasi Scan QR Surat Izin Keluar', desc: 'Validasi satpam untuk siswa atau guru yang keluar lingkungan sekolah.', status: 'TAHAP_DESAIN' },
      { title: 'Log Parkir & Stiker Kendaraan', desc: 'Pendataan plat nomor kendaraan guru, staf, dan orang tua murid.', status: 'SEGERA_HADIR' },
      { title: 'Catatan Insiden Security', desc: 'Laporan mingguan keamanan dan kejadian darurat di area sekolah.', status: 'SEGERA_HADIR' },
    ]
  },
  kepegawaian: {
    title: 'Kepegawaian & SDM Sekolah (HRD)',
    roleName: 'KEPEGAWAIAN / HRD',
    category: 'Manajemen SDM & Karir',
    icon: UserCheck,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    badgeColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-400/10 dark:text-violet-400',
    description: 'Modul data induk pegawai, rekrutmen & seleksi calon pegawai baru (HRD), pengajuan SK kepegawaian & NIP/NBM, penilaian kinerja staf, dan pengarsipan berkas kepegawaian.',
    modules: [
      { title: 'Rekrutmen & Seleksi Calon Pegawai Baru', desc: 'Pengelolaan berkas lamaran, seleksi administrasi, wawancara, dan penerimaan HRD.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Database Induk & Berkas HRD Pegawai', desc: 'Penyimpanan arsip digital SK, ijazah, sertifikat, dan NIP/NBM.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Manajemen Cuti & Izin Kerja', desc: 'Sistem pengajuan cuti tahunan, sakit, atau dinas luar secara digital.', status: 'TAHAP_DESAIN' },
      { title: 'Evaluasi Kinerja Pegawai (PKP)', desc: 'Penilaian berkala untuk performa kerja pendidik dan tenaga kependidikan.', status: 'SEGERA_HADIR' },
    ]
  },
  'bk-bp': {
    title: 'Bimbingan & Konseling (BK/BP)',
    roleName: 'BK / BP',
    category: 'Layanan Bimbingan Siswa',
    icon: HeartHandshake,
    gradient: 'from-pink-500 via-purple-600 to-rose-600',
    badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-400/10 dark:text-pink-400',
    description: 'Modul konseling akademik & pribadi siswa, pencatatan riwayat bimbingan, jadwal pertemuan tatap muka, serta konsultasi karir & perguruan tinggi.',
    modules: [
      { title: 'Rekam Konseling & Case History', desc: 'Catatan rahasia sesi bimbingan konseling pribadi & akademik siswa.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Konseling Karir & Pemetaan PTN/PTS', desc: 'Bimbingan minat studi lanjut, hasil SNMPTN/SNBP, dan rekomendasi jurusan.', status: 'TAHAP_DESAIN' },
      { title: 'Home Visit & Pertemuan Orang Tua', desc: 'Jadwal kunjungan rumah dan notulensi pertemuan konseling dengan wali murid.', status: 'SEGERA_HADIR' },
    ]
  },
  perpustakaan: {
    title: 'Sistem Informasi Perpustakaan',
    roleName: 'PUSTAKAWAN',
    category: 'Literasi & Sirkulasi Buku',
    icon: Library,
    gradient: 'from-cyan-600 via-blue-600 to-teal-700',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-400',
    description: 'Modul manajemen katalog buku digital, sirkulasi peminjaman & pengembalian buku barcode, kalkulasi denda keterlambatan, dan rekap statistik membaca.',
    modules: [
      { title: 'Katalog Buku Digital (OPAC)', desc: 'Pencarian koleksi buku, ketersediaan stok, dan lokasi rak secara online.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Sirkulasi Peminjaman & Pengembalian', desc: 'Transaksi cepat peminjaman buku menggunakan scan NIS/NIP barcode.', status: 'TAHAP_DESAIN' },
      { title: 'Statistik Pengunjung & Kartu Anggota', desc: 'Grafik minat baca harian siswa dan pembuat kartu perpustakaan digital.', status: 'SEGERA_HADIR' },
    ]
  },
  tahfidz: {
    title: 'Monitoring Guru Tahfidz',
    roleName: 'GURU TAHFIDZ',
    category: 'Keislaman & Program Tahfidz',
    icon: BookMarked,
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul rekap setoran hafalan Al-Qur\'an harian siswa, evaluasi kelancaran & tajwid, target juz, serta mutabaah hafalan yang terintegrasi.',
    modules: [
      { title: 'Jurnal Setoran Hafalan Harian', desc: 'Input juz, surat, dan ayat setoran harian siswa beserta catatannya.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penilaian Tajwid, Makhraj & Fashohah', desc: 'Penilaian kriteria standar mutu hafalan Al-Qur\'an.', status: 'TAHAP_DESAIN' },
      { title: 'Kartu Prestasi Tahfidz & Progress Juz', desc: 'Grafik pencapaian target hafalan siswa menuju kelulusan.', status: 'SEGERA_HADIR' },
    ]
  },
  persuratan: {
    title: 'Persuratan & Tata Usaha (E-Surat BAU)',
    roleName: 'PERSURATAN / BAU',
    category: 'Administrasi & Disposisi Digital',
    icon: Mail,
    gradient: 'from-amber-600 via-yellow-600 to-orange-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400',
    description: 'Modul pembuat surat resmi sekolah, penomoran surat otomatis, pendataan surat masuk & keluar, pengarsipan digital, serta disposisi pimpinan.',
    modules: [
      { title: 'Penomoran Surat Masuk & Keluar Otomatis', desc: 'Sistem penomoran otomatis terstandar untuk semua jenis dokumen sekolah.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Template Surat Resmi & Legalisir Ijazah', desc: 'Generator surat keterangan aktif, rekomendasi, legalisir ijazah alumni, dan panggilan.', status: 'TAHAP_DESAIN' },
      { title: 'Disposisi Digital Kepala Sekolah / BAU', desc: 'Alur penerusan surat masuk ke unit kerja terkait secara realtime.', status: 'SEGERA_HADIR' },
      { title: 'E-Archive & Pengarsipan Digital', desc: 'Penyimpanan arsip dokumen penting sekolah dengan indexing pencarian cepat.', status: 'DALAM_PENGEMBANGAN' },
    ]
  }
}

// Initial Mock Data for Guestbook BAU
const INITIAL_GUESTS: GuestEntry[] = [
  {
    id: '1',
    namaTamu: 'Dr. H. Ahmad Dahlan, M.Pd',
    instansi: 'Dinas Pendidikan & Dikdasmen Muhammadiyah',
    kategori: 'PEJABAT',
    tujuan: 'Kunjungan Monitoring Mutu & Supervisi Kurikulum',
    dituju: 'Kepala Sekolah & Tim Waka',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '08:30 WIB',
    status: 'PROSES',
    kontak: '0812-3456-7890',
    catatan: 'Diterima di Ruang Tamu Utama Kepala Sekolah'
  },
  {
    id: '2',
    namaTamu: 'Tim Rombongan SMA Muh 2 Yogyakarta (15 Orang)',
    instansi: 'SMA Muhammadiyah 2 Yogyakarta',
    kategori: 'STUDI_TIRU',
    tujuan: 'Studi Tiru Sistem Manajemen Digital SIMASMUH & e-Rapor',
    dituju: 'Tim BAU & Admin IT',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '09:45 WIB',
    status: 'TIBA',
    kontak: '0857-1122-3344',
    catatan: 'Persiapan Aula Pertemuan & Cinderamata'
  },
  {
    id: '3',
    namaTamu: 'Rizal Prasetyo, S.Kom (Alumni 2020)',
    instansi: 'Alumni SMA Muhipo',
    kategori: 'ALUMNI_IJAZAH',
    tujuan: 'Pengurusan Penyerahan Ijazah & Legalisir Transkrip Nilai',
    dituju: 'Staf Tata Usaha / BAU',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '10:15 WIB',
    status: 'SELESAI',
    kontak: '0896-5544-3322',
    catatan: 'Telah diserahkan 5 lembar legalisir stempel basah'
  },
  {
    id: '4',
    namaTamu: 'Bambang Sudarmo',
    instansi: 'PT Media Edukasi Nusantara',
    kategori: 'VENDOR_UMUM',
    tujuan: 'Penawaran Kerjasama Buku Bahan Ajar & Alat Lab Computer',
    dituju: 'Kepala BAU & Sarpras',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '11:00 WIB',
    status: 'TIBA',
    kontak: '0813-9988-7766',
    catatan: 'Penyerahan berkas proposal penawaran'
  }
]

function InteractiveGuestBook() {
  const [guests, setGuests] = useState<GuestEntry[]>(INITIAL_GUESTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const [formState, setFormState] = useState({
    namaTamu: '',
    instansi: '',
    kategori: 'STUDI_TIRU' as GuestEntry['kategori'],
    tujuan: '',
    dituju: 'Tata Usaha / BAU',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '09:00 WIB',
    status: 'TIBA' as GuestEntry['status'],
    kontak: '',
    catatan: ''
  })

  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchKategori = selectedKategori === 'ALL' || g.kategori === selectedKategori
      const matchSearch = 
        g.namaTamu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.instansi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.tujuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.dituju.toLowerCase().includes(searchQuery.toLowerCase())
      return matchKategori && matchSearch
    })
  }, [guests, selectedKategori, searchQuery])

  const handleAddGuest = () => {
    if (!formState.namaTamu || !formState.instansi) {
      Swal.fire('Form Belum Lengkap', 'Nama Tamu dan Instansi wajib diisi.', 'warning')
      return
    }

    const newGuest: GuestEntry = {
      id: Date.now().toString(),
      ...formState
    }

    setGuests([newGuest, ...guests])
    setIsFormOpen(false)
    setFormState({
      namaTamu: '',
      instansi: '',
      kategori: 'STUDI_TIRU',
      tujuan: '',
      dituju: 'Tata Usaha / BAU',
      tanggal: new Date().toISOString().split('T')[0],
      waktu: '09:00 WIB',
      status: 'TIBA',
      kontak: '',
      catatan: ''
    })

    Swal.fire({
      icon: 'success',
      title: 'Tamu Berhasil Terdaftar',
      text: `Data kedatangan "${newGuest.namaTamu}" telah dicatat di Log Buku Tamu BAU.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  const handleUpdateStatus = (id: string, newStatus: GuestEntry['status']) => {
    setGuests(guests.map(g => g.id === id ? { ...g, status: newStatus } : g))
  }

  const handleExportExcel = () => {
    if (filteredGuests.length === 0) return
    const exportData = filteredGuests.map((g, idx) => ({
      No: idx + 1,
      'Nama Tamu': g.namaTamu,
      'Instansi / Asal': g.instansi,
      Kategori: g.kategori,
      'Keperluan / Tujuan': g.tujuan,
      'Person in Charge (Dituju)': g.dituju,
      Tanggal: g.tanggal,
      Waktu: g.waktu,
      Status: g.status,
      Kontak: g.kontak || '-',
      Catatan: g.catatan || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Log Buku Tamu')
    XLSX.writeFile(wb, `Buku_Tamu_BAU_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Tamu Hari Ini</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{guests.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Tercatat di Log BAU</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Tamu Studi Tiru</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.kategori === 'STUDI_TIRU').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Rombongan Studi Banding</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Alumni (Pengurusan Ijazah)</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.kategori === 'ALUMNI_IJAZAH').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Legalisir & Ambil Ijazah</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Tamu Pejabat / Dinas</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {guests.filter(g => g.kategori === 'PEJABAT').length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Kunjungan Formal / Instansi</p>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Guestbook Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Contact className="w-5 h-5 text-indigo-600" />
                Registrasi & Log Kedatangan Tamu (BAU)
              </CardTitle>
              <CardDescription>
                Pencatatan resmi kedatangan tamu studi tiru, tamu pejabat, alumni pengurusan ijazah, serta vendor umum.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Catat Kedatangan Tamu
              </Button>
              <Button variant="outline" onClick={handleExportExcel} disabled={filteredGuests.length === 0} className="border-slate-300 text-slate-700 dark:text-slate-200">
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cari nama tamu / instansi / tujuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white dark:bg-slate-950"
              />
            </div>

            <Select value={selectedKategori} onValueChange={(val) => { if (val) setSelectedKategori(val) }}>
              <SelectTrigger className="bg-white dark:bg-slate-950">
                <SelectValue placeholder="Kategori Tamu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori Tamu</SelectItem>
                <SelectItem value="STUDI_TIRU">Tamu Studi Tiru / Banding</SelectItem>
                <SelectItem value="PEJABAT">Tamu Pejabat / Dinas</SelectItem>
                <SelectItem value="ALUMNI_IJAZAH">Alumni (Pengurusan Ijazah/Legalisir)</SelectItem>
                <SelectItem value="VENDOR_UMUM">Tamu Umum & Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead>Nama Tamu & Instansi</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead>Maksud & Tujuan Kunjungan</TableHead>
                  <TableHead>Dituju (PIC)</TableHead>
                  <TableHead>Waktu Kedatangan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      Tidak ada data kedatangan tamu yang sesuai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((g, idx) => (
                    <TableRow key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white">{g.namaTamu}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {g.instansi}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          g.kategori === 'STUDI_TIRU' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          g.kategori === 'PEJABAT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          g.kategori === 'ALUMNI_IJAZAH' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {g.kategori === 'STUDI_TIRU' ? 'Studi Tiru' :
                           g.kategori === 'PEJABAT' ? 'Pejabat/Dinas' :
                           g.kategori === 'ALUMNI_IJAZAH' ? 'Alumni/Ijazah' : 'Vendor/Umum'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-slate-800 dark:text-slate-200 font-medium text-xs sm:text-sm max-w-xs">{g.tujuan}</div>
                        {g.catatan && <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Keterangan: {g.catatan}</div>}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-semibold text-xs">{g.dituju}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-medium">{g.tanggal}</div>
                        <div className="text-[11px] text-slate-400">{g.waktu}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          g.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' :
                          g.status === 'PROSES' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {g.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select value={g.status} onValueChange={(val) => { if (val) handleUpdateStatus(g.id, val as GuestEntry['status']) }}>
                          <SelectTrigger className="h-7 text-xs w-[110px] bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Ubah Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TIBA">Tiba (Menunggu)</SelectItem>
                            <SelectItem value="PROSES">Dalam Proses</SelectItem>
                            <SelectItem value="SELESAI">Selesai</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal: Catat Kedatangan Tamu Baru */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Contact className="w-5 h-5" /> Form Registrasi Tamu Baru (BAU)
            </DialogTitle>
            <DialogDescription>
              Isikan rincian kedatangan tamu studi tiru, tamu pejabat, alumni (pengurusan ijazah/legalisir), atau vendor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Tamu / Penanggung Jawab <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Nama lengkap tamu..."
                value={formState.namaTamu}
                onChange={(e) => setFormState({ ...formState, namaTamu: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Instansi / Asal Lembaga <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: SMA Muh 2 Ykt / Alumni / Dinas"
                value={formState.instansi}
                onChange={(e) => setFormState({ ...formState, instansi: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori Kunjungan Tamu</Label>
              <Select 
                value={formState.kategori} 
                onValueChange={(val) => { if (val) setFormState({ ...formState, kategori: val as GuestEntry['kategori'] }) }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDI_TIRU">Tamu Studi Tiru / Banding</SelectItem>
                  <SelectItem value="PEJABAT">Tamu Pejabat / Kunjungan Dinas</SelectItem>
                  <SelectItem value="ALUMNI_IJAZAH">Tamu Alumni (Pengurusan Ijazah/Legalisir)</SelectItem>
                  <SelectItem value="VENDOR_UMUM">Tamu General / Vendor & Penawaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Person in Charge (Dituju)</Label>
              <Input
                placeholder="Misal: Kepala Sekolah / BAU / Kurikulum"
                value={formState.dituju}
                onChange={(e) => setFormState({ ...formState, dituju: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Maksud & Tujuan Kunjungan</Label>
              <Input
                placeholder="Misal: Legalisir ijazah / Studi tiru SIMASMUH / Supervisi dinas"
                value={formState.tujuan}
                onChange={(e) => setFormState({ ...formState, tujuan: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Nomor Kontak / WhatsApp</Label>
              <Input
                placeholder="0812-xxxx-xxxx"
                value={formState.kontak}
                onChange={(e) => setFormState({ ...formState, kontak: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Waktu Kedatangan</Label>
              <Input
                placeholder="09:00 WIB"
                value={formState.waktu}
                onChange={(e) => setFormState({ ...formState, waktu: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Catatan / Keterangan Pelayanan BAU</Label>
              <Textarea
                rows={2}
                placeholder="Catatan ruang pertemuan, nomor resi legalisir, dll..."
                value={formState.catatan}
                onChange={(e) => setFormState({ ...formState, catatan: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleAddGuest}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Simpan Registrasi Tamu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function FiturSubRolePage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params?.slug as string) || ''
  
  const config = FEATURE_MAP[slug] || {
    title: `Fitur ${slug.toUpperCase()}`,
    roleName: slug.toUpperCase(),
    category: 'Fitur Khusus Sub-Role',
    icon: Construction,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400',
    description: 'Modul ini disiapkan khusus untuk mendukung tugas dan kewenangan sub-role terkait di SIMASMUH SMA Muhammadiyah 1 Ponorogo.',
    modules: [
      { title: 'Modul Utama', desc: 'Fitur inti untuk mendukung operasional kerja sehari-hari.', status: 'SEGERA_HADIR' as const },
      { title: 'Modul Laporan & Rekapitulasi', desc: 'Penyajian data ringkasan dan analisis performa.', status: 'TAHAP_DESAIN' as const },
    ]
  }

  const IconComponent = config.icon

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Tombol Kembali */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.back()}
          className="gap-2 text-slate-600 hover:text-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Button>

        <Badge variant="outline" className={`px-3 py-1 font-semibold text-xs rounded-full border ${config.badgeColor}`}>
          Sub-Role: {config.roleName}
        </Badge>
      </div>

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-slate-800">
        <div className={`absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br ${config.gradient} opacity-20 blur-3xl rounded-full pointer-events-none`} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-300">
              <Sparkle className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Modul Layanan Administrasi & BAU</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {config.title}
            </h1>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {config.description}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center self-center bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shrink-0 min-w-[200px] text-center shadow-inner">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg mb-3`}>
              <IconComponent className="w-10 h-10 text-white" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Modul</span>
            <span className="text-sm font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Aktif Siap Pakai
            </span>
          </div>
        </div>
      </div>

      {/* Render Interaktif khusus Buku Tamu */}
      {slug === 'buku-tamu' && (
        <InteractiveGuestBook />
      )}

      {/* Render Interaktif khusus Ketertiban & BP/BK */}
      {(slug === 'ketertiban' || slug === 'bk-bp') && (
        <InteractiveCharacterAssessmentManagement defaultCategory={slug === 'ketertiban' ? 'PELANGGARAN' : 'ALL'} />
      )}

      {/* Grid Status Modul Terencana */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Rencana Modul Fitur Integrasi BAU
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Daftar spesifikasi sub-fitur yang terintegrasi penuh untuk operasional Badan Administrasi Umum & Tata Usaha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.modules.map((mod, idx) => (
            <Card key={idx} className="border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all duration-200 shadow-xs hover:shadow-md dark:bg-slate-900/80 backdrop-blur-xs">
              <CardHeader className="p-5 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-400">#0{idx + 1}</span>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    {mod.title}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Siap Digunakan
                </Badge>
              </CardHeader>
              <CardContent className="p-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {mod.desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Banner Box */}
      <Card className="border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Akses Penuh Tata Usaha & Badan Administrasi Umum (BAU)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Role Admin Tata Usaha / BAU memiliki hak akses pengelolaan setara Superadmin dengan fitur tambahan buku tamu, persuratan, inventaris aset, kepegawaian HRD, dan pencatatan keuangan.
            </p>
          </div>
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm gap-2">
              <span>Kembali ke Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
