'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Calendar, BookOpen, Users, Clock, User, CheckCircle2, Plus, Pencil, Trash2, Upload, FileCode, Sparkles, ShieldCheck } from 'lucide-react'
import { parseAscTimetableXml } from '@/utils/ascParser'

const DAYS_MAP = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
]

type ScheduleForm = {
  dayOfWeek: string
  startTime: string
  endTime: string
  classId: string
  subjectId: string
  teacherId: string
}

export default function JadwalPelajaranPage() {
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id
  const username = (session?.user as any)?.username
  const userEmail = session?.user?.email
  const role = (session?.user as any)?.role || 'GURU'
  const subRole = (session?.user as any)?.subRole
  const subRole2 = (session?.user as any)?.subRole2
  const subRole3 = (session?.user as any)?.subRole3

  const isSuperAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(role) || ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole || '') || ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole2 || '') || ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole3 || '')
  const isKepalaSekolah = [role, subRole, subRole2, subRole3].includes('KEPALA_SEKOLAH')

  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Selected Class state for Superadmin filter
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')

  // Modal State for Single Create / Edit
  const [openModal, setOpenModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState('')
  const [formData, setFormData] = useState<ScheduleForm>({
    dayOfWeek: '1',
    startTime: '07:00',
    endTime: '08:30',
    classId: '',
    subjectId: '',
    teacherId: ''
  })

  // Modal State for aSc Timetables Import
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Fetch Daftar Kelas
  const { data: classes, isLoading: loadingClasses } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    }
  })

  // 2. Fetch Daftar Siswa
  const { data: students, isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) return []
      return res.json()
    }
  })

  // 3. Fetch Daftar Mata Pelajaran
  const { data: subjects, isLoading: loadingSubjects } = useQuery<any[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    }
  })

  // 4. Fetch Daftar Guru
  const { data: teachers, isLoading: loadingTeachers } = useQuery<any[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) return []
      return res.json()
    }
  })

  // 5. Fetch Jadwal Pelajaran
  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/schedules')
      if (!res.ok) return []
      return res.json()
    }
  })

  const isLoading = loadingClasses || loadingStudents || loadingSchedules || loadingSubjects || loadingTeachers || status === 'loading'

  // Single Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: ScheduleForm) => {
      const res = await authenticatedFetch('/api-backend/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: Number(payload.dayOfWeek),
          startTime: payload.startTime,
          endTime: payload.endTime,
          classId: payload.classId,
          subjectId: payload.subjectId,
          teacherId: payload.teacherId
        })
      })
      if (!res.ok) throw new Error('Gagal menambahkan jadwal pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpenModal(false)
      resetForm()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: ScheduleForm) => {
      const res = await authenticatedFetch(`/api-backend/schedules/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: Number(payload.dayOfWeek),
          startTime: payload.startTime,
          endTime: payload.endTime,
          classId: payload.classId,
          subjectId: payload.subjectId,
          teacherId: payload.teacherId
        })
      })
      if (!res.ok) throw new Error('Gagal memperbarui jadwal pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpenModal(false)
      resetForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/schedules/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus jadwal pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  // Bulk Import Mutation for aSc Timetables
  const bulkImportMutation = useMutation({
    mutationFn: async (schedulesToImport: any[]) => {
      const res = await authenticatedFetch('/api-backend/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulesToImport)
      })
      if (!res.ok) throw new Error('Gagal mengimpor jadwal aSc Timetables')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      alert(`Berhasil mengimpor ${data?.length || 0} jadwal dari aSc Timetables! Seluruh data jadwal siswa telah tersinkronisasi.`)
      setImportModalOpen(false)
      setXmlFile(null)
      setParsedPreview(null)
    },
    onError: (err: any) => {
      alert(err.message || 'Terjadi kesalahan saat mengimpor data jadwal.')
    }
  })

  const resetForm = () => {
    setIsEdit(false)
    setEditId('')
    setFormData({
      dayOfWeek: '1',
      startTime: '07:00',
      endTime: '08:30',
      classId: classes && classes.length > 0 ? classes[0].id : '',
      subjectId: subjects && subjects.length > 0 ? subjects[0].id : '',
      teacherId: teachers && teachers.length > 0 ? teachers[0].id : ''
    })
  }

  const handleOpenAdd = () => {
    resetForm()
    setOpenModal(true)
  }

  const handleOpenEdit = (sch: any) => {
    setIsEdit(true)
    setEditId(sch.id)
    setFormData({
      dayOfWeek: sch.dayOfWeek?.toString() || '1',
      startTime: sch.startTime || '07:00',
      endTime: sch.endTime || '08:30',
      classId: sch.classId || sch.class?.id || '',
      subjectId: sch.subjectId || sch.subject?.id || '',
      teacherId: sch.teacherId || sch.teacher?.id || ''
    })
    setOpenModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus jadwal pelajaran ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.classId || !formData.subjectId || !formData.teacherId) {
      alert('Mohon lengkapi data Kelas, Mata Pelajaran, dan Guru Pengampu.')
      return
    }
    if (isEdit) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  // Handle aSc Timetables XML File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setXmlFile(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = parseAscTimetableXml(text, classes || [], subjects || [], teachers || [])
        setParsedPreview(parsed)
      } catch (err) {
        alert('Gagal membaca file aSc Timetables XML. Pastikan format XML valid.')
        setParsedPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.length === 0) {
      alert('Tidak ada data jadwal yang dapat diimpor dari file ini.')
      return
    }
    bulkImportMutation.mutate(parsedPreview)
  }

  // Deteksi mutlak kelas siswa yang sedang login
  const myProfile = students?.find((s: any) => 
    s.userId === userId || 
    (s.user && (s.user.id === userId || s.user.username === username || s.user.email === userEmail)) ||
    s.nisn === username || 
    s.nis === username ||
    s.nisn === userEmail ||
    s.nis === userEmail ||
    (s.parentRelations && s.parentRelations.some((pr: any) => pr.parent?.userId === userId))
  )
  const myClassId = myProfile?.classId
  const activeStudentClass = classes?.find((c: any) => c.id === myClassId) || myProfile?.class || (classes && classes.length > 0 ? classes[0] : null)

  // Filter jadwal
  const filteredSchedules = (schedules || []).filter((sch: any) => {
    if (isSuperAdmin) {
      if (selectedClassId === 'ALL') return true
      return sch.classId === selectedClassId
    }
    if (role === 'SISWA' || role === 'WALI_MURID' || role === 'PARENT' || role === 'ORANG_TUA') {
      return sch.classId === activeStudentClass?.id
    }
    // Guru / Pegawai view
    if (selectedClassId !== 'ALL') {
      return sch.classId === selectedClassId
    }
    return true
  }).sort((a: any, b: any) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek
    }
    return a.startTime.localeCompare(b.startTime)
  })

  // Kelompokkan jadwal berdasarkan hari (Senin - Sabtu: 1 - 6)
  const groupedSchedules: Record<number, any[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
  }

  filteredSchedules.forEach((sch: any) => {
    const day = sch.dayOfWeek ?? 1
    if (!groupedSchedules[day]) groupedSchedules[day] = []
    groupedSchedules[day].push(sch)
  })

  return (
    <div className="space-y-8 pb-10">
      {/* Banner Header Eksklusif & Estetik */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manajemen Kurikulum & aSc TimeTables</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300 drop-shadow-md" />
              Jadwal Pelajaran Sekolah
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
              {isSuperAdmin
                ? 'Import jadwal langsung dari aSc TimeTables XML untuk mengisi jadwal pelajaran seluruh kelas & siswa secara otomatis dan terstruktur.'
                : 'Daftar jadwal pelajaran mingguan yang ditetapkan oleh Kurikulum sekolah dan tersinkronisasi secara real-time.'}
            </p>
          </div>

          {/* Mode Supervisi untuk Kepala Sekolah */}
          {isKepalaSekolah && !isSuperAdmin && (
            <div className="px-4 py-2 rounded-2xl bg-amber-400/20 backdrop-blur-md border border-amber-300/40 text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
              <span>Mode Supervisi (Read-Only)</span>
            </div>
          )}

          {/* Akses Cepat Tombol Superadmin: Import aSc Timetables & Tambah Manual */}
          {isSuperAdmin && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                onClick={() => setImportModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-5 py-6 rounded-2xl shadow-lg hover:shadow-amber-400/20 transition-all flex items-center justify-center gap-2 border border-amber-300"
              >
                <FileCode className="w-5 h-5 text-indigo-900" />
                <span>Import aSc TimeTables (XML)</span>
              </Button>
              <Button
                onClick={handleOpenAdd}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-6 rounded-2xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Manual</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Kelas & Kontrol Pilihan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Filter Tampilan Kelas:</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {role === 'SISWA' ? (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-extrabold">
              Kelas Saya: {activeStudentClass?.name || 'Belum Terdaftar'}
            </div>
          ) : (
            <Select value={selectedClassId} onValueChange={(val) => val && setSelectedClassId(val)}>
              <SelectTrigger className="w-full sm:w-[240px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium">
                <SelectValue placeholder="Pilih Kelas">
                  {selectedClassId === 'ALL'
                    ? 'Semua Kelas'
                    : classes?.find((c: any) => c.id === selectedClassId)?.name || 'Pilih Kelas'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kelas</SelectItem>
                {(classes || []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.academicYear || 'Aktif'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Konten Jadwal Mingguan Per Kelas */}
      {isLoading ? (
        <div className="flex flex-col h-[40vh] items-center justify-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <p className="font-semibold text-lg">Memuat Jadwal Pelajaran...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4 stroke-[1.2]" />
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Belum Ada Jadwal Pelajaran</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto text-sm">
            {isSuperAdmin
              ? 'Belum ada jadwal pelajaran. Impor dari file aSc TimeTables XML atau tambahkan jadwal manual.'
              : 'Jadwal pelajaran belum ditambahkan oleh Kurikulum.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((dayIndex) => {
            const daySchedules = groupedSchedules[dayIndex] || []
            const isToday = new Date().getDay() === dayIndex

            return (
              <Card 
                key={dayIndex} 
                className={`flex flex-col transition-all duration-300 rounded-2xl border ${
                  isToday 
                    ? 'border-blue-500/80 dark:border-blue-500/80 shadow-lg shadow-blue-500/10 bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 ring-2 ring-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md bg-white dark:bg-slate-900/60'
                }`}
              >
                <CardHeader className={`pb-3 border-b ${isToday ? 'border-blue-100 dark:border-blue-900/50' : 'border-slate-100 dark:border-slate-800/80'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${isToday ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <CardTitle className={`text-lg font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {DAYS_MAP[dayIndex]}
                      </CardTitle>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm tracking-wider">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs font-medium dark:text-slate-400">
                    {daySchedules.length > 0 ? `${daySchedules.length} Sesi Mata Pelajaran` : 'Tidak ada kelas di hari ini'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-4 flex-1 space-y-3">
                  {daySchedules.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500">
                      <Clock className="w-6 h-6 mb-1.5 opacity-40" />
                      <span className="text-xs font-medium">Bebas Pelajaran / Libur</span>
                    </div>
                  ) : (
                    daySchedules.map((sch: any, idx: number) => (
                      <div 
                        key={sch.id || idx} 
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors group relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 dark:bg-indigo-400 group-hover:w-1.5 transition-all"></div>
                        <div className="pl-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {sch.startTime} - {sch.endTime}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                              {sch.class?.name || 'Kelas'}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                                {sch.subject?.name || 'Mata Pelajaran'}
                              </h4>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                <span>Guru: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu'}</strong></span>
                              </p>
                            </div>

                            {/* Action edit/delete untuk Superadmin */}
                            {isSuperAdmin && (
                              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                  onClick={() => handleOpenEdit(sch)}
                                  title="Edit Jadwal"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                  onClick={() => handleDelete(sch.id)}
                                  title="Hapus Jadwal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Dialog Import aSc TimeTables XML */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-500" />
              Import Jadwal dari aSc TimeTables (XML)
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Upload file ekspor XML dari aplikasi aSc TimeTables. Sistem akan mencocokkan & membuat otomatis data Kelas, Mata Pelajaran, Guru, dan Jadwal Pelajaran.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Upload className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {xmlFile ? xmlFile.name : 'Pilih atau Drag File aSc TimeTables (.xml)'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Format file yang didukung: XML (.xml)</p>
              
              <input
                type="file"
                ref={fileInputRef}
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 border-slate-300 dark:border-slate-700 font-semibold"
              >
                {xmlFile ? 'Ganti File XML' : 'Pilih File XML'}
              </Button>
            </div>

            {/* Preview Hasil Parse XML */}
            {parsedPreview && (
              <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>File XML Berhasil Dibaca!</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Terdeteksi <strong>{parsedPreview.length} sesi jadwal pelajaran</strong> yang siap diimpor dan disinkronkan ke jadwal siswa.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportModalOpen(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedPreview || parsedPreview.length === 0 || bulkImportMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm"
            >
              {bulkImportMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Impor & Sinkronkan Jadwal ({parsedPreview?.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Form Single Tambah / Edit Jadwal Pelajaran */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                {isEdit ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                Pilih Kelas, Mata Pelajaran, Guru Pengampu, Hari, dan Jam Pelajaran.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Select Kelas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kelas Target</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(val) => val && setFormData(prev => ({ ...prev, classId: val }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Kelas">
                      {classes?.find((c: any) => c.id === formData.classId)
                        ? `${classes.find((c: any) => c.id === formData.classId).name} (${classes.find((c: any) => c.id === formData.classId).academicYear || 'Aktif'})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.academicYear || 'Aktif'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Mata Pelajaran */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mata Pelajaran</Label>
                <Select
                  value={formData.subjectId}
                  onValueChange={(val) => val && setFormData(prev => ({ ...prev, subjectId: val }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Mata Pelajaran">
                      {subjects?.find((s: any) => s.id === formData.subjectId)
                        ? `${subjects.find((s: any) => s.id === formData.subjectId).name} (${subjects.find((s: any) => s.id === formData.subjectId).code})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(subjects || []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Guru Pengampu */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Guru Pengampu</Label>
                <Select
                  value={formData.teacherId}
                  onValueChange={(val) => val && setFormData(prev => ({ ...prev, teacherId: val }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Guru Pengampu">
                      {teachers?.find((t: any) => t.id === formData.teacherId)
                        ? (teachers.find((t: any) => t.id === formData.teacherId).user?.name || teachers.find((t: any) => t.id === formData.teacherId).nipNbm || 'Guru')
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(teachers || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.user?.name || t.nipNbm || 'Guru'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Hari */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hari Pelajaran</Label>
                <Select
                  value={formData.dayOfWeek}
                  onValueChange={(val) => val && setFormData(prev => ({ ...prev, dayOfWeek: val }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Senin</SelectItem>
                    <SelectItem value="2">Selasa</SelectItem>
                    <SelectItem value="3">Rabu</SelectItem>
                    <SelectItem value="4">Kamis</SelectItem>
                    <SelectItem value="5">Jumat</SelectItem>
                    <SelectItem value="6">Sabtu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Jam Masuk & Jam Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jam Mulai</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="border-slate-200 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {isEdit ? 'Simpan Perubahan' : 'Tambah Jadwal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
