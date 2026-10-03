'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Users, Calendar, PlusCircle, CheckCircle2, Clock, MapPin,
  Search, Trash2, Edit3, Save, FileSpreadsheet, Download, RefreshCw,
  Award, ShieldCheck, UserPlus, Check, X, AlertCircle, Info, ChevronRight,
  BookOpen, Star, Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'

interface PembinaEkstrakurikulerManagementProps {
  session?: any
}

export function PembinaEkstrakurikulerManagement({ session }: PembinaEkstrakurikulerManagementProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // State
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('anggota')

  // Modals state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState<any>(null)
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, { status: string; notes: string }>>({})

  // Form states
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL')
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('')
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>('')
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('ANGGOTA')
  const [catatanToAdd, setCatatanToAdd] = useState<string>('')

  // Sesi form state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    sessionDate: new Date().toISOString().split('T')[0],
    startTime: '15:30',
    endTime: '17:00',
    location: '',
    topic: '',
    trainerName: '',
    notes: '',
  })

  // Grades draft state
  const [academicYearFilter, setAcademicYearFilter] = useState('2025/2026')
  const [semesterFilter, setSemesterFilter] = useState('GANJIL')
  const [gradesDraft, setGradesDraft] = useState<Record<string, { score: number; predicate: string; description: string }>>({})

  // 1. Fetch Daftar Ekskul Binaan Pembina
  const { data: myEkskuls = [], isLoading: isLoadingEkskuls, refetch: refetchEkskuls } = useQuery<any[]>({
    queryKey: ['pembina-my-ekskul-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/extracurricular/pembina/my-binaan')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 30000,
  })

  // Set default selected ekskul once loaded
  useEffect(() => {
    if (myEkskuls.length > 0 && !selectedEkskulId) {
      setSelectedEkskulId(myEkskuls[0].id)
    }
  }, [myEkskuls, selectedEkskulId])

  // 2. Fetch Detail Ekskul Terpilih
  const { data: currentEkskul, isLoading: isLoadingDetail, refetch: refetchDetail } = useQuery<any>({
    queryKey: ['extracurricular-detail', selectedEkskulId],
    queryFn: async () => {
      if (!selectedEkskulId) return null
      const res = await authenticatedFetch(`/api-backend/extracurricular/${selectedEkskulId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!selectedEkskulId,
  })

  // 3. Fetch Rekap Realtime Ekskul
  const { data: recapData, isLoading: isLoadingRecap, refetch: refetchRecap } = useQuery<any>({
    queryKey: ['extracurricular-recap', selectedEkskulId],
    queryFn: async () => {
      if (!selectedEkskulId) return null
      const res = await authenticatedFetch(`/api-backend/extracurricular/${selectedEkskulId}/recap`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!selectedEkskulId,
  })

  // 4. Fetch Seluruh Siswa Real dari Database untuk Pilihan Tambah Anggota
  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ['master-students-for-ekskul'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // 5. Fetch Kelas Real dari Database
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ['master-classes-for-ekskul'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // Siswa yang belum menjadi anggota ekskul ini
  const availableStudentsToAdd = useMemo(() => {
    if (!currentEkskul || !Array.isArray(allStudents)) return []
    const existingStudentIds = new Set(currentEkskul.members?.map((m: any) => m.studentId) || [])
    
    return allStudents.filter((s: any) => {
      if (existingStudentIds.has(s.id)) return false
      if (selectedClassFilter !== 'ALL' && s.classId !== selectedClassFilter) return false
      if (memberSearchQuery) {
        const q = memberSearchQuery.toLowerCase()
        const nameMatch = s.name?.toLowerCase().includes(q)
        const nisMatch = s.nis?.includes(q) || s.nisn?.includes(q)
        return nameMatch || nisMatch
      }
      return true
    })
  }, [allStudents, currentEkskul, selectedClassFilter, memberSearchQuery])

  // Inisialisasi draft nilai saat data ekskul dimuat
  useEffect(() => {
    if (currentEkskul?.members) {
      const newDraft: Record<string, { score: number; predicate: string; description: string }> = {}
      currentEkskul.members.forEach((m: any) => {
        const existingGrade = m.grades?.find(
          (g: any) => g.academicYear === academicYearFilter && g.semester === semesterFilter
        ) || m.grades?.[0]
        
        newDraft[m.id] = {
          score: existingGrade?.score || 85,
          predicate: existingGrade?.predicate || 'A',
          description: existingGrade?.description || `Aktif mengikuti kegiatan latihan ${currentEkskul.name} dengan disiplin dan capaian yang sangat baik.`,
        }
      })
      setGradesDraft(newDraft)
    }
  }, [currentEkskul, academicYearFilter, semesterFilter])

  // MUTASI: Tambah Anggota Siswa
  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentToAdd) throw new Error('Silakan pilih siswa.')
      const res = await authenticatedFetch(`/api-backend/extracurricular/${selectedEkskulId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentToAdd,
          role: selectedRoleToAdd,
          catatan: catatanToAdd || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menambahkan anggota.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['pembina-my-ekskul-list'] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      setIsAddMemberOpen(false)
      setSelectedStudentToAdd('')
      setCatatanToAdd('')
      Swal.fire({
        icon: 'success',
        title: 'Anggota Ditambahkan',
        text: 'Siswa berhasil didaftarkan sebagai anggota ekstrakurikuler.',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menambahkan anggota.', 'error')
    },
  })

  // MUTASI: Hapus Anggota Siswa
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await authenticatedFetch(`/api-backend/extracurricular/members/${memberId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal mengeluarkan anggota.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['pembina-my-ekskul-list'] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      Swal.fire('Dikeluarkan', 'Anggota telah dihapus dari ekstrakurikuler.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal mengeluarkan anggota.', 'error')
    },
  })

  // MUTASI: Buat Sesi Pertemuan
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!sessionForm.title || !sessionForm.sessionDate) {
        throw new Error('Judul dan tanggal pertemuan wajib diisi.')
      }
      const res = await authenticatedFetch(`/api-backend/extracurricular/${selectedEkskulId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal membuat sesi pertemuan.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      setIsCreateSessionOpen(false)
      setSessionForm({
        title: '',
        sessionDate: new Date().toISOString().split('T')[0],
        startTime: '15:30',
        endTime: '17:00',
        location: '',
        topic: '',
        trainerName: '',
        notes: '',
      })
      Swal.fire({
        icon: 'success',
        title: 'Pertemuan Dibuat',
        text: 'Sesi latihan mingguan berhasil dicatat ke sistem.',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal membuat sesi pertemuan.', 'error')
    },
  })

  // MUTASI: Hapus Sesi Pertemuan
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await authenticatedFetch(`/api-backend/extracurricular/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus sesi.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      Swal.fire('Dihapus', 'Sesi pertemuan berhasil dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menghapus sesi.', 'error')
    },
  })

  // MUTASI: Simpan Presensi Sesi Pertemuan
  const saveAttendanceMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const attendances = Object.entries(attendanceDraft).map(([memberId, data]) => {
        const member = currentEkskul?.members?.find((m: any) => m.id === memberId)
        return {
          memberId,
          studentId: member?.studentId,
          status: data.status,
          notes: data.notes || undefined,
        }
      })

      const res = await authenticatedFetch(`/api-backend/extracurricular/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan presensi.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      setIsAttendanceModalOpen(false)
      Swal.fire({
        icon: 'success',
        title: 'Presensi Tersimpan',
        text: 'Data presensi siswa berhasil diperbarui.',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menyimpan presensi.', 'error')
    },
  })

  // MUTASI: Simpan Nilai Massal
  const saveGradesMutation = useMutation({
    mutationFn: async () => {
      const grades = Object.entries(gradesDraft).map(([memberId, data]) => {
        const member = currentEkskul?.members?.find((m: any) => m.id === memberId)
        return {
          memberId,
          studentId: member?.studentId,
          academicYear: academicYearFilter,
          semester: semesterFilter,
          score: Number(data.score) || 85,
          predicate: data.predicate,
          description: data.description || undefined,
        }
      })

      const res = await authenticatedFetch(`/api-backend/extracurricular/${selectedEkskulId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan nilai rapor.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-detail', selectedEkskulId] })
      queryClient.invalidateQueries({ queryKey: ['extracurricular-recap', selectedEkskulId] })
      Swal.fire({
        icon: 'success',
        title: 'Nilai Berhasil Disimpan',
        text: 'Penilaian rapor ekstrakurikuler telah disimpan ke database.',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menyimpan nilai.', 'error')
    },
  })

  // Open Attendance Modal Helper
  const handleOpenAttendanceModal = (session: any) => {
    setSelectedSessionForAttendance(session)
    const draft: Record<string, { status: string; notes: string }> = {}
    currentEkskul?.members?.forEach((m: any) => {
      const existing = session.attendances?.find((a: any) => a.memberId === m.id)
      draft[m.id] = {
        status: existing?.status || 'HADIR',
        notes: existing?.notes || '',
      }
    })
    setAttendanceDraft(draft)
    setIsAttendanceModalOpen(true)
  }

  // Set Semua Hadir Helper
  const handleSetAllHadir = () => {
    const updated = { ...attendanceDraft }
    Object.keys(updated).forEach((key) => {
      updated[key] = { ...updated[key], status: 'HADIR' }
    })
    setAttendanceDraft(updated)
  }

  // Export Rekap ke Excel
  const handleExportExcel = () => {
    if (!recapData || !recapData.memberRecaps) {
      Swal.fire('Info', 'Data rekapitulasi belum tersedia.', 'info')
      return
    }

    const rows = recapData.memberRecaps.map((m: any, idx: number) => ({
      'No': idx + 1,
      'Nama Siswa': m.studentName,
      'NISN': m.nisn || '-',
      'NIS': m.nis || '-',
      'Kelas': m.className || '-',
      'L/P': m.gender || '-',
      'Jabatan': m.role || 'ANGGOTA',
      'Hadir': m.hadirCount,
      'Izin': m.izinCount,
      'Sakit': m.sakitCount,
      'Alfa': m.alfaCount,
      'Persentase Kehadiran (%)': `${m.attendancePercentage}%`,
      'Nilai Angka': m.grade?.score || '-',
      'Predikat Rapor': m.grade?.predicate || '-',
      'Deskripsi Capaian': m.grade?.description || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Ekstrakurikuler')

    XLSX.writeFile(
      workbook,
      `Rekap_${currentEkskul?.name || 'Ekstrakurikuler'}_${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Pemilihan Ekstrakurikuler Binaan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                Workspace Pembina Ekstrakurikuler
              </h1>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                Pembina Resmi
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola keanggotaan siswa, presensi mingguan, evaluasi nilai rapor, dan rekapitulasi real-time.
            </p>
          </div>
        </div>

        {/* Dropdown Pemilihan Ekskul Binaan */}
        <div className="flex items-center gap-2 min-w-[280px]">
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Ekskul Binaan:
          </Label>
          <Select value={selectedEkskulId} onValueChange={(val) => setSelectedEkskulId(val || '')}>
            <SelectTrigger className="w-full text-xs font-bold border-amber-400/40 focus:ring-amber-500">
              <SelectValue placeholder="Pilih Ekstrakurikuler" />
            </SelectTrigger>
            <SelectContent>
              {myEkskuls.map((ekskul) => (
                <SelectItem key={ekskul.id} value={ekskul.id} className="text-xs font-semibold">
                  {ekskul.name} ({ekskul._count?.members || 0} Siswa)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ringkasan Statistik Realtime Ekskul Terpilih */}
      {currentEkskul && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Anggota</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                  {currentEkskul.members?.length || 0}
                </h3>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Siswa Terdaftar Aktif
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Pertemuan Terlaksana</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                  {currentEkskul.sessions?.length || 0}
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Sesi Latihan Mingguan
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-amber-50/50 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Rata-Rata Hadir</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                  {recapData?.stats?.avgAttendance || 0}%
                </h3>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Persentase Kehadiran
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-purple-50/50 to-white dark:from-slate-900 dark:to-slate-850">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nilai Terinput</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                  {currentEkskul.members?.filter((m: any) => m.grades?.length > 0).length || 0} / {currentEkskul.members?.length || 0}
                </h3>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  Evaluasi Rapor Terisi
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail Informasi Ekskul Card */}
      {currentEkskul && (
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>
                  <strong>Jadwal:</strong> {currentEkskul.scheduleDay || '-'} ({currentEkskul.scheduleTime || '-'})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <span className="truncate">
                  <strong>Lokasi:</strong> {currentEkskul.location || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>
                  <strong>Pembina:</strong> {currentEkskul.pembinaName} {currentEkskul.pembinaNip ? `(${currentEkskul.pembinaNip})` : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Menu Operasional Pembina */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('anggota')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'anggota'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Anggota Siswa</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pertemuan')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'pertemuan'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Pertemuan & Presensi</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('penilaian')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'penilaian'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Penilaian Rapor</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Rekap Realtime</span>
        </button>
      </div>

      {/* ==================== TAB 1: ANGGOTA SISWA ==================== */}
      {activeTab === 'anggota' && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  Daftar Anggota {currentEkskul?.name || 'Ekstrakurikuler'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Seluruh siswa yang aktif terdaftar dalam unit ekstrakurikuler binaan ini.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 h-8"
                onClick={() => setIsAddMemberOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Tambah Anggota Siswa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead className="min-w-[200px]">NAMA SISWA</TableHead>
                      <TableHead className="w-28 text-center">NISN / NIS</TableHead>
                      <TableHead className="w-24 text-center">KELAS</TableHead>
                      <TableHead className="w-20 text-center">L/P</TableHead>
                      <TableHead className="w-32 text-center">JABATAN</TableHead>
                      <TableHead className="w-24 text-center">STATUS</TableHead>
                      <TableHead className="w-28 text-center">TANGGAL GABUNG</TableHead>
                      <TableHead className="w-20 text-center">AKSI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEkskul?.members && currentEkskul.members.length > 0 ? (
                      currentEkskul.members.map((member: any, index: number) => (
                        <TableRow key={member.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{member.student?.name}</p>
                            {member.catatan && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-[220px]">{member.catatan}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {member.student?.nisn || member.student?.nis || '-'}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300">
                            {member.student?.class?.name || '-'}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-600">
                            {member.student?.gender || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                member.role === 'KETUA'
                                  ? 'border-amber-500 text-amber-600 bg-amber-500/10'
                                  : member.role === 'WAKIL_KETUA'
                                  ? 'border-blue-500 text-blue-600 bg-blue-500/10'
                                  : member.role === 'SEKRETARIS' || member.role === 'BENDAHARA'
                                  ? 'border-purple-500 text-purple-600 bg-purple-500/10'
                                  : 'border-slate-300 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-[11px] text-slate-500">
                            {new Date(member.joinedAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Keluarkan Anggota?',
                                  text: `Keluarkan ${member.student?.name} dari ekstrakurikuler ini?`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonColor: '#d33',
                                  cancelButtonColor: '#3085d6',
                                  confirmButtonText: 'Ya, Keluarkan',
                                  cancelButtonText: 'Batal',
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    removeMemberMutation.mutate(member.id)
                                  }
                                })
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-xs">Belum ada anggota siswa terdaftar.</p>
                          <p className="text-[11px] mt-1">Klik tombol &quot;Tambah Anggota Siswa&quot; untuk mendaftarkan peserta.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 2: PERTEMUAN & PRESENSI ==================== */}
      {activeTab === 'pertemuan' && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Daftar Pertemuan & Sesi Latihan Mingguan
                </CardTitle>
                <CardDescription className="text-xs">
                  Pencatatan tanggal pertemuan, topik materi latihan, dan presensi absensi anggota.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-8"
                onClick={() => setIsCreateSessionOpen(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Buat Pertemuan Baru
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead className="w-28 text-center">TANGGAL</TableHead>
                      <TableHead className="w-24 text-center">WAKTU</TableHead>
                      <TableHead className="min-w-[180px]">JUDUL & MATERI PERTEMUAN</TableHead>
                      <TableHead className="w-32">LOKASI</TableHead>
                      <TableHead className="w-32">PELATIH / PEMBINA</TableHead>
                      <TableHead className="w-36 text-center">REKAP KEHADIRAN</TableHead>
                      <TableHead className="w-28 text-center">AKSI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEkskul?.sessions && currentEkskul.sessions.length > 0 ? (
                      currentEkskul.sessions.map((session: any, index: number) => {
                        const totalAttendances = session.attendances?.length || 0
                        const hadirCount = session.attendances?.filter((a: any) => a.status === 'HADIR').length || 0
                        const izinCount = session.attendances?.filter((a: any) => a.status === 'IZIN').length || 0
                        const sakitCount = session.attendances?.filter((a: any) => a.status === 'SAKIT').length || 0
                        const alfaCount = session.attendances?.filter((a: any) => a.status === 'ALFA').length || 0

                        return (
                          <TableRow key={session.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                            <TableCell className="text-center font-semibold text-slate-800 dark:text-slate-100">
                              {new Date(session.sessionDate).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-center font-mono text-[11px] text-slate-500">
                              {session.startTime && session.endTime ? `${session.startTime} - ${session.endTime}` : '-'}
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{session.title}</p>
                              {session.topic && (
                                <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                                  Materi: {session.topic}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600 truncate max-w-[120px]">
                              {session.location || '-'}
                            </TableCell>
                            <TableCell className="text-slate-600 truncate max-w-[120px]">
                              {session.trainerName || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                                <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded" title="Hadir">
                                  H: {hadirCount}
                                </span>
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Izin">
                                  I: {izinCount}
                                </span>
                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Sakit">
                                  S: {sakitCount}
                                </span>
                                <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded" title="Alfa">
                                  A: {alfaCount}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 px-2"
                                  onClick={() => handleOpenAttendanceModal(session)}
                                >
                                  <Edit3 className="h-3 w-3 mr-1" />
                                  Presensi
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    Swal.fire({
                                      title: 'Hapus Pertemuan?',
                                      text: `Hapus sesi pertemuan "${session.title}" beserta riwayat presensinya?`,
                                      icon: 'warning',
                                      showCancelButton: true,
                                      confirmButtonColor: '#d33',
                                      confirmButtonText: 'Ya, Hapus',
                                      cancelButtonText: 'Batal',
                                    }).then((result) => {
                                      if (result.isConfirmed) {
                                        deleteSessionMutation.mutate(session.id)
                                      }
                                    })
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-xs">Belum ada sesi pertemuan tercatat.</p>
                          <p className="text-[11px] mt-1">Klik tombol &quot;Buat Pertemuan Baru&quot; untuk mencatat sesi latihan.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 3: PENILAIAN RAPOR ==================== */}
      {activeTab === 'penilaian' && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  Penilaian & Predikat Rapor Anggota
                </CardTitle>
                <CardDescription className="text-xs">
                  Input nilai angka (0-100), predikat capaian (A/B/C/D), dan deskripsi kompetensi rapor siswa.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Select value={academicYearFilter} onValueChange={(val) => setAcademicYearFilter(val || '2025/2026')}>
                  <SelectTrigger className="h-8 text-xs font-semibold w-28">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025/2026" className="text-xs">2025/2026</SelectItem>
                    <SelectItem value="2024/2025" className="text-xs">2024/2025</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={semesterFilter} onValueChange={(val) => setSemesterFilter(val || 'GANJIL')}>
                  <SelectTrigger className="h-8 text-xs font-semibold w-24">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GANJIL" className="text-xs">Ganjil</SelectItem>
                    <SelectItem value="GENAP" className="text-xs">Genap</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold gap-1.5 h-8"
                  onClick={() => saveGradesMutation.mutate()}
                  disabled={saveGradesMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveGradesMutation.isPending ? 'Menyimpan...' : 'Simpan Semua Nilai'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead className="min-w-[180px]">NAMA SISWA</TableHead>
                      <TableHead className="w-20 text-center">KELAS</TableHead>
                      <TableHead className="w-24 text-center">NILAI (0-100)</TableHead>
                      <TableHead className="w-32 text-center">PREDIKAT</TableHead>
                      <TableHead className="min-w-[320px]">DESKRIPSI CAPAIAN KOMPETENSI RAPOR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEkskul?.members && currentEkskul.members.length > 0 ? (
                      currentEkskul.members.map((member: any, index: number) => {
                        const currentDraft = gradesDraft[member.id] || {
                          score: 85,
                          predicate: 'A',
                          description: '',
                        }

                        return (
                          <TableRow key={member.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                            <TableCell>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{member.student?.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{member.student?.nisn || member.student?.nis}</p>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300">
                              {member.student?.class?.name || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={currentDraft.score}
                                onChange={(e) => {
                                  const val = Number(e.target.value)
                                  setGradesDraft((prev) => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      score: val,
                                      predicate: val >= 88 ? 'A' : val >= 75 ? 'B' : val >= 60 ? 'C' : 'D',
                                    },
                                  }))
                                }}
                                className="h-8 text-center text-xs font-bold w-18 mx-auto"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Select
                                value={currentDraft.predicate}
                                onValueChange={(val) => {
                                  setGradesDraft((prev) => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      predicate: val || 'A',
                                    },
                                  }))
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs font-bold w-28 mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A" className="text-xs font-bold text-emerald-600">A (Sangat Baik)</SelectItem>
                                  <SelectItem value="B" className="text-xs font-bold text-blue-600">B (Baik)</SelectItem>
                                  <SelectItem value="C" className="text-xs font-bold text-amber-600">C (Cukup)</SelectItem>
                                  <SelectItem value="D" className="text-xs font-bold text-rose-600">D (Kurang)</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={currentDraft.description}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setGradesDraft((prev) => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      description: val,
                                    },
                                  }))
                                }}
                                placeholder="Tuliskan catatan deskripsi capaian kompetensi..."
                                className="h-8 text-xs"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-xs">Belum ada anggota untuk dinilai.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== TAB 4: REKAP REALTIME ==================== */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  Rekapitulasi Kehadiran & Nilai Siswa (Realtime)
                </CardTitle>
                <CardDescription className="text-xs">
                  Hasil kalkulasi otomatis dari seluruh presensi pertemuan dan penilaian rapor.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold h-8 gap-1.5"
                  onClick={() => refetchRecap()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Segarkan
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 h-8"
                  onClick={handleExportExcel}
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh Excel (.xlsx)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                      <TableHead className="w-12 text-center">NO</TableHead>
                      <TableHead className="min-w-[180px]">NAMA SISWA</TableHead>
                      <TableHead className="w-20 text-center">KELAS</TableHead>
                      <TableHead className="w-16 text-center">HADIR</TableHead>
                      <TableHead className="w-16 text-center">IZIN</TableHead>
                      <TableHead className="w-16 text-center">SAKIT</TableHead>
                      <TableHead className="w-16 text-center">ALFA</TableHead>
                      <TableHead className="w-24 text-center">% HADIR</TableHead>
                      <TableHead className="w-20 text-center">NILAI</TableHead>
                      <TableHead className="w-24 text-center">PREDIKAT</TableHead>
                      <TableHead className="min-w-[260px]">DESKRIPSI RAPOR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recapData?.memberRecaps && recapData.memberRecaps.length > 0 ? (
                      recapData.memberRecaps.map((item: any, index: number) => (
                        <TableRow key={item.memberId} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                          <TableCell>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{item.studentName}</p>
                            <p className="text-[10px] text-slate-400">{item.nisn || item.nis}</p>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300">
                            {item.className}
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">{item.hadirCount}</TableCell>
                          <TableCell className="text-center font-bold text-blue-600">{item.izinCount}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{item.sakitCount}</TableCell>
                          <TableCell className="text-center font-bold text-rose-600">{item.alfaCount}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] font-bold ${
                                item.attendancePercentage >= 80
                                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                  : item.attendancePercentage >= 60
                                  ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                              }`}
                            >
                              {item.attendancePercentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.grade?.score ?? '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.grade?.predicate ? (
                              <Badge
                                className={`text-[10px] font-bold ${
                                  item.grade.predicate === 'A' || item.grade.predicate === 'Sangat Baik'
                                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                    : item.grade.predicate === 'B' || item.grade.predicate === 'Baik'
                                    ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                                    : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                }`}
                              >
                                {item.grade.predicate}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Belum dinilai</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {item.grade?.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-400">
                          <p className="font-semibold text-xs">Belum ada data rekapitulasi.</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== DIALOG: TAMBAH ANGGOTA SISWA ==================== */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-500" />
              Tambah Anggota Siswa ke {currentEkskul?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih siswa aktif dari database sekolah untuk didaftarkan ke ekstrakurikuler ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Filter Kelas */}
            <div>
              <Label className="text-xs font-semibold">Filter Kelas</Label>
              <Select value={selectedClassFilter} onValueChange={(val) => setSelectedClassFilter(val || 'ALL')}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">-- Semua Kelas --</SelectItem>
                  {allClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pencarian Siswa */}
            <div>
              <Label className="text-xs font-semibold">Cari Nama Siswa / NIS</Label>
              <Input
                placeholder="Ketik nama atau NIS siswa..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Dropdown Siswa Tersedia */}
            <div>
              <Label className="text-xs font-semibold">Pilih Siswa *</Label>
              <Select value={selectedStudentToAdd} onValueChange={(val) => setSelectedStudentToAdd(val || '')}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="-- Pilih Siswa --" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableStudentsToAdd.length > 0 ? (
                    availableStudentsToAdd.slice(0, 50).map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} ({s.class?.name || '-'}) - {s.nisn || s.nis || ''}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs text-slate-400">
                      Tidak ada siswa ditemukan
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Pilihan Peran / Jabatan */}
            <div>
              <Label className="text-xs font-semibold">Jabatan / Posisi</Label>
              <Select value={selectedRoleToAdd} onValueChange={(val) => setSelectedRoleToAdd(val || 'ANGGOTA')}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANGGOTA" className="text-xs">Anggota</SelectItem>
                  <SelectItem value="KETUA" className="text-xs">Ketua</SelectItem>
                  <SelectItem value="WAKIL_KETUA" className="text-xs">Wakil Ketua</SelectItem>
                  <SelectItem value="SEKRETARIS" className="text-xs">Sekretaris</SelectItem>
                  <SelectItem value="BENDAHARA" className="text-xs">Bendahara</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Catatan Tambahan */}
            <div>
              <Label className="text-xs font-semibold">Catatan Khusus (Opsional)</Label>
              <Input
                placeholder="Misal: Minat khusus, pengalaman sebelumnya..."
                value={catatanToAdd}
                onChange={(e) => setCatatanToAdd(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(false)} className="text-xs h-8">
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8"
              onClick={() => addMemberMutation.mutate()}
              disabled={!selectedStudentToAdd || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Menambahkan...' : 'Daftarkan Anggota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: BUAT PERTEMUAN BARU ==================== */}
      <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              Buat Sesi Pertemuan / Latihan Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Jadwalkan pertemuan mingguan baru untuk ekstrakurikuler {currentEkskul?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Judul Pertemuan *</Label>
              <Input
                placeholder="Misal: Pertemuan 1 - Pengenalan Teknik Dasar"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Tanggal Pertemuan *</Label>
                <Input
                  type="date"
                  value={sessionForm.sessionDate}
                  onChange={(e) => setSessionForm({ ...sessionForm, sessionDate: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label className="text-xs font-semibold">Mulai</Label>
                  <Input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Selesai</Label>
                  <Input
                    type="time"
                    value={sessionForm.endTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Lokasi Latihan</Label>
                <Input
                  placeholder="Misal: Lapangan Utama"
                  value={sessionForm.location}
                  onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Pelatih / Pembina Yang Memimpin</Label>
                <Input
                  placeholder={currentEkskul?.pembinaName || 'Nama Pembina'}
                  value={sessionForm.trainerName}
                  onChange={(e) => setSessionForm({ ...sessionForm, trainerName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Materi / Agenda Latihan</Label>
              <Input
                placeholder="Rincian latihan atau topik bahasan hari ini..."
                value={sessionForm.topic}
                onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Catatan Tambahan Evaluasi</Label>
              <Textarea
                placeholder="Catatan perkembangan atau pengumuman untuk anggota..."
                value={sessionForm.notes}
                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                className="text-xs min-h-[60px] mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateSessionOpen(false)} className="text-xs h-8">
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
              onClick={() => createSessionMutation.mutate()}
              disabled={!sessionForm.title || !sessionForm.sessionDate || createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? 'Menyimpan...' : 'Simpan Pertemuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: INPUT / EDIT PRESENSI PERTEMUAN ==================== */}
      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Presensi: {selectedSessionForAttendance?.title}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                onClick={handleSetAllHadir}
              >
                Set Semua Hadir
              </Button>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tanggal:{' '}
              {selectedSessionForAttendance?.sessionDate
                ? new Date(selectedSessionForAttendance.sessionDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '-'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-850 text-[11px] font-bold">
                  <TableHead className="w-10 text-center">NO</TableHead>
                  <TableHead className="min-w-[160px]">NAMA SISWA</TableHead>
                  <TableHead className="w-20 text-center">KELAS</TableHead>
                  <TableHead className="w-48 text-center">STATUS KEHADIRAN</TableHead>
                  <TableHead className="min-w-[140px]">CATATAN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentEkskul?.members?.map((member: any, index: number) => {
                  const currentStatus = attendanceDraft[member.id]?.status || 'HADIR'
                  const currentNotes = attendanceDraft[member.id]?.notes || ''

                  return (
                    <TableRow key={member.id} className="text-xs">
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{member.student?.name}</p>
                        <p className="text-[10px] text-slate-400">{member.role}</p>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300">
                        {member.student?.class?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {[
                            { code: 'HADIR', label: 'Hadir', bg: 'bg-emerald-600 text-white' },
                            { code: 'IZIN', label: 'Izin', bg: 'bg-blue-600 text-white' },
                            { code: 'SAKIT', label: 'Sakit', bg: 'bg-amber-600 text-white' },
                            { code: 'ALFA', label: 'Alfa', bg: 'bg-rose-600 text-white' },
                          ].map((st) => (
                            <button
                              key={st.code}
                              type="button"
                              onClick={() => {
                                setAttendanceDraft((prev) => ({
                                  ...prev,
                                  [member.id]: {
                                    ...prev[member.id],
                                    status: st.code,
                                  },
                                }))
                              }}
                              className={`py-1 text-[10px] font-bold rounded transition-colors ${
                                currentStatus === st.code
                                  ? st.bg
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Keterangan izin/sakit..."
                          value={currentNotes}
                          onChange={(e) => {
                            const val = e.target.value
                            setAttendanceDraft((prev) => ({
                              ...prev,
                              [member.id]: {
                                ...prev[member.id],
                                notes: val,
                              },
                            }))
                          }}
                          className="h-7 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsAttendanceModalOpen(false)} className="text-xs h-8">
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
              onClick={() => saveAttendanceMutation.mutate(selectedSessionForAttendance?.id)}
              disabled={saveAttendanceMutation.isPending}
            >
              {saveAttendanceMutation.isPending ? 'Menyimpan...' : 'Simpan Presensi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
