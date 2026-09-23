'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Award, ShieldAlert, Sparkles, ShieldCheck, UserCheck, 
  HeartHandshake, Library, BookMarked, Mail, Clock, 
  ArrowLeft, CheckCircle2, Construction, Sparkle, Layers, ChevronRight,
  Contact, Package, Boxes, Search, PlusCircle, Download, FileText, Pencil, Trash2,
  Building2, Users, Loader2, Phone, Calendar, GraduationCap
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
import { CutiPegawaiManagement } from '@/app/(dashboard)/presensi/cuti/page'
import { IzinSiswaManagement } from '@/app/(dashboard)/presensi/izin-siswa/page'
import { PersuratanManagement } from '@/components/tu/PersuratanManagement'
import { InventarisManagement } from '@/components/tu/InventarisManagement'
import { KepegawaianManagement } from '@/components/tu/KepegawaianManagement'
import { GuestBookManagement } from '@/components/tu/GuestBookManagement'
import { NotulensiRapatManagement } from '@/components/tu/NotulensiRapatManagement'
import { KegiatanSekolahManagement } from '@/components/tu/KegiatanSekolahManagement'
import { DisposisiUserManagement } from '@/components/tu/DisposisiUserManagement'

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

const STATUS_LABEL: Record<string, string> = {
  SEGERA_HADIR: 'Segera Siap Digunakan',
  DALAM_PENGEMBANGAN: 'Dalam Penyempurnaan',
  TAHAP_DESAIN: 'Rancangan Fitur Baru'
}

