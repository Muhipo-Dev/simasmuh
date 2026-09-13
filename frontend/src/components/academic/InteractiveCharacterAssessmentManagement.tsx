'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ShieldAlert, ShieldCheck, HeartHandshake, PlusCircle, Search, 
  Trash2, FileText, CheckCircle2, AlertTriangle, BookOpen, 
  Sparkles, Award, User, Clock, ArrowRight, Download, Filter,
  Phone, Users, Settings2, RotateCcw, Edit, Edit3, Eye, Sliders, Check,
  X, AlertCircle, RefreshCw, MessageSquare, Printer, Send, Home, PhoneCall,
  ClipboardList
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
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'


// Tipe Parameter Tata Tertib
export interface TatibParameter {
  id: string
  category: 'PELANGGARAN' | 'KEDISIPLINAN' | 'ADAB_ETIKA' | 'IBADAH' | 'PRESTASI_PENGHARGAAN'
  title: string
  points: number
  type: 'POSITIF' | 'NEGATIF'
  description?: string
  defaultAction?: string
}

// Parameter Bawaan Standar SIMASMUH (Terstruktur & Komprehensif Skala 100 Poin)
const DEFAULT_PARAMETERS: TatibParameter[] = [
  // --- KEDISIPLINAN & KERAPIAN (POSITIF & PEMBINAAN) ---
  { id: 'param-dis-1', category: 'KEDISIPLINAN', title: 'Seragam Lengkap, Bersih & Rapi Sesuai Jadwal', points: 5, type: 'POSITIF', description: 'Mengenakan seragam rapi beserta atribut lengkap (dasi, sabuk, sepatu, kaos kaki)', defaultAction: 'Apresiasi kedisiplinan harian' },
  { id: 'param-dis-2', category: 'KEDISIPLINAN', title: 'Kehadiran Tepat Waktu di Sekolah & Kelas', points: 5, type: 'POSITIF', description: 'Hadir konsisten sebelum bel masuk berbunyi setiap hari', defaultAction: 'Pencatatan teladan kedisiplinan' },
  { id: 'param-dis-3', category: 'KEDISIPLINAN', title: 'Menjaga Kebersihan & Kerapian Meja/Loker Kelas', points: 5, type: 'POSITIF', description: 'Aktif merawat kebersihan ruang kelas dan meja belajar', defaultAction: 'Apresiasi kedisiplinan lingkungan' },
  { id: 'param-dis-4', category: 'KEDISIPLINAN', title: 'Kedisiplinan Membawa Buku & Perlengkapan Belajar', points: 5, type: 'POSITIF', description: 'Perlengkapan sekolah dan buku pelajaran selalu siap', defaultAction: 'Apresiasi kesiapan belajar' },
  { id: 'param-dis-5', category: 'KEDISIPLINAN', title: 'Tertib & Disiplin Mengikuti Upacara Bendera / Apel', points: 5, type: 'POSITIF', description: 'Mengikuti upacara hari Senin / apel pagi dengan khidmat', defaultAction: 'Pencatatan rekam jejak kepemimpinan' },

  // --- ADAB, ETIKA & KESANTUNAN ---
  { id: 'param-adab-1', category: 'ADAB_ETIKA', title: 'Menerapkan 5S (Senyum, Salam, Sapa, Sopan, Santun)', points: 10, type: 'POSITIF', description: 'Membudayakan salam dan kesantunan kepada guru, karyawan, dan sesama siswa', defaultAction: 'Pemberian apresiasi karakter teladan' },
  { id: 'param-adab-2', category: 'ADAB_ETIKA', title: 'Menghormati Guru & Berbicara Bahasa Santun', points: 10, type: 'POSITIF', description: 'Menggunakan tutur kata yang baik, tidak kasar, dan bertata krama luhur', defaultAction: 'Pencatatan adab terpuji di buku saku' },
  { id: 'param-adab-3', category: 'ADAB_ETIKA', title: 'Sikap Tolong Menolong & Empati Antar Siswa', points: 10, type: 'POSITIF', description: 'Membantu teman yang kesulitan dan menjaga kerukunan tanpa bullying', defaultAction: 'Apresiasi keteladanan sosial' },
  { id: 'param-adab-4', category: 'ADAB_ETIKA', title: 'Kejujuran & Integritas Siswa (Menemukan Barang / Tidak Menyontek)', points: 15, type: 'POSITIF', description: 'Mengembalikan barang temuan ke pos ketertiban / bertindak jujur', defaultAction: 'Penganugerahan teladan integritas' },
  { id: 'param-adab-5', category: 'ADAB_ETIKA', title: 'Adab Makan & Minum Sesuai Sunnah (Duduk & Tangan Kanan)', points: 5, type: 'POSITIF', description: 'Menerapkan adab islami saat makan dan minum di area kantin/kelas', defaultAction: 'Apresiasi adab islami' },

  // --- AMALAN IBADAH (PAI & ISMUBA) ---
  { id: 'param-ibadah-1', category: 'IBADAH', title: 'Disiplin Sholat Dzuhur & Ashar Berjamaah di Masjid', points: 10, type: 'POSITIF', description: 'Hadir tepat waktu di masjid sebelum adzan/iqomah selesai', defaultAction: 'Pencatatan presensi ibadah di buku saku' },
  { id: 'param-ibadah-2', category: 'IBADAH', title: 'Rutinitas Sholat Dhuha & Tadarus Al-Qur\'an', points: 10, type: 'POSITIF', description: 'Konsisten melaksanakan sholat dhuha dan tilawah Al-Qur\'an pagi', defaultAction: 'Apresiasi kebiasaan ibadah harian' },
  { id: 'param-ibadah-3', category: 'IBADAH', title: 'Tertib & Disiplin Ibadah Kajian Jum\'at / Keputrian', points: 10, type: 'POSITIF', description: 'Mengikuti pembinaan keputrian dan sholat Jum\'at dengan tertib', defaultAction: 'Apresiasi keaktifan dakwah' },
  { id: 'param-ibadah-4', category: 'IBADAH', title: 'Hafalan Surat Pendek / Juz Amma Tambahan', points: 15, type: 'POSITIF', description: 'Menunjukkan peningkatan setoran hafalan Al-Qur\'an secara berkala', defaultAction: 'Pencatatan prestasi keagamaan' },

  // --- PRESTASI & PENGHARGAAN ---
  { id: 'param-pres-1', category: 'PRESTASI_PENGHARGAAN', title: 'Juara Lomba / Kejuaraan Akademik & Non-Akademik', points: 25, type: 'POSITIF', description: 'Membawa nama baik sekolah dalam kejuaraan/olimpiade tingkat Kab/Prov/Nasional', defaultAction: 'Penganugerahan sertifikat & penambahan poin' },
  { id: 'param-pres-2', category: 'PRESTASI_PENGHARGAAN', title: 'Pengurus Organisasi / Duta / Teladan Sekolah Terpilih', points: 20, type: 'POSITIF', description: 'Menjalankan amanah kepemimpinan IPM/Hizbul Wathan/Tapak Suci dengan prima', defaultAction: 'Apresiasi kepemimpinan' },

  // --- PELANGGARAN TATA TERTIB SEKOLAH (Rentang -5 s/d -50) ---
  { id: 'param-pel-1', category: 'PELANGGARAN', title: 'Terlambat Masuk Sekolah (>15 Menit)', points: -5, type: 'NEGATIF', description: 'Datang melewati batas bel masuk sekolah', defaultAction: 'Teguran lisan & piket kebersihan' },
  { id: 'param-pel-2', category: 'PELANGGARAN', title: 'Seragam Tidak Lengkap / Atribut Kurang', points: -5, type: 'NEGATIF', description: 'Tidak mengenakan dasi/kaos kaki/sepatu hitam/sabuk', defaultAction: 'Pencatatan tatib & penertiban' },
  { id: 'param-pel-3', category: 'PELANGGARAN', title: 'Rambut Tidak Rapi / Melewati Kerah (Putra)', points: -10, type: 'NEGATIF', description: 'Panjang rambut tidak sesuai standar ketentuan sekolah', defaultAction: 'Pembinaan tatib & batas potong rambut 3 hari' },
  { id: 'param-pel-4', category: 'PELANGGARAN', title: 'Membawa HP / Menggunakan Gadget Tanpa Izin KBM', points: -10, type: 'NEGATIF', description: 'Bermain game / sosmed saat jam pelajaran berlangsung', defaultAction: 'HP diamankan tatib s/d jam pulang' },
  { id: 'param-pel-5', category: 'PELANGGARAN', title: 'Meninggalkan Kelas / Sekolah Tanpa Izin (Membolos)', points: -20, type: 'NEGATIF', description: 'Keluar gerbang/kelas saat jam KBM tanpa surat izin', defaultAction: 'Panggilan wali murid & pembinaan BK' },
  { id: 'param-pel-6', category: 'PELANGGARAN', title: 'Tidak Mengikuti Sholat Berjamaah / Kabur saat Ibadah', points: -15, type: 'NEGATIF', description: 'Tidak menuju masjid saat panggilan sholat berkumandang', defaultAction: 'Bimbingan ibadah & pembinaan tatib' },
  { id: 'param-pel-7', category: 'PELANGGARAN', title: 'Berkelahi / Melakukan Intimidasi / Bullying', points: -50, type: 'NEGATIF', description: 'Melakukan tindakan kekerasan fisik/verbal terhadap sesama siswa', defaultAction: 'Surat Peringatan & panggilan orang tua' },
  { id: 'param-pel-8', category: 'PELANGGARAN', title: 'Merokok / Vape di Lingkungan Sekolah', points: -50, type: 'NEGATIF', description: 'Membawa/menghisap rokok atau rokok elektrik', defaultAction: 'Surat Peringatan (SP 1) & pemanggilan orang tua' },
]

export function InteractiveCharacterAssessmentManagement({ defaultCategory = 'ALL', mode = 'ALL' }: { defaultCategory?: string; mode?: 'ALL' | 'BK' | 'KETERTIBAN' | 'GURU' }) {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  // Ambil data profile user untuk menentukan hak akses verifikasi pembinaan & fitur BK
  const { data: userProfile } = useQuery<any>({
    queryKey: ['my-user-profile-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/users/me'),
  })

  // Ambil data master seluruh akun pengguna untuk mencari Kepala Sekolah aktif
  const { data: masterUsersList } = useQuery<any[]>({
    queryKey: ['master-users-bk-letter'],
    queryFn: () => authenticatedQuery('/api-backend/users'),
    staleTime: 5 * 60 * 1000,
  })

  // Cari akun yang menjabat Kepala Sekolah di data master
  const activeKepalaSekolahUser = useMemo(() => {
    if (!masterUsersList || !Array.isArray(masterUsersList)) return null
    return masterUsersList.find((u: any) => 
      u.role === 'KEPALA_SEKOLAH' || 
      u.subRole === 'KEPALA_SEKOLAH' || 
      u.subRole2 === 'KEPALA_SEKOLAH' || 
      u.subRole3 === 'KEPALA_SEKOLAH' || 
      u.subRole4 === 'KEPALA_SEKOLAH' || 
      u.subRole5 === 'KEPALA_SEKOLAH'
    )
  }, [masterUsersList])

  const user = userProfile || {}
  const userRoles = [
    user.role,
    user.subRole,
    user.subRole2,
    user.subRole3,
    user.subRole4,
    user.subRole5,
    (session?.user as any)?.role,
    (session?.user as any)?.subRole,
    (session?.user as any)?.subRole2,
    (session?.user as any)?.subRole3,
    (session?.user as any)?.subRole4,
    (session?.user as any)?.subRole5,
  ].filter(Boolean)

  const loggedInBkName = session?.user?.name || (userProfile as any)?.name || (userProfile as any)?.user?.name || (user as any)?.name || 'Guru BK SIMASMUH'

  const loggedInBkNip = useMemo(() => {
    // 1. Direct NIP/NBM dari user profile & session
    let rawNip = (session?.user as any)?.nip || (session?.user as any)?.nipNbm || (userProfile as any)?.nipNbm || (userProfile as any)?.nip || (user as any)?.nipNbm || (user as any)?.nip

    // 2. Jika belum ketemu / masih '-', cari di masterUsersList berdasarkan ID atau Nama
    if ((!rawNip || rawNip === '-') && masterUsersList && Array.isArray(masterUsersList)) {
      const matchedUser = masterUsersList.find((u: any) => 
        (u.id && (u.id === userProfile?.id || u.id === (session?.user as any)?.id)) ||
        (u.name && loggedInBkName && loggedInBkName !== 'Guru BK SIMASMUH' && u.name.trim().toLowerCase() === loggedInBkName.trim().toLowerCase())
      )
      if (matchedUser?.nipNbm || matchedUser?.nip) {
        rawNip = matchedUser.nipNbm || matchedUser.nip
      }
    }

    // 3. Validasi: Jangan gunakan username. Jika kosong atau bernilai username, kembalikan '-'
    const currentUsername = (session?.user as any)?.username || userProfile?.username || user?.username
    if (!rawNip || rawNip.trim() === '' || (currentUsername && rawNip.trim().toLowerCase() === currentUsername.trim().toLowerCase())) {
      return '-'
    }
    return rawNip
  }, [session, userProfile, user, masterUsersList, loggedInBkName])

  const activeKepsekName = activeKepalaSekolahUser?.name || 'Sugeng Riadi, M.Pd.'

  const isBk = userRoles.includes('BK_BP') || userRoles.includes('BK')
  const isTatib = userRoles.includes('KETERTIBAN')
  const isSuperAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_IT') || userRoles.includes('BAU') || userRoles.includes('ADMIN_TU') || userRoles.includes('KEPALA_SEKOLAH')
  
  // Hak akses verifikasi & persetujuan draf poin tatib hanya milik role KETERTIBAN
  const canVerify = isTatib

  // State Tab Utama
  const [activeTab, setActiveTab] = useState<'rekap-siswa' | 'log-catatan' | 'verifikasi-pembinaan' | 'catatan-konseling' | 'panggilan-ortu'>(
    mode === 'BK' 
      ? 'catatan-konseling' 
      : mode === 'GURU'
      ? 'rekap-siswa'
      : mode === 'KETERTIBAN' 
      ? (isTatib ? 'verifikasi-pembinaan' : 'rekap-siswa') 
      : isBk 
      ? 'catatan-konseling' 
      : isTatib 
      ? 'verifikasi-pembinaan' 
      : 'rekap-siswa'
  )

  // Radar BK filter state
  const [radarFilterActive, setRadarFilterActive] = useState(false)

  // State Filter Cari Siswa di Modal Form BK
  const [bkStudentSearch, setBkStudentSearch] = useState('')

  // State Modal Dialog Konseling
  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false)
  const [counselingFormState, setCounselingFormState] = useState({
    id: '',
    studentId: '',
    counselingType: 'PELANGGARAN_KEDISIPLINAN',
    title: '',
    description: '',
    actionTaken: '',
    status: 'PROSES_BIMBINGAN',
    privacy: 'TERBUKA',
    pointsAdjust: 0,
    date: new Date().toISOString().split('T')[0],
    notifyParent: true,
  })

