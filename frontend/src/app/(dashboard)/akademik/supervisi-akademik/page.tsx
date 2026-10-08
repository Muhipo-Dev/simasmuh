'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Loader2, Calendar, BookOpen, Clock, CheckCircle2, 
  Sparkles, UserCheck, Eye, User, BookCheck, Award, 
  FileText, Plus, Printer, Trash2, Camera, AlertCircle,
  FileCheck, CalendarDays, Check, RefreshCw, BarChart3,
  Search, ShieldCheck, Download, Pencil, Sliders, Settings2, RotateCcw,
  UploadCloud, Image as ImageIcon, X
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { SortableTableHead, useSorting } from '@/components/SortableTableHead'
import Swal from 'sweetalert2'

// 22 Jenis Supervisi Resmi SMA Muhammadiyah 1 Ponorogo
const JENIS_SUPERVISI = [
  { id: 'kurikulum_merdeka', label: 'Pembelajaran Kurikulum Merdeka', category: 'AKADEMIK', desc: 'Observasi KBM terintegrasi Kurikulum Merdeka, diferensiasi belajar, dan profil P5' },
  { id: 'perangkat_pembelajaran', label: 'Perangkat Pembelajaran', category: 'AKADEMIK', desc: 'Telaah kelengkapan administrasi Modul Ajar, ATP, CP, Prota, dan Promes' },
  { id: 'telaah_rpp', label: 'Telaah RPP', category: 'AKADEMIK', desc: 'Pemeriksaan kesesuaian RPP / Modul Ajar dengan standar proses pembelajaran' },
  { id: 'kunjungan_kelas', label: 'Kunjungan Kelas', category: 'AKADEMIK', desc: 'Observasi performa guru saat proses KBM tatap muka di ruang kelas' },
  { id: 'perangkat_penilaian', label: 'Perangkat Penilaian', category: 'AKADEMIK', desc: 'Telaah instrumen asesmen diagnostik, formatif, sumatif, dan rubrik penilaian' },
  { id: 'pembinaan_guru_bk', label: 'Pembinaan Guru BK', category: 'BK', desc: 'Supervisi program bimbingan konseling, layanan klasikal, dan penanganan siswa' },
  { id: 'perangkat_sekolah_penggerak', label: 'Perangkat Pembelajaran Sekolah Penggerak', category: 'AKADEMIK', desc: 'Penilaian instrumen pembelajaran paradigma baru sekolah penggerak' },
  { id: 'kinerja_admin_sekolah', label: 'Penilaian Kinerja Administrasi Sekolah', category: 'TENDIK', desc: 'Supervisi tata kelola administrasi umum dan persuratan tata usaha' },
  { id: 'kinerja_admin_ketenagaan', label: 'Penilaian Kinerja Administrasi Ketenagaan', category: 'TENDIK', desc: 'Supervisi berkas kepegawaian, absensi staf, dan data pendidik' },
  { id: 'kinerja_admin_perlengkapan', label: 'Penilaian Kinerja Administrasi Perlengkapan', category: 'TENDIK', desc: 'Supervisi pembukuan sarana, inventaris kelas, dan logistik' },
  { id: 'kinerja_admin_perpustakaan', label: 'Penilaian Kinerja Administrasi Perpustakaan', category: 'TENDIK', desc: 'Supervisi pelayanan literasi, katalog buku, dan sirkulasi peminjaman' },
  { id: 'kinerja_admin_kesiswaan', label: 'Penilaian Kinerja Administrasi Kesiswaan', category: 'TENDIK', desc: 'Supervisi buku induk siswa, mutasi, presensi, dan data pelanggaran' },
  { id: 'kinerja_keamanan', label: 'Penilaian Kinerja Keamanan', category: 'TENDIK', desc: 'Supervisi pos satpam, ketertiban gerbang, dan keamanan lingkungan sekolah' },
  { id: 'kinerja_bendahara_sekolah', label: 'Penilaian Bendahara Sekolah', category: 'KEUANGAN', desc: 'Supervisi pembukuan kas madrasah/sekolah, SPJ, dan rekonsiliasi' },
  { id: 'kinerja_staf_keuangan', label: 'Penilaian Kinerja Staf Keuangan', category: 'KEUANGAN', desc: 'Supervisi penerimaan SPP/VA BNI, verifikasi bukti bayar, dan laporan kas' },
  { id: 'kinerja_perawatan_sarpras', label: 'Penilaian Kinerja Perawatan Sarpras', category: 'TENDIK', desc: 'Supervisi pemeliharaan gedung, AC, proyektor, dan utilitas sekolah' },
  { id: 'kinerja_staf_it_desain', label: 'Penilaian Kinerja Staf It Dan Desain', category: 'TENDIK', desc: 'Supervisi jaringan internet, CBT, website, desain publikasi media sekolah' },
  { id: 'kinerja_staf_kebersihan', label: 'Penilaian Kinerja Staf Kebersihan', category: 'TENDIK', desc: 'Supervisi kebersihan ruang kelas, toilet, halaman, dan taman sekolah' },
  { id: 'kinerja_jaga_malam', label: 'Penilaian Kinerja Jaga Malam', category: 'TENDIK', desc: 'Supervisi patroli malam, kontrol kunci ruangan, dan aset malam hari' },
  { id: 'kinerja_petugas_koperasi', label: 'Penilaian Kinerja Petugas Koperasi', category: 'TENDIK', desc: 'Supervisi layanan koperasi sekolah, stok seragam, dan pembukuan toko' },
  { id: 'kinerja_petugas_dapur', label: 'Penilaian Kinerja Petugas Dapur', category: 'TENDIK', desc: 'Supervisi higienitas konsumsi, ketepatan penyajian, dan logistik dapur' },
  { id: 'kinerja_staf_kurikulum', label: 'Penilaian Kinerja Staf Kurikulum', category: 'TENDIK', desc: 'Supervisi rekap jadwal, bank soal, e-rapor, dan dokumen KSP/KTSP' },
  { id: 'kurikulum_merdeka_atp_modul', label: 'Kurikulum Merdeka - Aspek ATP dan Modul Ajar', category: 'AKADEMIK', desc: 'Fokus telaah integrasi Alur Tujuan Pembelajaran & modul ajar berdiferensiasi' },
  { id: 'kurikulum_merdeka_perencanaan', label: 'Kurikulum Merdeka - Perencanaan Pembelajaran', category: 'AKADEMIK', desc: 'Fokus rancangan TP, kesiapan LKPD, dan media interaktif' },
  { id: 'kurikulum_merdeka_pelaksanaan', label: 'Kurikulum Merdeka - Pelaksanaan Pembelajaran', category: 'AKADEMIK', desc: 'Fokus observasi interaksi KBM, asesmen formatif, dan refleksi siswa' },
  { id: 'kinerja_staf_uks', label: 'Penilaian Kinerja Staf UKS', category: 'TENDIK', desc: 'Supervisi pelayanan kesehatan siswa, kotak P3K, dan rekam medis UKS' },
]