const FEATURE_MAP: Record<string, FeatureConfig> = {
  'buku-tamu': {
    title: 'Buku Tamu',
    roleName: 'Tata Usaha',
    category: 'Administrasi & Humas',
    icon: Contact,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400',
    description: 'Modul registrasi & pendataan kedatangan tamu sekolah.',
    modules: [
      { title: 'Studi Tiru', desc: 'Pendataan rombongan kunjungan studi banding.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Kunjungan Dinas', desc: 'Registrasi tamu dinas dan instansi.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Layanan Alumni', desc: 'Pengurusan ijazah dan legalisir alumni.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Tamu Umum & Vendor', desc: 'Log kunjungan vendor dan tamu umum.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  inventaris: {
    title: 'Inventaris & Aset',
    roleName: 'Tata Usaha',
    category: 'Sarana Prasarana',
    icon: Package,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul pendataan sarana prasarana, kode inventaris, dan audit kondisi barang.',
    modules: [
      { title: 'Kode Aset & Barcode', desc: 'Pencatatan barang, foto fisik, dan pelabelan kode unik.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Audit Kondisi Barang', desc: 'Monitoring ketersediaan dan kondisi fisik aset.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Laporan Aset', desc: 'Rekapitulasi total nilai dan barang inventaris.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  ekstrakulikuler: {
    title: 'Ekstrakulikuler',
    roleName: 'Pembina Ekskul',
    category: 'Pengembangan Siswa',
    icon: Award,
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400',
    description: 'Modul pendaftaran anggota, jadwal latihan, presensi keaktifan, dan prestasi siswa.',
    modules: [
      { title: 'Data Anggota', desc: 'Pendataan anggota dan pilihan ekskul siswa.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Jadwal & Presensi', desc: 'Pencatatan absensi peserta ekskul.', status: 'SEGERA_HADIR' },
      { title: 'Rekap Prestasi', desc: 'Pencatatan kejuaraan dan piagam siswa.', status: 'TAHAP_DESAIN' },
      { title: 'Laporan Kegiatan', desc: 'Jurnal kegiatan dan evaluasi perkembangan.', status: 'SEGERA_HADIR' },
    ]
  },
  ketertiban: {
    title: 'Catatan Pembinaan & Poin Kedisiplinan',
    roleName: 'Ketertiban',
    category: 'Kesiswaan & Kedisiplinan',
    icon: ShieldAlert,
    gradient: 'from-rose-600 via-red-600 to-pink-600',
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-400',
    description: 'Modul pencatatan poin kedisiplinan oleh guru serta verifikasi & penetapan catatan pembinaan oleh bagian ketertiban.',
    modules: [
      { title: 'Catatan Pembinaan', desc: 'Verifikasi & persetujuan catatan kedisiplinan guru.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Poin Kedisiplinan Siswa', desc: 'Pencatatan pelanggaran & teladan oleh seluruh guru.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penerapan Skor Siswa', desc: 'Penetapan resmi skor ketertiban siswa ke buku saku.', status: 'SEGERA_HADIR' },
      { title: 'Notifikasi Otomatis Wali', desc: 'Kirim notifikasi in-app & Email resmi ke wali murid.', status: 'SEGERA_HADIR' },
    ]
  },
  'catatan-kedisiplinan': {
    title: 'Catatan Kedisiplinan Siswa',
    roleName: 'Guru',
    category: 'Kesiswaan & Kedisiplinan',
    icon: ShieldAlert,
    gradient: 'from-rose-600 via-red-600 to-pink-600',
    badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-400/10 dark:text-rose-400',
    description: 'Modul pencatatan draf poin kedisiplinan, pelanggaran, dan keteladanan siswa oleh guru.',
    modules: [
      { title: 'Pencatatan Draf Guru', desc: 'Pencatatan pelanggaran & teladan oleh guru.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Daftar Siswa & Skor', desc: 'Monitoring rekap poin kedisiplinan siswa.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  kebersihan: {
    title: 'Manajemen Kebersihan',
    roleName: 'Kebersihan',
    category: 'Sarana Prasarana',
    icon: Sparkles,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul pengawasan kebersihan area sekolah, inspeksi kelas, dan fasilitas umum.',
    modules: [
      { title: 'Jadwal Inspeksi', desc: 'Penjadwalan kebersihan gedung dan kelas.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penilaian Kebersihan', desc: 'Scoring harian kebersihan kelas.', status: 'TAHAP_DESAIN' },
      { title: 'Laporan Kerusakan', desc: 'Pengajuan alat kebersihan dan pembersihan.', status: 'SEGERA_HADIR' },
    ]
  },
  keamanan: {
    title: 'Pos Keamanan',
    roleName: 'Keamanan',
    category: 'Keamanan Sekolah',
    icon: ShieldCheck,
    gradient: 'from-blue-600 via-indigo-600 to-slate-700',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400',
    description: 'Modul buku tamu digital, pengawasan gerbang, izin keluar, dan log insiden.',
    modules: [
      { title: 'Buku Tamu Digital', desc: 'Registrasi tamu dan verifikasi identitas.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Scan Izin Keluar', desc: 'Validasi QR surat izin keluar siswa/guru.', status: 'TAHAP_DESAIN' },
      { title: 'Log Parkir', desc: 'Pendataan kendaraan di area sekolah.', status: 'SEGERA_HADIR' },
      { title: 'Laporan Insiden', desc: 'Catatan insiden keamanan sekolah.', status: 'SEGERA_HADIR' },
    ]
  },
  kepegawaian: {
    title: 'Humas & SDM',
    roleName: 'Humas & SDM',
    category: 'Manajemen Humas & SDM',
    icon: UserCheck,
    gradient: 'from-purple-600 via-indigo-600 to-violet-700',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-400/10 dark:text-purple-400',
    description: 'Pusat tata kelola Humas & SDM, publikasi web, arsip berkas kepegawaian guru/karyawan, rekrutmen digital, perizinan cuti, dan evaluasi kinerja terintegrasi.',
    modules: [
      { title: 'Database Pegawai & Guru', desc: 'Sinkronisasi arsip SK, ijazah, NIP/NBM, dan profil pegawai.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Rekrutmen & Seleksi Calon Pegawai', desc: 'Pengelolaan berkas pelamar, tahapan seleksi, hingga SK penerimaan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Cuti & Perizinan Kerja', desc: 'Verifikasi dan persetujuan permohonan cuti oleh SDM.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Evaluasi Kinerja Pendidik', desc: 'Penilaian kinerja kompetensi pedagogik, profesional, kepribadian & sosial.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  'bk-bp': {
    title: 'Bimbingan Konseling (BK)',
    roleName: 'Guru BK',
    category: 'Layanan Siswa',
    icon: HeartHandshake,
    gradient: 'from-pink-500 via-purple-600 to-rose-600',
    badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-400/10 dark:text-pink-400',
    description: 'Modul konseling akademik & pribadi siswa, jadwal pertemuan, dan bimbingan karir.',
    modules: [
      { title: 'Rekam Konseling', desc: 'Catatan sesi bimbingan konseling siswa.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Konseling Karir', desc: 'Bimbingan minat studi dan perguruan tinggi.', status: 'TAHAP_DESAIN' },
      { title: 'Home Visit', desc: 'Kunjungan rumah dan konseling orang tua.', status: 'SEGERA_HADIR' },
    ]
  },
  perpustakaan: {
    title: 'Perpustakaan',
    roleName: 'Pustakawan',
    category: 'Literasi & Buku',
    icon: Library,
    gradient: 'from-cyan-600 via-blue-600 to-teal-700',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-400',
    description: 'Modul katalog buku digital, sirkulasi peminjaman, dan rekap statistik membaca.',
    modules: [
      { title: 'Katalog Buku', desc: 'Pencarian koleksi buku dan lokasi rak.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Sirkulasi Buku', desc: 'Peminjaman dan pengembalian buku barcode.', status: 'TAHAP_DESAIN' },
      { title: 'Statistik Pengunjung', desc: 'Grafik minat baca dan kartu perpustakaan.', status: 'SEGERA_HADIR' },
    ]
  },
  tahfidz: {
    title: 'Tahfidz Al-Qur\'an',
    roleName: 'Guru Tahfidz',
    category: 'Keislaman',
    icon: BookMarked,
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Modul rekap setoran hafalan harian, evaluasi tajwid, dan progress juz siswa.',
    modules: [
      { title: 'Setoran Harian', desc: 'Input juz, surat, dan ayat setoran siswa.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penilaian Tajwid', desc: 'Evaluasi kelancaran dan tajwid hafalan.', status: 'TAHAP_DESAIN' },
      { title: 'Progress Hafalan', desc: 'Grafik pencapaian target hafalan siswa.', status: 'SEGERA_HADIR' },
    ]
  },
  persuratan: {
    title: 'Persuratan & E-Archive',
    roleName: 'Tata Usaha',
    category: 'Administrasi Sekolah',
    icon: Mail,
    gradient: 'from-amber-600 via-yellow-600 to-orange-600',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400',
    description: 'Modul pembuat surat resmi, penomoran otomatis, surat masuk/keluar, dan arsip digital.',
    modules: [
      { title: 'Surat Keluar', desc: 'Penomoran otomatis terstandar surat sekolah.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Template Surat', desc: 'Generator surat keterangan dan rekomendasi.', status: 'TAHAP_DESAIN' },
      { title: 'Disposisi Digital', desc: 'Alur penerusan surat masuk ke unit kerja.', status: 'SEGERA_HADIR' },
      { title: 'E-Archive', desc: 'Penyimpanan arsip dokumen penting sekolah.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  'notulensi-rapat': {
    title: 'Notulensi Rapat',
    roleName: 'Humas & SDM / Admin TU',
    category: 'Administrasi & Humas',
    icon: FileText,
    gradient: 'from-purple-600 via-indigo-600 to-slate-800',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-400/10 dark:text-purple-400',
    description: 'Pusat tata kelola notulensi rapat, rekam hasil keputusan, daftar hadir, dan tindak lanjut kedinasan.',
    modules: [
      { title: 'Rapat Dinas & Pimpinan', desc: 'Pencatatan rapat dinas dan koordinasi pimpinan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Koordinasi Humas & SDM', desc: 'Arsip agenda pembahasan Humas dan SDM.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Daftar Hadir Digital', desc: 'Rekap absensi kehadiran peserta rapat.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Action Plan & Keputusan', desc: 'Dokumentasi tindak lanjut hasil keputusan resmi.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  notulensi: {
    title: 'Notulensi Rapat',
    roleName: 'Humas & SDM / Admin TU',
    category: 'Administrasi & Humas',
    icon: FileText,
    gradient: 'from-purple-600 via-indigo-600 to-slate-800',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-400/10 dark:text-purple-400',
    description: 'Pusat tata kelola notulensi rapat, rekam hasil keputusan, daftar hadir, dan tindak lanjut kedinasan.',
    modules: [
      { title: 'Rapat Dinas & Pimpinan', desc: 'Pencatatan rapat dinas dan koordinasi pimpinan.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Koordinasi Humas & SDM', desc: 'Arsip agenda pembahasan Humas dan SDM.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Daftar Hadir Digital', desc: 'Rekap absensi kehadiran peserta rapat.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Action Plan & Keputusan', desc: 'Dokumentasi tindak lanjut hasil keputusan resmi.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  kegiatan: {
    title: 'Kegiatan Sekolah',
    roleName: 'Humas & SDM / Admin TU',
    category: 'Administrasi & Humas',
    icon: Sparkles,
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Pusat agenda kegiatan sekolah (Kajian Selasa Pagi, Workshop, Upacara) dan presensi mandiri via QR Code.',
    modules: [
      { title: 'Kajian Selasa Pagi', desc: 'Pencatatan materi kajian rutin dan presensi kehadiran.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'QR Code Generator', desc: 'Generate QR dinamis untuk scan absensi pegawai.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Presensi Live & Rekap', desc: 'Daftar hadir realtime, ekspor excel, dan cetak PDF.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  'kegiatan-sekolah': {
    title: 'Kegiatan Sekolah',
    roleName: 'Humas & SDM / Admin TU',
    category: 'Administrasi & Humas',
    icon: Sparkles,
    gradient: 'from-emerald-600 via-teal-600 to-slate-800',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400',
    description: 'Pusat agenda kegiatan sekolah (Kajian Selasa Pagi, Workshop, Upacara) dan presensi mandiri via QR Code.',
    modules: [
      { title: 'Kajian Selasa Pagi', desc: 'Pencatatan materi kajian rutin dan presensi kehadiran.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'QR Code Generator', desc: 'Generate QR dinamis untuk scan absensi pegawai.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Presensi Live & Rekap', desc: 'Daftar hadir realtime, ekspor excel, dan cetak PDF.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  kurikulum: {
    title: 'Manajemen Kurikulum',
    roleName: 'Kurikulum',
    category: 'Akademik & Kurikulum',
    icon: GraduationCap,
    gradient: 'from-fuchsia-600 via-purple-600 to-indigo-700',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-400',
    description: 'Pusat tata kelola kurikulum, perangkat ajar, supervisi jadwal KBM, dan rekapitulasi penilaian capaian pembelajaran.',
    modules: [
      { title: 'Struktur Kurikulum & Mapel', desc: 'Pengaturan beban jam pelajaran dan mata pelajaran.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Jadwal Pembelajaran KBM', desc: 'Penyusunan dan distribusi jadwal pelajaran kelas.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Supervisi Perangkat Ajar', desc: 'Pemantauan RPP, Modul Ajar, dan Jurnal Mengajar Guru.', status: 'SEGERA_HADIR' },
      { title: 'Rekap Capaian Nilai', desc: 'Monitoring nilai asesmen dan capaian hasil belajar siswa.', status: 'DALAM_PENGEMBANGAN' },
    ]
  },
  'guru-piket': {
    title: 'Guru Piket',
    roleName: 'Guru Piket',
    category: 'Operasional Harian',
    icon: Clock,
    gradient: 'from-lime-600 via-emerald-600 to-teal-700',
    badgeColor: 'bg-lime-500/10 text-lime-600 border-lime-500/20 dark:bg-lime-400/10 dark:text-lime-400',
    description: 'Pusat pemantauan KBM harian, perizinan siswa di gerbang, presensi kedatangan, dan penanganan kelas kosong.',
    modules: [
      { title: 'Log Piket Harian', desc: 'Pencatatan kejadian dan kondisi ketertiban harian.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Validasi Izin Keluar Masuk', desc: 'Pemberian dan pengecekan izin keluar siswa saat jam KBM.', status: 'DALAM_PENGEMBANGAN' },
      { title: 'Penanganan Kelas Kosong', desc: 'Tugas guru pengganti dan modul mandiri kelas kosong.', status: 'SEGERA_HADIR' },
      { title: 'Rekap Presensi KBM', desc: 'Monitoring ketertiban jam masuk guru dan siswa.', status: 'DALAM_PENGEMBANGAN' },
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
    dituju: 'Kepala Sekolah & Tim Tata Usaha',
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
    tujuan: 'Studi Tiru Sistem Manajemen Digital & e-Rapor',
    dituju: 'Tim Tata Usaha & Admin IT',
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
    dituju: 'Kepala Tata Usaha & Sarpras',
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
    dituju: 'Tata Usaha (Badan Administrasi Umum)',
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
              <p className="text-[11px] text-slate-500 mt-0.5">Tercatat di Log Tata Usaha</p>
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
                Registrasi & Log Kedatangan Tamu
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
              <Contact className="w-5 h-5" /> Form Registrasi Tamu Baru
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
              <Label>Catatan / Keterangan Pelayanan Tata Usaha</Label>
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
      </div>

      {/* Render Interaktif khusus Persuratan, Disposisi Guru/Pegawai, Kepegawaian, Inventaris, Buku Tamu, Kegiatan, Notulensi, Ketertiban & BK/BP */}
      {slug === 'persuratan' ? (
        <PersuratanManagement />
      ) : slug === 'disposisi' ? (
        <DisposisiUserManagement />
      ) : slug === 'kepegawaian' ? (
        <KepegawaianManagement />
      ) : slug === 'inventaris' ? (
        <InventarisManagement />
      ) : slug === 'buku-tamu' ? (
        <GuestBookManagement />
      ) : slug === 'kegiatan' || slug === 'kegiatan-sekolah' ? (
        <KegiatanSekolahManagement />
      ) : slug === 'notulensi-rapat' || slug === 'notulensi' ? (
        <NotulensiRapatManagement />
      ) : slug === 'catatan-kedisiplinan' || slug === 'ketertiban' || slug === 'bk-bp' ? (
        <InteractiveCharacterAssessmentManagement mode={slug === 'bk-bp' ? 'BK' : slug === 'catatan-kedisiplinan' ? 'GURU' : 'KETERTIBAN'} />
      ) : (
        <>
          {/* Grid Status Modul Terencana */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Rencana Modul Fitur {config.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Daftar spesifikasi sub-fitur yang terintegrasi untuk mendukung operasional {config.category}.
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
                  Akses Modul Terintegrasi
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Modul ini tersinkronisasi realtime dengan ekosistem aplikasi SIMASMUH SMA Muhammadiyah 1 Ponorogo.
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
        </>
      )}
    </div>
  )
}