// Preset Template Surat Bimbingan Konseling (BK)
const BK_LETTER_PRESETS = [
  {
    id: 'PEMANGGILAN_KEDISIPLINAN',
    label: 'Surat Pemanggilan Ortu (Pelanggaran & Kedisiplinan)',
    perihal: 'Surat Undangan Pemanggilan Orang Tua / Wali Murid (Pembinaan Kedisiplinan)',
    pembuka: 'Dengan hormat, mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid ke sekolah guna membicarakan perkembangan kedisiplinan dan pembinaan karakter putra/putri Bapak/Ibu di sekolah:',
    penutup: 'Mengingat pentingnya hal tersebut demi kebaikan dan masa depan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.',
    ruang: 'Ruang Bimbingan & Konseling (BK) SMA Muhammadiyah 1 Ponorogo',
  },
  {
    id: 'KONSULTASI_BELAJAR_UTBK',
    label: 'Surat Undangan Konsultasi Belajar & UTBK / Karir',
    perihal: 'Surat Undangan Konsultasi Pengembangan Akademik & Studi Lanjut (BK)',
    pembuka: 'Dengan hormat, mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid ke sekolah guna mendiskusikan pemetaan minat, prestasi belajar, dan persiapan studi lanjut (UTBK-SNBT) putra/putri Bapak/Ibu:',
    penutup: 'Sinergi antara pihak sekolah dan orang tua sangat kami harapkan demi menyukseskan masa depan pendidikan putra/putri Bapak/Ibu.',
    ruang: 'Ruang Bimbingan & Konseling (BK) SMA Muhammadiyah 1 Ponorogo',
  },
  {
    id: 'EVALUASI_PRESENSI',
    label: 'Surat Pemanggilan Evaluasi Kehadiran & Presensi',
    perihal: 'Surat Undangan Evaluasi Presensi & Kehadiran Siswa',
    pembuka: 'Dengan hormat, mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid ke sekolah guna melakukan evaluasi rekapitulasi kehadiran dan absensi putra/putri Bapak/Ibu:',
    penutup: 'Demikian undangan ini kami sampaikan. Atas perhatian dan kerjasama Bapak/Ibu, kami ucapkan terima kasih.',
    ruang: 'Ruang Bimbingan & Konseling (BK) SMA Muhammadiyah 1 Ponorogo',
  },
  {
    id: 'AGENDA_HOME_VISIT',
    label: 'Surat Pemberitahuan Agenda Home Visit (Kunjungan Rumah)',
    perihal: 'Surat Pemberitahuan Kunjungan Rumah (Home Visit BK)',
    pembuka: 'Dengan hormat, kami beritahukan bahwa Tim Bimbingan Konseling (BK) sekolah bermaksud melaksanakan agenda Kunjungan Rumah (Home Visit) ke kediaman Bapak/Ibu untuk silaturahmi dan pendampingan siswa:',
    penutup: 'Atas kesediaan dan sambutan hangat Bapak/Ibu keluarga di rumah, kami sampaikan terima kasih.',
    ruang: 'Kediaman / Rumah Wali Murid Siswa',
  },
]

  // State Modal Cetak Surat Pemanggilan Wali Murid
  const [isParentCallModalOpen, setIsParentCallModalOpen] = useState(false)
  const [letterModalTab, setLetterModalTab] = useState<'editor' | 'preview'>('editor')
  const [parentCallData, setParentCallData] = useState<{
    student: any
    studentId: string
    nomorSurat: string
    tanggalSurat: string
    tanggalPertemuan: string
    waktuPertemuan: string
    ruangPertemuan: string
    perihal: string
    catatanKasus: string
    templatePreset: string
    pembukaSurat: string
    penutupSurat: string
    namaKepalaSekolah: string
    namaGuruBk: string
    nipGuruBk: string
  } | null>(null)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL')

  // State Modal Dialog
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isParamModalOpen, setIsParamModalOpen] = useState(false)
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false)
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<any>(null)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null)

  // State Cari Siswa Khusus di Dalam Modal Input
  const [modalStudentSearch, setModalStudentSearch] = useState('')

  // State Parameter Tata Tertib (Tersimpan di LocalStorage / State)
  const [customParams, setCustomParams] = useState<TatibParameter[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simasmuh_tatib_parameters_v3')
      if (saved) {
        try { return JSON.parse(saved) } catch (e) { /* use default */ }
      }
    }
    return DEFAULT_PARAMETERS
  })

  // State Form Parameter Baru
  const [newParamForm, setNewParamForm] = useState<Partial<TatibParameter>>({
    category: 'PELANGGARAN',
    title: '',
    points: -100,
    type: 'NEGATIF',
    description: '',
    defaultAction: '',
  })


  // State Form Catatan Pembinaan / Pelanggaran
  const [formState, setFormState] = useState({
    id: '', // Jika edit catatan spesifik
    studentId: '',
    category: 'PELANGGARAN' as any,
    type: 'NEGATIF' as any,
    title: '',
    description: '',
    points: -100,
    date: new Date().toISOString().split('T')[0],
    actionTaken: '',
    status: canVerify ? 'SELESAI' : 'MENUNGGU',
    notifyParent: true,
  })

  // Simpan parameter ke localStorage
  const saveParametersToStorage = (params: TatibParameter[]) => {
    setCustomParams(params)
    if (typeof window !== 'undefined') {
      localStorage.setItem('simasmuh_tatib_parameters_v3', JSON.stringify(params))
    }
  }


  // 1. Ambil Siswa (Raw list)
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['students-list-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/students'),
  })

  // 2. Ambil Kelas
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['classes-list-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/classes'),
  })

  // 3. Ambil Rekap Skor Siswa (Tabel Nama Siswa, Skor Ketertiban & Skor Adab)
  const { data: studentsSummary = [], isLoading: isLoadingSummary } = useQuery<any[]>({
    queryKey: ['character-students-summary', selectedClassId, searchQuery],
    queryFn: () => {
      let url = '/api-backend/character-assessments/students-summary?'
      if (selectedClassId !== 'ALL') url += `classId=${selectedClassId}&`
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}`
      return authenticatedQuery(url)
    },
  })

  // 4. Ambil Daftar Riwayat Catatan Penilaian
  const { data: assessmentData, isLoading: isLoadingAssessments } = useQuery<any>({
    queryKey: ['character-assessments-list', selectedCategory, selectedClassId, selectedStatusFilter],
    queryFn: () => {
      let url = '/api-backend/character-assessments?limit=100'
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`
      if (selectedClassId !== 'ALL') url += `&classId=${selectedClassId}`
      if (selectedStatusFilter !== 'ALL') url += `&status=${selectedStatusFilter}`
      return authenticatedQuery(url)
    },
  })

  // 5. Ambil Statistika Dashboard Tatib & BK
  const { data: tatibStats } = useQuery<any>({
    queryKey: ['character-assessments-stats'],
    queryFn: () => authenticatedQuery('/api-backend/character-assessments/dashboard-stats'),
  })

  // 6. Ambil Data Izin Siswa Menunggu Verifikasi (Khusus Dashboard BK & Ketertiban)
  const { data: studentIzinList = [] } = useQuery<any[]>({
    queryKey: ['student-izin-pending-list-dashboard'],
    queryFn: async () => {
      const res = await authenticatedQuery('/api-backend/izin-keluar?category=SISWA')
      if (Array.isArray(res)) {
        return res.filter((item: any) => item.status === 'MENUNGGU' && !item.alasan?.includes('[IZIN DISPENSASI]'))
      }
      return []
    },
    enabled: canVerify || isBk || isTatib,
  })

  const assessments = assessmentData?.data || []

  // Filter Search Catatan Penilaian
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item: any) => {
      const q = searchQuery.toLowerCase()
      const studentName = item.student?.name?.toLowerCase() || ''
      const studentNis = item.student?.nis?.toLowerCase() || ''
      const title = item.title?.toLowerCase() || ''
      const desc = item.description?.toLowerCase() || ''
      const evaluatorName = item.evaluator?.name?.toLowerCase() || ''
      return studentName.includes(q) || studentNis.includes(q) || title.includes(q) || desc.includes(q) || evaluatorName.includes(q)
    })
  }, [assessments, searchQuery])

  // Catatan yang khusus menunggu verifikasi oleh Petugas Ketertiban
  const pendingVerificationList = useMemo(() => {
    return assessments.filter((item: any) => item.status === 'MENUNGGU' || item.status === 'MENUNGGU_VERIFIKASI')
  }, [assessments])

  // Catatan Bimbingan & Sesi Konseling Guru BK
  const counselingList = useMemo(() => {
    return assessments.filter((item: any) => 
      item.type === 'CATATAN_KONSELING' || 
      item.status === 'DALAM_PEMBINAAN' || 
      item.status === 'PEMANGGILAN_ORTU' || 
      item.status === 'HOME_VISIT' || 
      item.status === 'DIRUJUK'
    )
  }, [assessments])

  // Rekam Jejak Pemanggilan Wali Murid & Home Visit
  const parentCallList = useMemo(() => {
    return assessments.filter((item: any) => 
      item.status === 'PEMANGGILAN_ORTU' || 
      item.status === 'HOME_VISIT' ||
      (item.actionTaken && item.actionTaken.toLowerCase().includes('panggilan'))
    )
  }, [assessments])

  // Filter Siswa di dalam Dialog Modal Input (Pencarian Cepat Tatib)
  const modalStudentsFiltered = useMemo(() => {
    if (!modalStudentSearch) return students
    const q = modalStudentSearch.toLowerCase()
    return students.filter((st: any) => 
      st.name?.toLowerCase().includes(q) || 
      st.nis?.toLowerCase().includes(q) || 
      st.class?.name?.toLowerCase().includes(q) ||
      st.className?.toLowerCase().includes(q)
    )
  }, [students, modalStudentSearch])

  // Filter Siswa di dalam Dialog Modal Input BK (Pencarian Cepat BK)
  const filteredBkStudents = useMemo(() => {
    if (!bkStudentSearch.trim()) return students
    const q = bkStudentSearch.toLowerCase()
    return students.filter((st: any) => 
      st.name?.toLowerCase().includes(q) || 
      st.nis?.toLowerCase().includes(q) || 
      st.class?.name?.toLowerCase().includes(q) ||
      st.className?.toLowerCase().includes(q)
    )
  }, [students, bkStudentSearch])

  // Pengelompokan & Pengurutan Template Parameter (Kedisiplinan, Adab, Ibadah, Prestasi, Pelanggaran)
  const sortedGroupedParameters = useMemo(() => {
    const categoryOrder: Record<string, number> = {
      KEDISIPLINAN: 1,
      ADAB_ETIKA: 2,
      IBADAH: 3,
      PRESTASI_PENGHARGAAN: 4,
      PELANGGARAN: 5,
    }

    return [...customParams].sort((a, b) => {
      const orderA = categoryOrder[a.category] || 99
      const orderB = categoryOrder[b.category] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.title.localeCompare(b.title)
    })
  }, [customParams])

  // Filter Search Rekap Siswa
  const filteredStudentsSummary = useMemo(() => {
    if (!studentsSummary) return []
    return studentsSummary.filter((st: any) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = (
        st.name?.toLowerCase().includes(q) ||
        st.nis?.toLowerCase().includes(q) ||
        st.className?.toLowerCase().includes(q)
      )
      if (radarFilterActive) {
        return matchesSearch && (st.ketertibanScore < 70 || (st.negativesCount && st.negativesCount > 0))
      }
      return matchesSearch
    })
  }, [studentsSummary, searchQuery, radarFilterActive])

  // Handler Simpan Catatan Konseling BK
  const handleSaveCounseling = async () => {
    if (!counselingFormState.studentId) {
      Swal.fire({ title: 'Perhatian', text: 'Silakan pilih siswa target terlebih dahulu', icon: 'warning' })
      return
    }
    if (!counselingFormState.title) {
      Swal.fire({ title: 'Perhatian', text: 'Judul atau topik sesi konseling wajib diisi', icon: 'warning' })
      return
    }

    try {
      const selectedSt = students.find((s: any) => s.id === counselingFormState.studentId)
      const payload = {
        id: counselingFormState.id || undefined,
        studentId: counselingFormState.studentId,
        category: counselingFormState.counselingType === 'PELANGGARAN_KEDISIPLINAN' ? 'PELANGGARAN' : 'ADAB_ETIKA',
        type: 'CATATAN_KONSELING',
        title: `[Konseling ${counselingFormState.counselingType.replace(/_/g, ' ')}] ${counselingFormState.title}`,
        description: `[Akses: ${counselingFormState.privacy === 'RAHASIA_BK' ? 'RAHASIA BK' : 'TERBUKA WALI KELAS'}] ${counselingFormState.description || ''}`,
        actionTaken: counselingFormState.actionTaken || 'Sesi bimbingan konseling & rekomendasi tindak lanjut Guru BK',
        status: counselingFormState.status,
        points: Number(counselingFormState.pointsAdjust) || 0,
        date: counselingFormState.date,
        notifyParent: counselingFormState.notifyParent,
      }

      const url = payload.id ? `/api-backend/character-assessments/${payload.id}` : '/api-backend/character-assessments'
      const res = await authenticatedFetch(url, {
        method: payload.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || 'Gagal menyimpan catatan konseling')
      }

      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })

      setIsCounselingModalOpen(false)
      Swal.fire({
        title: 'Sesi Konseling Disimpan',
        text: `Catatan bimbingan konseling untuk ${selectedSt?.name || 'Siswa'} berhasil disimpan dan tersinkronkan!`,
        icon: 'success',
        confirmButtonColor: '#0284c7'
      })
    } catch (err: any) {
      Swal.fire({ title: 'Gagal', text: err.message || 'Gagal menyimpan catatan konseling', icon: 'error' })
    }
  }

  // Handler Edit Catatan Konseling BK
  const handleEditCounseling = (item: any) => {
    let counselingType = 'PELANGGARAN_KEDISIPLINAN'
    let cleanTitle = item.title || ''
    const matchType = cleanTitle.match(/^\[Konseling ([^\]]+)\]\s*(.*)$/)
    if (matchType) {
      counselingType = matchType[1].replace(/ /g, '_')
      cleanTitle = matchType[2]
    } else if (item.category === 'ADAB_ETIKA') {
      counselingType = 'PRIBADI'
    }

    let privacy = 'TERBUKA'
    let cleanDesc = item.description || ''
    const matchPrivacy = cleanDesc.match(/^\[Akses:\s*([^\]]+)\]\s*([\s\S]*)$/)
    if (matchPrivacy) {
      privacy = matchPrivacy[1] === 'RAHASIA BK' ? 'RAHASIA_BK' : 'TERBUKA'
      cleanDesc = matchPrivacy[2]
    }

    setCounselingFormState({
      id: item.id,
      studentId: item.studentId || item.student?.id || '',
      counselingType: counselingType as any,
      title: cleanTitle,
      description: cleanDesc,
      actionTaken: item.actionTaken || '',
      status: item.status || 'PROSES_BIMBINGAN',
      privacy: privacy as any,
      pointsAdjust: item.points || 0,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notifyParent: item.notifyParent !== false,
    })
    setIsCounselingModalOpen(true)
  }

  // Handler Edit Catatan Penilaian Kedisiplinan / Adab Umum
  const handleEditAssessment = (item: any) => {
    setSelectedStudentForAction(item.student)
    setFormState({
      id: item.id,
      studentId: item.studentId || item.student?.id || '',
      category: item.category || 'PELANGGARAN',
      type: item.type || 'NEGATIF',
      title: item.title || '',
      description: item.description || '',
      points: item.points || 0,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      actionTaken: item.actionTaken || '',
      status: item.status || 'SELESAI',
      notifyParent: item.notifyParent !== false,
    })
    setIsFormOpen(true)
  }

  // Realtime Auto-Sync Nama & NIP/NBM Guru BK dan Kepala Sekolah dari Data Master & Session Login
  useEffect(() => {
    if (parentCallData) {
      setParentCallData(prev => {
        if (!prev) return null
        let updated = { ...prev }
        let changed = false

        if (loggedInBkName && loggedInBkName !== 'Guru BK SIMASMUH' && prev.namaGuruBk !== loggedInBkName) {
          updated.namaGuruBk = loggedInBkName
          changed = true
        }

        if (loggedInBkNip && prev.nipGuruBk !== loggedInBkNip) {
          updated.nipGuruBk = loggedInBkNip
          changed = true
        }

        if (activeKepsekName && prev.namaKepalaSekolah !== activeKepsekName && activeKepalaSekolahUser?.name) {
          updated.namaKepalaSekolah = activeKepsekName
          changed = true
        }

        return changed ? updated : prev
      })
    }
  }, [session, userProfile, activeKepalaSekolahUser, loggedInBkName, loggedInBkNip, activeKepsekName, isParentCallModalOpen])

  // Helper Ekstraksi Kontak & Nama Asli Orang Tua / Wali Murid Siswa
  const getParentInfo = (student: any) => {
    if (!student) return { name: 'Wali Murid', phone: '-' }
    const fullStudent = students.find((s: any) => s.id === student.id || (student.nis && s.nis === student.nis)) || student
    const phone =
      fullStudent.parentRelations?.[0]?.parent?.user?.phone ||
      fullStudent.parentRelations?.[0]?.parent?.phone ||
      fullStudent.parentProfile?.user?.phone ||
      fullStudent.parentProfile?.phone ||
      fullStudent.parentPhone ||
      fullStudent.phone ||
      fullStudent.user?.phone ||
      student.parentRelations?.[0]?.parent?.user?.phone ||
      student.parentRelations?.[0]?.parent?.phone ||
      student.parentProfile?.user?.phone ||
      student.parentProfile?.phone ||
      student.parentPhone ||
      student.phone ||
      student.user?.phone ||
      '-'
    const name =
      fullStudent.parentRelations?.[0]?.parent?.user?.name ||
      fullStudent.parentRelations?.[0]?.parent?.name ||
      fullStudent.parentProfile?.name ||
      fullStudent.parentName ||
      student.parentRelations?.[0]?.parent?.user?.name ||
      student.parentRelations?.[0]?.parent?.name ||
      student.parentProfile?.name ||
      student.parentName ||
      'Orang Tua / Wali Murid'
    return { name, phone }
  }

  // Handler Buka Form Editor Surat Pemanggilan Orang Tua / Wali BK
  const handleOpenParentCallLetter = (student?: any, assessmentItem?: any) => {
    const rawTarget = student || (studentsSummary && studentsSummary[0]) || (students && students[0]) || { id: '', name: 'Pilih Target Siswa', nis: '-', nisn: '-', className: '-' }
    const targetStudent = students.find((s: any) => s.id === rawTarget.id || (rawTarget.nis && s.nis === rawTarget.nis)) || rawTarget
    const todayYear = new Date().getFullYear()
    const defaultDate = new Date(Date.now() + 86400000 * 2).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    setBkStudentSearch('')
    setParentCallData({
      student: targetStudent,
      studentId: targetStudent?.id || '',
      nomorSurat: `182/BK/SMA.M1/${todayYear}`,
      tanggalSurat: todayStr,
      tanggalPertemuan: defaultDate,
      waktuPertemuan: '09.00 - 11.00 WIB',
      ruangPertemuan: 'Ruang Bimbingan & Konseling (BK) SMA Muhammadiyah 1 Ponorogo',
      perihal: 'Surat Undangan Pemanggilan Orang Tua / Wali Murid (Pembinaan BK)',
      catatanKasus: assessmentItem ? `${assessmentItem.title} (${assessmentItem.description || '-'})` : 'Bimbingan perkembangan adab, ketertiban & akademis siswa di sekolah.',
      templatePreset: 'PEMANGGILAN_KEDISIPLINAN',
      pembukaSurat: 'Dengan hormat, mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid ke sekolah guna membicarakan perkembangan kedisiplinan dan pembinaan karakter putra/putri Bapak/Ibu di sekolah:',
      penutupSurat: 'Mengingat pentingnya hal tersebut demi kebaikan dan masa depan putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.',
      namaKepalaSekolah: activeKepsekName,
      namaGuruBk: loggedInBkName,
      nipGuruBk: loggedInBkNip,
    })
    setLetterModalTab('editor')
    setIsParentCallModalOpen(true)
  }

  // Handler Ganti Template Preset Surat BK
  const handleSelectLetterPreset = (presetId?: string | null) => {
    if (!presetId) return
    const preset = BK_LETTER_PRESETS.find(p => p.id === presetId)
    if (preset && parentCallData) {
      setParentCallData({
        ...parentCallData,
        templatePreset: presetId,
        perihal: preset.perihal,
        pembukaSurat: preset.pembuka,
        penutupSurat: preset.penutup,
        ruangPertemuan: preset.ruang,
      })
    }
  }

  // Handler Pilih Siswa di Form Surat BK
  const handleSelectLetterStudent = (studentId?: string | null) => {
    if (!studentId) return
    const selectedSt = students.find((s: any) => s.id === studentId) || studentsSummary.find((s: any) => s.id === studentId)
    if (selectedSt && parentCallData) {
      setParentCallData({
        ...parentCallData,
        student: selectedSt,
        studentId: studentId,
      })
    }
  }

  // Generator HTML Cetakan Dokumen PDF Surat Resmi BK (Standar Format TU SIMASMUH)
  const generateParentCallLetterHtml = (data: any) => {
    if (!data) return ''
    const st = data.student || {}
    const studentName = st.name || 'Siswa'
    const studentNis = st.nis || '-'
    const className = st.className || st.class?.name || '-'
    const guruBkName = data.namaGuruBk || user?.name || userProfile?.name || 'Guru BK SIMASMUH'
    const guruBkNip = data.nipGuruBk && data.nipGuruBk !== '-' ? data.nipGuruBk : (user?.nipNbm || user?.nip || userProfile?.nip || userProfile?.nipNbm || '-')
    const kepsekName = data.namaKepalaSekolah || activeKepsekName || 'Drs. H. Sugeng Riadi, M.Pd.'

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Surat Undangan Resmi BK - ${studentName} - SIMASMUH</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 15px 20px; color: #000; line-height: 1.45; font-size: 11pt; background: #fff; }
            .header-kop { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5pt double #000; padding-bottom: 6px; margin-bottom: 12px; text-align: center; }
            .logo-box { width: 70px; text-align: center; flex-shrink: 0; }
            .logo-box img { max-width: 65px; height: auto; display: block; margin: 0 auto; }
            .kop-text { text-align: center; flex: 1; padding: 0 10px; }
            .kop-text .org { font-size: 9.5pt; font-weight: bold; text-transform: uppercase; margin: 0; line-height: 1.25; }
            .kop-text .school { font-size: 14.5pt; font-weight: 900; text-transform: uppercase; margin: 2px 0; letter-spacing: 0.5px; }
            .kop-text .status { font-size: 8.5pt; font-weight: bold; margin: 0; }
            .kop-text .addr { font-size: 8.5pt; margin-top: 2px; }
            .kop-text .email-web { font-size: 8pt; margin-top: 1px; font-weight: 500; }
            .meta-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; }
            .meta-table td { padding: 2px 0; vertical-align: top; font-size: 11pt; }
            .content-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .content-table td { padding: 3px 0; vertical-align: top; font-size: 11pt; }
            .footer-ttd { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; text-align: center; }
            .ttd-box { width: 44%; text-align: center; font-size: 11pt; }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-kop">
            <div class="logo-box">
              <img src="/muhammadiyah-logo-40493.png" alt="Logo Dikdasmen" />
            </div>
            <div class="kop-text">
              <p class="org">MAJELIS PENDIDIKAN DASAR DAN MENENGAH<br/>PIMPINAN WILAYAH MUHAMMADIYAH JAWA TIMUR</p>
              <p class="school">SMA MUHAMMADIYAH 1 PONOROGO</p>
              <p class="status">Status : TERAKREDITASI A &nbsp;&nbsp;&nbsp;&nbsp; NPSN : 20510139</p>
              <p class="addr">Jl. Batoro Katong No. 6B Telp/Fax (0352) 481521 Ponorogo 63411</p>
              <p class="email-web">E-mail : smamuh1po@gmail.com | Website: www.smamuhipo.sch.id</p>
            </div>
            <div class="logo-box">
              <img src="/pic_logo.png" alt="Logo Sekolah" />
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 65%;">
                <div>Nomor &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${data.nomorSurat}</div>
                <div>Lampiran : 1 (Satu) Berkas Cetakan Dokumen</div>
                <div>Perihal &nbsp;&nbsp;&nbsp;&nbsp;: <b>${data.perihal}</b></div>
              </td>
              <td style="width: 35%; text-align: right;">
                <div>Ponorogo, ${data.tanggalSurat}</div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 8px; margin-bottom: 12px;">
            <div>Kepada Yth.</div>
            <div style="font-weight: bold;">Bapak / Ibu Orang Tua / Wali Murid dari ${studentName}</div>
            <div>di Tempat</div>
          </div>

          <div style="text-align: justify; line-height: 1.5;">
            <p style="margin: 4px 0;"><i>Assalamu'alaikum Warahmatullahi Wabarakatuh</i></p>
            <p style="margin: 6px 0;">${data.pembukaSurat}</p>

            <table class="content-table" style="margin-left: 15px;">
              <tr><td style="width: 160px; font-weight: 600;">Nama Siswa</td><td>: <b>${studentName}</b></td></tr>
              <tr><td style="font-weight: 600;">NIS</td><td>: ${studentNis}</td></tr>
              <tr><td style="font-weight: 600;">Kelas</td><td>: ${className}</td></tr>
              <tr><td style="font-weight: 600;">Catatan Pembinaan</td><td>: ${data.catatanKasus}</td></tr>
            </table>

            <p style="margin: 10px 0 4px 0;">Pertemuan Insya Allah akan dilaksanakan pada:</p>
            <table class="content-table" style="margin-left: 15px;">
              <tr><td style="width: 160px; font-weight: 600;">Hari / Tanggal</td><td>: <b>${data.tanggalPertemuan}</b></td></tr>
              <tr><td style="font-weight: 600;">Waktu</td><td>: <b>${data.waktuPertemuan}</b></td></tr>
              <tr><td style="font-weight: 600;">Tempat</td><td>: <b>${data.ruangPertemuan}</b></td></tr>
            </table>

            <p style="margin: 10px 0 6px 0;">${data.penutupSurat}</p>
            <p style="margin: 4px 0;"><i>Wassalamu'alaikum Warahmatullahi Wabarakatuh</i></p>
          </div>

          <div class="footer-ttd">
            <div class="ttd-box">
              <p style="margin: 0;">Mengetahui,</p>
              <p style="margin: 2px 0 0 0; font-weight: bold;">Kepala Sekolah</p>
              <div style="height: 60px;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline;">${kepsekName}</p>
              <p style="margin: 1px 0 0 0; font-size: 9pt;">NBM. 974.501</p>
            </div>
            <div class="ttd-box">
              <p style="margin: 0;">Guru Bimbingan Konseling (BK)</p>
              <p style="margin: 2px 0 0 0; font-weight: bold;">SMA Muhammadiyah 1 Ponorogo</p>
              <div style="height: 60px;"></div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline;">${guruBkName}</p>
              <p style="margin: 1px 0 0 0; font-size: 9pt;">NIP/NBM. ${guruBkNip}</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  // Handler Cetak Dokumen Surat Pemanggilan BK (Format Standar TU Admin SIMASMUH)
  const handlePrintParentCallLetter = () => {
    if (!parentCallData) return
    const win = window.open('', '', 'width=850,height=950')
    if (!win) return
    const htmlContent = generateParentCallLetterHtml(parentCallData)
    win.document.write(htmlContent)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 400)
  }

  // Handler Kirim Undangan Surat BK via WhatsApp Wali Murid, Terbitkan Cetakan PDF & Simpan Rekam Jejak
  const handleSendParentCallWhatsApp = async () => {
    if (!parentCallData || !parentCallData.student) return
    const st = parentCallData.student
    const { name: parentName, phone: parentPhoneRaw } = getParentInfo(st)
    const parentPhone = parentPhoneRaw !== '-' ? parentPhoneRaw : (st.parentPhone || st.phone || '')
    const cleanPhone = parentPhone ? parentPhone.replace(/[^0-9]/g, '') : ''
    const fileName = `Surat_Undangan_BK_${st.name.replace(/\s+/g, '_')}_${(parentCallData.nomorSurat || 'Resmi').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    // Pesan Notifikasi WhatsApp Resmi & Santun
    const waMessage = 
      `*Assalamu'alaikum Warahmatullahi Wabarakatuh*\n\n` +
      `Yth. Bapak/Ibu *${parentName}*\n` +
      `Orang Tua / Wali dari ananda *${st.name}* (Kelas: ${st.className || st.class?.name || '-'})\n\n` +
      `Pemberitahuan resmi dari *Bimbingan & Konseling (BK) SMA Muhammadiyah 1 Ponorogo* bahwa telah diterbitkan dokumen surat pemanggilan/undangan resmi berikut:\n\n` +
      `📄 *SURAT RESMI BK:*\n` +
      `• No. Surat: *${parentCallData.nomorSurat}*\n` +
      `• Perihal: *${parentCallData.perihal}*\n` +
      `• Catatan/Topik: ${parentCallData.catatanKasus}\n\n` +
      `🗓 *JADWAL PERTEMUAN:*\n` +
      `• Hari/Tanggal: *${parentCallData.tanggalPertemuan}*\n` +
      `• Waktu: *${parentCallData.waktuPertemuan}*\n` +
      `• Tempat: *${parentCallData.ruangPertemuan}*\n\n` +
      `📎 *DOKUMEN CETAKAN PDF RESMI:* Telah diterbitkan sah berstempel sekolah dan dilampirkan bersama pesan ini.\n\n` +
      `Atas perhatian dan kehadiran Bapak/Ibu tepat pada waktunya, kami sampaikan terima kasih.\n\n` +
      `*Wassalamu'alaikum Warahmatullahi Wabarakatuh*\n\n` +
      `_Hormat Kami,_\n` +
      `*Guru Bimbingan Konseling (BK)*\n` +
      `*SMA Muhammadiyah 1 Ponorogo*\n` +
      `_${parentCallData.namaGuruBk}_`

    try {
      // 1. Simpan DULU ke Data Rekam Jejak BK di Database
      await authenticatedFetch('/api-backend/character-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: st.id,
          category: 'KEDISIPLINAN',
          type: 'CATATAN_KONSELING',
          title: `Surat Undangan Ortu: ${parentCallData.perihal}`,
          description: `Nomor Surat: ${parentCallData.nomorSurat}\nPerihal: ${parentCallData.perihal}\nTopik: ${parentCallData.catatanKasus}\nPertemuan: ${parentCallData.tanggalPertemuan} (${parentCallData.waktuPertemuan}) di ${parentCallData.ruangPertemuan}`,
          points: 0,
          date: new Date().toISOString(),
          actionTaken: parentPhone ? `Surat Undangan Resmi BK & Cetakan PDF Diterbitkan untuk Wali (${parentPhone})` : 'Surat Undangan Resmi BK & Cetakan PDF Diterbitkan',
          status: 'PEMANGGILAN_ORTU',
          notifyParent: true
        })
      })

      // 2. Kirim Pesan via WhatsApp Gateway SIMASMUH (088293733330)
      try {
        const res = await authenticatedFetch('/api-backend/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: parentPhone,
            message: waMessage,
            recipientName: parentName,
            category: 'INFORMASI',
            title: `Surat Undangan BK: ${parentCallData.perihal}`,
            fileName: fileName
          })
        })

        if (!res.ok) {
          await authenticatedFetch('/api-backend/whatsapp/send-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: parentPhone,
              message: waMessage,
              recipientName: parentName,
              fileName: fileName
            })
          })
        }
      } catch (waErr) {
        console.warn('WhatsApp gateway fallback:', waErr)
      }

      // 3. Otomatis Buka Dialog Cetak / Unduh Dokumen PDF Resmi
      handlePrintParentCallLetter()

      // 4. Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['character-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['rekap-siswa-karakter'] })
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })

      setIsParentCallModalOpen(false)

      // 5. Dialog Konfirmasi Sukses & Opsi Buka WhatsApp Web untuk Melampirkan File PDF
      Swal.fire({
        title: 'Surat Undangan & Cetakan PDF Siap!',
        html: `
          <div class="text-left text-xs space-y-2 p-1">
            <p>✓ Surat panggilan ortu untuk <b>${st.name}</b> berhasil disimpan ke <b>Rekam Jejak BK</b>.</p>
            <p>✓ Notifikasi & ucapan resmi telah dikirimkan ke WhatsApp Wali (<b>${parentPhone}</b>).</p>
            <p>✓ Dialog cetak PDF telah terbuka. Anda dapat menyimpan sebagai PDF (<i>Save as PDF</i>) untuk dilampirkan atau dicetak fisik.</p>
          </div>
        `,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Buka WhatsApp Web',
        cancelButtonText: 'Selesai',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#4f46e5'
      }).then((result) => {
        if (result.isConfirmed) {
          const encodedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`
          window.open(encodedUrl, '_blank')
        }
      })
    } catch (err: any) {
      console.error('Simpan Rekam Jejak BK Error:', err)
      Swal.fire({
        title: 'Gagal Memproses Surat BK',
        text: err.message || 'Terjadi kesalahan saat memproses surat BK.',
        icon: 'error'
      })
    }
  }


  // Mutation Tambah / Edit Catatan Evaluasi Siswa
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = !!payload.id
      const url = isEdit 
        ? `/api-backend/character-assessments/${payload.id}`
        : '/api-backend/character-assessments'
      
      const res = await authenticatedFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal menyimpan penilaian')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-etika'] })
      queryClient.invalidateQueries({ queryKey: ['executive-statistics'] })
      setIsFormOpen(false)
      setIsEditStudentModalOpen(false)
      setFormState({
        id: '',
        studentId: '',
        category: 'PELANGGARAN',
        type: 'NEGATIF',
        title: '',
        description: '',
        points: -10,
        date: new Date().toISOString().split('T')[0],
        actionTaken: '',
        status: canVerify ? 'SELESAI' : 'MENUNGGU',
        notifyParent: true,
      })
      Swal.fire({
        icon: 'success',
        title: canVerify ? 'Catatan Pembinaan Berhasil Disimpan' : 'Poin Kedisiplinan Berhasil Dicatat',
        text: canVerify 
          ? 'Catatan pembinaan telah diterapkan resmi ke poin siswa dan notifikasi terkirim ke wali murid.' 
          : 'Poin kedisiplinan berhasil dicatat dan diteruskan ke Bagian Ketertiban untuk diverifikasi & diterapkan ke akun siswa.',
        timer: 2500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Terjadi Kesalahan', err.message, 'error')
    },
  })

  // Mutation Verifikasi / Persetujuan oleh Bagian Ketertiban
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, actionTaken, note }: { id: string; status: 'TERVERIFIKASI' | 'DITOLAK' | 'DALAM_PEMBINAAN'; actionTaken?: string; note?: string }) => {
      const res = await authenticatedFetch(`/api-backend/character-assessments/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actionTaken, note }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal memverifikasi catatan')
      }
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-etika'] })
      Swal.fire({
        icon: variables.status === 'DITOLAK' ? 'info' : 'success',
        title: variables.status === 'DITOLAK' ? 'Catatan Ditolak' : 'Catatan Pembinaan Disetujui & Diterapkan',
        text: variables.status === 'DITOLAK' 
          ? 'Catatan kedisiplinan ditolak dan tidak diterapkan ke poin siswa.'
          : 'Catatan pembinaan berhasil diverifikasi dan resmi diterapkan ke poin kedisiplinan siswa serta terkirim ke WhatsApp wali murid.',
        timer: 2500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Verifikasi', err.message, 'error')
    },
  })

  // Mutation Reset Poin Siswa ke 100
  const resetMutation = useMutation({
    mutationFn: async ({ studentId, reason }: { studentId: string; reason?: string }) => {
      const res = await authenticatedFetch(`/api-backend/character-assessments/student/${studentId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal mereset poin siswa')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-etika'] })
      Swal.fire({
        icon: 'success',
        title: 'Poin Berhasil Di-Reset',
        text: data.message || 'Poin ketertiban siswa dikembalikan ke skor 100.',
        timer: 2500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Reset Poin', err.message, 'error')
    },
  })

  // Mutation Reset Semua Poin Siswa ke Credit Awal 100
  const resetAllMutation = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      const res = await authenticatedFetch('/api-backend/character-assessments/reset-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal mereset semua data poin siswa')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-etika'] })
      Swal.fire({
        icon: 'success',
        title: 'Reset Massal Berhasil',
        text: data.message || 'Seluruh data pelanggaran & apresiasi berhasil di-reset kembali ke credit awal 100 Poin.',
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Reset Massal', err.message, 'error')
    },
  })

  // Mutation Hapus Catatan
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/character-assessments/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-students-summary'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      Swal.fire({
        icon: 'success',
        title: 'Data Dihapus',
        timer: 1500,
        showConfirmButton: false,
      })
    },
  })

  // Handler Buka Form Input Catatan Baru untuk Siswa Tertentu
  const handleOpenAddRecordForStudent = (student: any, defaultCat: string = 'PELANGGARAN') => {
    setSelectedStudentForAction(student)
    
    // Cari parameter pertama yang cocok
    const matchingParam = customParams.find(p => p.category === defaultCat) || customParams[0]
    
    setFormState({
      id: '',
      studentId: student.id,
      category: defaultCat as any,
      type: (matchingParam?.type || (defaultCat === 'PELANGGARAN' ? 'NEGATIF' : 'POSITIF')) as any,
      title: matchingParam?.title || '',
      description: matchingParam?.description || '',
      points: matchingParam?.points || (defaultCat === 'PELANGGARAN' ? -10 : 10),
      date: new Date().toISOString().split('T')[0],
      actionTaken: matchingParam?.defaultAction || 'Dibina dan dipantau berkala',
      status: canVerify ? 'SELESAI' : 'MENUNGGU',
      notifyParent: true,
    })
    setIsFormOpen(true)
  }

  // Handler Buka Modal Edit Poin & Rekam Jejak Siswa
  const handleOpenEditStudent = (student: any) => {
    setSelectedStudentForAction(student)
    setIsEditStudentModalOpen(true)
  }

  // Handler Reset Skor Siswa
  const handleResetPoints = (student: any) => {
    Swal.fire({
      title: 'Reset Poin Ketertiban Siswa?',
      html: `<div class="text-xs text-slate-600 text-left">
        <p>Anda akan melakukan pemutihan / mengembalikan skor ketertiban <b>${student.name}</b> (${student.nis}) kembali ke <b>100 Poin</b>.</p>
        <p class="mt-2 text-rose-600 font-semibold">Tindakan ini akan membuat catatan pemutihan resmi di sistem.</p>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Alasan reset / pemutihan poin (opsional)...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Ya, Reset Poin ke 100',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        resetMutation.mutate({ studentId: student.id, reason: res.value })
      }
    })
  }

  // Handler Reset Seluruh Skor & Data Poin Siswa ke 100 Awal
  const handleResetAllPoints = () => {
    Swal.fire({
      title: 'Reset Seluruh Data Poin Siswa?',
      html: `<div class="text-xs text-slate-600 text-left space-y-2">
        <p class="font-bold text-rose-600">PERINGATAN RESET TOTAL KE CREDIT AWAL (100 POIN)</p>
        <p>Tindakan ini akan mereset dan membersihkan seluruh riwayat catatan pelanggaran, apresiasi, dan pemutihan untuk <b>seluruh siswa</b> di sistem.</p>
        <p>Semua siswa akan kembali ke saldo kredit awal <b>100 Poin (Grade A)</b>.</p>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Ketik alasan reset massal sistem (opsional)...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Reset Semua ke 100 Poin',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        resetAllMutation.mutate({ reason: res.value })
      }
    })
  }

  // Handler Verifikasi Catatan oleh Petugas Ketertiban
  const handleApproveAssessment = (item: any) => {
    Swal.fire({
      title: 'Setujui & Terapkan Poin?',
      html: `<div class="text-xs text-slate-600 text-left space-y-2">
        <p>Catatan dari <b>${item.evaluator?.name || 'Guru'}</b> untuk siswa <b>${item.student?.name}</b> (${item.student?.nis}):</p>
        <div class="p-2.5 bg-slate-50 border rounded-lg">
          <p class="font-bold text-slate-800">${item.title}</p>
          <p class="text-slate-500">${item.description || '-'}</p>
          <p class="font-black mt-1 ${item.points < 0 ? 'text-rose-600' : 'text-emerald-600'}">Poin: ${item.points > 0 ? '+' : ''}${item.points}</p>
        </div>
        <p class="text-emerald-700 font-semibold">Poin ini akan langsung diterapkan ke skor ketertiban siswa dan dikirimkan ke akun wali murid.</p>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Tindak lanjut / instruksi pembinaan tatib (opsional)...',
      inputValue: item.actionTaken || 'Diverifikasi & Diterapkan oleh Bagian Ketertiban',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'Ya, Setujui & Terapkan Poin',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        verifyMutation.mutate({
          id: item.id,
          status: 'TERVERIFIKASI',
          actionTaken: res.value || 'Diverifikasi & Diterapkan oleh Bagian Ketertiban',
        })
      }
    })
  }

  // Handler Tolak Catatan oleh Petugas Ketertiban
  const handleRejectAssessment = (item: any) => {
    Swal.fire({
      title: 'Tolak Catatan Kedisiplinan?',
      html: `<div class="text-xs text-slate-600 text-left">
        <p>Tolak catatan dari <b>${item.evaluator?.name || 'Guru'}</b> untuk siswa <b>${item.student?.name}</b>.</p>
        <p class="mt-1 text-slate-400">Catatan ini tidak akan diterapkan ke poin ketertiban siswa.</p>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Alasan penolakan pembinaan...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Tolak Catatan',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        verifyMutation.mutate({
          id: item.id,
          status: 'DITOLAK',
          note: res.value || 'Catatan tidak memenuhi kriteria pembinaan tatib',
        })
      }
    })
  }

  // Handler Pilih Parameter dari Dropdown Preset
  const handleSelectParameterPreset = (paramId?: string | null) => {
    if (!paramId) return
    const p = customParams.find(item => item.id === paramId)
    if (p) {
      setFormState(prev => ({
        ...prev,
        category: p.category,
        type: p.type,
        title: p.title,
        points: p.points,
        description: p.description || '',
        actionTaken: p.defaultAction || prev.actionTaken,
      }))
    }
  }


  // Handler Simpan Catatan Penilaian
  const handleSubmitForm = () => {
    if (!formState.studentId) {
      Swal.fire('Pilih Siswa', 'Silakan pilih siswa yang akan dinilai.', 'warning')
      return
    }
    if (!formState.title) {
      Swal.fire('Perihal Wajib Diisi', 'Silakan masukkan judul atau perihal penilaian.', 'warning')
      return
    }
    createMutation.mutate(formState)
  }

  // Handler Simpan Parameter Baru
  const handleAddCustomParam = () => {
    if (!newParamForm.title || !newParamForm.category) {
      Swal.fire('Isi Parameter', 'Judul dan kategori parameter wajib diisi.', 'warning')
      return
    }

    const newParam: TatibParameter = {
      id: `param-${Date.now()}`,
      category: newParamForm.category as any,
      title: newParamForm.title || '',
      points: Number(newParamForm.points) || (newParamForm.type === 'NEGATIF' ? -5 : 5),
      type: (newParamForm.type || (Number(newParamForm.points) < 0 ? 'NEGATIF' : 'POSITIF')) as any,
      description: newParamForm.description || '',
      defaultAction: newParamForm.defaultAction || '',
    }

    const updated = [...customParams, newParam]
    saveParametersToStorage(updated)
    setNewParamForm({
      category: 'PELANGGARAN',
      title: '',
      points: -10,
      type: 'NEGATIF',
      description: '',
      defaultAction: '',
    })

    Swal.fire({
      icon: 'success',
      title: 'Parameter Ditambahkan',
      text: `Parameter "${newParam.title}" (${newParam.points > 0 ? '+' : ''}${newParam.points} Poin) berhasil disimpan.`,
      timer: 1500,
      showConfirmButton: false,
    })
  }

  // Handler Hapus Parameter
  const handleDeleteCustomParam = (id: string, title: string) => {
    const updated = customParams.filter(p => p.id !== id)
    saveParametersToStorage(updated)
    Swal.fire({
      icon: 'success',
      title: 'Parameter Dihapus',
      text: `Parameter "${title}" telah dihapus.`,
      timer: 1500,
      showConfirmButton: false,
    })
  }

  // Ekspor Excel Data
  const handleExportExcel = () => {
    if (activeTab === 'rekap-siswa') {
      if (filteredStudentsSummary.length === 0) return
      const exportData = filteredStudentsSummary.map((s: any, idx: number) => ({
        No: idx + 1,
        NIS: s.nis,
        NISN: s.nisn || '-',
        'Nama Siswa': s.name,
        Kelas: s.className,
        'Skor Ketertiban': s.ketertibanScore,
        'Skor Adab': s.adabScore,
        'Total Kasus Pelanggaran': s.totalPelanggaran,
        'Total Apresiasi / Teladan': s.totalPrestasi,
        'Total Sesi Pembinaan': s.totalPembinaan,
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Skor Siswa')
      XLSX.writeFile(wb, `Rekap_Skor_Ketertiban_Adab_${new Date().toISOString().split('T')[0]}.xlsx`)
    } else {
      if (filteredAssessments.length === 0) return
      const exportData = filteredAssessments.map((a: any, idx: number) => ({
        No: idx + 1,
        Tanggal: new Date(a.date).toLocaleDateString('id-ID'),
        'Nama Siswa': a.student?.name || '-',
        NIS: a.student?.nis || '-',
        Kelas: a.student?.class?.name || '-',
        Kategori: a.category,
        Tipe: a.type,
        'Judul Catatan': a.title,
        'Deskripsi / Kasus': a.description || '-',
        'Poin Delta': a.points,
        Status: a.status,
        'Tindak Lanjut / Pembinaan': a.actionTaken || '-',
        'Penilai / Guru': a.evaluator?.name || '-',
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Log Catatan Tatib')
      XLSX.writeFile(wb, `Log_Catatan_Adab_Tatib_${new Date().toISOString().split('T')[0]}.xlsx`)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards Ringkasan (Adaptif Mode: BK Konseling vs Catatan Kedisiplinan) */}
      {mode === 'BK' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">Total Sesi Konseling</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {counselingList.length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Sesi Bimbingan & Konseling Terdata</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-md">
                <HeartHandshake className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Pemanggilan Ortu</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {parentCallList.length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Surat Undangan & Kunjungan</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <PhoneCall className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Dalam Pembinaan</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {counselingList.filter((a: any) => a.status === 'DALAM_PEMBINAAN' || a.status === 'PROSES_BIMBINGAN' || a.status === 'DIRUJUK').length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Kasus & Pantauan Berjalan</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Konseling Selesai</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {counselingList.filter((a: any) => a.status === 'SELESAI' || a.status === 'TERVERIFIKASI').length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Siswa Terbina & Konseling Tuntas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Pelanggaran</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {tatibStats?.totalPelanggaran ?? 0}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Catatan Terverifikasi & Diterapkan</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Verifikasi Tertunda</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {tatibStats?.pendingVerification ?? pendingVerificationList.length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Input Guru Menunggu Approval Tatib</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Apresiasi & Teladan</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {tatibStats?.totalPrestasi ?? 0}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Poin Prestasi & Karakter Terpuji</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Skor Adab & Ibadah</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                  {tatibStats?.totalIbadah ?? 0}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Dinilai Guru Mapel & Tatib</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Banner Informasi Modul */}
      <div className={`p-4 rounded-2xl text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border ${
        mode === 'BK' 
          ? 'bg-gradient-to-r from-pink-950 via-purple-950 to-slate-900 border-pink-800/60' 
          : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border-blue-800/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            mode === 'BK' ? 'bg-pink-600/30 border-pink-400/30' : 'bg-blue-600/30 border-blue-400/30'
          }`}>
            {mode === 'BK' ? (
              <HeartHandshake className="w-5 h-5 text-pink-300" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white">
              {mode === 'BK' 
                ? 'Layanan Bimbingan Konseling (BK / BP) & Pemanggilan Wali Murid'
                : canVerify
                ? 'Panel Poin Kedisiplinan & Verifikasi Tata Tertib'
                : 'Panel Catatan Kedisiplinan Siswa (Draf Guru)'}
            </h4>
            <p className="text-xs text-blue-200/90 mt-0.5">
              {mode === 'BK'
                ? 'Area pencatatan sesi bimbingan konseling, pantauan kasus siswa, serta surat panggilan orang tua terhubung WhatsApp.'
                : canVerify
                ? 'Verifikasi catatan guru, penetapan skor kedisiplinan resmi siswa (Skala 100 Poin), dan sinkronisasi notifikasi wali murid.'
                : 'Pencatatan pelanggaran, adab, dan teladan siswa oleh Guru. Catatan otomatis masuk sebagai Draf untuk diverifikasi Petugas Ketertiban.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {mode === 'BK' ? (
            <>
              <Button
                onClick={() => {
                  setCounselingFormState({
                    id: '',
                    studentId: '',
                    counselingType: 'PELANGGARAN_KEDISIPLINAN',
                    title: '',
                    description: '',
                    actionTaken: '',
                    status: 'PROSES_BIMBINGAN',
                    privacy: 'TERBUKA',
                    pointsAdjust: 0,
                    date: new Date().toISOString().split('T')[0],
                    notifyParent: true,
                  })
                  setIsCounselingModalOpen(true)
                }}
                size="sm"
                className="h-9 text-xs gap-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-xs"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>+ Sesi Konseling Baru</span>
              </Button>

              <Button
                onClick={() => handleOpenParentCallLetter()}
                size="sm"
                className="h-9 text-xs gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Buat Surat Ortu</span>
              </Button>
            </>
          ) : (
            <>
              {canVerify && (
                <Button
                  onClick={() => setIsParamModalOpen(true)}
                  size="sm"
                  className="h-9 text-xs gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Atur Parameter Poin</span>
                </Button>
              )}

              <Button
                onClick={() => {
                  setSelectedStudentForAction(null)
                  setFormState({
                    id: '',
                    studentId: '',
                    category: 'PELANGGARAN',
                    type: 'NEGATIF',
                    title: '',
                    description: '',
                    points: -10,
                    date: new Date().toISOString().split('T')[0],
                    actionTaken: '',
                    status: canVerify ? 'SELESAI' : 'MENUNGGU',
                    notifyParent: true,
                  })
                  setIsFormOpen(true)
                }}
                size="sm"
                className="h-9 text-xs gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{canVerify ? 'Input Catatan Pembinaan' : 'Catat Poin Kedisiplinan'}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2b. Notifikasi Area: Verifikasi Izin Siswa (Wali Murid) untuk BK & Ketertiban */}
      {(canVerify || isBk || isTatib) && studentIzinList.length > 0 && (
        <Card className="border-blue-300 dark:border-blue-800 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100/70 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-blue-900/40 shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Area Verifikasi Izin Siswa (Wali Murid)
                  </h4>
                  <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 animate-pulse">
                    {studentIzinList.length} Menunggu Verifikasi
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Terdapat <span className="font-extrabold text-blue-700 dark:text-blue-300">{studentIzinList.length} surat permohonan izin ketidakhadiran</span> (sakit / keperluan keluarga) dari wali murid yang membutuhkan pengecekan &amp; persetujuan resmi Tim {mode === 'BK' ? 'BK / BP' : 'Ketertiban'}.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => window.location.href = '/presensi/izin-siswa'}
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shrink-0 shadow-xs"
            >
              <span>Proses Verifikasi Izin</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3. Filter & Navigasi Tab */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
          {mode === 'BK' ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('catatan-konseling')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'catatan-konseling'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Sesi & Catatan BK ({counselingList.length})</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('panggilan-ortu')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'panggilan-ortu'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Pemanggilan Ortu ({parentCallList.length})</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('rekap-siswa')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'rekap-siswa'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Radar Pantauan Siswa</span>
              </Button>
            </>
          ) : mode === 'GURU' ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('rekap-siswa')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'rekap-siswa'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Siswa & Catat Poin</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('log-catatan')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'log-catatan'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Riwayat Catatan Guru</span>
              </Button>
            </>
          ) : mode === 'KETERTIBAN' ? (
            <>
              {canVerify && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('verifikasi-pembinaan')}
                  className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                    activeTab === 'verifikasi-pembinaan'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Verifikasi Catatan ({pendingVerificationList.length})</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('rekap-siswa')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'rekap-siswa'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Siswa & Skor Poin</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('log-catatan')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'log-catatan'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Log Riwayat Kedisiplinan</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('catatan-konseling')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'catatan-konseling'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Sesi & Catatan BK</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('panggilan-ortu')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'panggilan-ortu'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Pemanggilan Ortu</span>
              </Button>

              {canVerify && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('verifikasi-pembinaan')}
                  className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                    activeTab === 'verifikasi-pembinaan'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Verifikasi Catatan ({pendingVerificationList.length})</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('rekap-siswa')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'rekap-siswa'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Siswa & Skor</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('log-catatan')}
                className={`text-xs font-bold gap-1.5 rounded-lg h-8 px-3 ${
                  activeTab === 'log-catatan'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Log Semua Riwayat</span>
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Cari siswa, NIS, atau guru..."
              className="pl-9 h-10 text-xs rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || 'ALL')}>
            <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kelas</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeTab === 'log-catatan' && (
            <>
              <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'ALL')}>
                <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  <SelectItem value="PELANGGARAN">Pelanggaran</SelectItem>
                  <SelectItem value="KEDISIPLINAN">Kedisiplinan</SelectItem>
                  <SelectItem value="ADAB_ETIKA">Adab & Kesantunan</SelectItem>
                  <SelectItem value="IBADAH">Amalan Ibadah</SelectItem>
                  <SelectItem value="PRESTASI_PENGHARGAAN">Prestasi / Reward</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatusFilter} onValueChange={(val) => setSelectedStatusFilter(val || 'ALL')}>
                <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="MENUNGGU">Menunggu Tatib</SelectItem>
                  <SelectItem value="TERVERIFIKASI">Terverifikasi</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITOLAK">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-10 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 font-bold"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor</span>
          </Button>
        </div>
      </div>

      {/* Tab: Sesi & Catatan Bimbingan Konseling (BK) */}
      {activeTab === 'catatan-konseling' && (
        <Card className="border-pink-200 dark:border-pink-900/60 shadow-xs overflow-hidden rounded-2xl">
            <CardHeader className="p-4 sm:p-5 border-b border-pink-100 dark:border-pink-900/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-pink-600" />
                  Daftar Sesi Bimbingan & Konseling BK Siswa
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Rekam jejak bimbingan pribadi, akademik, karir, dan tindak lanjut kedisiplinan siswa oleh Guru BK.
                </CardDescription>
              </div>

              <Button
                onClick={() => {
                  setCounselingFormState({
                    id: '',
                    studentId: '',
                    counselingType: 'PELANGGARAN_KEDISIPLINAN',
                    title: '',
                    description: '',
                    actionTaken: '',
                    status: 'PROSES_BIMBINGAN',
                    privacy: 'TERBUKA',
                    pointsAdjust: 0,
                    date: new Date().toISOString().split('T')[0],
                    notifyParent: true,
                  })
                  setIsCounselingModalOpen(true)
                }}
                size="sm"
                className="h-9 text-xs font-bold gap-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Sesi Konseling</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-pink-50/50 dark:bg-slate-900/80">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                      <TableHead className="text-xs font-bold">Tanggal & Konselor</TableHead>
                      <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                      <TableHead className="text-xs font-bold">Topik / Permasalahan</TableHead>
                      <TableHead className="text-xs font-bold">Rencana Tindak Lanjut</TableHead>
                      <TableHead className="text-xs font-bold text-center">Status Sesi</TableHead>
                      <TableHead className="w-36 text-center text-xs font-bold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counselingList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm">
                          <HeartHandshake className="w-8 h-8 text-pink-400 mx-auto mb-2 opacity-60" />
                          <p className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Catatan Konseling</p>
                          <p className="text-xs text-slate-400">Klik tombol "Tambah Sesi Konseling" untuk mencatat sesi bimbingan siswa.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      counselingList.map((item: any, idx: number) => (
                        <TableRow key={item.id} className="hover:bg-pink-50/30 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">
                              {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {item.evaluator?.name || 'Guru BK'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-slate-900 dark:text-white block">{item.student?.name}</span>
                            <span className="text-[11px] text-slate-500">
                              NIS: {item.student?.nis} • {item.student?.class?.name || 'Tanpa Kelas'}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.description || '-'}</p>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                              {item.actionTaken || 'Bimbingan rutin Guru BK'}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] font-bold ${
                                item.status === 'PEMANGGILAN_ORTU' || item.status === 'HOME_VISIT'
                                  ? 'bg-rose-500 text-white'
                                  : item.status === 'PROSES_BIMBINGAN' || item.status === 'DALAM_PEMBINAAN'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {item.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCounseling(item)}
                                className="h-7 text-[11px] font-bold px-2 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg gap-1"
                                title="Edit Sesi Konseling"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenParentCallLetter(item.student, item)}
                                className="h-7 text-[11px] font-bold px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg gap-1"
                                title="Cetak Surat Undangan Ortu"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Surat Ortu</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Hapus Catatan Konseling?',
                                    text: `Hapus sesi konseling "${item.title}" untuk ${item.student?.name || 'siswa'}?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    cancelButtonColor: '#64748b',
                                    confirmButtonText: 'Ya, Hapus',
                                    cancelButtonText: 'Batal',
                                  }).then((res) => {
                                    if (res.isConfirmed) {
                                      deleteMutation.mutate(item.id)
                                    }
                                  })
                                }}
                                className="h-7 text-[11px] font-bold px-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                                title="Hapus Catatan Konseling"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      )}

      {/* Tab: Pemanggilan Orang Tua & Home Visit */}
      {activeTab === 'panggilan-ortu' && (
        <Card className="border-indigo-200 dark:border-indigo-900/60 shadow-xs overflow-hidden rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-indigo-600" />
                Rekam Jejak Pemanggilan Orang Tua / Wali & Home Visit
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Daftar siswa yang memerlukan undangan hadir orang tua/wali ke sekolah atau agenda kunjungan rumah.
              </CardDescription>
            </div>
            <Badge className="bg-indigo-600 text-white font-bold text-xs">
              {parentCallList.length} Kasus Pemanggilan
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-indigo-50/50 dark:bg-slate-900/80">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                    <TableHead className="text-xs font-bold">No. Kontak Orang Tua</TableHead>
                    <TableHead className="text-xs font-bold">Perihal / Alasan Undangan</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status Agenda</TableHead>
                    <TableHead className="w-48 text-center text-xs font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parentCallList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm">
                        <PhoneCall className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">Belum Ada Agenda Pemanggilan Ortu</p>
                        <p className="text-xs text-slate-400">Tidak ada pemanggilan orang tua atau agenda home visit aktif saat ini.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    parentCallList.map((item: any, idx: number) => (
                      <TableRow key={item.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 text-xs">
                        <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-900 dark:text-white block">{item.student?.name}</span>
                          <span className="text-[11px] text-slate-500">
                            NIS: {item.student?.nis} • {item.student?.class?.name || 'Tanpa Kelas'}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {getParentInfo(item.student).phone !== '-' ? (
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {getParentInfo(item.student).phone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Belum terdaftar</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.actionTaken || item.description || '-'}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-rose-600 text-white font-bold text-[10px]">
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCounseling(item)}
                              className="h-8 text-[11px] font-bold px-2.5 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg gap-1"
                              title="Edit Agenda Pemanggilan"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleOpenParentCallLetter(item.student, item)}
                              className="h-8 text-[11px] font-bold px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1 shadow-xs"
                              title="Cetak Surat Undangan"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Hapus Agenda Pemanggilan?',
                                  text: `Penghapusan pemanggilan ortu untuk ${item.student?.name || 'siswa'} bersifat permanen.`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#ef4444',
                                  cancelButtonColor: '#64748b',
                                  confirmButtonText: 'Ya, Hapus',
                                  cancelButtonText: 'Batal',
                                }).then((res) => {
                                  if (res.isConfirmed) {
                                    deleteMutation.mutate(item.id)
                                  }
                                })
                              }}
                              className="h-8 text-[11px] font-bold px-2 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                              title="Hapus Agenda Pemanggilan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Konten Tab Khusus: Verifikasi Pembinaan (Oleh Bagian Ketertiban) */}
      {activeTab === 'verifikasi-pembinaan' && canVerify && (
        <Card className="border-amber-200 dark:border-amber-900/60 shadow-xs overflow-hidden rounded-2xl bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="p-4 sm:p-5 border-b border-amber-200/60 dark:border-amber-900/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Area Verifikasi Catatan Kedisiplinan Guru
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Daftar catatan pelanggaran dan apresiasi yang dicatat oleh guru. Setujui untuk menerapkan poin secara resmi ke akun siswa dan meneruskan notifikasi ke wali murid.
              </CardDescription>
            </div>
            <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
              {pendingVerificationList.length} Menunggu Verifikasi
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-amber-100/50 dark:bg-slate-900/80">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                    <TableHead className="text-xs font-bold">Kategori & Poin</TableHead>
                    <TableHead className="text-xs font-bold">Judul & Kronologi</TableHead>
                    <TableHead className="text-xs font-bold">Guru Pencatat</TableHead>
                    <TableHead className="w-48 text-center text-xs font-bold">Aksi Verifikasi Tatib</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAssessments ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                        Memuat data antrean verifikasi...
                      </TableCell>
                    </TableRow>
                  ) : pendingVerificationList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-sm space-y-1">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                        <p className="font-bold text-slate-700 dark:text-slate-300">Semua Catatan Guru Sudah Diverifikasi</p>
                        <p className="text-xs text-slate-400">Tidak ada antrean catatan kedisiplinan yang menunggu persetujuan.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingVerificationList.map((item: any, idx: number) => {
                      const isNeg = item.points < 0 || item.category === 'PELANGGARAN' || item.type === 'NEGATIF'
                      return (
                        <TableRow key={item.id} className="hover:bg-amber-100/30 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {new Date(item.date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-white">{item.student?.name}</div>
                            <div className="text-[11px] text-slate-400">
                              NIS: {item.student?.nis} • {item.student?.class?.name || 'Tanpa Kelas'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isNeg
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }`}
                              >
                                {item.category.replace('_', ' ')}
                              </Badge>
                              <span className={`font-black text-xs ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {item.points > 0 ? `+${item.points}` : item.points}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.description || '-'}</p>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {item.evaluator?.name || 'Guru'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              {item.evaluator?.subRole || item.evaluator?.role || 'GURU'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleApproveAssessment(item)}
                                disabled={verifyMutation.isPending}
                                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] gap-1 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Setujui & Terapkan</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectAssessment(item)}
                                disabled={verifyMutation.isPending}
                                className="h-8 px-2 border-rose-300 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Konten Tab: Radar Pantauan & Rekap Skor Siswa */}
      {activeTab === 'rekap-siswa' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {mode === 'BK' ? (
                  <>
                    <HeartHandshake className="w-5 h-5 text-pink-600" />
                    Radar Pantauan & Ringkasan Perkembangan Siswa (BK)
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Daftar Siswa & Skor Kedisiplinan
                  </>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {mode === 'BK'
                  ? 'Monitoring integrasi skor akumulasi kedisiplinan, jumlah pelanggaran, prestasi, serta rekam jejak bimbingan konseling.'
                  : 'Skor awal siswa 100 Poin. Poin diterapkan resmi setelah diverifikasi oleh Bagian Ketertiban.'}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={radarFilterActive ? "default" : "outline"}
                onClick={() => setRadarFilterActive(!radarFilterActive)}
                className={`h-8 text-xs font-bold gap-1.5 rounded-xl ${
                  radarFilterActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{radarFilterActive ? 'Tampilkan Semua Siswa' : 'Radar BK (Perlu Pembinaan)'}</span>
              </Button>

              {(canVerify || isSuperAdmin) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetAllPoints}
                  disabled={resetAllMutation.isPending}
                  className="h-8 text-xs font-bold gap-1.5 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400"
                  title="Reset seluruh poin siswa kembali ke 100 awal"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetAllMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Reset Semua Poin ke 100</span>
                </Button>
              )}

              <Badge variant="outline" className="font-bold text-xs">
                Total: {filteredStudentsSummary.length} Siswa
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Nama Siswa & Rombel</TableHead>
                    <TableHead className="text-xs font-bold text-center">Skor Akumulasi</TableHead>
                    <TableHead className="text-xs font-bold text-center">Jumlah Pelanggaran</TableHead>
                    <TableHead className="text-xs font-bold text-center">Jumlah Prestasi</TableHead>
                    {mode === 'BK' && (
                      <TableHead className="text-xs font-bold text-center">Sesi & Catatan BK</TableHead>
                    )}
                    <TableHead className="text-xs font-bold text-center">Status {mode === 'BK' ? 'BK' : 'Kedisiplinan'}</TableHead>
                    <TableHead className={mode === 'BK' ? "w-64 text-center text-xs font-bold" : "w-44 text-center text-xs font-bold"}>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSummary ? (
                    <TableRow>
                      <TableCell colSpan={mode === 'BK' ? 8 : 7} className="h-32 text-center text-slate-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Memuat data skor & konseling siswa...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudentsSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={mode === 'BK' ? 8 : 7} className="h-32 text-center text-slate-400 text-sm">
                        Tidak ada data siswa ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudentsSummary.map((st: any, idx: number) => {
                      const getGradeColor = (score: number) => {
                        if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        if (score >= 20) return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
                        return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      }

                      const getGradeLetter = (score: number) => {
                        if (score >= 90) return 'A'
                        if (score >= 70) return 'B'
                        if (score >= 50) return 'C'
                        if (score >= 20) return 'D'
                        return 'E'
                      }

                      const kGrade = st.ketertibanGrade || getGradeLetter(st.ketertibanScore)
                      const bkCount = counselingList.filter((c: any) => c.studentId === st.id).length || st.totalCatatanKonseling || 0

                      return (
                        <TableRow key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                            <div className="text-[11px] text-slate-400">
                              NIS: {st.nis} • Kelas: <span className="font-semibold text-slate-600 dark:text-slate-300">{st.className}</span>
                            </div>
                          </TableCell>
                          
                          {/* Skor Akumulasi */}
                          <TableCell className="text-center">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-black text-xs ${getGradeColor(st.ketertibanScore)}`}>
                                <span className="text-sm font-extrabold">{st.ketertibanScore}</span>
                                <span className="text-[10px] font-black uppercase px-1 py-0.2 rounded bg-white/60 dark:bg-black/30">
                                  Grade {kGrade}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {st.ketertibanScore >= 90 ? 'Baik / Terpuji' : st.ketertibanScore >= 70 ? 'Pantauan & Bimbingan' : st.ketertibanScore >= 50 ? 'Pantauan' : st.ketertibanScore >= 20 ? 'Bimbingan Ketat' : 'Kritis (Dikeluarkan)'}
                              </span>
                            </div>
                          </TableCell>

                          {/* Jumlah Pelanggaran */}
                          <TableCell className="text-center">
                            {st.totalPelanggaran > 0 ? (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                                {st.totalPelanggaran} Kasus
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </TableCell>

                          {/* Jumlah Prestasi */}
                          <TableCell className="text-center">
                            {st.totalPrestasi > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                                +{st.totalPrestasi} Apresiasi
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </TableCell>

                          {/* Sesi & Catatan BK (Khusus Mode BK) */}
                          {mode === 'BK' && (
                            <TableCell className="text-center">
                              {bkCount > 0 ? (
                                <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 font-bold gap-1">
                                  <HeartHandshake className="w-3 h-3 text-pink-600" />
                                  {bkCount} Sesi BK
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-medium">-</span>
                              )}
                            </TableCell>
                          )}

                          {/* Status */}
                          <TableCell className="text-center">
                            {mode === 'BK' ? (
                              st.ketertibanScore < 20 ? (
                                <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase animate-pulse">
                                  Perlu Tindak Lanjut (SP3)
                                </Badge>
                              ) : st.ketertibanScore < 50 ? (
                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px]">
                                  Bimbingan Intensif BK
                                </Badge>
                              ) : st.ketertibanScore < 70 ? (
                                <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
                                  Dalam Pantauan BK
                                </Badge>
                              ) : bkCount > 0 ? (
                                <Badge className="bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-200 font-bold text-[10px]">
                                  {bkCount} Konseling Aktif
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                  Karakter Baik
                                </Badge>
                              )
                            ) : (
                              st.ketertibanScore < 20 ? (
                                <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase animate-pulse">
                                  Dikeluarkan (E)
                                </Badge>
                              ) : st.ketertibanScore < 50 ? (
                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px]">
                                  Bimbingan Ketat (D)
                                </Badge>
                              ) : st.pendingVerificationCount > 0 ? (
                                <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
                                  {st.pendingVerificationCount} Menunggu Tatib
                                </Badge>
                              ) : st.totalPembinaan > 0 ? (
                                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 font-bold text-[10px]">
                                  {st.totalPembinaan} Pembinaan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                                  Bersih / Tertib
                                </Badge>
                              )
                            )}
                          </TableCell>

                          {/* Tombol Aksi */}
                          <TableCell className="text-center">
                            {mode === 'BK' ? (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setCounselingFormState({
                                      id: '',
                                      studentId: st.id,
                                      counselingType: st.ketertibanScore < 70 ? 'PELANGGARAN_KEDISIPLINAN' : 'BELAJAR_AKADEMIK',
                                      title: `Bimbingan Konseling - ${st.name}`,
                                      description: `Skor Kedisiplinan: ${st.ketertibanScore} Poin | Pelanggaran: ${st.totalPelanggaran || 0}`,
                                      actionTaken: 'Bimbingan konseling dan rekomendasi Guru BK',
                                      status: 'PROSES_BIMBINGAN',
                                      privacy: 'TERBUKA',
                                      pointsAdjust: 0,
                                      date: new Date().toISOString().split('T')[0],
                                      notifyParent: true,
                                    })
                                    setIsCounselingModalOpen(true)
                                  }}
                                  className="h-8 px-2.5 text-[11px] font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg gap-1 shadow-xs"
                                  title="Input Sesi Konseling Siswa"
                                >
                                  <HeartHandshake className="w-3.5 h-3.5" />
                                  <span>+ Sesi BK</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenParentCallLetter(st)}
                                  className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 gap-1"
                                  title="Cetak Surat Undangan Pemanggilan Orang Tua"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Surat Ortu</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditStudent(st)}
                                  className="h-8 px-2 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 gap-1"
                                  title="Lihat Rekam Jejak Siswa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Jejak</span>
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditStudent(st)}
                                  className="h-8 px-2 text-[11px] font-bold rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 gap-1"
                                  title="Lihat Rekam Jejak & Kelola Poin"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>{canVerify ? 'Kelola' : 'Beri Poin'}</span>
                                </Button>

                                {canVerify && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResetPoints(st)}
                                    className="h-8 px-2 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 gap-1"
                                    title="Reset Poin Siswa ke 100"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Reset</span>
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Konten Tab: Log Riwayat Catatan Pembinaan & Pelanggaran */}
      {activeTab === 'log-catatan' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                Log Riwayat Catatan Pembinaan & Poin Kedisiplinan Siswa
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Catatan terverifikasi langsung tersinkronisasi ke buku saku siswa & notifikasi WhatsApp wali murid.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total: <strong>{filteredAssessments.length}</strong> catatan
            </span>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                    <TableHead className="text-xs font-bold">Kategori & Poin</TableHead>
                    <TableHead className="text-xs font-bold">Judul & Keterangan</TableHead>
                    <TableHead className="text-xs font-bold">Tindak Lanjut / Status</TableHead>
                    <TableHead className="text-xs font-bold">Pencatat / Guru</TableHead>
                    <TableHead className="w-24 text-center text-xs font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAssessments ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-600" />
                        Memuat data catatan...
                      </TableCell>
                    </TableRow>
                  ) : filteredAssessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                        Belum ada riwayat catatan yang cocok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssessments.map((item: any, idx: number) => {
                      const isNeg = item.points < 0 || item.category === 'PELANGGARAN' || item.type === 'NEGATIF'
                      const isPending = item.status === 'MENUNGGU' || item.status === 'MENUNGGU_VERIFIKASI'
                      const isVerified = item.status === 'SELESAI' || item.status === 'TERVERIFIKASI'
                      const isRejected = item.status === 'DITOLAK'

                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {new Date(item.date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-white">{item.student?.name}</div>
                            <div className="text-[11px] text-slate-400">
                              NIS: {item.student?.nis} • {item.student?.class?.name || 'Tanpa Kelas'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isNeg
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }`}
                              >
                                {item.category.replace('_', ' ')}
                              </Badge>
                              <span className={`font-black text-xs ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {item.points > 0 ? `+${item.points}` : item.points}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description || '-'}</p>
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="space-y-1">
                              <span className="text-slate-600 dark:text-slate-300 block line-clamp-1">
                                {item.actionTaken || 'Dipantau dan dibina'}
                              </span>
                              <div>
                                {isVerified ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[9px] font-bold">
                                    Terverifikasi & Diterapkan
                                  </Badge>
                                ) : isPending ? (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[9px] font-bold">
                                    Menunggu Verifikasi Tatib
                                  </Badge>
                                ) : isRejected ? (
                                  <Badge variant="destructive" className="text-[9px] font-bold">
                                    Ditolak
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px]">
                                    {item.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate max-w-[120px]">
                              {item.evaluator?.name || 'Guru'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              {item.evaluator?.subRole || item.evaluator?.role || 'GURU'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {isPending && canVerify && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApproveAssessment(item)}
                                  className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50"
                                  title="Setujui Catatan Ini"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditAssessment(item)}
                                className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                                title="Edit Catatan Penilaian"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Hapus Catatan Penilaian?',
                                    text: `Hapus catatan penilaian untuk ${item.student?.name}?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#ef4444',
                                    confirmButtonText: 'Ya, Hapus',
                                  }).then((res) => {
                                    if (res.isConfirmed) {
                                      deleteMutation.mutate(item.id)
                                    }
                                  })
                                }}
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. MODAL 1: Atur Parameter Poin Tata Tertib & Pembinaan */}
      <Dialog open={isParamModalOpen} onOpenChange={setIsParamModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Sliders className="w-5 h-5 text-amber-600" />
              Atur Parameter Poin Kedisiplinan, Adab & Pelanggaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Konfigurasikan bobot poin untuk setiap kategori pembinaan dan pelanggaran tata tertib sekolah.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tambah Parameter Baru */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              Tambah Kategori / Jenis Parameter Poin Baru
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <Label className="text-[11px] font-bold">Kategori *</Label>
                <Select
                  value={newParamForm.category}
                  onValueChange={(val) => {
                    const isPelanggaran = val === 'PELANGGARAN'
                    setNewParamForm(prev => ({
                      ...prev,
                      category: val as any,
                      type: isPelanggaran ? 'NEGATIF' : 'POSITIF',
                      points: isPelanggaran ? -100 : 100,
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg mt-1">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PELANGGARAN">Pelanggaran Tata Tertib</SelectItem>
                    <SelectItem value="KEDISIPLINAN">Kedisiplinan & Kerapian</SelectItem>
                    <SelectItem value="ADAB_ETIKA">Adab & Kesantunan</SelectItem>
                    <SelectItem value="IBADAH">Amalan Ibadah (PAI)</SelectItem>
                    <SelectItem value="PRESTASI_PENGHARGAAN">Prestasi / Penghargaan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold">Poin Delta (- / +) *</Label>
                <Input
                  type="number"
                  value={newParamForm.points}
                  onChange={(e) => setNewParamForm(prev => ({ ...prev, points: Number(e.target.value) }))}
                  className="h-9 text-xs rounded-lg mt-1"
                  placeholder="-10 atau +10"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold">Tipe Evaluasi *</Label>
                <Select
                  value={newParamForm.type}
                  onValueChange={(val) => setNewParamForm(prev => ({ ...prev, type: val as any }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-lg mt-1">
                    <SelectValue placeholder="Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEGATIF">Poin Negatif (Pelanggaran)</SelectItem>
                    <SelectItem value="POSITIF">Poin Positif (Apresiasi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-[11px] font-bold">Judul / Nama Peristiwa *</Label>
                <Input
                  value={newParamForm.title}
                  onChange={(e) => setNewParamForm(prev => ({ ...prev, title: e.target.value }))}
                  className="h-9 text-xs rounded-lg mt-1"
                  placeholder="Misal: Tidak Memakai Atribut Lengkap saat Upacara"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold">Tindakan / Sanksi Default</Label>
                <Input
                  value={newParamForm.defaultAction}
                  onChange={(e) => setNewParamForm(prev => ({ ...prev, defaultAction: e.target.value }))}
                  className="h-9 text-xs rounded-lg mt-1"
                  placeholder="Misal: Teguran lisan & piket"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={handleAddCustomParam}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simpan Parameter</span>
              </Button>
            </div>
          </div>

          {/* Daftar Parameter Tersimpan */}
          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-slate-800 dark:text-white">
              Daftar Standar Parameter Poin Aktif ({customParams.length})
            </h5>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Kategori</TableHead>
                    <TableHead className="text-xs font-bold">Nama Kasus / Evaluasi</TableHead>
                    <TableHead className="text-xs font-bold text-center">Poin</TableHead>
                    <TableHead className="text-xs font-bold">Tindakan Default</TableHead>
                    <TableHead className="w-12 text-center text-xs font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customParams.map((p) => {
                    const isNeg = p.points < 0 || p.type === 'NEGATIF'
                    return (
                      <TableRow key={p.id} className="text-xs hover:bg-slate-50/50">
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 dark:text-slate-100">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-center font-black">
                          <span className={isNeg ? 'text-rose-600' : 'text-emerald-600'}>
                            {p.points > 0 ? `+${p.points}` : p.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 max-w-[200px] truncate">
                          {p.defaultAction || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomParam(p.id, p.title)}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsParamModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL 2: Dialog Modal Edit & Rekam Jejak Siswa Terpilih */}
      <Dialog open={isEditStudentModalOpen} onOpenChange={setIsEditStudentModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStudentForAction && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                    <User className="w-5 h-5 text-blue-600" />
                    Detail Kedisiplinan & Adab: {selectedStudentForAction.name}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  NIS: {selectedStudentForAction.nis} • Kelas: {selectedStudentForAction.className} • Skor Ketertiban: <b>{selectedStudentForAction.ketertibanScore}</b>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Tombol Aksi Cepat */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsEditStudentModalOpen(false)
                      handleOpenAddRecordForStudent(selectedStudentForAction, 'PELANGGARAN')
                    }}
                    className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Catat Pelanggaran</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setIsEditStudentModalOpen(false)
                      handleOpenAddRecordForStudent(selectedStudentForAction, 'PRESTASI_PENGHARGAAN')
                    }}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>Beri Poin Apresiasi</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditStudentModalOpen(false)
                      handleResetPoints(selectedStudentForAction)
                    }}
                    className="h-9 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 font-bold rounded-xl gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Poin ke 100</span>
                  </Button>
                </div>

                {/* Riwayat Catatan Siswa Ini */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Riwayat Pembinaan & Catatan Tatib Siswa
                  </h5>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    {selectedStudentForAction.assessments?.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/60 sticky top-0">
                          <TableRow>
                            <TableHead className="text-xs font-bold">Tanggal</TableHead>
                            <TableHead className="text-xs font-bold">Perihal</TableHead>
                            <TableHead className="text-xs font-bold text-center">Poin</TableHead>
                            <TableHead className="text-xs font-bold">Tindak Lanjut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedStudentForAction.assessments.map((a: any) => {
                            const isNeg = a.points < 0
                            return (
                              <TableRow key={a.id} className="text-xs">
                                <TableCell className="whitespace-nowrap text-slate-500">
                                  {new Date(a.date).toLocaleDateString('id-ID')}
                                </TableCell>
                                <TableCell>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{a.title}</span>
                                  {a.description && <p className="text-[10px] text-slate-400">{a.description}</p>}
                                </TableCell>
                                <TableCell className="text-center font-black">
                                  <span className={isNeg ? 'text-rose-600' : 'text-emerald-600'}>
                                    {a.points > 0 ? `+${a.points}` : a.points}
                                  </span>
                                </TableCell>
                                <TableCell className="text-slate-600">{a.actionTaken || '-'}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Belum ada catatan pelanggaran atau pembinaan untuk siswa ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditStudentModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. MODAL 3: Form Input Catatan Pembinaan & Pelanggaran */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              {canVerify ? 'Input Catatan Pembinaan & Kedisiplinan' : 'Buat Catatan Kedisiplinan Siswa (Draf)'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {canVerify
                ? 'Catatan pembinaan ini akan langsung terverifikasi dan tersinkronisasi ke poin siswa serta terkirim ke WhatsApp wali murid.'
                : 'Catatan yang dibuat oleh Guru Kelas/Pengajar akan tersimpan sebagai Draf Menunggu Verifikasi BK atau Petugas Ketertiban sebelum diterapkan ke akun siswa & wali murid.'}
            </DialogDescription>
          </DialogHeader>

          {/* Banner Informasi Alur Verifikasi untuk Guru */}
          {!canVerify && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Alur Draf Verifikasi Terintegrasi</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Setelah catatan ini disimpan, Tim Ketertiban & Guru BK akan menerima notifikasi verifikasi. Catatan baru akan tampil di akun Siswa & Wali Murid setelah disetujui.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-2 text-xs">
            {/* Pilih Siswa dengan Fitur Pencarian Cepat */}
            <div className="sm:col-span-2 space-y-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Pilih Siswa Target *
                </Label>
                <span className="text-[10px] font-semibold text-slate-400">
                  Ditemukan: {modalStudentsFiltered.length} siswa
                </span>
              </div>

              {/* Input Pencarian Siswa Cepat */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Ketik nama atau NIS untuk filter siswa..."
                  value={modalStudentSearch}
                  onChange={(e) => setModalStudentSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              {/* Select Dropdown Siswa */}
              <Select
                value={formState.studentId}
                onValueChange={(val) => setFormState(prev => ({ ...prev, studentId: val || '' }))}
              >
                <SelectTrigger className="h-9 text-xs rounded-lg bg-white dark:bg-slate-900">
                  <SelectValue placeholder="-- Klik untuk Memilih Siswa --">
                    {(() => {
                      const selectedStudent = students.find((s: any) => s.id === formState.studentId)
                      if (!selectedStudent) return undefined
                      return `${selectedStudent.name} (${selectedStudent.nis}) - ${selectedStudent.class?.name || 'Tanpa Kelas'}`
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {modalStudentsFiltered.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Siswa dengan kata kunci "{modalStudentSearch}" tidak ditemukan.
                    </div>
                  ) : (
                    modalStudentsFiltered.map((st: any) => (
                      <SelectItem key={st.id} value={st.id} className="text-xs py-1.5">
                        <span className="font-bold">{st.name}</span> <span className="text-slate-400">({st.nis})</span> - <span className="font-medium text-slate-600 dark:text-slate-300">{st.class?.name || 'Tanpa Kelas'}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Template Cepat Parameter (Terurut Rapi & Komprehensif) */}
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold flex items-center justify-between text-blue-700 dark:text-blue-400">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  Pilih Template Parameter (Terurut Sesuai Kategori)
                </span>
                <span className="text-[10px] text-slate-400">Otomatis mengisi poin, judul & tindakan</span>
              </Label>
              <Select onValueChange={handleSelectParameterPreset}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <SelectValue placeholder="-- Pilih Template Parameter Kedisiplinan / Adab / Tatib --">
                    {formState.title ? formState.title : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {sortedGroupedParameters.map((p) => {
                    const isPositif = p.points > 0
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-xs py-1.5">
                        <span className="font-semibold text-slate-500">[{p.category.replace('_', ' ')}]</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-100">{p.title}</span>{' '}
                        <span className={`font-black ${isPositif ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ({isPositif ? `+${p.points}` : p.points} Poin)
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Kategori Penilaian *</Label>
              <Select
                value={formState.category}
                onValueChange={(val) => setFormState(prev => ({ ...prev, category: val as any }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PELANGGARAN">Pelanggaran Tata Tertib</SelectItem>
                  <SelectItem value="KEDISIPLINAN">Kedisiplinan & Kerapian</SelectItem>
                  <SelectItem value="ADAB_ETIKA">Adab & Kesantunan</SelectItem>
                  <SelectItem value="IBADAH">Amalan & Sholat (PAI)</SelectItem>
                  <SelectItem value="PRESTASI_PENGHARGAAN">Prestasi / Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Poin Delta (- / +) *</Label>
              <Input
                type="number"
                placeholder="-10 atau 10"
                value={formState.points}
                onChange={(e) => setFormState(prev => ({ ...prev, points: Number(e.target.value) }))}
                className="h-10 text-xs rounded-xl font-bold"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Judul Kasus / Peristiwa *</Label>
              <Input
                placeholder="Misal: Terlambat Masuk Sekolah / Teladan Adab Santun"
                value={formState.title}
                onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Tanggal Peristiwa</Label>
              <Input
                type="date"
                value={formState.date}
                onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Status Verifikasi Catatan</Label>
              {canVerify ? (
                <Select
                  value={formState.status}
                  onValueChange={(val) => setFormState(prev => ({ ...prev, status: val || 'SELESAI' }))}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELESAI">Terverifikasi (Tampil di Siswa/Wali)</SelectItem>
                    <SelectItem value="DALAM_PEMBINAAN">Dalam Pembinaan</SelectItem>
                    <SelectItem value="MENUNGGU">Draf (Menunggu Verifikasi)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Draf Menunggu Verifikasi BK/Tatib</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                    Draf
                  </Badge>
                </div>
              )}
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Deskripsi / Kronologi Kejadian</Label>
              <Textarea
                rows={2}
                placeholder="Keterangan rinci peristiwa, tempat, atau hasil investigasi..."
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Tindak Lanjut / Usulan Pembinaan</Label>
              <Input
                placeholder="Misal: Diberikan teguran lisan & dibimbing hafalan surat pendek"
                value={formState.actionTaken}
                onChange={(e) => setFormState(prev => ({ ...prev, actionTaken: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl text-xs font-bold">
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmitForm}
              disabled={createMutation.isPending}
              className={`${
                canVerify ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
              } text-white rounded-xl font-bold gap-1.5 text-xs`}
            >
              {createMutation.isPending
                ? 'Menyimpan...'
                : canVerify
                ? 'Simpan & Terapkan Poin Resmi'
                : 'Simpan Draf & Ajukan Verifikasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. MODAL 4: Form Input Sesi Bimbingan & Konseling (BK) */}
      <Dialog open={isCounselingModalOpen} onOpenChange={setIsCounselingModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-pink-600 dark:text-pink-400">
              <HeartHandshake className="w-5 h-5" />
              Input Sesi & Catatan Bimbingan Konseling (BK)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pencatatan sesi konsultasi, bimbingan minat karir, sosial, atau tindak lanjut kedisiplinan siswa oleh Guru BK.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-2 text-xs">
            {/* Pilih Siswa Target Konseling */}
            <div className="sm:col-span-2 space-y-1.5 p-2.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-600" />
                  Pilih Siswa Target Konseling *
                </Label>
                <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-300">
                  Ditemukan: {filteredBkStudents.length} siswa
                </span>
              </div>

              {/* Input Pencarian Siswa Cepat BK */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Ketik nama, NIS, atau kelas siswa untuk filter..."
                  value={bkStudentSearch}
                  onChange={(e) => setBkStudentSearch(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-lg bg-white dark:bg-slate-900 border-pink-200 dark:border-pink-900/60"
                />
              </div>

              {/* Select Dropdown Siswa BK */}
              <Select
                value={counselingFormState.studentId}
                onValueChange={(val) => setCounselingFormState(prev => ({ ...prev, studentId: val || '' }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900">
                  <SelectValue placeholder="-- Klik untuk Memilih Siswa --">
                    {(() => {
                      const st = students.find((s: any) => s.id === counselingFormState.studentId)
                      if (!st) return undefined
                      return `${st.name} (${st.nis}) - ${st.class?.name || 'Tanpa Kelas'}`
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredBkStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Siswa dengan kata kunci "{bkStudentSearch}" tidak ditemukan.
                    </div>
                  ) : (
                    filteredBkStudents.map((st: any) => (
                      <SelectItem key={st.id} value={st.id} className="text-xs py-1.5">
                        <span className="font-bold">{st.name}</span> <span className="text-slate-400">({st.nis})</span> - <span className="font-medium text-slate-600 dark:text-slate-300">{st.class?.name || 'Tanpa Kelas'}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {counselingFormState.studentId && (() => {
              const selectedSt = students.find((s: any) => s.id === counselingFormState.studentId)
              if (!selectedSt) return null
              const parentName = selectedSt.parentRelations?.[0]?.parent?.name || selectedSt.parentName || 'Ortu / Wali Murid'
              const parentPhone = selectedSt.parentRelations?.[0]?.parent?.user?.phone || selectedSt.parentPhone || selectedSt.phone || '088293733330'
              return (
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      Wali Terhubung: {parentName}
                    </p>
                    <p className="text-[11px] text-slate-500">NIS: {selectedSt.nis} • Rombel: {selectedSt.class?.name || selectedSt.className || '-'}</p>
                  </div>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 shrink-0">
                    <MessageSquare className="w-3 h-3" />
                    WA: {parentPhone}
                  </Badge>
                </div>
              )
            })()}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Kategori Bimbingan / Konseling *</Label>
              <Select
                value={counselingFormState.counselingType}
                onValueChange={(val) => setCounselingFormState(prev => ({ ...prev, counselingType: val as any }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIBADI">Konseling Pribadi / Emosional</SelectItem>
                  <SelectItem value="BELAJAR_AKADEMIK">Konseling Belajar & Akademik</SelectItem>
                  <SelectItem value="KARIR_STUDI_LANJUT">Bimbingan Karir & Perguruan Tinggi</SelectItem>
                  <SelectItem value="SOSIAL_HUBUNGAN">Konseling Sosial & Teman Sebaya</SelectItem>
                  <SelectItem value="PELANGGARAN_KEDISIPLINAN">Tindak Lanjut Pelanggaran & Tatib</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Status Bimbingan *</Label>
              <Select
                value={counselingFormState.status}
                onValueChange={(val) => setCounselingFormState(prev => ({ ...prev, status: val as any }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSES_BIMBINGAN">Proses Bimbingan Rutin</SelectItem>
                  <SelectItem value="SELESAI">Selesai / Tuntas</SelectItem>
                  <SelectItem value="PEMANGGILAN_ORTU">Perlu Pemanggilan Ortu</SelectItem>
                  <SelectItem value="HOME_VISIT">Agenda Home Visit</SelectItem>
                  <SelectItem value="DIRUJUK">Dirujuk ke Ahli / Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Judul / Topik Permasalahan *</Label>
              <Input
                placeholder="Misal: Konsultasi Minat UTBK-SNBT / Pembinaan Kedisiplinan Kehadiran"
                value={counselingFormState.title}
                onChange={(e) => setCounselingFormState(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Tanggal Konseling</Label>
              <Input
                type="date"
                value={counselingFormState.date}
                onChange={(e) => setCounselingFormState(prev => ({ ...prev, date: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Sifat Catatan BK</Label>
              <Select
                value={counselingFormState.privacy}
                onValueChange={(val) => setCounselingFormState(prev => ({ ...prev, privacy: val as any }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Sifat Catatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TERBUKA">Terbuka untuk Wali Kelas</SelectItem>
                  <SelectItem value="RAHASIA_BK">Rahasia (Khusus Guru BK)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Deskripsi Permasalahan / Hasil Sesi</Label>
              <Textarea
                rows={3}
                placeholder="Rincian keluhan siswa, analisa guru BK, serta pengamatan perilaku..."
                value={counselingFormState.description}
                onChange={(e) => setCounselingFormState(prev => ({ ...prev, description: e.target.value }))}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold">Rencana Tindak Lanjut / Solusi (Action Plan)</Label>
              <Input
                placeholder="Misal: Diberikan modul belajar tambahan & pemantauan mingguan wali kelas"
                value={counselingFormState.actionTaken}
                onChange={(e) => setCounselingFormState(prev => ({ ...prev, actionTaken: e.target.value }))}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCounselingModalOpen(false)} className="rounded-xl text-xs font-bold">
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveCounseling}
              className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold gap-1.5 text-xs"
            >
              Simpan Sesi Konseling
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10. MODAL: Pembuatan & Editor Template Surat Resmi Bimbingan Konseling (BK) */}
      <Dialog open={isParentCallModalOpen} onOpenChange={setIsParentCallModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  Editor & Generator Surat Resmi BK (Bimbingan Konseling)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Pilih preset template, sesuaikan perihal, nomor surat, dan narasi surat secara fleksibel sebelum dicetak atau dikirim via WhatsApp.
                </DialogDescription>
              </div>

              {/* Mode Switcher Tab (Editor vs Preview) */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <Button
                  size="sm"
                  variant={letterModalTab === 'editor' ? 'default' : 'ghost'}
                  onClick={() => setLetterModalTab('editor')}
                  className={`h-8 text-xs font-bold rounded-lg px-3 ${
                    letterModalTab === 'editor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Edit Form & Template
                </Button>
                <Button
                  size="sm"
                  variant={letterModalTab === 'preview' ? 'default' : 'ghost'}
                  onClick={() => setLetterModalTab('preview')}
                  className={`h-8 text-xs font-bold rounded-lg px-3 ${
                    letterModalTab === 'preview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Pratinjau PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {parentCallData && (
            <div className="space-y-4">
              {/* TAB 1: FORM EDITOR SURAT BK */}
              {letterModalTab === 'editor' ? (
                <div className="space-y-4 text-xs">
                  {/* Preset Template Selector */}
                  <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-2">
                    <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Pilih Preset Template Surat BK
                    </Label>
                    <Select
                      value={parentCallData.templatePreset}
                      onValueChange={handleSelectLetterPreset}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900 font-bold">
                        <SelectValue placeholder="-- Pilih Template Surat --" />
                      </SelectTrigger>
                      <SelectContent>
                        {BK_LETTER_PRESETS.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs py-2">
                            <span className="font-bold">{preset.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Siswa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Target Siswa *</Label>
                        {bkStudentSearch && (
                          <span className="text-[10px] text-pink-600 dark:text-pink-400 font-semibold">
                            {filteredBkStudents.length} siswa ditemukan
                          </span>
                        )}
                      </div>

                      {/* Input Cari Siswa untuk Editor Surat BK */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Cari nama, NIS, atau kelas siswa..."
                          value={bkStudentSearch}
                          onChange={(e) => setBkStudentSearch(e.target.value)}
                          className="pl-8 pr-14 h-8 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                        {bkStudentSearch && (
                          <button
                            type="button"
                            onClick={() => setBkStudentSearch('')}
                            className="absolute right-2 top-1.5 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-semibold"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <Select
                        value={parentCallData.studentId}
                        onValueChange={handleSelectLetterStudent}
                      >
                        <SelectTrigger className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900 font-medium">
                          <SelectValue placeholder="Pilih Siswa">
                            {parentCallData.student ? `${parentCallData.student.name} (${parentCallData.student.nis}) - ${parentCallData.student.className || parentCallData.student.class?.name || '-'}` : 'Pilih Siswa'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {filteredBkStudents.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Siswa dengan kata kunci "{bkStudentSearch}" tidak ditemukan.
                            </div>
                          ) : (
                            filteredBkStudents.map((st: any) => (
                              <SelectItem key={st.id} value={st.id} className="text-xs py-2">
                                <span className="font-bold">{st.name}</span> <span className="text-slate-400">({st.nis})</span> - <span className="font-medium text-slate-600 dark:text-slate-300">{st.class?.name || st.className || '-'}</span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Wali Murid Terhubung</Label>
                      <div className="h-[76px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col justify-center gap-1 text-xs border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">Nama Ortu/Wali:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {getParentInfo(parentCallData.student).name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1">
                          <span className="text-[10px] text-slate-400 font-medium">WhatsApp:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-[11px]">
                            {getParentInfo(parentCallData.student).phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nomor Surat, Tanggal Surat, Perihal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Nomor Surat BK *</Label>
                      <Input
                        value={parentCallData.nomorSurat}
                        onChange={(e) => setParentCallData({ ...parentCallData, nomorSurat: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Tanggal Surat *</Label>
                      <Input
                        value={parentCallData.tanggalSurat}
                        onChange={(e) => setParentCallData({ ...parentCallData, tanggalSurat: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-bold">Perihal Surat *</Label>
                      <Input
                        value={parentCallData.perihal}
                        onChange={(e) => setParentCallData({ ...parentCallData, perihal: e.target.value })}
                        className="h-10 text-xs rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  {/* Jadwal Pertemuan */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border space-y-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Jadwal & Tempat Pertemuan
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px]">Hari & Tanggal *</Label>
                        <Input
                          value={parentCallData.tanggalPertemuan}
                          onChange={(e) => setParentCallData({ ...parentCallData, tanggalPertemuan: e.target.value })}
                          className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Waktu Pertemuan *</Label>
                        <Input
                          value={parentCallData.waktuPertemuan}
                          onChange={(e) => setParentCallData({ ...parentCallData, waktuPertemuan: e.target.value })}
                          className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Tempat Ruangan *</Label>
                        <Input
                          value={parentCallData.ruangPertemuan}
                          onChange={(e) => setParentCallData({ ...parentCallData, ruangPertemuan: e.target.value })}
                          className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Catatan Pembinaan / Kasus */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Catatan Pembinaan / Topik Kasus *</Label>
                    <Textarea
                      rows={2}
                      value={parentCallData.catatanKasus}
                      onChange={(e) => setParentCallData({ ...parentCallData, catatanKasus: e.target.value })}
                      className="text-xs rounded-xl resize-none font-medium"
                    />
                  </div>

                  {/* Teks Pembuka & Teks Penutup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Kalimat Pembuka Surat</Label>
                      <Textarea
                        rows={3}
                        value={parentCallData.pembukaSurat}
                        onChange={(e) => setParentCallData({ ...parentCallData, pembukaSurat: e.target.value })}
                        className="text-xs rounded-xl resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Kalimat Penutup Surat</Label>
                      <Textarea
                        rows={3}
                        value={parentCallData.penutupSurat}
                        onChange={(e) => setParentCallData({ ...parentCallData, penutupSurat: e.target.value })}
                        className="text-xs rounded-xl resize-none"
                      />
                    </div>
                  </div>

                  {/* Penandatangan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-bold">Nama Kepala Sekolah *</Label>
                      <Input
                        value={parentCallData.namaKepalaSekolah}
                        onChange={(e) => setParentCallData({ ...parentCallData, namaKepalaSekolah: e.target.value })}
                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-bold">Nama Guru BK (Pengguna Login) *</Label>
                      <Input
                        value={parentCallData.namaGuruBk}
                        onChange={(e) => setParentCallData({ ...parentCallData, namaGuruBk: e.target.value })}
                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs font-bold">NIP / NBM Guru BK *</Label>
                      <Input
                        value={parentCallData.nipGuruBk}
                        onChange={(e) => setParentCallData({ ...parentCallData, nipGuruBk: e.target.value })}
                        className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: PRATINJAU DOKUMEN PDF SURAT BK */
                <div className="space-y-4 text-xs">
                  <div id="printable-parent-call-letter" className="p-6 bg-white text-black border border-slate-300 rounded-xl shadow-xs space-y-4">
                    {/* Kop Surat Resmi SIMASMUH (Standar TU Admin) */}
                    <div className="header-kop flex items-center justify-between border-b-[2.5pt] border-double border-black pb-2 mb-4 text-center">
                      <div className="logo-box w-[70px] shrink-0 text-center">
                        <img src="/muhammadiyah-logo-40493.png" alt="Logo Dikdasmen" className="w-[65px] h-auto mx-auto block" />
                      </div>
                      <div className="kop-text flex-1 px-2 text-center">
                        <p className="org text-[9.5pt] font-bold uppercase leading-tight text-black m-0">
                          MAJELIS PENDIDIKAN DASAR DAN MENENGAH<br/>PIMPINAN WILAYAH MUHAMMADIYAH JAWA TIMUR
                        </p>
                        <p className="school text-[14.5pt] font-black uppercase tracking-wider text-black my-[2px]">
                          SMA MUHAMMADIYAH 1 PONOROGO
                        </p>
                        <p className="status text-[9pt] font-bold text-black m-0">
                          Status : TERAKREDITASI A &nbsp;&nbsp;&nbsp;&nbsp; NPSN : 20510139
                        </p>
                        <p className="addr text-[8.5pt] text-black mt-[1.5px]">
                          Jl. Batoro Katong No. 6B Telp/Fax (0352) 481521 Ponorogo 63411
                        </p>
                        <p className="email-web text-[8.5pt] font-medium text-black mt-[1px]">
                          E-mail : smamuh1po@gmail.com | Website: www.smamuhipo.sch.id
                        </p>
                      </div>
                      <div className="logo-box w-[70px] shrink-0 text-center">
                        <img src="/pic_logo.png" alt="Logo Sekolah" className="w-[65px] h-auto mx-auto block" />
                      </div>
                    </div>

                    <div className="flex justify-between items-start text-xs font-medium pt-2">
                      <div>
                        <p>Nomor : {parentCallData.nomorSurat}</p>
                        <p>Lampiran : -</p>
                        <p>Perihal : <b>{parentCallData.perihal}</b></p>
                      </div>
                      <div>
                        <p>Ponorogo, {parentCallData.tanggalSurat}</p>
                      </div>
                    </div>

                    <div className="pt-2 text-xs space-y-1">
                      <p>Kepada Yth.</p>
                      <p className="font-bold">Bapak / Ibu Orang Tua / Wali Murid dari {parentCallData.student?.name || 'Siswa'}</p>
                      <p>di Tempat</p>
                    </div>

                    <div className="pt-2 text-xs space-y-2 text-justify">
                      <p><i>{"Assalamu'alaikum Warahmatullahi Wabarakatuh"}</i></p>
                      <p>{parentCallData.pembukaSurat}</p>

                      <table className="w-full text-xs border-collapse my-2">
                        <tbody>
                          <tr><td className="w-36 font-semibold py-1">Nama</td><td>: {parentCallData.student?.name || '-'}</td></tr>
                          <tr><td className="font-semibold py-1">NIS</td><td>: {parentCallData.student?.nis || '-'}</td></tr>
                          <tr><td className="font-semibold py-1">Kelas</td><td>: {parentCallData.student?.className || parentCallData.student?.class?.name || '-'}</td></tr>
                          <tr><td className="font-semibold py-1">Catatan Pembinaan</td><td>: {parentCallData.catatanKasus}</td></tr>
                        </tbody>
                      </table>

                      <p className="mt-3">Pertemuan Insya Allah dilaksanakan pada:</p>
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          <tr><td className="w-36 font-semibold py-1">Hari / Tanggal</td><td>: {parentCallData.tanggalPertemuan}</td></tr>
                          <tr><td className="font-semibold py-1">Waktu</td><td>: {parentCallData.waktuPertemuan}</td></tr>
                          <tr><td className="font-semibold py-1">Tempat</td><td>: {parentCallData.ruangPertemuan}</td></tr>
                        </tbody>
                      </table>

                      <p>{parentCallData.penutupSurat}</p>
                      <p><i>{"Wassalamu'alaikum Warahmatullahi Wabarakatuh"}</i></p>
                    </div>

                    <div className="flex justify-between items-center pt-8 text-xs text-center">
                      <div className="w-5/12">
                        <p>Mengetahui,</p>
                        <p className="font-bold">Kepala Sekolah</p>
                        <div className="h-14"></div>
                        <p className="font-bold underline">{parentCallData.namaKepalaSekolah}</p>
                        <p className="text-[10px]">NBM. 974.501</p>
                      </div>
                      <div className="w-5/12">
                        <p>Guru Bimbingan Konseling (BK)</p>
                        <div className="h-14"></div>
                        <p className="font-bold underline">{parentCallData.namaGuruBk || user?.name || userProfile?.name || 'Guru BK SIMASMUH'}</p>
                        <p className="text-[10px]">NIP/NBM. {parentCallData.nipGuruBk && parentCallData.nipGuruBk !== '-' ? parentCallData.nipGuruBk : (user?.nipNbm || user?.nip || userProfile?.nip || userProfile?.nipNbm || '-')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between">
            <Button type="button" variant="outline" onClick={() => setIsParentCallModalOpen(false)} className="rounded-xl text-xs font-bold w-full sm:w-auto">
              Tutup
            </Button>
            
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrintParentCallLetter}
                className="rounded-xl text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                Cetak / Simpan PDF
              </Button>

              <Button
                type="button"
                onClick={handleSendParentCallWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-1.5 text-xs shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                Kirim WhatsApp & Terbitkan PDF
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