// Rubrik Generator Dinamis Berdasarkan Jenis Supervisi
function getRubrikByJenis(jenisId: string) {
  if (jenisId.includes('kinerja_') || jenisId.includes('bendahara') || jenisId.includes('keamanan') || jenisId.includes('kebersihan') || jenisId.includes('dapur') || jenisId.includes('jaga_malam') || jenisId.includes('koperasi') || jenisId.includes('uks')) {
    return [
      {
        kategori: 'A. Kedisiplinan & Integritas Kerja (Bobot 30%)',
        items: [
          { id: 't1', label: 'Ketepatan waktu kehadiran & kepatuhan jam kerja resmi', bobot: 10 },
          { id: 't2', label: 'Tanggung jawab penyelesaian tupoksi kerja harian', bobot: 10 },
          { id: 't3', label: 'Penerapan etika, integritas, dan nilai Al-Islam Kemuhammadiyahan', bobot: 10 },
        ]
      },
      {
        kategori: 'B. Kualitas Hasil & Layanan Kerja (Bobot 40%)',
        items: [
          { id: 't4', label: 'Kecepatan dan ketepatan penyelesaian tugas administrasi/layanan', bobot: 15 },
          { id: 't5', label: 'Kerapian dokumentasi, arsip, dan laporan pertanggungjawaban', bobot: 15 },
          { id: 't6', label: 'Keramahan dan kualitas pelayanan kepada civitas sekolah & tamu', bobot: 10 },
        ]
      },
      {
        kategori: 'C. Inisiatif & Kerjasama Tim (Bobot 30%)',
        items: [
          { id: 't7', label: 'Kemampuan komunikasi dan kerjasama antar unit kerja', bobot: 15 },
          { id: 't8', label: 'Inisiatif perbaikan, perawatan fasilitas, dan tanggap situasi darurat', bobot: 15 },
        ]
      }
    ]
  }

  if (jenisId === 'pembinaan_guru_bk') {
    return [
      {
        kategori: 'A. Perencanaan Program BK (Bobot 25%)',
        items: [
          { id: 'bk1', label: 'Kelengkapan Program Tahunan & Semester Layanan BK', bobot: 10 },
          { id: 'bk2', label: 'Asesmen kebutuhan & sosiometri peserta didik', bobot: 15 },
        ]
      },
      {
        kategori: 'B. Pelaksanaan Layanan BK (Bobot 50%)',
        items: [
          { id: 'bk3', label: 'Layanan Bimbingan Klasikal & Kelompok', bobot: 15 },
          { id: 'bk4', label: 'Layanan Konseling Individual & Pendampingan Kasus', bobot: 20 },
          { id: 'bk5', label: 'Kolaborasi dengan Orang Tua / Wali Murid & Guru Wali Kelas', bobot: 15 },
        ]
      },
      {
        kategori: 'C. Evaluasi & Tindak Lanjut (Bobot 25%)',
        items: [
          { id: 'bk6', label: 'Pencatatan Buku Kasus & Rekam Bimbingan Siswa', bobot: 15 },
          { id: 'bk7', label: 'Tindak lanjut konferensi kasus & home visit', bobot: 10 },
        ]
      }
    ]
  }

  if (jenisId === 'perangkat_pembelajaran' || jenisId === 'telaah_rpp' || jenisId === 'kurikulum_merdeka_atp_modul' || jenisId === 'kurikulum_merdeka_perencanaan' || jenisId === 'perangkat_sekolah_penggerak' || jenisId === 'perangkat_penilaian') {
    return [
      {
        kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL',
        items: [
          { id: 'item_1', no: 1, label: 'UU Sisdiknas (No 20 th 2003)', bobot: 4 },
          { id: 'item_2', no: 2, label: 'SNP (PP 19 2005 / PP 32 2013 / PP 13 2015)', bobot: 4 },
          { id: 'item_3', no: 3, label: 'SKL (Permendikbud 20 2016 / Standar Kelulusan)', bobot: 4 },
          { id: 'item_4', no: 4, label: 'Standar Isi (Permendikbud 21 th 2016)', bobot: 4 },
          { id: 'item_5', no: 5, label: 'KI & KD / Capaian Pembelajaran (CP)', bobot: 4 },
          { id: 'item_6', no: 6, label: 'Standar Proses (Permendikbud 22 2016)', bobot: 4 },
          { id: 'item_7', no: 7, label: 'Standar Penilaian (Permendikbud 24 2016)', bobot: 4 },
          { id: 'item_8', no: 8, label: 'Pedoman Menyusun RPP / Modul Ajar', bobot: 4 },
          { id: 'item_9', no: 9, label: 'Pedoman Pembelajaran', bobot: 4 },
          { id: 'item_10', no: 10, label: 'Pedoman Penilaian & Asesmen Kurikulum', bobot: 4 },
          { id: 'item_11', no: 11, label: 'KOSP / KTSP (Visi, Misi, Tujuan Sekolah)', bobot: 4 },
        ]
      },
      {
        kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN',
        items: [
          { id: 'item_12', no: 12, label: 'Kalender Pendidikan', bobot: 4 },
          { id: 'item_13', no: 13, label: 'Analisis Minggu & Jam Efektif', bobot: 4 },
          { id: 'item_14', no: 14, label: 'Silabus / Alur Tujuan Pembelajaran (ATP)', bobot: 4 },
          { id: 'item_15', no: 15, label: 'RPP / Modul Ajar (Jumlah Keterpenuhan)', bobot: 4 },
          { id: 'item_16', no: 16, label: 'Program Tahunan (Prota)', bobot: 4 },
          { id: 'item_17', no: 17, label: 'Program Semester (Promes)', bobot: 4 },
          { id: 'item_18', no: 18, label: 'Jadwal Mengajar', bobot: 4 },
          { id: 'item_19', no: 19, label: 'Daftar Buku Pegangan Guru', bobot: 4 },
          { id: 'item_20', no: 20, label: 'Daftar Buku Pegangan Siswa', bobot: 4 },
          { id: 'item_21', no: 21, label: 'Agenda Guru / Jurnal Mengajar', bobot: 4 },
          { id: 'item_22', no: 22, label: 'Daftar Hadir Siswa', bobot: 4 },
          { id: 'item_23', no: 23, label: 'Jurnal Sikap Siswa', bobot: 4 },
          { id: 'item_24', no: 24, label: 'Daftar Rekap Nilai Sikap', bobot: 4 },
          { id: 'item_25', no: 25, label: 'Daftar Nilai Pengetahuan / Formatif', bobot: 4 },
          { id: 'item_26', no: 26, label: 'Daftar Nilai Keterampilan / Sumatif', bobot: 4 },
          { id: 'item_27', no: 27, label: 'Analisis Ketuntasan Siswa', bobot: 4 },
          { id: 'item_28', no: 28, label: 'Analisis Ketuntasan Materi', bobot: 4 },
          { id: 'item_29', no: 29, label: 'Program Remedial & Pengayaan', bobot: 4 },
          { id: 'item_30', no: 30, label: 'Pelaksanaan Remedial & Pengayaan', bobot: 4 },
        ]
      }
    ]
  }

  // Default: Rubrik Pembelajaran / Kurikulum Merdeka (KBM 30 Komponen Terstruktur)
  return [
    {
      kategori: 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL',
      items: [
        { id: 'item_1', no: 1, label: 'UU Sisdiknas (No 20 th 2003)', bobot: 4 },
        { id: 'item_2', no: 2, label: 'SNP (PP 19 2005 / PP 32 2013 / PP 13 2015)', bobot: 4 },
        { id: 'item_3', no: 3, label: 'SKL (Permendikbud 20 2016 / Standar Kelulusan)', bobot: 4 },
        { id: 'item_4', no: 4, label: 'Standar Isi (Permendikbud 21 th 2016)', bobot: 4 },
        { id: 'item_5', no: 5, label: 'KI & KD / Capaian Pembelajaran (CP)', bobot: 4 },
        { id: 'item_6', no: 6, label: 'Standar Proses (Permendikbud 22 2016)', bobot: 4 },
        { id: 'item_7', no: 7, label: 'Standar Penilaian (Permendikbud 24 2016)', bobot: 4 },
        { id: 'item_8', no: 8, label: 'Pedoman Menyusun RPP / Modul Ajar', bobot: 4 },
        { id: 'item_9', no: 9, label: 'Pedoman Pembelajaran', bobot: 4 },
        { id: 'item_10', no: 10, label: 'Pedoman Penilaian & Asesmen Kurikulum', bobot: 4 },
        { id: 'item_11', no: 11, label: 'KOSP / KTSP (Visi, Misi, Tujuan Sekolah)', bobot: 4 },
      ]
    },
    {
      kategori: 'B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN',
      items: [
        { id: 'item_12', no: 12, label: 'Kalender Pendidikan', bobot: 4 },
        { id: 'item_13', no: 13, label: 'Analisis Minggu & Jam Efektif', bobot: 4 },
        { id: 'item_14', no: 14, label: 'Silabus / Alur Tujuan Pembelajaran (ATP)', bobot: 4 },
        { id: 'item_15', no: 15, label: 'RPP / Modul Ajar (Jumlah Keterpenuhan)', bobot: 4 },
        { id: 'item_16', no: 16, label: 'Program Tahunan (Prota)', bobot: 4 },
        { id: 'item_17', no: 17, label: 'Program Semester (Promes)', bobot: 4 },
        { id: 'item_18', no: 18, label: 'Jadwal Mengajar', bobot: 4 },
        { id: 'item_19', no: 19, label: 'Daftar Buku Pegangan Guru', bobot: 4 },
        { id: 'item_20', no: 20, label: 'Daftar Buku Pegangan Siswa', bobot: 4 },
        { id: 'item_21', no: 21, label: 'Agenda Guru / Jurnal Mengajar', bobot: 4 },
        { id: 'item_22', no: 22, label: 'Daftar Hadir Siswa', bobot: 4 },
        { id: 'item_23', no: 23, label: 'Jurnal Sikap Siswa', bobot: 4 },
        { id: 'item_24', no: 24, label: 'Daftar Rekap Nilai Sikap', bobot: 4 },
        { id: 'item_25', no: 25, label: 'Daftar Nilai Pengetahuan / Formatif', bobot: 4 },
        { id: 'item_26', no: 26, label: 'Daftar Nilai Keterampilan / Sumatif', bobot: 4 },
        { id: 'item_27', no: 27, label: 'Analisis Ketuntasan Siswa', bobot: 4 },
        { id: 'item_28', no: 28, label: 'Analisis Ketuntasan Materi', bobot: 4 },
        { id: 'item_29', no: 29, label: 'Program Remedial & Pengayaan', bobot: 4 },
        { id: 'item_30', no: 30, label: 'Pelaksanaan Remedial & Pengayaan', bobot: 4 },
      ]
    }
  ]
}

