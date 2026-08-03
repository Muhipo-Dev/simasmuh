'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Award, ShieldAlert, Sparkles, ShieldCheck, UserCheck, 
  HeartHandshake, Library, BookMarked, Mail, Clock, 
  ArrowLeft, CheckCircle2, Construction, Sparkle, Layers, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    title: 'Kepegawaian & SDM Sekolah',
    roleName: 'KEPEGAWAIAN',
    category: 'Manajemen SDM & Karir',
    icon: UserCheck,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    badgeColor: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:bg-violet-400/10 dark:text-violet-400',
    description: 'Modul data induk pegawai, riwayat pangkat/golongan NIP/NBM, pengajuan cuti/izin resmi, penilaian kinerja staf, dan pengarsipan berkas kepegawaian.',
    modules: [
      { title: 'Database Induk & Berkas Pegawai', desc: 'Penyimpanan arsip digital SK, ijazah, sertifikat, dan NIP/NBM.', status: 'DALAM_PENGEMBANGAN' },
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
    title: 'Persuratan & Tata Usaha (E-Surat)',
    roleName: 'PERSURATAN',
    category: 'Administrasi & Disposisi',
    icon: Mail,
    gradient: 'from-amber-600 via-yellow-600 to-orange-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400',
    description: 'Modul pembuat surat resmi sekolah, penomoran surat otomatis, pendataan surat masuk & keluar, serta disposisi pimpinan secara digital.',
    modules: [
      { title: 'Penomoran Surat Masuk & Keluar Otomatis', desc: 'Sistem penomoran otomatis terstandar untuk semua jenis dokumen sekolah.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Template Surat Resmi & Export PDF', desc: 'Generator surat keterangan aktif, rekomendasi, dan panggilan orang tua.', status: 'TAHAP_DESAIN' },
      { title: 'Disposisi Digital Kepala Sekolah', desc: 'Alur penerusan surat masuk ke unit kerja terkait secara realtime.', status: 'SEGERA_HADIR' },
    ]
  }
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
              <span>Pengembangan Modul Baru</span>
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
            <span className="text-sm font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 animate-spin text-amber-400" />
              Segera Hadir
            </span>
          </div>
        </div>
      </div>

      {/* Grid Status Modul Terencana */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Rencana Modul Fitur
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Daftar spesifikasi sub-fitur yang sedang dalam proses perancangan dan siap diluncurkan.
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
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
                  Coming Soon
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
              Butuh Akses Prioritas atau Masukan Fitur Ini?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Tim pengembang SIMASMUH terus menyempurnakan alur kerja setiap sub-role. Hubungi Admin IT untuk memberikan saran kebutuhan spesifik sekolah Anda.
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
