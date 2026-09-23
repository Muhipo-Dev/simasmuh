'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  ChevronRight,
  Eye,
  User
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { SortableTableHead, useSorting } from '@/components/SortableTableHead'

const DAYS_NAME = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export default function JurnalMengajarPage() {
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id
  const userRole = (session?.user as any)?.role
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'all-schedules'>('today')
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDetailJournal, setSelectedDetailJournal] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL')
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    material: '',
    notes: '',
    scheduleId: '',
    teacherId: ''
  })

  const userRolesList = [userRole, (session?.user as any)?.subRole, (session?.user as any)?.subRole2].filter(Boolean)
  const isExecutiveSupervisor = userRolesList.some(r => ['KEPALA_SEKOLAH', 'SUPERADMIN', 'ADMIN_IT', 'KURIKULUM'].includes(r))
  const isKepalaSekolah = userRolesList.includes('KEPALA_SEKOLAH')

  // 1. Ambil seluruh jadwal mengajar
  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules-journal-view', isExecutiveSupervisor ? 'all' : userId],
    queryFn: async () => {
      const url = (!isExecutiveSupervisor && userId) ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jadwal')
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  // Filter jadwal eksklusif untuk guru aktif (atau semua jika supervisor)
  const allSchedulesList = Array.isArray(schedules) ? schedules : []
  const mySchedules = allSchedulesList.filter(s => {
    if (isExecutiveSupervisor) return true
    return (
      s?.teacher?.userId === userId || 
      s?.teacher?.user?.email === session?.user?.email || 
      (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username)
    )
  })

  // 2. Ambil riwayat jurnal mengajar
  const { data: rawJournals, isLoading: loadingJournals } = useQuery<any[]>({
    queryKey: ['teaching-journals', isExecutiveSupervisor ? 'all' : userId],
    queryFn: async () => {
      const url = (!isExecutiveSupervisor && userId) ? `/api-backend/teaching-journals?userId=${userId}` : '/api-backend/teaching-journals'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jurnal mengajar')
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  const myJournals = Array.isArray(rawJournals) ? rawJournals : []

  // Ambil opsi guru & kelas unik untuk filter supervisor
  const teacherOptions = Array.from(
    new Map(
      allSchedulesList
        .filter(s => s?.teacher?.id)
        .map(s => [s.teacher.id, { id: s.teacher.id, name: s.teacher.user?.name || s.teacher.name || 'Guru' }])
    ).values()
  )

  const classOptions = Array.from(
    new Map(
      allSchedulesList
        .filter(s => s?.class?.id)
        .map(s => [s.class.id, { id: s.class.id, name: s.class.name }])
    ).values()
  )

  // Hitung jadwal hari ini
  const todayDayOfWeek = new Date().getDay()
  const todayDateString = new Date().toISOString().split('T')[0]

  const parseTimeToMinutes = (t: string | undefined | null): number => {
    if (!t) return 0
    const clean = t.replace('.', ':').trim()
    const parts = clean.split(':')
    const hours = parseInt(parts[0] || '0', 10) || 0
    const minutes = parseInt(parts[1] || '0', 10) || 0
    return hours * 60 + minutes
  }

  // Jadwal Hari Ini terfilter
  const todaySchedules = mySchedules
    .filter(s => Number(s.dayOfWeek) === todayDayOfWeek)
    .filter(s => selectedTeacherFilter === 'ALL' || s.teacherId === selectedTeacherFilter || s.teacher?.id === selectedTeacherFilter)
    .filter(s => selectedClassFilter === 'ALL' || s.classId === selectedClassFilter || s.class?.id === selectedClassFilter)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime))

  // Jadwal Mingguan Lengkap terfilter
  const allWeeklySchedules = [...mySchedules]
    .filter(s => selectedTeacherFilter === 'ALL' || s.teacherId === selectedTeacherFilter || s.teacher?.id === selectedTeacherFilter)
    .filter(s => selectedClassFilter === 'ALL' || s.classId === selectedClassFilter || s.class?.id === selectedClassFilter)
    .sort((a, b) => {
      if ((a.dayOfWeek ?? 1) !== (b.dayOfWeek ?? 1)) {
        return (a.dayOfWeek ?? 1) - (b.dayOfWeek ?? 1)
      }
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    })

  // Cek apakah jurnal hari ini sudah diisi untuk scheduleId tertentu
  const getTodayJournalForSchedule = (scheduleId: string) => {
    return myJournals.find(j => {
      const jDateStr = new Date(j.date).toISOString().split('T')[0]
      return j.scheduleId === scheduleId && jDateStr === todayDateString
    })
  }

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (updatedJournal: any) => {
      const { id, ...payload } = updatedJournal
      const res = await authenticatedFetch(`/api-backend/teaching-journals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-journals'] })
      setOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/teaching-journals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-journals'] })
    }
  })

  const handleOpenDetailDialog = (journalItem: any, fallbackSchedule?: any) => {
    setSelectedDetailJournal({
      ...journalItem,
      schedule: journalItem?.schedule || fallbackSchedule
    })
    setDetailOpen(true)
  }

  const handleOpenEditDialog = (item: any) => {
    setFormData({ 
      id: item.id, 
      date: new Date(item.date).toISOString().split('T')[0], 
      material: item.material || '', 
      notes: item.notes || '', 
      scheduleId: item.scheduleId || '', 
      teacherId: item.teacherId || '' 
    })
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus catatan jurnal ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      ...formData,
      date: new Date(formData.date).toISOString()
    })
  }

  const { sortConfig, handleSort, sortedItems: sortedJournals } = useSorting(myJournals)
  const searchedJournals = filterDataBySearch(sortedJournals, searchQuery)
  const searchedWeeklySchedules = filterDataBySearch(allWeeklySchedules, searchQuery)

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 opacity-90" />
            {isExecutiveSupervisor ? 'Supervisi Jurnal Mengajar Guru' : 'Jurnal Mengajar Guru'}
          </h1>
          <p className="text-blue-100 mt-1.5 text-sm sm:text-base">
            {isExecutiveSupervisor
              ? 'Monitoring pelaksanaan KBM, topik materi pembelajaran, dan rekap pengisian jurnal seluruh guru.'
              : 'Otomatis terhubung dengan jadwal mengajar harian Anda untuk pengisian materi KBM & presensi siswa.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {session?.user && (
            <div className="bg-white/10 dark:bg-slate-900/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-300 shrink-0" />
              <div className="text-xs sm:text-sm">
                <div className="text-blue-200 font-medium">
                  {isExecutiveSupervisor ? 'Supervisor:' : 'Akun Guru:'}
                </div>
                <div className="font-bold text-white tracking-wide">{session?.user?.name}</div>
              </div>
            </div>
          )}
          {!isExecutiveSupervisor && (
            <Link href="/akademik/jurnal-mengajar/tambah">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md h-10 px-4">
                <Plus className="w-4 h-4 mr-2" />
                Isi Jurnal Baru
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Supervisor Bar (Jika Kepala Sekolah / Kurikulum / Superadmin) */}
      {isExecutiveSupervisor && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Filter Supervisi KBM:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Guru */}
                <select
                  aria-label="Filter Guru"
                  value={selectedTeacherFilter}
                  onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                  className="rounded-xl text-xs h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">Semua Guru Pengampu</option>
                  {teacherOptions.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Filter Kelas */}
                <select
                  aria-label="Filter Kelas"
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="rounded-xl text-xs h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classOptions.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>

                {(selectedTeacherFilter !== 'ALL' || selectedClassFilter !== 'ALL') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTeacherFilter('ALL')
                      setSelectedClassFilter('ALL')
                    }}
                    className="h-9 text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`pb-3 px-4 font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'today'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          {isExecutiveSupervisor ? 'Monitoring KBM Hari Ini' : 'Jadwal KBM Hari Ini'}
          {todaySchedules.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {todaySchedules.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {isExecutiveSupervisor ? 'Log Jurnal Seluruh Guru' : 'Riwayat Jurnal Mengajar'}
          {myJournals.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {myJournals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all-schedules')}
          className={`pb-3 px-4 font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'all-schedules'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {isExecutiveSupervisor ? 'Jadwal Mingguan Sekolah' : 'Semua Jadwal Mingguan'}
        </button>
      </div>

      {/* Tab Content 1: Jadwal Hari Ini */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{isExecutiveSupervisor ? 'Monitoring KBM Hari Ini' : 'Agenda Mengajar Hari Ini'}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isExecutiveSupervisor
                  ? 'Pantau real-time keterisian materi ajar dan presensi kelas oleh para guru hari ini.'
                  : 'Klik tombol "Isi Jurnal & Presensi" untuk langsung merekam materi ajar dan absensi siswa di kelas bersangkutan.'}
              </p>
            </div>
          </div>

          {loadingSchedules ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-7 h-7 animate-spin mb-2 text-blue-600" />
              <p className="text-sm">Menyiapkan jadwal mengajar hari ini...</p>
            </div>
          ) : todaySchedules.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3 stroke-[1.5]" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Tidak Ada Jadwal Mengajar Hari Ini</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1">
                  Hari ini tidak ada agenda kelas aktif di sistem pada hari {DAYS_NAME[todayDayOfWeek]}.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveTab('all-schedules')} 
                  className="mt-4 text-xs font-semibold"
                >
                  Lihat Jadwal Hari Lain
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaySchedules.map((schedule) => {
                const filledJournal = getTodayJournalForSchedule(schedule.id)
                return (
                  <Card 
                    key={schedule.id} 
                    className={`relative overflow-hidden border shadow-xs transition-all ${
                      filledJournal 
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Kelas {schedule.class?.name || '-'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {schedule.startTime} - {schedule.endTime}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                          {schedule.subject?.name || 'Mata Pelajaran'}
                        </h3>
                        {isExecutiveSupervisor && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 font-semibold mt-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{schedule.teacher?.user?.name || schedule.teacher?.name || 'Guru Pengampu'}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Kode: <span className="font-mono">{schedule.subject?.code || '-'}</span>
                        </p>

                        {filledJournal ? (
                          <div className="mt-3 p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Jurnal & Presensi Terisi
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                              <strong className="font-medium">Materi:</strong> {filledJournal.material}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            {isExecutiveSupervisor ? 'Belum diisi oleh guru pengampu.' : 'Belum diisi untuk sesi KBM hari ini.'}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {filledJournal ? (
                          <div className="flex items-center gap-2">
                            {isKepalaSekolah ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetailDialog(filledJournal, schedule)}
                                className="w-full text-xs font-semibold h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Lihat Detail KBM
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditDialog(filledJournal)}
                                className="w-full text-xs font-semibold h-8"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                Ubah Jurnal
                              </Button>
                            )}
                          </div>
                        ) : isExecutiveSupervisor ? (
                          <div className="text-center py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500">
                            Menunggu Pengisian Guru
                          </div>
                        ) : (
                          <Link 
                            href={`/akademik/jurnal-mengajar/tambah?scheduleId=${schedule.id}&date=${todayDateString}`}
                            className="w-full block"
                          >
                            <Button 
                              size="sm" 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 shadow-xs"
                            >
                              Isi Jurnal & Presensi
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Riwayat Jurnal Mengajar */}
      {activeTab === 'history' && (
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">
                {isExecutiveSupervisor ? 'Log Supervisi Seluruh Jurnal Mengajar Guru' : 'Riwayat Jurnal Mengajar'}
              </CardTitle>
              <CardDescription>
                {isExecutiveSupervisor 
                  ? 'Daftar materi dan jurnal mengajar seluruh guru yang telah tersimpan di sistem.'
                  : 'Catatan seluruh materi pembelajaran yang telah Anda laksanakan.'}
              </CardDescription>
            </div>
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari materi / kelas..."
            />
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="pl-6 w-[70px]">No</TableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="date">Tanggal</SortableTableHead>
                  {isExecutiveSupervisor && (
                    <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="schedule.teacher.user.name">Guru Pengampu</SortableTableHead>
                  )}
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="schedule.class.name">Kelas</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="schedule.subject.name">Mata Pelajaran</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="material">Materi Pembelajaran</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="notes">Catatan</SortableTableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingJournals ? (
                  <TableRow>
                    <TableCell colSpan={isExecutiveSupervisor ? 8 : 7} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                        Memuat riwayat jurnal...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedJournals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isExecutiveSupervisor ? 8 : 7} className="text-center text-slate-500 py-10">
                      {searchQuery ? 'Tidak ada jurnal yang sesuai dengan pencarian.' : 'Belum ada data jurnal mengajar.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedJournals.map((jurnal, index) => (
                    <TableRow key={jurnal.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {format(new Date(jurnal.date), 'dd MMM yyyy', { locale: localeId })}
                      </TableCell>
                      {isExecutiveSupervisor && (
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                          {jurnal.schedule?.teacher?.user?.name || jurnal.schedule?.teacher?.name || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          {jurnal.schedule?.class?.name || 'Kelas'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                        {jurnal.schedule?.subject?.name || '-'}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate font-medium text-slate-900 dark:text-white">
                        {jurnal.material}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 italic max-w-[180px] truncate">
                        {jurnal.notes || '-'}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-2">
                          {isKepalaSekolah ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleOpenDetailDialog(jurnal)} 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2.5 text-xs font-bold"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Detail
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleOpenEditDialog(jurnal)} 
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(jurnal.id)} 
                                disabled={deleteMutation.isPending} 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab Content 3: Semua Jadwal Mingguan */}
      {activeTab === 'all-schedules' && (
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">
                {isExecutiveSupervisor ? 'Master Jadwal Mengajar Mingguan Sekolah' : 'Daftar Jadwal Mengajar Mingguan'}
              </CardTitle>
              <CardDescription>
                {isExecutiveSupervisor 
                  ? 'Struktur jadwal alokasi guru, mata pelajaran, dan kelas dalam sepekan.'
                  : 'Rincian seluruh jam dan kelas mengajar Anda pada semester aktif.'}
              </CardDescription>
            </div>
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari kelas / mapel..."
            />
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="pl-6">Hari</TableHead>
                  <TableHead>Waktu</TableHead>
                  {isExecutiveSupervisor && <TableHead>Guru Pengampu</TableHead>}
                  <TableHead>Kelas</TableHead>
                  <TableHead>Mata Pelajaran</TableHead>
                  {!isExecutiveSupervisor && <TableHead className="text-right pr-6">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSchedules ? (
                  <TableRow>
                    <TableCell colSpan={isExecutiveSupervisor ? 5 : 6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                        Memuat jadwal mingguan...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedWeeklySchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isExecutiveSupervisor ? 5 : 6} className="text-center text-slate-500 py-10">
                      {searchQuery ? 'Tidak ada jadwal yang sesuai pencarian.' : 'Belum ada jadwal mengajar yang dialokasikan.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedWeeklySchedules.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-bold text-slate-900 dark:text-slate-100">
                        <span className="inline-block py-0.5 px-2.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs">
                          {DAYS_NAME[item.dayOfWeek]}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.startTime} - {item.endTime}
                      </TableCell>
                      {isExecutiveSupervisor && (
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                          {item.teacher?.user?.name || item.teacher?.name || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.class?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {item.subject?.name || '-'}
                      </TableCell>
                      {!isExecutiveSupervisor && (
                        <TableCell className="text-right pr-6">
                          <Link href={`/akademik/jurnal-mengajar/tambah?scheduleId=${item.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-8 font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50">
                              Isi Jurnal
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Detail Supervisi Jurnal (Read-Only) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Detail Supervisi KBM
            </DialogTitle>
            <DialogDescription>
              Informasi catatan pembelajaran dan materi KBM oleh guru pengampu.
            </DialogDescription>
          </DialogHeader>

          {selectedDetailJournal && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 block">Guru Pengampu</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedDetailJournal.schedule?.teacher?.user?.name || selectedDetailJournal.schedule?.teacher?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Tanggal KBM</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedDetailJournal.date ? format(new Date(selectedDetailJournal.date), 'EEEE, dd MMMM yyyy', { locale: localeId }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Kelas & Mapel</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    Kelas {selectedDetailJournal.schedule?.class?.name || '-'} &bull; {selectedDetailJournal.schedule?.subject?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Jam Pelajaran</span>
                  <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {selectedDetailJournal.schedule?.startTime} - {selectedDetailJournal.schedule?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Topik / Materi Pembelajaran</Label>
                <div className="mt-1 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                  {selectedDetailJournal.material || '-'}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catatan KBM / Evaluasi</Label>
                <div className="mt-1 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic text-xs">
                  {selectedDetailJournal.notes || 'Tidak ada catatan tambahan.'}
                </div>
              </div>

              {selectedDetailJournal.photoUrl && (
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Dokumentasi KBM</Label>
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedDetailJournal.photoUrl} alt="Dokumentasi KBM" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Jurnal (Khusus Guru Pengampu) */}
      {!isKepalaSekolah && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Ubah Jurnal Mengajar</DialogTitle>
                <DialogDescription>
                  Perbarui rincian topik materi ajar yang disampaikan.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tanggal KBM</Label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Materi Pembelajaran</Label>
                  <Input 
                    value={formData.material} 
                    onChange={e => setFormData({...formData, material: e.target.value})} 
                    placeholder="Topik materi yang diajarkan..." 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Catatan Khusus (Opsional)</Label>
                  <Input 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Catatan tambahan selama KBM..." 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 font-bold">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