export default function SupervisiAkademikPage() {
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id
  const userName = (session?.user as any)?.name || 'Kepala Sekolah'
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()

  const [activeTab, setActiveTab] = useState<
    | 'mulai' 
    | 'riwayat' 
    | 'perangkat' 
    | 'rekap-perangkat' 
    | 'hasil-guru' 
    | 'program-supervisi' 
    | 'jadwal' 
    | 'hasil-semua' 
    | 'foto-pelaksanaan' 
    | 'tindak-lanjut'
  >('mulai')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL')

  // State Form Mulai Supervisi & Jenis Supervisi
  const [formJenisSupervisi, setFormJenisSupervisi] = useState<string>('kurikulum_merdeka')
  const [openJenisModal, setOpenJenisModal] = useState(false)
  const [formTeacherId, setFormTeacherId] = useState('')
  const [formScheduleId, setFormScheduleId] = useState('')
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0])
  const [formKelas, setFormKelas] = useState('')
  const [formMapel, setFormMapel] = useState('')
  const [formMateri, setFormMateri] = useState('')
  const [formScores, setFormScores] = useState<Record<string, number>>({})
  const [formCatatanKekuatan, setFormCatatanKekuatan] = useState('')
  const [formCatatanPerbaikan, setFormCatatanPerbaikan] = useState('')
  const [formRekomendasi, setFormRekomendasi] = useState('')
  const [formFotoUrl, setFormFotoUrl] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string>('')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = React.useRef<HTMLInputElement>(null)
  const [savingSupervisi, setSavingSupervisi] = useState(false)

  // State Dialog & Form Manajemen Rubrik (Bisa Diubah oleh Semua WAKA)
  const [openRubrikModal, setOpenRubrikModal] = useState(false)
  const [editingRubrikItem, setEditingRubrikItem] = useState<any>(null)
  const [rubrikFormKategori, setRubrikFormKategori] = useState('A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL')
  const [rubrikFormLabel, setRubrikFormLabel] = useState('')
  const [rubrikFormBobot, setRubrikFormBobot] = useState(4)

  // State Dialog Detail / Cetak
  const [detailSupervisi, setDetailSupervisi] = useState<any>(null)
  const [openDetailDialog, setOpenDetailDialog] = useState(false)

  // State Jadwal Supervisi Form Dialog
  const [openJadwalDialog, setOpenJadwalDialog] = useState(false)
  const [jadwalForm, setJadwalForm] = useState({
    teacherId: '',
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    className: '',
    subjectName: '',
    supervisorName: userName,
    status: 'TERJADWAL',
    jenisSupervisi: 'kurikulum_merdeka'
  })

  const queryClient = useQueryClient()

  // 1. Ambil Pengaturan Sekolah
  const { data: settings } = useQuery<any>({
    queryKey: ['settings-supervisi'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  // 2. Ambil Master Guru & Seluruh Staf Pegawai / Tendik
  const { data: rawTeachers, isLoading: loadingTeachers } = useQuery<any[]>({
    queryKey: ['teachers-and-staff-supervisi-targets'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/supervisi/targets')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const teachersList = Array.isArray(rawTeachers) ? rawTeachers : []

  // 3. Ambil Master Jadwal
  const { data: rawSchedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules-supervisi-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/schedules')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const schedulesList = Array.isArray(rawSchedules) ? rawSchedules : []

  // 4. Ambil Jurnal Mengajar
  const { data: rawJournals, isLoading: loadingJournals } = useQuery<any[]>({
    queryKey: ['journals-supervisi-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teaching-journals')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const journalsList = Array.isArray(rawJournals) ? rawJournals : []

  // 5. Ambil Data Riil Riwayat Supervisi dari Database PostgreSQL Melalui API
  const { data: rawSupervisiRecords, isLoading: loadingSupervisi } = useQuery<any[]>({
    queryKey: ['supervisi-records-database-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/supervisi')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const supervisiRecords = Array.isArray(rawSupervisiRecords) ? rawSupervisiRecords : []

  // 6. Ambil Data Riil Jadwal Supervisi dari Database PostgreSQL Melalui API
  const { data: rawJadwalList, isLoading: loadingJadwal } = useQuery<any[]>({
    queryKey: ['supervisi-jadwal-database-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/supervisi/jadwal/all')
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const jadwalSupervisiList = Array.isArray(rawJadwalList) ? rawJadwalList : []

  // 7. Ambil Data Riil Rekapitulasi Perangkat Pembelajaran Guru dari Database
  const { data: perangkatStatsData } = useQuery<any>({
    queryKey: ['perangkat-ajar-stats-rekap-supervisi'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/perangkat-ajar/stats-rekap')
      if (!res.ok) return { summary: {}, rekapList: [] }
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })
  const rekapPerangkatList = perangkatStatsData?.rekapList || []

  // 8. Ambil Master Rubrik Penilaian Real dari Database (Bisa Diubah & Diedit Seluruh WAKA)
  const { data: dbRubrikData, isLoading: loadingRubrik } = useQuery<any>({
    queryKey: ['supervisi-rubrik-items', formJenisSupervisi],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/supervisi/rubrik/items?jenisId=${formJenisSupervisi}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  // Ambil rubrik aktif (Prioritas data riil database yang dapat diedit oleh WAKA)
  const currentRubrik = useMemo(() => {
    if (dbRubrikData?.categories && dbRubrikData.categories.length > 0) {
      return dbRubrikData.categories
    }
    return getRubrikByJenis(formJenisSupervisi)
  }, [dbRubrikData, formJenisSupervisi])

  // Mutasi Master Rubrik (Tambah/Edit/Hapus Indikator oleh Waka)
  const saveRubrikItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingRubrikItem?.dbId
        ? `/api-backend/supervisi/rubrik/items/${editingRubrikItem.dbId}`
        : '/api-backend/supervisi/rubrik/items'
      const method = editingRubrikItem?.dbId ? 'PATCH' : 'POST'

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan butir rubrik.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-rubrik-items'] })
      setEditingRubrikItem(null)
      setRubrikFormLabel('')
      setRubrikFormBobot(4)
      Swal.fire('Berhasil Disimpan', 'Indikator penilaian rubrik berhasil diperbarui di basis data.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'error')
    }
  })

  const deleteRubrikItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/supervisi/rubrik/items/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus butir rubrik.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-rubrik-items'] })
      Swal.fire('Terhapus', 'Butir indikator berhasil dihapus dari instrumen.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error')
    }
  })

  const resetRubrikMutation = useMutation({
    mutationFn: async (jenisId: string) => {
      const res = await authenticatedFetch('/api-backend/supervisi/rubrik/reset-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenisId }),
      })
      if (!res.ok) throw new Error('Gagal mereset rubrik.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-rubrik-items'] })
      Swal.fire('Berhasil Reset', 'Instrumen rubrik dikembalikan ke template standar resmi.', 'success')
    }
  })

  // Handle Pilih Guru pada Form Mulai Supervisi
  const handleSelectTeacher = (tId: string) => {
    setFormTeacherId(tId)
    const teacherSchedules = schedulesList.filter(s => s.teacherId === tId || s.teacher?.id === tId)
    if (teacherSchedules.length > 0) {
      const first = teacherSchedules[0]
      setFormScheduleId(first.id)
      setFormKelas(first.class?.name || '')
      setFormMapel(first.subject?.name || '')
    } else {
      setFormScheduleId('')
      setFormKelas('')
      setFormMapel('')
    }
  }

  // Hitung Nilai Akhir & Predikat Otomatis Dinamis
  const calculatedResult = useMemo(() => {
    let totalScore = 0

    currentRubrik.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        const score = formScores[item.id] || 0 // Skala 1 - 4
        const maxScore = 4
        const itemWeighted = (score / maxScore) * (item.bobot || 4)
        totalScore += itemWeighted
      })
    })

    const finalScore = Math.round(totalScore)
    let predicate = 'Kurang'
    let badgeColor = 'bg-rose-500'

    if (finalScore >= 91) {
      predicate = 'Amat Baik (A)'
      badgeColor = 'bg-emerald-600'
    } else if (finalScore >= 81) {
      predicate = 'Baik (B)'
      badgeColor = 'bg-blue-600'
    } else if (finalScore >= 71) {
      predicate = 'Cukup (C)'
      badgeColor = 'bg-amber-500'
    } else {
      predicate = 'Perlu Pembinaan (D)'
      badgeColor = 'bg-rose-600'
    }

    return { finalScore, predicate, badgeColor }
  }, [formScores, currentRubrik])

  // Mutations untuk Sinkronisasi Basis Data Riil
  const saveSupervisiMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/supervisi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan hasil supervisi.')
      }
      return res.json()
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-records-database-all'] })
      Swal.fire({
        title: 'Supervisi Berhasil Disimpan!',
        html: `Hasil penilaian <strong>${data.jenisLabel}</strong> untuk <strong>${data.teacherName}</strong> dengan skor <strong>${data.finalScore} (${data.predicate})</strong> berhasil dicatat dan disinkronkan ke basis data SIMASMUH.`,
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })

      // Reset form
      setFormScores({})
      setFormMateri('')
      setFormCatatanKekuatan('')
      setFormCatatanPerbaikan('')
      setFormRekomendasi('')
      setFormFotoUrl('')
      setFotoFile(null)
      setFotoPreview('')
      setActiveTab('riwayat')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan pada sistem.', 'error')
    },
  })

  const saveJadwalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/supervisi/jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan jadwal supervisi.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-jadwal-database-all'] })
      setOpenJadwalDialog(false)
      Swal.fire('Berhasil', 'Jadwal supervisi akademik berhasil diagendakan ke database.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan Jadwal', err.message || 'Terjadi kesalahan pada sistem.', 'error')
    },
  })

  const deleteSupervisiMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/supervisi/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus data supervisi.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-records-database-all'] })
      Swal.fire('Terhapus', 'Data supervisi berhasil dihapus dari database.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menghapus data.', 'error')
    },
  })

  const deleteJadwalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/supervisi/jadwal/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus jadwal supervisi.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisi-jadwal-database-all'] })
      Swal.fire('Terhapus', 'Jadwal supervisi berhasil dihapus dari database.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menghapus jadwal.', 'error')
    },
  })

  // Submit Penilaian Supervisi
  const handleSubmitSupervisi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTeacherId) {
      Swal.fire('Perhatian', 'Silakan pilih guru/staf yang disupervisi.', 'warning')
      return
    }

    setSavingSupervisi(true)
    let finalPhotoUrl = formFotoUrl

    try {
      if (fotoFile && fotoPreview.startsWith('data:image')) {
        setUploadingFoto(true)
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: fotoPreview, folder: 'supervisi' }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          finalPhotoUrl = uploadData.url || finalPhotoUrl
        }
        setUploadingFoto(false)
      }

      const selectedTeacherObj = teachersList.find(t => t.id === formTeacherId)
      const jenisInfo = JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)

      const payload = {
        teacherId: formTeacherId,
        scheduleId: formScheduleId || undefined,
        jenisId: formJenisSupervisi,
        jenisLabel: jenisInfo?.label || 'Pembelajaran Kurikulum Merdeka',
        kategori: jenisInfo?.category || 'AKADEMIK',
        date: formTanggal ? new Date(formTanggal).toISOString() : new Date().toISOString(),
        className: formKelas || 'Umum',
        subjectName: formMapel || 'Tugas Pokok',
        material: formMateri || 'Penilaian Kinerja Reguler',
        scores: formScores,
        finalScore: calculatedResult.finalScore,
        predicate: calculatedResult.predicate,
        catatanKekuatan: formCatatanKekuatan,
        catatanPerbaikan: formCatatanPerbaikan,
        rekomendasi: formRekomendasi,
        photoUrl: finalPhotoUrl || undefined,
        supervisorName: userName,
      }

      saveSupervisiMutation.mutate(payload)
    } catch (err: any) {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat mengunggah foto/data.', 'error')
    } finally {
      setSavingSupervisi(false)
    }
  }

  // Tambah Jadwal Supervisi Baru
  const handleAddJadwal = () => {
    if (!jadwalForm.teacherId || !jadwalForm.date) {
      Swal.fire('Perhatian', 'Silakan lengkapi guru dan tanggal pelaksanaan supervisi.', 'warning')
      return
    }

    const payload = {
      teacherId: jadwalForm.teacherId,
      jenisSupervisi: jadwalForm.jenisSupervisi || 'kurikulum_merdeka',
      date: new Date(jadwalForm.date).toISOString(),
      time: jadwalForm.time || '08:00',
      className: jadwalForm.className || 'X 1',
      subjectName: jadwalForm.subjectName || 'Pendidikan Agama Islam',
      supervisorName: jadwalForm.supervisorName || userName,
      status: jadwalForm.status || 'TERJADWAL',
    }

    saveJadwalMutation.mutate(payload)
  }

  // Hapus Data Supervisi
  const handleDeleteSupervisi = (id: string, teacherName: string) => {
    Swal.fire({
      title: 'Hapus Hasil Supervisi?',
      html: `Apakah Anda yakin ingin menghapus data supervisi untuk <strong>${teacherName}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus Data',
      cancelButtonText: 'Batal'
    }).then(res => {
      if (res.isConfirmed) {
        deleteSupervisiMutation.mutate(id)
      }
    })
  }

  // Cetak Lembar Hasil Supervisi Resmi
  const handlePrintSupervisi = (record: any) => {
    setDetailSupervisi(record)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  // Filter Data Riwayat Supervisi
  const filteredSupervisi = supervisiRecords
    .filter(r => selectedTeacherFilter === 'ALL' || r.teacherId === selectedTeacherFilter)
    .filter(r => selectedClassFilter === 'ALL' || r.className === selectedClassFilter)

  const { sortConfig, handleSort, sortedItems: sortedSupervisi } = useSorting(filteredSupervisi)
  const searchedSupervisi = filterDataBySearch(sortedSupervisi, searchQuery)

  // Rule 20 Pagination States
  const [riwayatPage, setRiwayatPage] = useState<number>(1)
  const [riwayatPageSize, setRiwayatPageSize] = useState<number>(10)
  const [jadwalPage, setJadwalPage] = useState<number>(1)
  const [jadwalPageSize, setJadwalPageSize] = useState<number>(10)
  const [rekapPage, setRekapPage] = useState<number>(1)
  const [rekapPageSize, setRekapPageSize] = useState<number>(10)

  useEffect(() => {
    setRiwayatPage(1)
  }, [searchQuery, selectedTeacherFilter, selectedClassFilter, riwayatPageSize])

  useEffect(() => {
    setJadwalPage(1)
  }, [searchQuery, jadwalPageSize])

  useEffect(() => {
    setRekapPage(1)
  }, [searchQuery, rekapPageSize])

  const paginatedSupervisi = useMemo(() => {
    const startIndex = (riwayatPage - 1) * riwayatPageSize
    return searchedSupervisi.slice(startIndex, startIndex + riwayatPageSize)
  }, [searchedSupervisi, riwayatPage, riwayatPageSize])

  const paginatedJadwal = useMemo(() => {
    const startIndex = (jadwalPage - 1) * jadwalPageSize
    return jadwalSupervisiList.slice(startIndex, startIndex + jadwalPageSize)
  }, [jadwalSupervisiList, jadwalPage, jadwalPageSize])

  const [allSupervisiPage, setAllSupervisiPage] = useState<number>(1)
  const [allSupervisiPageSize, setAllSupervisiPageSize] = useState<number>(10)

  const filteredAllSupervisi = useMemo(() => {
    return supervisiRecords.filter(r => !searchQuery || r.teacherName?.toLowerCase().includes(searchQuery.toLowerCase()) || r.supervisorName?.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [supervisiRecords, searchQuery])

  useEffect(() => {
    setAllSupervisiPage(1)
  }, [searchQuery, allSupervisiPageSize])

  const paginatedAllSupervisi = useMemo(() => {
    const startIndex = (allSupervisiPage - 1) * allSupervisiPageSize
    return filteredAllSupervisi.slice(startIndex, startIndex + allSupervisiPageSize)
  }, [filteredAllSupervisi, allSupervisiPage, allSupervisiPageSize])

  // Status Perangkat Guru (Calculated dynamically from real database records)
  const teacherPerangkatRekap = useMemo(() => {
    return teachersList.map(t => {
      const tName = t.user?.name || t.name || 'Guru'
      const tJournals = journalsList.filter(j => j.schedule?.teacherId === t.id || j.teacherId === t.id)
      const tSupervisis = supervisiRecords.filter(s => s.teacherId === t.id)
      const hasSupervisi = tSupervisis.length > 0
      const lastScore = hasSupervisi ? tSupervisis[0].finalScore : null
      const lastPredicate = hasSupervisi ? tSupervisis[0].predicate : null

      const dbRekap = rekapPerangkatList.find((r: any) => r.id === t.id || r.userId === t.userId)

      return {
        id: t.id,
        name: tName,
        nip: t.nip || '-',
        journalsCount: tJournals.length,
        supervisiCount: tSupervisis.length,
        lastScore,
        lastPredicate,
        modulAjarStatus: dbRekap?.modulAjarStatus || 'Belum Diunggah',
        modulAjarCount: dbRekap?.modulAjarCount || 0,
        atpStatus: dbRekap?.atpStatus || 'Belum Diunggah',
        atpCount: dbRekap?.atpCount || 0,
        cpStatus: dbRekap?.cpStatus || 'Belum Diunggah',
        cpCount: dbRekap?.cpCount || 0,
        protaPromesStatus: dbRekap?.protaPromesStatus || 'Belum Diunggah',
        protaPromesCount: dbRekap?.protaPromesCount || 0,
        completenessScore: dbRekap?.completenessScore || 0,
        statusValidasi: dbRekap?.statusValidasi || 'BELUM_LENGKAP',
        totalDocs: dbRekap?.totalDocs || 0,
        documents: dbRekap?.documents || [],
      }
    })
  }, [teachersList, journalsList, supervisiRecords, rekapPerangkatList])

  return (
    <div className="space-y-6 pb-12">
      {/* Header Utama Modul Supervisi ASA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-white/10 print:hidden">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold backdrop-blur-md border border-amber-400/30 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-300" />
              Supervisi Akademik (ASA)
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-amber-300 shrink-0" />
            Supervisi Akademik & GTK
          </h1>
          <p className="text-blue-100 mt-0.5 text-xs">
            Observasi pembelajaran, telaah perangkat guru, dan evaluasi kinerja tenaga pendidik/kependidikan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 flex items-center gap-3 shadow-inner">
            <UserCheck className="w-5 h-5 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <div className="text-blue-200 font-medium">Supervisor Penilai:</div>
              <div className="font-bold text-white tracking-wide">{userName}</div>
            </div>
          </div>
          <Button
            onClick={() => {
              setJadwalForm({
                teacherId: teachersList[0]?.id || '',
                date: new Date().toISOString().split('T')[0],
                time: '08:00',
                className: 'X 1',
                subjectName: 'Pendidikan Agama Islam',
                supervisorName: userName,
                status: 'TERJADWAL',
                jenisSupervisi: 'kurikulum_merdeka'
              })
              setOpenJadwalDialog(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Jadwalkan Supervisi
          </Button>
        </div>
      </div>

      {/* Navigasi Tab Fitur Resmi ASA (Menu Supervisi GTK) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 no-scrollbar print:hidden">
        {[
          { id: 'mulai', label: 'Mulai Supervisi', icon: Sparkles, count: null },
          { id: 'riwayat', label: 'Riwayat Supervisi', icon: Clock, count: supervisiRecords.length },
          { id: 'perangkat', label: 'Perangkat Guru', icon: BookOpen, count: null },
          { id: 'rekap-perangkat', label: 'Rekap Perangkat', icon: FileCheck, count: teachersList.length },
          { id: 'hasil-guru', label: 'Hasil Supervisi', icon: BookCheck, count: null },
          { id: 'program-supervisi', label: 'Program Tahunan', icon: CalendarDays, count: null },
          { id: 'jadwal', label: 'Jadwal Agenda', icon: Calendar, count: jadwalSupervisiList.length },
          { id: 'hasil-semua', label: 'Analisis Hasil', icon: BarChart3, count: supervisiRecords.length },
          { id: 'foto-pelaksanaan', label: 'Dokumentasi Foto', icon: Camera, count: supervisiRecords.filter(r => !!r.photoUrl).length || null },
          { id: 'tindak-lanjut', label: 'Tindak Lanjut', icon: Award, count: null },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MULAI SUPERVISI (INSTRUMEN PENILAIAN OBSERVASI KELAS) */}
      {/* ========================================================================= */}
      {activeTab === 'mulai' && (
        <div className="space-y-6 print:hidden">
          <form onSubmit={handleSubmitSupervisi} className="space-y-6">
            {/* Header Form & Identitas Guru */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Form Instrumen Observasi & Supervisi GTK
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pilih jenis supervisi dan beri skor pada setiap indikator kompetensi (Skala 1 - 4).
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenJenisModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Jenis: {JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)?.label || 'Kurikulum Merdeka'}
                    </Button>
                    <Badge className={`${calculatedResult.badgeColor} text-white font-black text-xs px-3 py-1.5`}>
                      Skor: {calculatedResult.finalScore} &bull; {calculatedResult.predicate}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Banner Jenis Supervisi Terpilih */}
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <BookCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)?.label}
                        <Badge className="bg-indigo-600 text-white text-[9px] font-bold">
                          {JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)?.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)?.desc}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenJenisModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-xs font-bold shrink-0"
                  >
                    Ganti Jenis
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Pilih Guru / Tendik */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Guru / Tendik Sasaran <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={formTeacherId}
                      onChange={(e) => handleSelectTeacher(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Pendidik / Staf Pegawai (Tendik) --</option>
                      {teachersList.map((t: any) => {
                        const name = t.user?.name || t.name || 'Pegawai'
                        const role = t.user?.role?.replace('_', ' ') || 'GURU'
                        const nipText = t.nip || t.user?.nipNbm ? `NIP/NBM. ${t.nip || t.user?.nipNbm}` : role
                        return (
                          <option key={t.id} value={t.id}>
                            {name} ({nipText})
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Tanggal Observasi */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tanggal Pelaksanaan <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      required
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>

                  {/* Kelas & Rombel / Ruang */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kelas / Ruangan Unit
                    </Label>
                    <Input
                      placeholder="Contoh: X 1, XI 2, Ruang TU, Lab"
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      className="h-10 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  {/* Mata Pelajaran / Tupoksi */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mata Pelajaran / Tupoksi
                    </Label>
                    <Input
                      placeholder="Contoh: Matematika, Kepegawaian, Sarpras"
                      value={formMapel}
                      onChange={(e) => setFormMapel(e.target.value)}
                      className="h-10 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Materi / Fokus Aspek yang Diobservasi
                  </Label>
                  <Input
                    placeholder="Tuliskan pokok bahasan atau fokus penilaian kinerja yang diobservasi..."
                    value={formMateri}
                    onChange={(e) => setFormMateri(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rubrik Penilaian Terperinci Dinamis & Pengaturan Instrumen oleh Seluruh WAKA */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Butir Indikator Penilaian Supervisi ({JENIS_SUPERVISI.find(j => j.id === formJenisSupervisi)?.label})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Indikator tersimpan di database dan dapat diubah, ditambah, atau disesuaikan oleh seluruh jajaran WAKA & Kepala Sekolah.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRubrikItem(null)
                      setRubrikFormKategori(currentRubrik[0]?.kategori || 'A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL')
                      setRubrikFormLabel('')
                      setRubrikFormBobot(4)
                      setOpenRubrikModal(true)
                    }}
                    className="h-8 px-3 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Kelola / Edit Indikator
                  </Button>
                </div>
              </div>

              {currentRubrik.map((cat: any, cIdx: number) => (
                <Card key={cIdx} className="border-slate-200 dark:border-slate-800 shadow-xs">
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 py-3 px-5 flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-sm font-extrabold text-blue-900 dark:text-blue-300">
                      {cat.kategori || cat.category}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRubrikItem(null)
                        setRubrikFormKategori(cat.kategori || cat.category)
                        setRubrikFormLabel('')
                        setRubrikFormBobot(4)
                        setOpenRubrikModal(true)
                      }}
                      className="h-7 px-2 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Tambah Butir
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cat.items.map((item: any, iIdx: number) => {
                        const currentVal = formScores[item.id] || 0
                        return (
                          <div key={item.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="space-y-0.5 max-w-xl">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-400">#{cIdx + 1}.{iIdx + 1}</span>
                                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                                  {item.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pl-6">
                                <span className="text-[11px] text-slate-400">
                                  Bobot Nilai Maksimal: {item.bobot}%
                                </span>
                                {item.dbId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRubrikItem(item)
                                      setRubrikFormKategori(cat.kategori)
                                      setRubrikFormLabel(item.label)
                                      setRubrikFormBobot(item.bobot || 4)
                                      setOpenRubrikModal(true)
                                    }}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                                  >
                                    <Pencil className="w-2.5 h-2.5" /> Edit
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Opsi Skor 1 - 4 */}
                            <div className="flex items-center gap-1.5 sm:gap-2 pl-6 sm:pl-0">
                              {[
                                { val: 4, short: '4 (Amat Baik)' },
                                { val: 3, short: '3 (Baik)' },
                                { val: 2, short: '2 (Cukup)' },
                                { val: 1, short: '1 (Kurang)' },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => setFormScores(prev => ({ ...prev, [item.id]: opt.val }))}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                    currentVal === opt.val
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                                  }`}
                                >
                                  {opt.short}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Catatan Kualitatif, Rekomendasi & Dokumentasi Foto */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Catatan Kualitatif, Umpan Balik & Rekomendasi Supervisi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Kelebihan / Kekuatan Guru dalam Mengajar
                    </Label>
                    <Textarea
                      placeholder="Contoh: Interaksi dengan siswa sangat hidup, penguasaan materi mendalam, pemanfaatan media slide presentasi menarik..."
                      rows={3}
                      value={formCatatanKekuatan}
                      onChange={(e) => setFormCatatanKekuatan(e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Aspek yang Perlu Ditingkatkan / Perbaikan
                    </Label>
                    <Textarea
                      placeholder="Contoh: Perlu alokasi waktu evaluasi formatif di akhir KBM yang lebih proporsional, penguatan LKPD kelompok..."
                      rows={3}
                      value={formCatatanPerbaikan}
                      onChange={(e) => setFormCatatanPerbaikan(e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rekomendasi & Rencana Tindak Lanjut Supervisor
                  </Label>
                  <Textarea
                    placeholder="Contoh: Disarankan mengikuti workshop pengembangan asesmen kurikulum merdeka, sharing best practice bersama MGMP..."
                    rows={2}
                    value={formRekomendasi}
                    onChange={(e) => setFormRekomendasi(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>

                {/* Unggah Foto Bukti Dokumentasi */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border-2 border-dashed border-blue-200 dark:border-blue-800/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Foto Bukti Dokumentasi Pelaksanaan Supervisi
                      <span className="text-[11px] text-slate-400 font-normal">(Opsional)</span>
                    </Label>
                    {fotoFile && (
                      <span className="text-[11px] text-blue-600 font-semibold truncate max-w-[200px]">
                        {fotoFile.name}
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fotoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setFotoFile(file)
                        const reader = new FileReader()
                        reader.onload = () => {
                          setFotoPreview(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />

                  {fotoPreview || formFotoUrl ? (
                    <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-blue-200 dark:border-blue-900 max-w-xs shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fotoPreview || formFotoUrl}
                        alt="Preview Bukti Supervisi"
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => fotoInputRef.current?.click()}
                          className="h-8 text-xs font-bold bg-white/90 text-slate-900"
                        >
                          Ganti Foto
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setFotoFile(null)
                            setFotoPreview('')
                            setFormFotoUrl('')
                            if (fotoInputRef.current) fotoInputRef.current.value = ''
                          }}
                          className="h-8 text-xs font-bold"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Hapus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fotoInputRef.current?.click()}
                        className="h-9 px-4 rounded-xl border-blue-300 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs shadow-xs"
                      >
                        <UploadCloud className="w-4 h-4 mr-1.5 text-blue-600" />
                        Unggah Foto Dokumentasi (JPG / PNG / WebP)
                      </Button>
                      <span className="text-[11px] text-slate-400">
                        Klik tombol di atas untuk memilih foto dokumentasi supervisi langsung dari perangkat Anda.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardContent className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Total Nilai: <strong className="text-slate-900 dark:text-white font-bold text-sm">{calculatedResult.finalScore}</strong> &bull; Predikat: <strong className="text-blue-600 font-bold">{calculatedResult.predicate}</strong>
                </div>
                <Button
                  type="submit"
                  disabled={savingSupervisi}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md gap-2"
                >
                  {savingSupervisi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Simpan & Sahkan Hasil Supervisi
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT & HASIL SUPERVISI GURU */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat' && (
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 print:hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookCheck className="w-5 h-5 text-blue-600" />
                Daftar & Rekapitulasi Hasil Supervisi Guru
              </CardTitle>
              <CardDescription className="text-xs">
                Riwayat penilaian observasi kelas, skor akhir, predikat, dan cetak lembar hasil supervisi resmi.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari guru / mapel / kelas..."
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="pl-6 w-[50px]">No</TableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="date">Tanggal</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="teacherName">Nama Guru</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="className">Kelas</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="subjectName">Mata Pelajaran</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="finalScore">Skor Akhir</SortableTableHead>
                  <TableHead>Predikat</TableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedSupervisi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <BookCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-xs">Belum ada data supervisi akademik tersimpan.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Silakan pilih tab &quot;Mulai Supervisi&quot; untuk mengisi instrumen observasi baru.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSupervisi.map((record, index) => (
                    <TableRow key={record.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-medium text-slate-500 text-xs">{(riwayatPage - 1) * riwayatPageSize + index + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                        {format(new Date(record.date), 'dd MMM yyyy', { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                        {record.teacherName}
                        {record.nip && record.nip !== '-' && (
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. {record.nip}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          {record.className}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                        {record.subjectName}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {record.finalScore}
                        </span>
                        <span className="text-[10px] text-slate-400"> / 100</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          record.finalScore >= 91 ? 'bg-emerald-600' :
                          record.finalScore >= 81 ? 'bg-blue-600' :
                          record.finalScore >= 71 ? 'bg-amber-500' : 'bg-rose-600'
                        } text-white font-bold text-[10px]`}>
                          {record.predicate}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDetailSupervisi(record)
                              setOpenDetailDialog(true)
                            }}
                            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintSupervisi(record)}
                            className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Cetak
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSupervisi(record.id, record.teacherName)}
                            className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {searchedSupervisi.length > 0 && (
            <TablePagination
              currentPage={riwayatPage}
              pageSize={riwayatPageSize}
              totalItems={searchedSupervisi.length}
              onPageChange={setRiwayatPage}
              onPageSizeChange={setRiwayatPageSize}
              itemLabel="hasil supervisi"
            />
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIHAT PERANGKAT PEMBELAJARAN GURU */}
      {/* ========================================================================= */}
      {activeTab === 'perangkat' && (
        <div className="space-y-6 print:hidden">
          <Card className="shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Lihat Perangkat Pembelajaran Guru (Kurikulum Merdeka)
                </CardTitle>
                <CardDescription className="text-xs">
                  Telaah kelengkapan administrasi guru: Modul Ajar, Alur Tujuan Pembelajaran (ATP), Capaian Pembelajaran (CP), Program Tahunan (Prota), & Program Semester (Promes).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5">
                <Link href="/akademik/perangkat-ajar">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    Kelola & Verifikasi Berkas
                  </Button>
                </Link>
                <TableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari guru..."
                />
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherPerangkatRekap
                  .filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((t) => (
                    <Card key={t.id} className="border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.name}
                            </CardTitle>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {t.nip !== '-' ? `NIP. ${t.nip}` : 'Guru SMA Muhammadiyah 1'}
                            </span>
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">
                            {t.journalsCount} Sesi Jurnal
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 font-medium">1. Modul Ajar / RPP</span>
                          {t.modulAjarCount > 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t.modulAjarStatus} ({t.modulAjarCount})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum Diunggah</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 font-medium">2. Alur Tujuan Belajar (ATP)</span>
                          {t.atpCount > 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t.atpStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum Diunggah</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 font-medium">3. Capaian Pembelajaran (CP)</span>
                          {t.cpCount > 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t.cpStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum Diunggah</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 font-medium">4. Prota & Promes</span>
                          {t.protaPromesCount > 0 ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {t.protaPromesStatus}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum Diunggah</span>
                          )}
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Status Supervisi:</span>
                          {t.lastScore ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                              Skor {t.lastScore} ({t.lastPredicate?.split(' ')[0]})
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold italic">Belum disupervisi</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REKAP PERANGKAT PEMBELAJARAN GURU */}
      {/* ========================================================================= */}
      {activeTab === 'rekap-perangkat' && (
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 print:hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Matriks Rekapitulasi Perangkat Pembelajaran Guru
              </CardTitle>
              <CardDescription className="text-xs">
                Tabel rekapitulasi kelengkapan dokumen pembelajaran seluruh guru di SMA Muhammadiyah 1 Ponorogo.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2.5">
              <Link href="/akademik/perangkat-ajar">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  Panel Kurikulum
                </Button>
              </Link>
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari guru..."
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="pl-6 w-[50px]">No</TableHead>
                  <TableHead>Nama Guru</TableHead>
                  <TableHead className="text-center">Modul Ajar / RPP</TableHead>
                  <TableHead className="text-center">ATP & CP</TableHead>
                  <TableHead className="text-center">Prota / Promes</TableHead>
                  <TableHead className="text-center">Jurnal KBM Terisi</TableHead>
                  <TableHead className="text-center">Hasil Supervisi</TableHead>
                  <TableHead className="text-right pr-6">Status Validasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherPerangkatRekap
                  .filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((teacher, idx) => (
                    <TableRow key={teacher.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-medium text-slate-500 text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                        {teacher.name}
                        {teacher.nip !== '-' && (
                          <span className="text-[10px] text-slate-400 font-mono block">NIP. {teacher.nip}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {teacher.modulAjarCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> {teacher.modulAjarStatus}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {teacher.atpCount > 0 || teacher.cpCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Lengkap
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {teacher.protaPromesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> {teacher.protaPromesStatus}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-xs text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-md">
                          {teacher.journalsCount} Sesi KBM
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {teacher.lastScore ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            {teacher.lastScore} ({teacher.lastPredicate?.split(' ')[0]})
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Disupervisi</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {teacher.statusValidasi === 'TERVERIFIKASI_LENGKAP' ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            Terverifikasi
                          </Badge>
                        ) : teacher.totalDocs > 0 ? (
                          <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                            Proses Telaah
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">
                            Belum Lengkap
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HASIL SUPERVISI GURU */}
      {/* ========================================================================= */}
      {activeTab === 'hasil-guru' && (
        <div className="space-y-6 print:hidden">
          <Card className="shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookCheck className="w-5 h-5 text-blue-600" />
                  Pencapaian & Lembar Hasil Supervisi Guru
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftar capaian nilai observasi KBM masing-masing guru, kartu evaluasi, dan rekomendasi perbaikan.
                </CardDescription>
              </div>
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari guru / mapel..."
              />
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supervisiRecords.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <BookCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">Belum ada lembar supervisi tercatat.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Buka tab &quot;Mulai Supervisi&quot; untuk mengisi instrumen observasi.</p>
                  </div>
                ) : (
                  supervisiRecords
                    .filter(r => !searchQuery || r.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) || r.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((rec) => (
                      <Card key={rec.id} className="border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                        <CardHeader className="p-4 pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">{rec.teacherName}</h4>
                              <p className="text-[11px] text-slate-500">{rec.className} &bull; {rec.subjectName}</p>
                            </div>
                            <Badge className={`${
                              rec.finalScore >= 91 ? 'bg-emerald-600' :
                              rec.finalScore >= 81 ? 'bg-blue-600' :
                              rec.finalScore >= 71 ? 'bg-amber-500' : 'bg-rose-600'
                            } text-white font-black text-xs`}>
                              {rec.finalScore} / 100
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2.5 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Materi KBM:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{rec.material}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Predikat:</span>
                            <span className="font-bold text-blue-600">{rec.predicate}</span>
                          </div>
                          {rec.rekomendasi && (
                            <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-700 dark:text-slate-300">
                              <strong>Rekomendasi:</strong> {rec.rekomendasi}
                            </div>
                          )}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {format(new Date(rec.date), 'dd MMM yyyy', { locale: localeId })}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDetailSupervisi(rec)
                                  setOpenDetailDialog(true)
                                }}
                                className="h-7 px-2 text-[11px] text-blue-600 font-bold"
                              >
                                Detail
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintSupervisi(rec)}
                                className="h-7 px-2 text-[11px] font-bold"
                              >
                                Cetak
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: PROGRAM SUPERVISI DI SMA MUHAMMADIYAH 1 PONOROGO */}
      {/* ========================================================================= */}
      {activeTab === 'program-supervisi' && (
        <div className="space-y-6 print:hidden">
          <Card className="shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    Program Kerja Supervisi Akademik SMA Muhammadiyah 1 Ponorogo
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kerangka acuan, sasaran strategis, tahapan observasi, dan target mutu pembelajaran tahun ajaran berjalan.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-xs font-bold px-3 py-1">
                  Periode Semester Berjalan
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {/* Sasaran & Target Program */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black mb-3">1</div>
                  <h4 className="font-bold text-xs text-blue-950 dark:text-blue-200 mb-1">Sasaran Guru (100%)</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Seluruh pendidik tetap dan tidak tetap diwajibkan menjalani observasi KBM minimal 1 kali setiap semester.
                  </p>
                </div>
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black mb-3">2</div>
                  <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200 mb-1">Target Mutu Capaian</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Target pencapaian nilai supervisi rata-rata &ge; 85.00 dengan predikat minimal Baik pada seluruh rumpun mata pelajaran.
                  </p>
                </div>
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black mb-3">3</div>
                  <h4 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 mb-1">Tindak Lanjut & Coaching</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Penyelenggaraan workshop penguatan asesmen, digitalisasi KBM, dan sharing best practice MGMP sekolah.
                  </p>
                </div>
              </div>

              {/* Tahapan Pelaksanaan */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  Alur & Tahapan Pelaksanaan Supervisi Akademik (ASA)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { step: 'Tahap 1: Perencanaan', desc: 'Penyusunan jadwal, pembagian guru sasaran, dan sosialisasi instrumen observasi.' },
                    { step: 'Tahap 2: Pra-Observasi', desc: 'Pemeriksaan Modul Ajar, ATP, kesiapan media pembelajaran, dan lembar kerja siswa.' },
                    { step: 'Tahap 3: Observasi KBM', desc: 'Pengamatan langsung di kelas, pencatatan rubrik pedagogik, dan interaksi pembelajaran.' },
                    { step: 'Tahap 4: Pasca-Observasi', desc: 'Diskusi refleksi, pemberian umpan balik konstruktif, pengesahan nilai, dan tindak lanjut.' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="font-bold text-blue-600 dark:text-blue-400 mb-1">{s.step}</div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: JADWAL SUPERVISI DI SMA MUHAMMADIYAH 1 PONOROGO */}
      {/* ========================================================================= */}
      {activeTab === 'jadwal' && (
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 print:hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                Jadwal Supervisi di SMA Muhammadiyah 1 Ponorogo
              </CardTitle>
              <CardDescription className="text-xs">
                Agenda pelaksanaan observasi kelas semester berjalan untuk SMA Muhammadiyah 1 Ponorogo.
              </CardDescription>
            </div>
            <Button
              onClick={() => setOpenJadwalDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal Baru
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="pl-6 w-[50px]">No</TableHead>
                  <TableHead>Hari / Tanggal</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Guru Sasaran</TableHead>
                  <TableHead>Kelas & Mapel</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jadwalSupervisiList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Belum ada agenda supervisi terdaftar. Klik tombol &quot;Tambah Jadwal Baru&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedJadwal.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-medium text-slate-500 text-xs">{(jadwalPage - 1) * jadwalPageSize + index + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                        {format(new Date(item.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.time} WIB
                      </TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {item.teacherName}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-slate-900 dark:text-white">{item.className}</span> &bull; {item.subjectName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {item.supervisorName}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          item.status === 'SELESAI' ? 'bg-emerald-600' : 'bg-amber-500'
                        } text-white font-bold text-[10px]`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            Swal.fire({
                              title: 'Hapus Agenda Jadwal?',
                              text: `Hapus agenda supervisi untuk ${item.teacherName}?`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#e11d48',
                              confirmButtonText: 'Ya, Hapus',
                              cancelButtonText: 'Batal'
                            }).then(res => {
                              if (res.isConfirmed) {
                                deleteJadwalMutation.mutate(item.id)
                              }
                            })
                          }}
                          className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          {jadwalSupervisiList.length > 0 && (
            <TablePagination
              currentPage={jadwalPage}
              pageSize={jadwalPageSize}
              totalItems={jadwalSupervisiList.length}
              onPageChange={setJadwalPage}
              onPageSizeChange={setJadwalPageSize}
              itemLabel="jadwal supervisi"
            />
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: HASIL SEMUA SUPERVISI DI SMA MUHAMMADIYAH 1 PONOROGO */}
      {/* ========================================================================= */}
      {activeTab === 'hasil-semua' && (
        <div className="space-y-6 print:hidden">
          {/* Kartu Ringkasan Analitik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Total Supervisi</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {supervisiRecords.length}
                  </div>
                  <span className="text-[10px] text-slate-500">Guru Terobservasi</span>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-blue-600">
                  <UserCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Rata-rata Skor</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {supervisiRecords.length > 0
                      ? (supervisiRecords.reduce((acc, r) => acc + (r.finalScore || 0), 0) / supervisiRecords.length).toFixed(1)
                      : '0.0'}
                  </div>
                  <span className="text-[10px] text-slate-500">Skala 100</span>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600">
                  <Award className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Predikat Amat Baik (A)</span>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {supervisiRecords.filter(r => r.finalScore >= 91).length}
                  </div>
                  <span className="text-[10px] text-slate-500">Skor &ge; 91</span>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
                  <Sparkles className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Perlu Pembinaan</span>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {supervisiRecords.filter(r => r.finalScore < 71).length}
                  </div>
                  <span className="text-[10px] text-slate-500">Skor &lt; 71</span>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl text-rose-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Rekap Seluruh Supervisi */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Rekapitulasi Lengkap Semua Supervisi Akademik Sekolah
                </CardTitle>
                <CardDescription className="text-xs">
                  Seluruh data observasi guru di SMA Muhammadiyah 1 Ponorogo beserta supervisor penilai.
                </CardDescription>
              </div>
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari guru / supervisor..."
              />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="pl-6 w-[50px]">No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>Kelas & Mapel</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisiRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Belum ada data supervisi tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedAllSupervisi.map((rec, idx) => (
                      <TableRow key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="pl-6 font-medium text-slate-500 text-xs">{(allSupervisiPage - 1) * allSupervisiPageSize + idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                          {format(new Date(rec.date), 'dd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                          {rec.teacherName}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">{rec.className}</span> &bull; {rec.subjectName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {rec.supervisorName}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs">
                          {rec.finalScore}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${
                            rec.finalScore >= 91 ? 'bg-emerald-600' :
                            rec.finalScore >= 81 ? 'bg-blue-600' :
                            rec.finalScore >= 71 ? 'bg-amber-500' : 'bg-rose-600'
                          } text-white font-bold text-[10px]`}>
                            {rec.predicate}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDetailSupervisi(rec)
                              setOpenDetailDialog(true)
                            }}
                            className="h-8 px-2.5 text-xs text-blue-600 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {filteredAllSupervisi.length > 0 && (
              <TablePagination
                currentPage={allSupervisiPage}
                pageSize={allSupervisiPageSize}
                totalItems={filteredAllSupervisi.length}
                onPageChange={setAllSupervisiPage}
                onPageSizeChange={setAllSupervisiPageSize}
                itemLabel="rekap supervisi"
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: FOTO PELAKSANAAN SUPERVISI DI SMA MUHAMMADIYAH 1 PONOROGO */}
      {/* ========================================================================= */}
      {activeTab === 'foto-pelaksanaan' && (
        <div className="space-y-6 print:hidden">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  Foto Pelaksanaan Supervisi di SMA Muhammadiyah 1 Ponorogo
                </CardTitle>
                <CardDescription className="text-xs">
                  Dokumentasi visual kegiatan observasi kelas, interaksi pembelajaran siswa, dan evaluasi KBM.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {supervisiRecords.filter(r => !!r.photoUrl).length === 0 ? (
                  <div className="col-span-full text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Camera className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Belum ada foto dokumentasi supervisi diunggah.</p>
                    <p className="text-[11px] text-slate-400">Foto dokumentasi dapat langsung diunggah saat mengisi form pada tab &quot;Mulai Supervisi&quot;.</p>
                  </div>
                ) : (
                  supervisiRecords.filter(r => !!r.photoUrl).map((rec, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                      <div className="h-44 overflow-hidden bg-slate-100 dark:bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={rec.photoUrl} alt="Dokumentasi Supervisi" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{rec.teacherName}</h4>
                        <p className="text-[11px] text-slate-500">{rec.className} &bull; {rec.subjectName}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          {format(new Date(rec.date), 'dd MMMM yyyy', { locale: localeId })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: TINDAK LANJUT SUPERVISI DI SMA MUHAMMADIYAH 1 PONOROGO */}
      {/* ========================================================================= */}
      {activeTab === 'tindak-lanjut' && (
        <div className="space-y-6 print:hidden">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Program Tindak Lanjut Supervisi di SMA Muhammadiyah 1 Ponorogo
                </CardTitle>
                <CardDescription className="text-xs">
                  Rencana pembinaan, rekomendasi pelatihan, tindak lanjut MGMP, dan pemantauan perbaikan kompetensi guru.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supervisiRecords.length === 0 ? (
                  <div className="col-span-full text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 text-xs">
                    Belum ada rekomendasi tindak lanjut tersimpan.
                  </div>
                ) : (
                  supervisiRecords.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{rec.teacherName}</h4>
                        <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                          Skor {rec.finalScore}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          <strong>Kekuatan:</strong> {rec.catatanKekuatan || 'KBM berlangsung kondusif.'}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          <strong>Aspek Perbaikan:</strong> {rec.catatanPerbaikan || 'Pertahankan konsistensi.'}
                        </p>
                        <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-blue-900 dark:text-blue-300 font-medium">
                          <strong>Aksi Tindak Lanjut:</strong> {rec.rekomendasi || 'Pembinaan rutin bersama WAKA Kurikulum & Kepala Sekolah.'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DIALOG DETAIL SUPERVISI */}
      {/* ========================================================================= */}
      <Dialog open={openDetailDialog} onOpenChange={setOpenDetailDialog}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookCheck className="w-5 h-5 text-blue-600" />
              Detail Hasil Supervisi Akademik Guru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian skor instrumen observasi, catatan kekuatan, dan rekomendasi pembinaan.
            </DialogDescription>
          </DialogHeader>

          {detailSupervisi && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Guru yang Disupervisi</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{detailSupervisi.teacherName}</span>
                  {detailSupervisi.nip && <span className="text-[10px] text-slate-500 font-mono block">NIP. {detailSupervisi.nip}</span>}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Tanggal Observasi</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {format(new Date(detailSupervisi.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Kelas & Mapel</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {detailSupervisi.className} &bull; {detailSupervisi.subjectName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Skor & Predikat</span>
                  <Badge className="bg-blue-600 text-white font-bold text-xs mt-0.5">
                    {detailSupervisi.finalScore} / 100 ({detailSupervisi.predicate})
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Materi yang Diajarkan</Label>
                <div className="mt-1 p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                  {detailSupervisi.material}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Kekuatan / Kelebihan Guru</Label>
                <div className="mt-1 p-2.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200">
                  {detailSupervisi.catatanKekuatan || 'Tidak ada catatan khusus.'}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Aspek Perbaikan & Rekomendasi</Label>
                <div className="mt-1 p-2.5 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200">
                  {detailSupervisi.rekomendasi || detailSupervisi.catatanPerbaikan || 'Tingkatkan kualitas KBM secara konsisten.'}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpenDetailDialog(false)
                handlePrintSupervisi(detailSupervisi)
              }}
              className="gap-1.5 font-bold text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </Button>
            <Button variant="default" size="sm" onClick={() => setOpenDetailDialog(false)} className="text-xs font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL / DIALOG PILIH JENIS SUPERVISI (22 JENIS RESMI SMA MUHIPO) */}
      {/* ========================================================================= */}
      <Dialog open={openJenisModal} onOpenChange={setOpenJenisModal}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              Pilih Jenis Supervisi
            </DialogTitle>
          </div>
          <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {JENIS_SUPERVISI.map((item) => {
              const isSelected = formJenisSupervisi === item.id
              return (
                <label
                  key={item.id}
                  onClick={() => {
                    setFormJenisSupervisi(item.id)
                    setFormScores({})
                  }}
                  className={`flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span>{item.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                        item.category === 'AKADEMIK' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        item.category === 'KEUANGAN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        item.category === 'BK' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <Button
              type="button"
              onClick={() => setOpenJenisModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl shadow-md uppercase tracking-wider text-xs"
            >
              Mulai Supervisi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL / DIALOG KELOLA & EDIT INDIKATOR RUBRIK SUPERVISI (UNTUK SEMUA WAKA) */}
      {/* ========================================================================= */}
      <Dialog open={openRubrikModal} onOpenChange={(open) => {
        setOpenRubrikModal(open)
        if (!open) {
          setEditingRubrikItem(null)
          setRubrikFormLabel('')
          setRubrikFormBobot(4)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                Kelola & Sesuaikan Indikator Instrumen Supervisi
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Role Pimpinan & WAKA dapat menambah, mengedit teks bobot, atau menghapus butir dokumen pedoman & perangkat program.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                Swal.fire({
                  title: 'Reset ke Template Standar?',
                  text: 'Seluruh butir indikator untuk jenis supervisi ini akan dikembalikan ke template 30 komponen resmi.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#3b82f6',
                  confirmButtonText: 'Ya, Reset',
                  cancelButtonText: 'Batal'
                }).then(r => {
                  if (r.isConfirmed) {
                    resetRubrikMutation.mutate(formJenisSupervisi)
                  }
                })
              }}
              disabled={resetRubrikMutation.isPending}
              className="h-8 px-2.5 text-xs text-amber-400 border-amber-500/40 hover:bg-amber-950/40 hover:text-amber-300 font-bold gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </Button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-5 text-xs">
            {/* Form Input Tambah / Edit Butir */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  {editingRubrikItem ? 'Edit Butir Indikator Penilaian' : 'Tambah Butir Indikator Baru'}
                </span>
                {editingRubrikItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRubrikItem(null)
                      setRubrikFormLabel('')
                      setRubrikFormBobot(4)
                    }}
                    className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Batal Edit
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Kategori Dokumen / Instrumen</Label>
                  <select
                    value={rubrikFormKategori}
                    onChange={(e) => setRubrikFormKategori(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950"
                  >
                    <option value="A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL">A. DOKUMEN PERATURAN, UU, PEDOMAN, DLL</option>
                    <option value="B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN">B. PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN</option>
                    <option value="C. KEGIATAN PENDAHULUAN PEMBELAJARAN">C. KEGIATAN PENDAHULUAN PEMBELAJARAN</option>
                    <option value="D. KEGIATAN INTI PEMBELAJARAN & DIFERENSIASI">D. KEGIATAN INTI PEMBELAJARAN & DIFERENSIASI</option>
                    <option value="E. KEGIATAN PENUTUP & ASESMEN FORMATIF">E. KEGIATAN PENUTUP & ASESMEN FORMATIF</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Bobot Nilai Maksimal (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={rubrikFormBobot}
                    onChange={(e) => setRubrikFormBobot(Number(e.target.value) || 4)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nama Butir / Dokumen / Indikator Observasi</Label>
                <Input
                  placeholder="Contoh: Modul Ajar / RPP Berdiferensiasi, Dokumen Kurikulum Operasional Satuan Pendidikan (KOSP)..."
                  value={rubrikFormLabel}
                  onChange={(e) => setRubrikFormLabel(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  disabled={!rubrikFormLabel.trim() || saveRubrikItemMutation.isPending}
                  onClick={() => {
                    saveRubrikItemMutation.mutate({
                      jenisId: formJenisSupervisi,
                      category: rubrikFormKategori,
                      label: rubrikFormLabel.trim(),
                      bobot: rubrikFormBobot,
                      order: editingRubrikItem?.no || 99,
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5"
                >
                  {saveRubrikItemMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingRubrikItem ? 'Simpan Perubahan' : 'Tambahkan Butir'}
                </Button>
              </div>
            </div>

            {/* List Butir Aktif di Database */}
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                Daftar Butir Indikator Aktif ({currentRubrik.reduce((acc: number, c: any) => acc + c.items.length, 0)} Butir)
              </span>

              {currentRubrik.map((cat: any, cIdx: number) => (
                <div key={cIdx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800/60 px-3.5 py-2 font-bold text-xs text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                    {cat.category}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cat.items.map((it: any) => (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-blue-600 font-mono">#{it.no}</span>
                            <span className="truncate">{it.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Bobot: {it.bobot}% &bull; Kategori: {cat.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRubrikItem({ ...it, dbId: it.dbId })
                              setRubrikFormKategori(cat.category)
                              setRubrikFormLabel(it.label)
                              setRubrikFormBobot(it.bobot || 4)
                            }}
                            className="h-7 px-2 text-[11px] text-blue-600 hover:bg-blue-50 font-bold"
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {it.dbId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Hapus Butir Indikator?',
                                  text: `Hapus butir "${it.label}" dari instrumen observasi?`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#e11d48',
                                  confirmButtonText: 'Ya, Hapus',
                                  cancelButtonText: 'Batal'
                                }).then(r => {
                                  if (r.isConfirmed) {
                                    deleteRubrikItemMutation.mutate(it.dbId)
                                  }
                                })
                              }}
                              className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpenRubrikModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5 rounded-xl"
            >
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* TEMPLATE DOKUMEN RESMI CETAK (HANYA MUNCUL KETIKA WINDOW.PRINT()) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TEMPLATE DOKUMEN RESMI CETAK (PERSIS 100% SESUAI PDF RESMI SUPERVISI GTK) */}
      {/* ========================================================================= */}
      {detailSupervisi && (
        <div className="hidden print:block font-sans text-black bg-white w-full max-w-[210mm] mx-auto text-[11px] leading-tight">
          {/* ======================= HALAMAN 1 ======================= */}
          <div className="min-h-[290mm] p-6 relative flex flex-col justify-between">
            <div>
              {/* KOP SURAT RESMI */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                {/* Logo Muhammadiyah Kiri */}
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-muhammadiyah.png"
                    alt="Logo Muhammadiyah"
                    className="w-14 h-14 object-contain"
                    onError={(e: any) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="w-12 h-12 rounded-full border border-black/40 flex items-center justify-center font-bold text-[9px] text-center print:border-black">
                    LOGO
                  </div>
                </div>

                {/* Teks Kop Tengah */}
                <div className="text-center flex-1 px-2 space-y-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    MAJELIS PENDIDIKAN DASAR DAN MENENGAH MUHAMMADIYAH
                  </h2>
                  <h1 className="text-base font-black uppercase tracking-tight">
                    SMA MUHAMMADIYAH 1 PONOROGO
                  </h1>
                  <p className="text-xs font-semibold text-slate-800">
                    Ponorogo
                  </p>
                  <p className="text-[10px] text-slate-700">
                    E-mail: Admin@gmail.com &bull; Web: smamuhipo.sch.id &bull; Telp: 085156660060
                  </p>
                </div>

                {/* Logo SMA MUHIPO Kanan */}
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Logo SMA MUHIPO"
                    className="w-14 h-14 object-contain"
                    onError={(e: any) => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className="w-12 h-12 rounded-xl border border-black/40 flex items-center justify-center font-bold text-[9px] text-center print:border-black">
                    MUHIPO
                  </div>
                </div>
              </div>

              {/* JUDUL LEMBAR SUPERVISI */}
              <div className="text-center my-3 space-y-0.5">
                <h3 className="text-sm font-black uppercase tracking-wide">
                  SUPERVISI {detailSupervisi.jenisLabel ? detailSupervisi.jenisLabel.toUpperCase() : 'PERANGKAT PEMBELAJARAN'}
                </h3>
                <h4 className="text-xs font-bold uppercase">
                  GURU {new Date(detailSupervisi.date).getFullYear() || '2024/2025'}
                </h4>
              </div>

              {/* TABEL IDENTITAS GURU & KELAS (2 KOLOM RAPI) */}
              <div className="grid grid-cols-2 gap-x-6 text-[11px] mb-3 border-b border-black pb-2">
                <div className="space-y-1">
                  <div className="grid grid-cols-[110px_10px_1fr]">
                    <span className="font-semibold">Nama Sekolah</span>
                    <span>:</span>
                    <span className="font-bold uppercase">SMA MUHAMMADIYAH 1 PONOROGO</span>
                  </div>
                  <div className="grid grid-cols-[110px_10px_1fr]">
                    <span className="font-semibold">Nama Guru</span>
                    <span>:</span>
                    <span className="font-bold">{detailSupervisi.teacherName}</span>
                  </div>
                  <div className="grid grid-cols-[110px_10px_1fr]">
                    <span className="font-semibold">Mapel</span>
                    <span>:</span>
                    <span>{detailSupervisi.subjectName || 'Guru Mapel'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_10px_1fr]">
                    <span className="font-semibold">Pangkat/Golongan</span>
                    <span>:</span>
                    <span>-</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span className="font-semibold">Sem/Tapel</span>
                    <span>:</span>
                    <span>Ganjil / 2024/2025</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span className="font-semibold">NIP/NBM</span>
                    <span>:</span>
                    <span className="font-mono">{detailSupervisi.nip || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span className="font-semibold">Jam T.M</span>
                    <span>:</span>
                    <span>24</span>
                  </div>
                  <div className="grid grid-cols-[100px_10px_1fr]">
                    <span className="font-semibold">Sertifikasi</span>
                    <span>:</span>
                    <span>-</span>
                  </div>
                </div>
              </div>

              {/* TABEL KOMPONEN PENILAIAN 30 INDIKATOR (PERSIS FORMAT TABEL PDF) */}
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200 text-center font-bold">
                    <th className="border border-black p-1 w-8">No</th>
                    <th className="border border-black p-1 text-left">Komponen Penilaian</th>
                    <th className="border border-black p-1 w-12">Ada</th>
                    <th className="border border-black p-1 w-12">Tidak</th>
                    <th className="border border-black p-1 w-12">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Kategori A */}
                  <tr className="bg-slate-50 print:bg-slate-100 font-bold">
                    <td className="border border-black p-1 text-center">A.</td>
                    <td colSpan={4} className="border border-black p-1">
                      DOKUMEN PERATURAN, UU, PEDOMAN, DLL
                    </td>
                  </tr>
                  {[
                    { no: 1, label: 'UU Sisdiknas (No 20 th 2003)', score: 4 },
                    { no: 2, label: 'SNP (PP 19 2005 PP 32 2013 PP 13 2015)', score: 4 },
                    { no: 3, label: 'SKL (Permendikbud 20 2016)', score: 4 },
                    { no: 4, label: 'Standar Isi (Permendikbud 21 th 2016)', score: 4 },
                    { no: 5, label: 'KI & KD (Permendikbud 24 th 2016)', score: 4 },
                    { no: 6, label: 'Standar Proses (Permendikbud 22 2016)', score: 4 },
                    { no: 7, label: 'Standar Penilaian (Permendikbud 24 2016)', score: 4 },
                    { no: 8, label: 'Pedoman Menyusun RPP', score: 4 },
                    { no: 9, label: 'Pedoman Pembelajaran', score: 4 },
                    { no: 10, label: 'Pedoman Penilaian 2017 cetakan ke 4', score: 4 },
                    { no: 11, label: 'KTSP (Visi, Misi, Tujuan)', score: 4 },
                  ].map((row) => (
                    <tr key={row.no} className="hover:bg-slate-50">
                      <td className="border border-black p-1 text-center font-semibold">{row.no}</td>
                      <td className="border border-black p-1">{row.label}</td>
                      <td className="border border-black p-1 text-center font-bold">v</td>
                      <td className="border border-black p-1 text-center">-</td>
                      <td className="border border-black p-1 text-center font-bold">{row.score}</td>
                    </tr>
                  ))}

                  {/* Kategori B */}
                  <tr className="bg-slate-50 print:bg-slate-100 font-bold">
                    <td className="border border-black p-1 text-center">B.</td>
                    <td colSpan={4} className="border border-black p-1">
                      PERANGKAT PROGRAM dan PELAKSANAAN PEMBELAJARAN
                    </td>
                  </tr>
                  {[
                    { no: 12, label: 'Kalender Pendidikan', score: 4 },
                    { no: 13, label: 'Analisis Minggu & Jam Efektif', score: 4 },
                    { no: 14, label: 'Silabus', score: 4 },
                    { no: 15, label: 'RPP (JumlahKeterpenuhan)', score: 4 },
                    { no: 16, label: 'Program Tahunan', score: 4 },
                    { no: 17, label: 'Program Semester', score: 4 },
                    { no: 18, label: 'Jadwal Mengajar', score: 4 },
                    { no: 19, label: 'Daftar Buku Pegangan Guru', score: 4 },
                    { no: 20, label: 'Daftar Buku Pegangan Siswa', score: 4 },
                    { no: 21, label: 'Agenda Guru Jurnal Mengajar', score: 4 },
                    { no: 22, label: 'Daftar Hadir Siswa', score: 4 },
                    { no: 23, label: 'Jurnal Sikap Siswa', score: 4 },
                    { no: 24, label: 'DaftarRekap Nilai Sikap', score: 4 },
                    { no: 25, label: 'Daftar Nilai Pengetahuan', score: 4 },
                    { no: 26, label: 'Daftar Nilai Keterampilan', score: 4 },
                    { no: 27, label: 'Analisis Ketuntasan Siswa', score: 4 },
                    { no: 28, label: 'Analisis Ketuntasan Materi', score: 4 },
                    { no: 29, label: 'Program RemedialPengayaan', score: 4 },
                    { no: 30, label: 'Pelaksanaan RemedialPengayayaan', score: 4 },
                  ].map((row) => (
                    <tr key={row.no} className="hover:bg-slate-50">
                      <td className="border border-black p-1 text-center font-semibold">{row.no}</td>
                      <td className="border border-black p-1">{row.label}</td>
                      <td className="border border-black p-1 text-center font-bold">v</td>
                      <td className="border border-black p-1 text-center">-</td>
                      <td className="border border-black p-1 text-center font-bold">{row.score}</td>
                    </tr>
                  ))}

                  {/* BARIS TOTAL NILAI/SKOR */}
                  <tr className="bg-slate-100 print:bg-slate-200 font-bold text-center">
                    <td colSpan={2} className="border border-black p-1.5 text-right uppercase tracking-wider pr-4">
                      Jumlah Nilai/Skor
                    </td>
                    <td className="border border-black p-1.5">30</td>
                    <td className="border border-black p-1.5">0</td>
                    <td className="border border-black p-1.5 font-black text-sm">
                      {detailSupervisi.finalScore ? Math.round((detailSupervisi.finalScore / 100) * 120) : 120}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGE BREAK UNTUK CETAK DOKUMEN RESMI */}
          <div className="break-before-page" />

          {/* ======================= HALAMAN 2 ======================= */}
          <div className="min-h-[290mm] p-6 flex flex-col justify-between pt-8">
            <div className="space-y-4">
              {/* KOTAK REKAP NILAI AKHIR & PREDIKAT */}
              <div className="grid grid-cols-[1fr_200px] gap-4 items-start">
                <div className="text-[11px] space-y-1">
                  <span className="font-bold block">Keterangan:</span>
                  <p>Nilai Akhir = (Jumlah Skor x 100) / Skor Maksimal (120)</p>
                  <p>Predikat = A (91-100), B (81-90), C (71-80), D (dibawah 70)</p>
                </div>

                <div className="border border-black text-center text-[11px]">
                  <div className="bg-slate-100 print:bg-slate-200 border-b border-black py-1 font-bold">
                    Nilai Akhir
                  </div>
                  <div className="py-2 font-black text-2xl">
                    {detailSupervisi.finalScore || 100}
                  </div>
                  <div className="border-t border-black py-1 font-bold">
                    Predikat {detailSupervisi.predicate?.split(' ')[0] || 'A'}
                  </div>
                </div>
              </div>

              {/* KOTAK CATATAN KUALITATIF */}
              <div className="border border-black p-3 rounded-none text-[11px] space-y-1">
                <span className="font-bold block uppercase tracking-wide">Catatan:</span>
                <p className="leading-relaxed">
                  {detailSupervisi.catatanKekuatan || 'Kesiapan Guru dalam penyusunan perangkat pembelajaran Sangat Baik.'}
                </p>
              </div>

              {/* KOTAK TINDAK LANJUT */}
              <div className="border border-black p-3 rounded-none text-[11px] space-y-1">
                <span className="font-bold block uppercase tracking-wide">Tindak Lanjut:</span>
                <p className="leading-relaxed">
                  {detailSupervisi.rekomendasi || 'Guru dalam memahami SKL, memahami UU Sisdiknas dan memahami SNP sangat baik, perlu dipertahankan. Guru dimotivasi untuk mempertahankan dan tetap melaksanakan PBM dengan baik dan menyenangkan.'}
                </p>
              </div>
            </div>

            {/* AREA 3 TANDA TANGAN (KEPALA SEKOLAH, SUPERVISOR, GURU MAPEL) */}
            <div className="pt-12 grid grid-cols-3 gap-4 text-center text-[11px]">
              <div>
                <p className="font-semibold">Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
                <div className="h-24 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 italic">[E-Sign SIMASMUH]</span>
                </div>
                <p className="font-bold underline">Sugeng Riadi, M.Pd</p>
                <p className="font-mono text-[10px]">NBM. 974501</p>
              </div>

              <div>
                <p>&nbsp;</p>
                <p className="font-bold">Supervisor</p>
                <div className="h-24 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 italic">[E-Sign SIMASMUH]</span>
                </div>
                <p className="font-bold underline">{detailSupervisi.supervisorName || 'Fahrur Roji S.Pd.I'}</p>
                <p className="font-mono text-[10px]">NBM. 1382117</p>
              </div>

              <div>
                <p className="font-semibold">Ponorogo, {format(new Date(detailSupervisi.date || new Date()), 'dd MMMM yyyy', { locale: localeId })}</p>
                <p className="font-bold">{detailSupervisi.subjectName || 'Guru Mapel'}</p>
                <div className="h-24 flex items-center justify-center">
                  <span className="text-[10px] text-slate-300 italic">[E-Sign SIMASMUH]</span>
                </div>
                <p className="font-bold underline">{detailSupervisi.teacherName}</p>
                <p className="font-mono text-[10px]">NBM/NIP. {detailSupervisi.nip || '1041433'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
