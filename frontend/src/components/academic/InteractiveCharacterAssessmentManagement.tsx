'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ShieldAlert, ShieldCheck, HeartHandshake, PlusCircle, Search, 
  Trash2, FileText, CheckCircle2, AlertTriangle, BookOpen, 
  Sparkles, Award, User, Clock, ArrowRight, Download, Filter,
  Phone, Users, Settings2, RotateCcw, Edit3, Eye, Sliders, Check,
  X, AlertCircle, RefreshCw
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

// Parameter Bawaan Standar SIMASMUH (Terstruktur & Komprehensif)
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

  // --- PELANGGARAN TATA TERTIB SEKOLAH ---
  { id: 'param-pel-1', category: 'PELANGGARAN', title: 'Terlambat Masuk Sekolah (>15 Menit)', points: -5, type: 'NEGATIF', description: 'Datang melewati batas bel masuk sekolah', defaultAction: 'Teguran lisan & piket kebersihan' },
  { id: 'param-pel-2', category: 'PELANGGARAN', title: 'Seragam Tidak Lengkap / Atribut Kurang', points: -5, type: 'NEGATIF', description: 'Tidak mengenakan dasi/kaos kaki/sepatu hitam/sabuk', defaultAction: 'Pencatatan tatib & penertiban' },
  { id: 'param-pel-3', category: 'PELANGGARAN', title: 'Rambut Tidak Rapi / Melewati Kerah (Putra)', points: -10, type: 'NEGATIF', description: 'Panjang rambut tidak sesuai standar ketentuan sekolah', defaultAction: 'Pembinaan tatib & batas potong rambut 3 hari' },
  { id: 'param-pel-4', category: 'PELANGGARAN', title: 'Membawa HP / Menggunakan Gadget Tanpa Izin KBM', points: -10, type: 'NEGATIF', description: 'Bermain game / sosmed saat jam pelajaran berlangsung', defaultAction: 'HP diamankan tatib s/d jam pulang' },
  { id: 'param-pel-5', category: 'PELANGGARAN', title: 'Meninggalkan Kelas / Sekolah Tanpa Izin (Membolos)', points: -20, type: 'NEGATIF', description: 'Keluar gerbang/kelas saat jam KBM tanpa surat izin', defaultAction: 'Panggilan wali murid & pembinaan BK' },
  { id: 'param-pel-6', category: 'PELANGGARAN', title: 'Tidak Mengikuti Sholat Berjamaah / Kabur saat Ibadah', points: -15, type: 'NEGATIF', description: 'Tidak menuju masjid saat panggilan sholat berkumandang', defaultAction: 'Bimbingan ibadah & pembinaan tatib' },
  { id: 'param-pel-7', category: 'PELANGGARAN', title: 'Berkelahi / Melakukan Intimidasi / Bullying', points: -50, type: 'NEGATIF', description: 'Melakukan tindakan kekerasan fisik/verbal terhadap sesama siswa', defaultAction: 'Surat Peringatan & panggilan orang tua' },
  { id: 'param-pel-8', category: 'PELANGGARAN', title: 'Merokok / Vape di Lingkungan Sekolah', points: -50, type: 'NEGATIF', description: 'Membawa/menghisap rokok atau rokok elektrik', defaultAction: 'Surat Peringatan (SP 1) & pemanggilan orang tua' },
]

