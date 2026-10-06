'use client'

import React, { useState, useMemo } from 'react'
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
  UserCheck,
  ChevronRight,
  Eye,
  BookCheck,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { 
  mergeConsecutiveSchedules, 
  findJournalForSchedule, 
  DAYS_NAME 
} from '@/lib/schedule-utils'
import { SortableTableHead, useSorting } from '@/components/SortableTableHead'

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
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [historyClassFilter, setHistoryClassFilter] = useState('ALL')
  const [scheduleDayFilter, setScheduleDayFilter] = useState('ALL')
  const [scheduleClassFilter, setScheduleClassFilter] = useState('ALL')

  // Selection state for tables
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([])
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([])

  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    material: '',
    notes: '',
    scheduleId: '',
    teacherId: ''
  })

  const userRolesList = [userRole, (session?.user as any)?.subRole, (session?.user as any)?.subRole2].filter(Boolean)
  const isSupervisorRole = userRolesList.some(r => ['KEPALA_SEKOLAH', 'SUPERADMIN', 'ADMIN_IT', 'KURIKULUM'].includes(r))

  // 1. Ambil jadwal mengajar khusus guru yang sedang login
  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['my-schedules-journal-view', userId],
    queryFn: async () => {
      const url = userId ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jadwal')
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  // Filter jadwal eksklusif untuk guru aktif
  const allSchedulesList = Array.isArray(schedules) ? schedules : []
  const myRawSchedules = allSchedulesList.filter(s => {
    if (!userId) return true
    return (
      s?.teacher?.userId === userId || 
      s?.teacher?.user?.email === session?.user?.email || 
      (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username)
    )
  })

  // Menggabungkan jadwal yang berurutan (maksimal 3 JP per sesi KBM)
  const mySchedules = useMemo(() => {
    return mergeConsecutiveSchedules(myRawSchedules, 3)
  }, [myRawSchedules])

  // Menghitung Timestamp Pembaruan Terakhir Jadwal Guru
  const schedulesLastUpdated = useMemo(() => {
    if (!myRawSchedules || myRawSchedules.length === 0) return null
    const timestamps = myRawSchedules
      .map((s: any) => {
        const time = new Date(s.updatedAt || s.createdAt || 0).getTime()
        return isNaN(time) ? 0 : time
      })
      .filter((t: number) => t > 0)
    if (timestamps.length === 0) return null
    return new Date(Math.max(...timestamps))
  }, [myRawSchedules])

  const formatScheduleUpdateTime = (dateInput?: string | Date | null) => {
    if (!dateInput) return 'Belum Diperbarui'
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
      if (isNaN(d.getTime()) || d.getTime() === 0) return 'Belum Diperbarui'
      return (
        new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(d) + ' WIB'
      )
    } catch {
      return 'Belum Diperbarui'
    }
  }

  // 2. Ambil riwayat jurnal mengajar milik guru yang sedang login
  const { data: rawJournals, isLoading: loadingJournals } = useQuery<any[]>({
    queryKey: ['my-teaching-journals', userId],
    queryFn: async () => {
      const url = userId ? `/api-backend/teaching-journals?userId=${userId}` : '/api-backend/teaching-journals'
      const res = await authenticatedFetch(url)
      if (!res.ok) throw new Error('Gagal memuat jurnal mengajar')
      return res.json()
    },
    enabled: !!userId || status === 'authenticated'
  })

  const myJournals = Array.isArray(rawJournals) ? rawJournals : []

  // Hitung jadwal hari ini
  const todayDayOfWeek = new Date().getDay()
  const todayDateString = new Date().toISOString().split('T')[0]

  // Jadwal Hari Ini terfilter (hasil merge)
  const todaySchedules = useMemo(() => {
    return mySchedules.filter(s => Number(s.dayOfWeek) === todayDayOfWeek)
  }, [mySchedules, todayDayOfWeek])

  // Opsi Kelas untuk Filter
  const availableClassOptions = useMemo(() => {
    const classMap = new Map<string, string>()
    mySchedules.forEach(s => {
      const cName = s.class?.name
      const cId = s.classId || s.class?.id || cName
      if (cName && cId) {
        classMap.set(cId, cName)
      }
    })
    return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }))
  }, [mySchedules])

  // Filter Riwayat Jurnal
  const filteredJournals = useMemo(() => {
    return myJournals.filter(j => {
      if (historyClassFilter === 'ALL') return true
      const cId = j.schedule?.classId || j.schedule?.class?.id || j.schedule?.class?.name
      return cId === historyClassFilter
    })
  }, [myJournals, historyClassFilter])

  // Filter Jadwal Mingguan
  const filteredWeeklySchedules = useMemo(() => {
    return mySchedules.filter(s => {
      const matchDay = scheduleDayFilter === 'ALL' || String(s.dayOfWeek) === scheduleDayFilter
      const cId = s.classId || s.class?.id || s.class?.name
      const matchClass = scheduleClassFilter === 'ALL' || cId === scheduleClassFilter
      return matchDay && matchClass
    })
  }, [mySchedules, scheduleDayFilter, scheduleClassFilter])

  // Cek apakah jurnal hari ini sudah diisi untuk schedule tertentu
  const getTodayJournalForSchedule = (schedule: any) => {
    return findJournalForSchedule(schedule, myJournals, todayDateString)
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
      queryClient.invalidateQueries({ queryKey: ['my-teaching-journals'] })
      setOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/teaching-journals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus jurnal')
      return res.json()
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['my-teaching-journals'] })
      setSelectedJournalIds(prev => prev.filter(item => item !== deletedId))
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

  const { sortConfig: journalSort, handleSort: handleJournalSort, sortedItems: sortedJournals } = useSorting(filteredJournals)
  const searchedJournals = filterDataBySearch(sortedJournals, searchQuery)

  const { sortConfig: scheduleSort, handleSort: handleScheduleSort, sortedItems: sortedSchedules } = useSorting(filteredWeeklySchedules)
  const searchedWeeklySchedules = filterDataBySearch(sortedSchedules, searchQuery)

  // Selection Helpers - Journals
  const handleSelectAllJournals = () => {
    if (selectedJournalIds.length === searchedJournals.length) {
      setSelectedJournalIds([])
    } else {
      setSelectedJournalIds(searchedJournals.map(j => j.id))
    }
  }

  const handleToggleJournalSelect = (id: string) => {
    setSelectedJournalIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Selection Helpers - Schedules
  const handleSelectAllSchedules = () => {
    if (selectedScheduleIds.length === searchedWeeklySchedules.length) {
      setSelectedScheduleIds([])
    } else {
      setSelectedScheduleIds(searchedWeeklySchedules.map(s => s.id))
    }
  }

  const handleToggleScheduleSelect = (id: string) => {
    setSelectedScheduleIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Bulk Delete
  const handleBulkDeleteJournals = async () => {
    if (selectedJournalIds.length === 0) return
    if (confirm(`Yakin ingin menghapus ${selectedJournalIds.length} jurnal terpilih?`)) {
      for (const id of selectedJournalIds) {
        await deleteMutation.mutateAsync(id)
      }
      setSelectedJournalIds([])
    }
  }

  return (
    <div className="space-y-5">
      {/* Clean Institutional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Jurnal Mengajar Guru
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan materi KBM dan absensi siswa terintegrasi jadwal aktif.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {session?.user && (
            <div className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Guru:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.user?.name}</span>
            </div>
          )}
          {isSupervisorRole && (
            <Link href="/akademik/supervisi-jurnal">
              <Button variant="outline" size="sm" className="text-xs h-9 font-medium border-slate-300 dark:border-slate-700">
                <BookCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Supervisi Kurikulum
              </Button>
            </Link>
          )}
          <Link href="/akademik/jurnal-mengajar/tambah">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-3.5 shadow-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Isi Jurnal Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'today'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Jadwal KBM Hari Ini
          {todaySchedules.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {todaySchedules.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Riwayat Jurnal Mengajar
          {myJournals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {myJournals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all-schedules')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'all-schedules'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Semua Jadwal Mingguan
          {mySchedules.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {mySchedules.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content 1: Jadwal Hari Ini */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Agenda Mengajar Hari Ini
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sesi JP bersambung otomatis digabung dalam 1 lembar jurnal KBM.
            </p>
          </div>

          {loadingSchedules ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
              <p className="text-xs">Memuat agenda mengajar hari ini...</p>
            </div>
          ) : todaySchedules.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800 shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 stroke-[1.5]" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Tidak Ada Jadwal Mengajar Hari Ini</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Hari ini Anda tidak memiliki agenda kelas aktif pada hari {DAYS_NAME[todayDayOfWeek]}.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveTab('all-schedules')} 
                  className="mt-3 text-xs font-semibold h-8"
                >
                  Lihat Jadwal Hari Lain
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {todaySchedules.map((schedule) => {
                const filledJournal = getTodayJournalForSchedule(schedule)
                return (
                  <Card 
                    key={schedule.id} 
                    className={`relative overflow-hidden border shadow-none transition-colors rounded-xl flex flex-col justify-between ${
                      filledJournal 
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="p-4 space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            Kelas {schedule.class?.name || '-'}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {schedule.startTime} - {schedule.endTime}
                            {schedule.totalPeriods > 1 && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800">
                                {schedule.totalPeriods} JP
                              </span>
                            )}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {schedule.subject?.name || 'Mata Pelajaran'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Kode: <span className="font-mono font-medium">{schedule.subject?.code || '-'}</span>
                        </p>

                        {filledJournal ? (
                          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Jurnal & Presensi Terisi
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 line-clamp-2 text-xs">
                              <strong className="font-medium text-slate-800 dark:text-slate-200">Materi:</strong> {filledJournal.material}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Belum diisi untuk sesi KBM hari ini.
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {filledJournal ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetailDialog(filledJournal, schedule)}
                              className="flex-1 text-xs font-semibold h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200 dark:border-slate-700"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Lihat
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditDialog(filledJournal)}
                              className="flex-1 text-xs font-semibold h-8 border-slate-200 dark:border-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-300" />
                              Ubah
                            </Button>
                          </div>
                        ) : (
                          <Link 
                            href={`/akademik/jurnal-mengajar/tambah?scheduleId=${schedule.id}&date=${todayDateString}`}
                            className="w-full block"
                          >
                            <Button 
                              size="sm" 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shadow-none"
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
        <Card className="shadow-none border-slate-200 dark:border-slate-800 rounded-xl">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Riwayat Jurnal Mengajar
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar rekaman materi pembelajaran dan absensi siswa yang telah dilaksanakan.
              </CardDescription>
            </div>
            
            {/* Searchbar & Filter Bersebelahan (Rule 16) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-64">
                <TableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari materi / mapel..."
                />
              </div>

              <div className="w-36">
                <Select value={historyClassFilter} onValueChange={(val) => setHistoryClassFilter(val || 'ALL')}>
                  <SelectTrigger className="h-9 text-xs">
                    <Filter className="w-3 h-3 mr-1 text-slate-400" />
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {availableClassOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedJournalIds.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDeleteJournals} 
                  className="h-9 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Hapus ({selectedJournalIds.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  {/* Checkbox Header (Rule 16) */}
                  <TableHead className="w-10 pl-4 pr-2">
                    <button 
                      type="button" 
                      onClick={handleSelectAllJournals}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      {selectedJournalIds.length > 0 && selectedJournalIds.length === searchedJournals.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-12">No</TableHead>
                  <SortableTableHead sortConfig={journalSort} onSort={handleJournalSort} sortKey="date">Tanggal</SortableTableHead>
                  <SortableTableHead sortConfig={journalSort} onSort={handleJournalSort} sortKey="schedule.class.name">Kelas</SortableTableHead>
                  <SortableTableHead sortConfig={journalSort} onSort={handleJournalSort} sortKey="schedule.subject.name">Mata Pelajaran</SortableTableHead>
                  <SortableTableHead sortConfig={journalSort} onSort={handleJournalSort} sortKey="material">Materi Pembelajaran</SortableTableHead>
                  <SortableTableHead sortConfig={journalSort} onSort={handleJournalSort} sortKey="notes">Catatan</SortableTableHead>
                  <TableHead className="text-right pr-4 w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingJournals ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mb-1.5 text-blue-600" />
                        <span className="text-xs">Memuat riwayat jurnal...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedJournals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-10 text-xs">
                      {searchQuery || historyClassFilter !== 'ALL' ? 'Tidak ada jurnal yang sesuai dengan filter pencarian.' : 'Belum ada data jurnal mengajar yang Anda isi.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedJournals.map((jurnal, index) => {
                    const isSelected = selectedJournalIds.includes(jurnal.id)
                    return (
                      <TableRow key={jurnal.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {/* Checkbox Row (Rule 16) */}
                        <TableCell className="pl-4 pr-2">
                          <button 
                            type="button" 
                            onClick={() => handleToggleJournalSelect(jurnal.id)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {format(new Date(jurnal.date), 'dd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            Kelas {jurnal.schedule?.class?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                          {jurnal.schedule?.subject?.name || '-'}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate font-medium text-slate-900 dark:text-white" title={jurnal.material}>
                          {jurnal.material}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 italic max-w-[180px] truncate" title={jurnal.notes}>
                          {jurnal.notes || '-'}
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenDetailDialog(jurnal)} 
                              className="text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 h-7 w-7"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleOpenEditDialog(jurnal)} 
                              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-7 w-7"
                              title="Ubah Jurnal"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(jurnal.id)} 
                              disabled={deleteMutation.isPending} 
                              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 h-7 w-7"
                              title="Hapus Jurnal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab Content 3: Semua Jadwal Mingguan */}
      {activeTab === 'all-schedules' && (
        <Card className="shadow-none border-slate-200 dark:border-slate-800 rounded-xl">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Jadwal Mengajar Mingguan
              </CardTitle>
              <CardDescription className="text-xs flex flex-wrap items-center gap-1.5 mt-0.5">
                <span>Rincian jam dan kelas mengajar yang diampu (sesi JP bersambung terpadu).</span>
                {schedulesLastUpdated && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Update: <strong className="text-slate-800 dark:text-slate-200">{formatScheduleUpdateTime(schedulesLastUpdated)}</strong>
                    </span>
                  </>
                )}
              </CardDescription>
            </div>

            {/* Searchbar & Filter Bersebelahan (Rule 16) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-56">
                <TableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari hari / mapel..."
                />
              </div>

              <div className="w-32">
                <Select value={scheduleDayFilter} onValueChange={(val) => setScheduleDayFilter(val || 'ALL')}>
                  <SelectTrigger className="h-9 text-xs">
                    <Filter className="w-3 h-3 mr-1 text-slate-400" />
                    <SelectValue placeholder="Semua Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Hari</SelectItem>
                    {DAYS_NAME.map((day, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-32">
                <Select value={scheduleClassFilter} onValueChange={(val) => setScheduleClassFilter(val || 'ALL')}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {availableClassOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  {/* Checkbox Header (Rule 16) */}
                  <TableHead className="w-10 pl-4 pr-2">
                    <button 
                      type="button" 
                      onClick={handleSelectAllSchedules}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      {selectedScheduleIds.length > 0 && selectedScheduleIds.length === searchedWeeklySchedules.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <SortableTableHead sortConfig={scheduleSort} onSort={handleScheduleSort} sortKey="dayOfWeek">Hari</SortableTableHead>
                  <SortableTableHead sortConfig={scheduleSort} onSort={handleScheduleSort} sortKey="startTime">Waktu / Alokasi</SortableTableHead>
                  <SortableTableHead sortConfig={scheduleSort} onSort={handleScheduleSort} sortKey="class.name">Kelas</SortableTableHead>
                  <SortableTableHead sortConfig={scheduleSort} onSort={handleScheduleSort} sortKey="subject.name">Mata Pelajaran</SortableTableHead>
                  <TableHead className="text-right pr-4 w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSchedules ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mb-1.5 text-blue-600" />
                        <span className="text-xs">Memuat jadwal mingguan...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedWeeklySchedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-10 text-xs">
                      {searchQuery || scheduleDayFilter !== 'ALL' || scheduleClassFilter !== 'ALL' ? 'Tidak ada jadwal yang sesuai pencarian.' : 'Belum ada jadwal mengajar yang dialokasikan untuk Anda.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedWeeklySchedules.map((item) => {
                    const isSelected = selectedScheduleIds.includes(item.id)
                    return (
                      <TableRow key={item.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs ${isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}`}>
                        {/* Checkbox Row (Rule 16) */}
                        <TableCell className="pl-4 pr-2">
                          <button 
                            type="button" 
                            onClick={() => handleToggleScheduleSelect(item.id)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                          {DAYS_NAME[item.dayOfWeek]}
                        </TableCell>
                        <TableCell className="font-mono text-slate-700 dark:text-slate-300">
                          <span>{item.startTime} - {item.endTime}</span>
                          {item.totalPeriods > 1 && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {item.totalPeriods} JP
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            Kelas {item.class?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          {item.subject?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Link href={`/akademik/jurnal-mengajar/tambah?scheduleId=${item.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 font-semibold text-blue-600 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                              Isi Jurnal
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog Detail Jurnal (Read-Only) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Detail Jurnal Mengajar
            </DialogTitle>
            <DialogDescription className="text-xs">
              Catatan materi ajar dan pelaksanaan KBM Anda di kelas.
            </DialogDescription>
          </DialogHeader>

          {selectedDetailJournal && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] text-slate-500 block">Tanggal KBM</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {selectedDetailJournal.date ? format(new Date(selectedDetailJournal.date), 'EEEE, dd MMMM yyyy', { locale: localeId }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Kelas & Mapel</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    Kelas {selectedDetailJournal.schedule?.class?.name || '-'} &bull; {selectedDetailJournal.schedule?.subject?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Jam Pelajaran</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {selectedDetailJournal.schedule?.startTime} - {selectedDetailJournal.schedule?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Topik / Materi Pembelajaran</Label>
                <div className="mt-1 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs">
                  {selectedDetailJournal.material || '-'}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Catatan KBM / Evaluasi</Label>
                <div className="mt-1 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 italic text-xs">
                  {selectedDetailJournal.notes || 'Tidak ada catatan tambahan.'}
                </div>
              </div>

              {selectedDetailJournal.photoUrl && (
                <div>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Dokumentasi KBM</Label>
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedDetailJournal.photoUrl} alt="Dokumentasi KBM" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)} className="text-xs h-8">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Jurnal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Ubah Jurnal Mengajar</DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui rincian topik materi ajar yang disampaikan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5 py-3 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal KBM</Label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Materi Pembelajaran</Label>
                <Input 
                  value={formData.material} 
                  onChange={e => setFormData({...formData, material: e.target.value})} 
                  placeholder="Topik materi yang diajarkan..." 
                  required 
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catatan Khusus (Opsional)</Label>
                <Input 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  placeholder="Catatan tambahan selama KBM..." 
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs h-8">Batal</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending} className="bg-blue-600 font-semibold text-xs h-8">
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
