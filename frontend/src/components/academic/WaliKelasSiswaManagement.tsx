'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSession } from 'next-auth/react'
import { 
  Users, 
  ClipboardCheck, 
  UserCheck, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Download, 
  BookOpen, 
  Calendar, 
  ScanFace, 
  FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

interface ClassSummaryItem {
  studentId: string
  userId: string
  nis: string
  nisn: string
  name: string
  gender: string
  program?: string | null
  statusHariIni: string
  checkInHariIni: string
  checkOutHariIni: string
  keteranganHariIni: string
  summary: {
    hadir: number
    izin: number
    terlambat: number
  }
  logs: {
    date: string
    time: string
    checkIn?: string
    checkOut?: string
    status: string
  }[]
  izins: {
    id: string
    date: string
    alasan: string
    waktu: string
    status: string
  }[]
}

export function WaliKelasSiswaManagement({ 
  homeroomClass, 
  initialTab = 'siswa',
  customTitle,
  customDescription
}: { 
  homeroomClass?: any; 
  initialTab?: 'siswa' | 'presensi' | 'izin_dispensasi';
  customTitle?: string;
  customDescription?: string;
}) {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id

  // State Tabs
  const [activeTab, setActiveTab] = useState<'siswa' | 'presensi' | 'izin_dispensasi'>(initialTab)
  const [izinSubFilter, setIzinSubFilter] = useState<'ALL' | 'IZIN' | 'DISPENSASI'>('ALL')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')

  // State Dialog Buat Izin / Dispensasi
  const [izinModalOpen, setIzinModalOpen] = useState(false)
  const [izinSubmitting, setIzinSubmitting] = useState(false)
  const [izinForm, setIzinForm] = useState({
    targetUserId: '',
    date: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    tipeIzin: 'SAKIT' as 'SAKIT' | 'KELUARGA' | 'DISPENSASI',
    alasan: '',
    lampiranBase64: '',
    lampiranFileName: '',
  })

  // State Dialog Verifikasi Izin
  const [verifyModal, setVerifyModal] = useState<{
    open: boolean
    type: 'APPROVE' | 'REJECT'
    izin: any | null
    catatan: string
    loading: boolean
  }>({
    open: false,
    type: 'APPROVE',
    izin: null,
    catatan: '',
    loading: false,
  })

  // State Modal Detail Log Siswa
  const [detailStudent, setDetailStudent] = useState<ClassSummaryItem | null>(null)

  // 1. Fetch Daftar Kelas jika props belum ada atau untuk cek multi-kelas
  const { data: classesData = [] } = useQuery<any[]>({
    queryKey: ['classes-for-wali-kelas'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Temukan semua kelas yang diwalikan oleh user saat ini
  const myClasses = useMemo(() => {
    const fromApi = classesData.filter(
      (c: any) => 
        c.homeroomTeacher?.userId === userId || 
        c.homeroomTeacher?.user?.id === userId || 
        c.homeroomTeacherId === user?.teacherId ||
        c.homeroomTeacherId === user?.teacherProfile?.id ||
        (c.homeroomTeacher?.user?.email && user?.email && c.homeroomTeacher?.user?.email === user?.email) ||
        (c.homeroomTeacher?.user?.name && user?.name && c.homeroomTeacher?.user?.name.trim().toLowerCase() === user?.name.trim().toLowerCase())
    )
    if (fromApi.length > 0) return fromApi
    if (homeroomClass) return [homeroomClass]
    return []
  }, [classesData, userId, user?.teacherId, user?.teacherProfile?.id, user?.email, user?.name, homeroomClass])

  // State Pilihan Kelas (jika wali kelas memiliki lebih dari satu kelas)
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  const effectiveClass = useMemo(() => {
    if (selectedClassId) {
      const found = myClasses.find((c: any) => c.id === selectedClassId)
      if (found) return found
    }
    if (myClasses.length > 0) return myClasses[0]
    return homeroomClass || null
  }, [selectedClassId, myClasses, homeroomClass])

  const classId = effectiveClass?.id

  // 2. Fetch Data Siswa & Presensi Realtime Kelas
  const { data: classSummary = [], isLoading: loadingSummary, refetch: refetchSummary } = useQuery<ClassSummaryItem[]>({
    queryKey: ['class-attendance-summary', classId, period, targetDate],
    queryFn: async () => {
      if (!classId) return []
      const res = await authenticatedFetch(
        `/api-backend/daily-attendances/class-summary?classId=${classId}&period=${period}&date=${targetDate}`
      )
      if (!res.ok) throw new Error('Gagal memuat log presensi kelas')
      return res.json()
    },
    enabled: !!classId,
    refetchInterval: 30000,
  })

  // 3. Fetch Izin & Dispensasi Siswa Khusus Kelas Ini
  const { data: classIzinList = [], isLoading: loadingIzin, refetch: refetchIzin } = useQuery<any[]>({
    queryKey: ['class-izin-list', classId],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/izin-keluar?category=SISWA')
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      if (!effectiveClass) return data
      return data.filter((i: any) => i.user?.student?.class?.name === effectiveClass.name || i.user?.student?.classId === effectiveClass.id)
    },
    enabled: !!classId,
    refetchInterval: 30000,
  })

  // Filter Data Siswa
  const filteredStudents = useMemo(() => {
    return filterDataBySearch(classSummary, searchQuery, ['name', 'nis', 'nisn', 'statusHariIni', 'keteranganHariIni'])
  }, [classSummary, searchQuery])

  // Filter Data Izin & Dispensasi
  const filteredIzin = useMemo(() => {
    let list = classIzinList
    if (izinSubFilter === 'IZIN') {
      list = list.filter(i => !i.alasan?.toUpperCase().includes('DISPENSASI'))
    } else if (izinSubFilter === 'DISPENSASI') {
      list = list.filter(i => i.alasan?.toUpperCase().includes('DISPENSASI'))
    }
    return filterDataBySearch(list, searchQuery, ['user.name', 'user.student.name', 'user.student.nis', 'alasan', 'status'])
  }, [classIzinList, izinSubFilter, searchQuery])

  // Hitung Metrik Hari Ini
  const metrics = useMemo(() => {
    const total = classSummary.length
    const hadir = classSummary.filter(s => s.statusHariIni === 'HADIR').length
    const izin = classSummary.filter(s => s.statusHariIni === 'IZIN').length
    const belumHadir = total - hadir - izin
    const persentaseHadir = total > 0 ? Math.round((hadir / total) * 100) : 0
    const pendingIzinCount = classIzinList.filter((i: any) => i.status === 'MENUNGGU').length
    return { total, hadir, izin, belumHadir, persentaseHadir, pendingIzinCount }
  }, [classSummary, classIzinList])

  // Handler Submit Buat Izin / Dispensasi Siswa oleh Wali Kelas
  const handleCreateIzin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!izinForm.targetUserId || !izinForm.alasan || !izinForm.date) {
      Swal.fire('Form Belum Lengkap', 'Pilih siswa, tanggal, dan isi alasan perizinan!', 'warning')
      return
    }

    setIzinSubmitting(true)
    try {
      let uploadedFileUrl = ''
      if (izinForm.lampiranBase64) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: izinForm.lampiranBase64, folder: 'surat-izin' }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedFileUrl = uploadData.url
        }
      }

      const isMultiDay = izinForm.endDate && izinForm.endDate !== izinForm.date
      const rentangPeriodeText = isMultiDay ? ` (Periode: ${izinForm.date} s/d ${izinForm.endDate})` : ''
      const prefixJenis = `[IZIN ${izinForm.tipeIzin}]${rentangPeriodeText} `

      const payload = {
        date: izinForm.date,
        waktuKeluar: '07:00',
        estimasiKembali: isMultiDay ? `s/d ${izinForm.endDate}` : '15:30',
        alasan: `${prefixJenis}${izinForm.alasan}`,
        lampiranUrl: uploadedFileUrl || undefined,
        tipeIzin: izinForm.tipeIzin,
        targetUserId: izinForm.targetUserId,
      }

      const res = await authenticatedFetch('/api-backend/izin-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Izin / Dispensasi Disimpan',
          text: 'Data izin siswa berhasil dicatat dan disinkronkan ke presensi kelas.',
          timer: 1800,
          showConfirmButton: false,
        })
        setIzinModalOpen(false)
        setIzinForm({
          targetUserId: '',
          date: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          tipeIzin: 'SAKIT',
          alasan: '',
          lampiranBase64: '',
          lampiranFileName: '',
        })
        refetchSummary()
        refetchIzin()
      } else {
        const err = await res.json().catch(() => ({}))
        Swal.fire('Gagal', err.message || 'Gagal menyimpan izin siswa', 'error')
      }
    } catch {
      Swal.fire('Error', 'Terjadi kesalahan sistem saat menyimpan izin', 'error')
    } finally {
      setIzinSubmitting(false)
    }
  }

  // Handler Verifikasi Izin (Approve / Reject)
  const handleVerifyIzin = async () => {
    if (!verifyModal.izin) return
    setVerifyModal(prev => ({ ...prev, loading: true }))
    try {
      const endpoint = verifyModal.type === 'APPROVE'
        ? `/api-backend/izin-keluar/${verifyModal.izin.id}/approve`
        : `/api-backend/izin-keluar/${verifyModal.izin.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catatanAdmin: verifyModal.catatan }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: verifyModal.type === 'APPROVE' ? 'Disetujui' : 'Ditolak',
          text: 'Status verifikasi perizinan siswa berhasil diperbarui.',
          timer: 1500,
          showConfirmButton: false,
        })
        setVerifyModal({ open: false, type: 'APPROVE', izin: null, catatan: '', loading: false })
        refetchSummary()
        refetchIzin()
      } else {
        const err = await res.json().catch(() => ({}))
        Swal.fire('Gagal', err.message || 'Gagal memproses verifikasi', 'error')
      }
    } catch {
      Swal.fire('Error', 'Terjadi kesalahan sistem saat memproses verifikasi', 'error')
    } finally {
      setVerifyModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Export Excel Rekap Presensi Kelas
  const handleExportExcel = () => {
    if (!classSummary || classSummary.length === 0) return

    const exportRows = classSummary.map((s, i) => ({
      'No': i + 1,
      'NIS': s.nis,
      'NISN': s.nisn,
      'Nama Siswa': s.name,
      'L/P': s.gender,
      'Program': s.program || 'Reguler',
      'Status Hari Ini': s.statusHariIni,
      'Jam Masuk': s.checkInHariIni,
      'Jam Pulang': s.checkOutHariIni,
      'Keterangan Hari Ini': s.keteranganHariIni,
      [`Hadir (${period.toUpperCase()})`]: s.summary.hadir,
      [`Izin (${period.toUpperCase()})`]: s.summary.izin,
      [`Terlambat (${period.toUpperCase()})`]: s.summary.terlambat,
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Presensi ${effectiveClass?.name || 'Kelas'}`)
    XLSX.writeFile(wb, `Rekap_Presensi_Kelas_${effectiveClass?.name || 'WaliKelas'}_${period}_${targetDate}.xlsx`)
  }

  return (
    <div className="space-y-4">
      {/* Header Responsif Ringkas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{customTitle || (initialTab === 'presensi' ? 'Presensi Kelas Harian' : 'Manajemen Siswa')}</span>
            </h1>

            {/* Dropdown Pilihan Kelas jika mengampu lebih dari 1 kelas */}
            {myClasses.length > 1 ? (
              <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Pilih Kelas:</span>
                <Select
                  value={effectiveClass?.id || ''}
                  onValueChange={(val) => setSelectedClassId(val)}
                >
                  <SelectTrigger className="h-8 text-xs font-bold bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl px-2.5 min-w-[110px]">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {myClasses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                        Kelas {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                {effectiveClass?.name ? `(${effectiveClass.name})` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {customDescription || `Presensi realtime seluruh siswa & rekap harian ${effectiveClass?.name ? `Kelas ${effectiveClass.name}` : 'kelas Anda'}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 text-xs font-bold h-8 px-3"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Ekspor
          </Button>

          <Button
            size="sm"
            onClick={() => setIzinModalOpen(true)}
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Catat Izin
          </Button>
        </div>
      </div>

      {/* Ringkasan Metrik Kompak (Grid 2 Kolom Mobile, 4 Kolom Tablet/Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Siswa</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Hadir Hari Ini</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.hadir} <span className="text-[11px] font-bold text-slate-400">({metrics.persentaseHadir}%)</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Izin / Sakit</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.izin}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ClipboardCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Belum Absen</p>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.belumHadir}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Navigasi Tab & Kontrol Filter */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <CardHeader className="p-3 sm:p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          {/* Menu Tab Responsif Scrollable */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('siswa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'siswa'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Daftar Siswa ({classSummary.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presensi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'presensi'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ScanFace className="w-3.5 h-3.5" />
                Log Presensi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('izin_dispensasi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'izin_dispensasi'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Izin & Dispensasi
                {metrics.pendingIzinCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {metrics.pendingIzinCount}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-Filter Tab Izin & Dispensasi */}
            {activeTab === 'izin_dispensasi' && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                {(['ALL', 'IZIN', 'DISPENSASI'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setIzinSubFilter(f)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      izinSubFilter === f
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {f === 'ALL' ? 'Semua' : f === 'IZIN' ? 'Izin Siswa' : 'Dispensasi'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kontrol Filter & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'presensi' && (
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        period === p
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="w-full sm:w-64">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari nama / NIS..."
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* TAB 1: DAFTAR SISWA KELAS */}
          {activeTab === 'siswa' && (
            <div>
              {/* Tampilan Desktop & Tablet: Tabel */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="w-[45px] pl-4">No</TableHead>
                      <TableHead>NIS / NISN</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead className="text-center">L/P</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Status Hari Ini</TableHead>
                      <TableHead>Jam Masuk - Pulang</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSummary ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs">Memuat data siswa kelas...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                          Tidak ada data siswa ditemukan.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((std, idx) => (
                        <TableRow key={std.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                          <TableCell className="pl-4 font-medium text-slate-400 text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">{std.nis}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{std.nisn || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {std.name}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-center">{std.gender}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {std.program ? std.program.toUpperCase() : 'REGULER'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {std.statusHariIni === 'HADIR' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Hadir
                              </span>
                            ) : std.statusHariIni === 'IZIN' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <ClipboardCheck className="w-3 h-3" /> Izin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <Clock className="w-3 h-3" /> Belum Hadir
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {std.checkInHariIni !== '-' ? (
                              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                                {std.checkInHariIni} {std.checkOutHariIni !== '-' ? `– ${std.checkOutHariIni}` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailStudent(std)}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold h-7 px-2.5"
                            >
                              Detail Log
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Tampilan Mobile: Card Ringkas Kompak */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {loadingSummary ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    Memuat data siswa...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada siswa ditemukan.
                  </div>
                ) : (
                  filteredStudents.map((std, idx) => (
                    <div key={std.studentId} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{std.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{std.nis}</span>
                            <span>•</span>
                            <span className="font-sans font-semibold text-slate-600 dark:text-slate-300">{std.gender}</span>
                            <span>•</span>
                            <span className="font-sans text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{std.program || 'Reguler'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {std.statusHariIni === 'HADIR' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Hadir
                          </span>
                        ) : std.statusHariIni === 'IZIN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Izin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                            Belum
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailStudent(std)}
                          className="text-indigo-600 text-xs font-bold h-7 px-2"
                        >
                          Log
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LOG PRESENSI REALTIME */}
          {activeTab === 'presensi' && (
            <div>
              {/* Tampilan Desktop & Tablet: Tabel */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="w-[45px] pl-4">No</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>Status Hari Ini</TableHead>
                      <TableHead>Jam Masuk - Pulang</TableHead>
                      <TableHead className="text-center">Hadir ({period.toUpperCase()})</TableHead>
                      <TableHead className="text-center">Izin ({period.toUpperCase()})</TableHead>
                      <TableHead className="text-center">Terlambat</TableHead>
                      <TableHead className="text-right pr-4">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSummary ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs">Memuat log presensi...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-500 text-xs">
                          Tidak ada data presensi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((std, idx) => (
                        <TableRow key={std.studentId} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                          <TableCell className="pl-4 font-medium text-slate-400 text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{std.nis}</TableCell>
                          <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">{std.name}</TableCell>
                          <TableCell>
                            {std.statusHariIni === 'HADIR' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Hadir
                              </span>
                            ) : std.statusHariIni === 'IZIN' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                Izin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                                Belum Hadir
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {std.checkInHariIni !== '-' ? `${std.checkInHariIni} ${std.checkOutHariIni !== '-' ? `– ${std.checkOutHariIni}` : ''}` : '-'}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {std.summary.hadir}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-amber-600 dark:text-amber-400">
                            {std.summary.izin}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-rose-600 dark:text-rose-400">
                            {std.summary.terlambat}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailStudent(std)}
                              className="text-indigo-600 hover:text-indigo-700 text-xs font-bold h-7 px-2.5"
                            >
                              Log
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Tampilan Mobile Presensi */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {loadingSummary ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    Memuat log presensi...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada catatan presensi.
                  </div>
                ) : (
                  filteredStudents.map((std) => (
                    <div key={std.studentId} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{std.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {std.checkInHariIni !== '-' ? `Masuk: ${std.checkInHariIni}` : 'Belum absen'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" title="Hadir">{std.summary.hadir}H</span>
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" title="Izin">{std.summary.izin}I</span>
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded" title="Terlambat">{std.summary.terlambat}T</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailStudent(std)}
                          className="text-indigo-600 text-xs font-bold h-7 px-1.5"
                        >
                          Log
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: IZIN & DISPENSASI SISWA TERPADU */}
          {activeTab === 'izin_dispensasi' && (
            <div>
              {/* Tampilan Desktop & Tablet: Tabel */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow>
                      <TableHead className="w-[45px] pl-4">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Siswa</TableHead>
                      <TableHead>Kategori & Alasan</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Lampiran</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Aksi Verifikasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingIzin ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs">Memuat perizinan & dispensasi...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredIzin.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                          Belum ada permohonan izin atau dispensasi di kelas ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIzin.map((iz: any, idx: number) => {
                        const isDispensasi = iz.alasan?.toUpperCase().includes('DISPENSASI')
                        return (
                          <TableRow key={iz.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                            <TableCell className="pl-4 font-medium text-slate-400 text-xs">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-semibold whitespace-nowrap">
                              {new Date(iz.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">{iz.user?.student?.name || iz.user?.name}</span>
                                <span className="text-[11px] text-slate-400 font-mono">NIS: {iz.user?.student?.nis || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-[260px]">
                              <div className="flex items-center gap-1 mb-0.5">
                                {isDispensasi ? (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] px-1.5 py-0 font-bold">
                                    Dispensasi
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5 py-0 font-bold">
                                    Izin Siswa
                                  </Badge>
                                )}
                              </div>
                              <p className="truncate" title={iz.alasan}>{iz.alasan}</p>
                            </TableCell>
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              {iz.waktuKeluar || '07:00'} - {iz.estimasiKembali || '15:30'}
                            </TableCell>
                            <TableCell>
                              {iz.lampiranUrl ? (
                                <a
                                  href={iz.lampiranUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Berkas
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iz.status === 'DISETUJUI' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Disetujui
                                </span>
                              ) : iz.status === 'DITOLAK' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  <XCircle className="w-3 h-3" /> Ditolak
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                  <Clock className="w-3 h-3" /> Menunggu
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                {iz.status === 'MENUNGGU' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => setVerifyModal({
                                        open: true,
                                        type: 'APPROVE',
                                        izin: iz,
                                        catatan: `Disetujui dan diverifikasi oleh Wali Kelas (${user?.name || 'Wali Kelas'}).`,
                                        loading: false,
                                      })}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-2.5 rounded-lg"
                                    >
                                      Setujui
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setVerifyModal({
                                        open: true,
                                        type: 'REJECT',
                                        izin: iz,
                                        catatan: 'Mohon maaf, permohonan izin belum dapat disetujui.',
                                        loading: false,
                                      })}
                                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold h-7 px-2.5 rounded-lg"
                                    >
                                      Tolak
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Selesai</span>
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

              {/* Tampilan Mobile: Card Izin & Dispensasi */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {loadingIzin ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    Memuat data perizinan...
                  </div>
                ) : filteredIzin.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada permohonan izin atau dispensasi.
                  </div>
                ) : (
                  filteredIzin.map((iz: any) => {
                    const isDispensasi = iz.alasan?.toUpperCase().includes('DISPENSASI')
                    return (
                      <div key={iz.id} className="p-3 space-y-2 hover:bg-slate-50/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-white">
                              {iz.user?.student?.name || iz.user?.name}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <span>{new Date(iz.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              <span>•</span>
                              <span className="font-mono">{iz.waktuKeluar || '07:00'}-{iz.estimasiKembali || '15:30'}</span>
                            </div>
                          </div>

                          <div>
                            {iz.status === 'DISETUJUI' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Disetujui
                              </span>
                            ) : iz.status === 'DITOLAK' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Ditolak
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                Menunggu
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isDispensasi ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {isDispensasi ? 'Dispensasi' : 'Izin Siswa'}
                            </span>
                            {iz.lampiranUrl && (
                              <a
                                href={iz.lampiranUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-600 font-bold hover:underline ml-auto flex items-center gap-0.5"
                              >
                                <FileText className="w-3 h-3" /> Bukti Lampiran
                              </a>
                            )}
                          </div>
                          <p className="line-clamp-2">{iz.alasan}</p>
                        </div>

                        {iz.status === 'MENUNGGU' && (
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <Button
                              size="sm"
                              onClick={() => setVerifyModal({
                                open: true,
                                type: 'APPROVE',
                                izin: iz,
                                catatan: `Disetujui dan diverifikasi oleh Wali Kelas (${user?.name || 'Wali Kelas'}).`,
                                loading: false,
                              })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-3 rounded-lg"
                            >
                              Setujui
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVerifyModal({
                                open: true,
                                type: 'REJECT',
                                izin: iz,
                                catatan: 'Mohon maaf, permohonan izin belum dapat disetujui.',
                                loading: false,
                              })}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold h-7 px-3 rounded-lg"
                            >
                              Tolak
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL BUAT IZIN / DISPENSASI SISWA */}
      <Dialog open={izinModalOpen} onOpenChange={setIzinModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-4 sm:p-5">
          <form onSubmit={handleCreateIzin}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base font-bold">
                <Plus className="w-4 h-4" /> Catat Izin / Dispensasi Siswa
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Pilih siswa dan masukkan detail perizinan atau dispensasi kegiatan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <Label className="font-bold text-slate-800 dark:text-slate-200">Pilih Siswa Kelas</Label>
                <Select
                  value={izinForm.targetUserId}
                  onValueChange={(v) => setIzinForm(prev => ({ ...prev, targetUserId: v || '' }))}
                  required
                >
                  <SelectTrigger className="text-xs h-8.5">
                    <SelectValue placeholder="Pilih Siswa..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[180px]">
                    {classSummary.map((std) => (
                      <SelectItem key={std.userId} value={std.userId}>
                        {std.name} ({std.nis})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="font-bold text-slate-800 dark:text-slate-200">Mulai Tanggal</Label>
                  <Input
                    type="date"
                    value={izinForm.date}
                    onChange={(e) => setIzinForm(prev => ({ ...prev, date: e.target.value }))}
                    className="text-xs h-8.5"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-800 dark:text-slate-200">Sampai Tanggal</Label>
                  <Input
                    type="date"
                    value={izinForm.endDate}
                    onChange={(e) => setIzinForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="text-xs h-8.5"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800 dark:text-slate-200">Kategori Perizinan</Label>
                <Select
                  value={izinForm.tipeIzin}
                  onValueChange={(v: any) => setIzinForm(prev => ({ ...prev, tipeIzin: v }))}
                >
                  <SelectTrigger className="text-xs h-8.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAKIT">Izin Sakit</SelectItem>
                    <SelectItem value="KELUARGA">Izin Keperluan Keluarga</SelectItem>
                    <SelectItem value="DISPENSASI">Dispensasi Kegiatan Sekolah / Lomba</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800 dark:text-slate-200">Alasan / Keterangan</Label>
                <Textarea
                  value={izinForm.alasan}
                  onChange={(e) => setIzinForm(prev => ({ ...prev, alasan: e.target.value }))}
                  placeholder="Keterangan sakit / tugas dispensasi..."
                  rows={2.5}
                  className="text-xs resize-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800 dark:text-slate-200">Foto Surat Bukti / Dokumen (Opsional)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setIzinForm(prev => ({ ...prev, lampiranFileName: file.name }))
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setIzinForm(prev => ({ ...prev, lampiranBase64: reader.result as string }))
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                  className="text-xs h-8.5 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIzinModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={izinSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {izinSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL VERIFIKASI PERSETUJUAN */}
      <Dialog open={verifyModal.open} onOpenChange={(v) => setVerifyModal(prev => ({ ...prev, open: v }))}>
        <DialogContent className="sm:max-w-[400px] p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              {verifyModal.type === 'APPROVE' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
              {verifyModal.type === 'APPROVE' ? 'Setujui Permohonan' : 'Tolak Permohonan'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {verifyModal.izin && `Siswa: ${verifyModal.izin.user?.student?.name || verifyModal.izin.user?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 py-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
              <p className="font-bold text-slate-900 dark:text-white">Alasan:</p>
              <p className="text-slate-600 dark:text-slate-300">{verifyModal.izin?.alasan}</p>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-800 dark:text-slate-200">Catatan Verifikasi</Label>
              <Textarea
                value={verifyModal.catatan}
                onChange={(e) => setVerifyModal(prev => ({ ...prev, catatan: e.target.value }))}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setVerifyModal(prev => ({ ...prev, open: false }))}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={verifyModal.loading}
              onClick={handleVerifyIzin}
              className={verifyModal.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'}
            >
              {verifyModal.loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Konfirmasi {verifyModal.type === 'APPROVE' ? 'Setujui' : 'Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL LOG PRESENSI SISWA */}
      <Dialog open={!!detailStudent} onOpenChange={(v) => { if (!v) setDetailStudent(null) }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ScanFace className="w-4 h-4 text-indigo-600" />
              Riwayat Presensi Siswa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {detailStudent?.name} ({detailStudent?.nis}) | Kelas: {effectiveClass?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-xs">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p className="text-[10px] text-slate-500">Hadir</p>
                <p className="text-base font-black text-emerald-600">{detailStudent?.summary.hadir}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] text-slate-500">Izin</p>
                <p className="text-base font-black text-amber-600">{detailStudent?.summary.izin}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-800">
                <p className="text-[10px] text-slate-500">Terlambat</p>
                <p className="text-base font-black text-rose-600">{detailStudent?.summary.terlambat}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white">Rekaman Masuk & Pulang (Face/QR Presensi):</p>
              {detailStudent?.logs.length === 0 ? (
                <p className="text-slate-400 italic">Belum ada rekaman presensi periode ini.</p>
              ) : (
                <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                  {detailStudent?.logs.map((l, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{l.date}</p>
                          <p className="text-[10px] text-slate-400">Masuk: {l.checkIn || l.time} {l.checkOut ? `| Pulang: ${l.checkOut}` : ''}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {l.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white">Riwayat Izin & Dispensasi:</p>
              {detailStudent?.izins.length === 0 ? (
                <p className="text-slate-400 italic">Belum ada izin atau dispensasi tercatat.</p>
              ) : (
                <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {detailStudent?.izins.map((iz) => (
                    <div key={iz.id} className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 dark:text-amber-300">{iz.date}</span>
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">DISETUJUI</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5">{iz.alasan}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button size="sm" onClick={() => setDetailStudent(null)} className="w-full h-8 text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