export function InteractiveCharacterAssessmentManagement({ defaultCategory = 'ALL' }: { defaultCategory?: string }) {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const queryClient = useQueryClient()

  // Ambil data profile user untuk menentukan hak akses verifikasi pembinaan
  const { data: userProfile } = useQuery<any>({
    queryKey: ['my-user-profile-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/users/me'),
  })

  const user = userProfile || {}
  const userRoles = [
    user.role,
    user.subRole,
    user.subRole2,
    user.subRole3,
    user.subRole4,
    user.subRole5,
  ].filter(Boolean)

  const isTatib = userRoles.includes('KETERTIBAN')
  const isSuperAdmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_IT') || userRoles.includes('BAU') || userRoles.includes('ADMIN_TU') || userRoles.includes('KEPALA_SEKOLAH')
  const canVerify = isTatib || isSuperAdmin

  // State Tab Utama
  const [activeTab, setActiveTab] = useState<'rekap-siswa' | 'log-catatan' | 'verifikasi-pembinaan'>(
    canVerify ? 'verifikasi-pembinaan' : 'rekap-siswa'
  )

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
      const saved = localStorage.getItem('simasmuh_tatib_parameters_v2')
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
    points: -10,
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
    points: -10,
    date: new Date().toISOString().split('T')[0],
    actionTaken: '',
    status: canVerify ? 'SELESAI' : 'MENUNGGU',
    notifyParent: true,
  })

  // Simpan parameter ke localStorage
  const saveParametersToStorage = (params: TatibParameter[]) => {
    setCustomParams(params)
    if (typeof window !== 'undefined') {
      localStorage.setItem('simasmuh_tatib_parameters_v2', JSON.stringify(params))
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

  // Filter Siswa di dalam Dialog Modal Input (Pencarian Cepat)
  const modalStudentsFiltered = useMemo(() => {
    if (!modalStudentSearch) return students
    const q = modalStudentSearch.toLowerCase()
    return students.filter((st: any) => 
      st.name?.toLowerCase().includes(q) || 
      st.nis?.toLowerCase().includes(q) || 
      st.class?.name?.toLowerCase().includes(q)
    )
  }, [students, modalStudentSearch])

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
      return (
        st.name?.toLowerCase().includes(q) ||
        st.nis?.toLowerCase().includes(q) ||
        st.className?.toLowerCase().includes(q)
      )
    })
  }, [studentsSummary, searchQuery])


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
      {/* 1. Stat Cards Ringkasan */}
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

      {/* 2. Banner Informasi Integrasi Penilaian */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white">
              Panel Penilaian Kedisiplinan Siswa Terintegrasi
            </h4>
            <p className="text-xs text-blue-200/90 mt-0.5">
              Pencatatan pelanggaran & apresiasi terverifikasi langsung ke saldo poin siswa dan notifikasi wali murid.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canVerify && (
            <Button
              onClick={() => setIsParamModalOpen(true)}
              size="sm"
              className="h-9 text-xs gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs"
            >
              <Sliders className="w-4 h-4" />
              <span>Atur Parameter</span>
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
        </div>
      </div>

      {/* 3. Filter & Navigasi Tab */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
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

      {/* 5. Konten Tab: Rekap Skor Siswa */}
      {activeTab === 'rekap-siswa' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden rounded-2xl">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Daftar Siswa, Skor Ketertiban & Skor Adab
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Skor awal siswa 100. Poin diterapkan resmi setelah diverifikasi oleh Bagian Ketertiban.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-bold text-xs">
              Total: {filteredStudentsSummary.length} Siswa
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                    <TableHead className="text-xs font-bold text-center">Skor Ketertiban</TableHead>
                    <TableHead className="text-xs font-bold text-center">Skor Adab</TableHead>
                    <TableHead className="text-xs font-bold text-center">Pelanggaran</TableHead>
                    <TableHead className="text-xs font-bold text-center">Prestasi / Teladan</TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    <TableHead className="w-48 text-center text-xs font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSummary ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Memuat data skor...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudentsSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                        Tidak ada data siswa ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudentsSummary.map((st: any, idx: number) => {
                      const isLowScore = st.ketertibanScore < 75
                      const isMediumScore = st.ketertibanScore >= 75 && st.ketertibanScore < 90

                      return (
                        <TableRow key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs">
                          <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                            <div className="text-[11px] text-slate-400">
                              NIS: {st.nis} • Kelas: <span className="font-semibold text-slate-600 dark:text-slate-300">{st.className}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              <span className={`font-black text-sm ${
                                isLowScore ? 'text-rose-600' : isMediumScore ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {st.ketertibanScore}
                              </span>
                              <span className="text-[10px] text-slate-400">/ 100</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                              <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                                {st.adabScore}
                              </span>
                              <span className="text-[10px] text-blue-400">/ 100</span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            {st.totalPelanggaran > 0 ? (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                                {st.totalPelanggaran} Kasus
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {st.totalPrestasi > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                                +{st.totalPrestasi} Apresiasi
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </TableCell>

                          {/* Status Pembinaan */}
                          <TableCell className="text-center">
                            {st.pendingVerificationCount > 0 ? (
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
                            )}
                          </TableCell>

                          {/* Aksi */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditStudent(st)}
                                className="h-8 px-2 text-[11px] font-bold rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 gap-1"
                                title="Lihat Rekam Jejak & Edit Poin"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{canVerify ? 'Kelola / Catat' : 'Beri Poin'}</span>
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
                      points: isPelanggaran ? -10 : 10,
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
              Input Catatan Pembinaan, Adab & Pelanggaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pemberian poin ini akan langsung tersinkronisasi ke skor ketertiban siswa dan terkirim ke WhatsApp orang tua/wali.
            </DialogDescription>
          </DialogHeader>

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
              <Label className="text-xs font-bold">Status Pembinaan</Label>
              <Select
                value={formState.status}
                onValueChange={(val) => setFormState(prev => ({ ...prev, status: val || 'SELESAI' }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELESAI">Selesai / Tuntas</SelectItem>
                  <SelectItem value="DALAM_PEMBINAAN">Dalam Pembinaan</SelectItem>
                  <SelectItem value="MENUNGGU">Menunggu Bimbingan</SelectItem>
                </SelectContent>
              </Select>
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
              <Label className="text-xs font-bold">Tindak Lanjut / Bentuk Pembinaan</Label>
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
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold gap-1.5 text-xs"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan & Kirim Notifikasi WA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
