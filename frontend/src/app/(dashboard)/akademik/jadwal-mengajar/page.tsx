'use client'

import React, { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/TablePagination'
import { TableSearch } from '@/components/TableSearch'
import {
  CalendarDays,
  Clock,
  BookOpen,
  GraduationCap,
  Users,
  User,
  Filter,
  Printer,
  Table as TableIcon,
  LayoutGrid,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react'
import { mergeConsecutiveSchedules, parseTimeToMinutes, DAYS_NAME } from '@/lib/schedule-utils'

const DAYS_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
}

const ACTIVE_DAYS = [1, 2, 3, 4, 5]

export default function JadwalMengajarPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const userRole = user?.role || 'GURU'
  const userRolesList = [userRole, user?.subRole, user?.subRole2, user?.subRole3].filter(Boolean)
  const isSuperAdmin = userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'KURIKULUM', 'KEPALA_SEKOLAH'].includes(r))

  const authenticatedFetch = useAuthenticatedFetch()

  // View Mode: 'table' (Tabel Matriks Guru) | 'cards' (Kartu Harian) | 'list' (Tabel Daftar Sesi)
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'list'>('table')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dayFilter, setDayFilter] = useState<string>('ALL')
  const [classFilter, setClassFilter] = useState<string>('ALL')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  // Drag-to-scroll gesture for Desktop matrix
  const matrixContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [startX, setStartX] = useState<number>(0)
  const [scrollLeft, setScrollLeft] = useState<number>(0)

  // Pagination for list view (Rule 20: 10 / 50 / 100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])

  // 1. Fetch Teachers List (untuk Superadmin / Kurikulum melihat jadwal guru lain)
  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ['teachers-list-schedule'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) return []
      return res.json()
    },
    enabled: isSuperAdmin,
    staleTime: 60000,
  })

  // 2. Fetch Profil Guru Pengampu yang sedang login
  const { data: myTeacherProfile } = useQuery<any>({
    queryKey: ['my-teacher-profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/teachers?userId=${userId}`)
      if (!res.ok) return null
      const data = await res.json()
      if (Array.isArray(data)) {
        return data.find((t: any) => t.userId === userId || t.user?.id === userId) || data[0] || null
      }
      return data
    },
    enabled: !!userId,
    staleTime: 60000,
  })

  // Target Teacher ID yang ditampilkan (Default: profil guru yang sedang login, atau pilihan Superadmin)
  const activeTeacherId = useMemo(() => {
    if (selectedTeacherId) return selectedTeacherId
    return myTeacherProfile?.id || ''
  }, [selectedTeacherId, myTeacherProfile])

  // 3. Fetch Jadwal Mengajar Guru
  const { data: rawSchedules = [], isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['teacher-schedules-hub', userId, activeTeacherId, isSuperAdmin],
    queryFn: async () => {
      let url = '/api-backend/schedules'
      if (activeTeacherId) {
        url = `/api-backend/schedules?teacherId=${activeTeacherId}`
      } else if (userId) {
        url = `/api-backend/schedules?userId=${userId}`
      }
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!userId,
  })

  // Filter jadwal khusus milik guru aktif
  const teacherRawSchedules = useMemo(() => {
    if (!Array.isArray(rawSchedules)) return []
    if (activeTeacherId) {
      return rawSchedules.filter((s: any) => s.teacherId === activeTeacherId || s.teacher?.id === activeTeacherId)
    }
    return rawSchedules.filter((s: any) => {
      return (
        s?.teacher?.userId === userId ||
        s?.teacher?.user?.email === user?.email ||
        (s?.teacher?.user?.username && s?.teacher?.user?.username === user?.username)
      )
    })
  }, [rawSchedules, activeTeacherId, userId, user])

  // Sesi mengajar yang digabungkan (maks 3 JP)
  const mergedTeachingSchedules = useMemo(() => {
    return mergeConsecutiveSchedules(teacherRawSchedules, 3)
  }, [teacherRawSchedules])

  // Info Guru yang sedang dilihat
  const viewingTeacher = useMemo(() => {
    if (myTeacherProfile && (!selectedTeacherId || selectedTeacherId === myTeacherProfile.id)) {
      return myTeacherProfile
    }
    if (activeTeacherId && teachers.length > 0) {
      const found = teachers.find((t: any) => t.id === activeTeacherId)
      if (found) return found
    }
    if (myTeacherProfile) return myTeacherProfile
    if (teacherRawSchedules.length > 0 && teacherRawSchedules[0]?.teacher) {
      return teacherRawSchedules[0].teacher
    }
    return null
  }, [activeTeacherId, selectedTeacherId, teachers, myTeacherProfile, teacherRawSchedules])

  // Daftar Pilihan Kelas yang diajar guru ini
  const taughtClasses = useMemo(() => {
    const map = new Map<string, any>()
    teacherRawSchedules.forEach((s: any) => {
      if (s.class && s.class.id) {
        map.set(s.class.id, s.class)
      }
    })
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [teacherRawSchedules])

  // Waktu Update Terakhir
  const lastUpdated = useMemo(() => {
    if (teacherRawSchedules.length === 0) return null
    const times = teacherRawSchedules
      .map((s: any) => new Date(s.updatedAt || s.createdAt || 0).getTime())
      .filter((t: number) => !isNaN(t) && t > 0)
    if (times.length === 0) return null
    return new Date(Math.max(...times))
  }, [teacherRawSchedules])

  const formatUpdateTime = (dateInput?: string | Date | null) => {
    if (!dateInput) return 'Belum Diperbarui'
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
      if (isNaN(d.getTime()) || d.getTime() === 0) return 'Belum Diperbarui'
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d) + ' WIB'
    } catch {
      return 'Belum Diperbarui'
    }
  }

  // Generate Slot Waktu Terurut untuk Tabel Matriks Guru
  const timeSlots = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string; startMinutes: number; endMinutes: number }>()
    teacherRawSchedules.forEach((sch: any) => {
      if (!sch.startTime || !sch.endTime) return
      const s = sch.startTime.trim()
      const e = sch.endTime.trim()
      const key = `${s}-${e}`
      if (!map.has(key)) {
        map.set(key, {
          startTime: s,
          endTime: e,
          startMinutes: parseTimeToMinutes(s),
          endMinutes: parseTimeToMinutes(e),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
      return a.endMinutes - b.endMinutes
    })
  }, [teacherRawSchedules])

  // Grouping Berdasarkan Hari (1: Senin s.d. 5: Jumat)
  const groupedByDay = useMemo(() => {
    const grouped: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    teacherRawSchedules.forEach((sch: any) => {
      const day = sch.dayOfWeek ?? 1
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(sch)
    })
    Object.keys(grouped).forEach((key) => {
      const d = Number(key)
      grouped[d].sort((a: any, b: any) => {
        const timeA = parseTimeToMinutes(a.startTime)
        const timeB = parseTimeToMinutes(b.startTime)
        if (timeA !== timeB) return timeA - timeB
        return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime)
      })
    })
    return grouped
  }, [teacherRawSchedules])

  // Filtered List untuk Tampilan Daftar Sesi (List View)
  const filteredListSchedules = useMemo(() => {
    return mergedTeachingSchedules.filter((item: any) => {
      const matchesSearch =
        !searchQuery ||
        (item.subject?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.class?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (DAYS_NAME[item.dayOfWeek] || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDay = dayFilter === 'ALL' || String(item.dayOfWeek) === dayFilter
      const matchesClass = classFilter === 'ALL' || item.classId === classFilter || item.class?.id === classFilter

      return matchesSearch && matchesDay && matchesClass
    })
  }, [mergedTeachingSchedules, searchQuery, dayFilter, classFilter])

  // Paginasi List View (Rule 20)
  const paginatedListSchedules = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredListSchedules.slice(start, start + pageSize)
  }, [filteredListSchedules, currentPage, pageSize])

  // Reset page saat filter berubah (Rule 20)
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  // Checkbox seleksi baris (Rule 16)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(paginatedListSchedules.map((s: any) => s.id))
    } else {
      setSelectedRowIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds(prev => [...prev, id])
    } else {
      setSelectedRowIds(prev => prev.filter(x => x !== id))
    }
  }

  // Hitung jumlah filter aktif
  const activeFiltersCount = (dayFilter !== 'ALL' ? 1 : 0) + (classFilter !== 'ALL' ? 1 : 0)

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase()
    if (['button', 'input', 'select', 'a'].includes(targetTag)) return
    if (!matrixContainerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - matrixContainerRef.current.offsetLeft)
    setScrollLeft(matrixContainerRef.current.scrollLeft)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !matrixContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - matrixContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    matrixContainerRef.current.scrollLeft = scrollLeft - walk
  }

  // Hitung Statistik Mengajar Guru
  const stats = useMemo(() => {
    const totalJP = teacherRawSchedules.length
    const totalClasses = taughtClasses.length
    const uniqueSubjects = new Set(teacherRawSchedules.map((s: any) => s.subject?.name).filter(Boolean)).size
    return { totalJP, totalClasses, uniqueSubjects }
  }, [teacherRawSchedules, taughtClasses])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-3 print:bg-white print:text-black">
      {/* Print Specific CSS Rules */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 10mm 12mm 10mm 12mm;
        }
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* DEDICATED OFFICIAL PRINT TEMPLATE */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:m-0 print:p-0">
        <div className="text-black border-b-[2.5px] border-black pb-2 mb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 flex items-center justify-center shrink-0">
              <img
                src="/images/logo-muhammadiyah.png"
                alt="Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none' }}
              />
            </div>
            <div className="text-center flex-1 space-y-0.5">
              <h4 className="text-[10px] font-bold tracking-wider uppercase">
                MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL
              </h4>
              <h3 className="text-xs font-bold tracking-wider uppercase">
                PIMPINAN DAERAH MUHAMMADIYAH PONOROGO
              </h3>
              <h2 className="text-base font-black tracking-wide uppercase">
                SMA MUHAMMADIYAH 1 PONOROGO
              </h2>
              <p className="text-[9.5px] text-gray-700">
                Alamat: Jl. Batoro Katong No. 130 Ponorogo, Jawa Timur 63411 | Telp: (0352) 481521
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mb-3">
          <h3 className="text-sm font-black uppercase underline tracking-wide">
            JADWAL MENGAJAR GURU
          </h3>
          <p className="text-xs font-bold text-gray-800 mt-0.5">
            Nama Guru: {viewingTeacher?.user?.name || viewingTeacher?.nip || session?.user?.name} | NIP/NBM: {viewingTeacher?.nip || viewingTeacher?.nipNbm || '-'}
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100 border border-black">
              <th className="py-1.5 px-2 text-center border border-black w-28">WAKTU / JP</th>
              {ACTIVE_DAYS.map((d) => (
                <th key={d} className="py-1.5 px-2 text-center border border-black uppercase font-bold">
                  {DAYS_MAP[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, sIdx) => (
              <tr key={sIdx} className="border border-black">
                <td className="py-1 px-1.5 text-center font-mono text-[10px] border border-black bg-gray-50 font-bold">
                  {slot.startTime} - {slot.endTime}
                </td>
                {ACTIVE_DAYS.map((dayNum) => {
                  const dayLessons = (groupedByDay[dayNum] || []).filter(
                    (sch: any) =>
                      (sch.startTime || '').trim() === slot.startTime ||
                      (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
                  )
                  return (
                    <td key={dayNum} className="p-1.5 border border-black align-top bg-white text-[11px]">
                      {dayLessons.length === 0 ? (
                        <div className="text-center text-gray-300">—</div>
                      ) : (
                        dayLessons.map((sch: any) => (
                          <div key={sch.id} className="mb-1 last:mb-0">
                            <div className="font-bold text-black">{sch.subject?.name || 'Mapel'}</div>
                            <div className="text-[9.5px] text-gray-700">Kelas {sch.class?.name || '-'}</div>
                          </div>
                        ))
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* INTERAKTIF SCREEN LAYOUT */}
      <div className="print:hidden space-y-6">
        {/* Header Eksklusif Jadwal Mengajar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 sm:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Operasional Akademik Guru</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 drop-shadow-md" />
                Jadwal Mengajar Guru
              </h1>
              <p className="text-blue-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Jadwal mengajar resmi untuk guru pengampu berdasarkan alokasi kurikulum. Terhubung langsung dengan pengisian Jurnal Mengajar dan Presensi Kelas Binaan.
              </p>

              {/* Status Update & Guru Info */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-xs shadow-xs">
                  <User className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    Guru Pengampu:{' '}
                    <strong className="font-bold text-white">
                      {viewingTeacher?.user?.name || session?.user?.name || 'Guru'}
                    </strong>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-xs shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>
                    Update: <strong className="font-bold text-white">{formatUpdateTime(lastUpdated)}</strong>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Terhubung Kurikulum</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Jadwal A4</span>
              </Button>

              <Link href="/akademik/jadwal-pelajaran">
                <Button
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm shadow-sm"
                >
                  <Calendar className="w-4 h-4 text-emerald-300" />
                  <span>Lihat Jadwal Pelajaran Sekolah</span>
                </Button>
              </Link>

              <Link href="/akademik/jurnal-mengajar">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md">
                  <BookOpen className="w-4 h-4" />
                  <span>Buka Jurnal Pembelajaran</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistik Ringkas Beban Mengajar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Alokasi Mengajar</p>
                <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {stats.totalJP} <span className="text-xs font-semibold text-slate-500">Jam Pelajaran (JP)</span>
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Jumlah Rombel Diampu</p>
                <h3 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {stats.totalClasses} <span className="text-xs font-semibold text-slate-500">Kelas</span>
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mata Pelajaran Diampu</p>
                <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {stats.uniqueSubjects} <span className="text-xs font-semibold text-slate-500">Mapel</span>
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Control Bar: Pilihan Guru (Superadmin), Mode Tampilan, Search, & Popover Filter */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Searchbar & Popover Filter Terpusat (Rule 16) */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Dropdown Pemilihan Guru (Hanya untuk Superadmin/Kurikulum/Kepsek) */}
              {isSuperAdmin && teachers.length > 0 && (
                <div className="w-full sm:w-64">
                  <Select
                    value={activeTeacherId}
                    onValueChange={(val) => val && setSelectedTeacherId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Pilih Guru Pengampu">
                        {teachers.find((t: any) => t.id === activeTeacherId)?.user?.name || 'Pilih Guru'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {teachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                          {t.user?.name || t.nip || 'Guru'} {t.nip ? `(${t.nip})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Searchbar */}
              <div className="w-full sm:w-64">
                <TableSearch
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Cari hari, mapel, atau kelas..."
                />
              </div>

              {/* Satu Tombol Filter Terpusat (Popover - Rule 16) */}
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <span>Filter</span>
                      {activeFiltersCount > 0 && (
                        <Badge className="h-5 px-1.5 text-[10px] bg-blue-600 text-white font-bold rounded-full">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  }
                />
                <PopoverContent align="start" className="w-72 p-4 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filter Jadwal Mengajar</span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setDayFilter('ALL')
                          setClassFilter('ALL')
                          setCurrentPage(1)
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Pilih Hari</label>
                    <Select value={dayFilter} onValueChange={(val) => { setDayFilter(val || 'ALL'); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Semua Hari" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Hari</SelectItem>
                        {ACTIVE_DAYS.map((d) => (
                          <SelectItem key={d} value={String(d)}>{DAYS_MAP[d]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Pilih Kelas</label>
                    <Select value={classFilter} onValueChange={(val) => { setClassFilter(val || 'ALL'); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <SelectValue placeholder="Semua Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Kelas</SelectItem>
                        {taughtClasses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Mode Switcher: Matriks Mingguan vs Kartu Harian vs Daftar Sesi */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">Mode:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tabel Matriks Mingguan Guru"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Matriks</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Kartu Jadwal Per Hari"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kartu Harian</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Daftar Sesi Mengajar & Jurnal"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Daftar Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Konten Utama Jadwal Mengajar */}
        {loadingSchedules ? (
          <div className="flex flex-col h-[40vh] items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="font-semibold text-xs">Memuat Jadwal Mengajar Guru...</p>
          </div>
        ) : teacherRawSchedules.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl">
            <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3 stroke-[1.2]" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Belum Ada Jadwal Mengajar yang Terhubung
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto text-xs">
              Jadwal mengajar untuk akun guru ini belum dialokasikan di modul kurikulum aSc Timetables.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link href="/akademik/jadwal-pelajaran">
                <Button size="sm" variant="outline" className="text-xs font-semibold rounded-xl">
                  Buka Jadwal Pelajaran Sekolah
                </Button>
              </Link>
            </div>
          </Card>
        ) : viewMode === 'table' ? (
          /* TABEL MATRIKS MINGGUAN GURU DENGAN DRAG-TO-SCROLL (Rule 14 & Rule 15) */
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div
              ref={matrixContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`overflow-x-auto select-none transition-colors duration-150 ${
                isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
              }`}
            >
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Waktu / JP</span>
                      </div>
                    </th>
                    {ACTIVE_DAYS.map((dayNum) => {
                      const isToday = new Date().getDay() === dayNum
                      return (
                        <th
                          key={dayNum}
                          className={`py-2.5 px-3 text-center border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 ${
                            isToday ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{DAYS_MAP[dayNum]}</span>
                            {isToday && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" title="Hari Ini" />
                            )}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {timeSlots.map((slot, sIdx) => (
                    <tr key={sIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                          Sesi ke-{sIdx + 1}
                        </div>
                        <div className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 py-0.5 px-1.5 rounded border border-indigo-100 dark:border-indigo-900 inline-block">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </td>

                      {ACTIVE_DAYS.map((dayNum) => {
                        const dayLessons = (groupedByDay[dayNum] || []).filter(
                          (sch: any) =>
                            (sch.startTime || '').trim() === slot.startTime ||
                            (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
                        )
                        const isToday = new Date().getDay() === dayNum

                        return (
                          <td
                            key={dayNum}
                            className={`p-2 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 align-top ${
                              isToday ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                            }`}
                          >
                            {dayLessons.length === 0 ? (
                              <div className="h-full min-h-[48px] flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs select-none">
                                —
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {dayLessons.map((sch: any) => (
                                  <div
                                    key={sch.id}
                                    className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 transition-all hover:shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="min-w-0 flex-1">
                                        <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                                          {sch.subject?.name || 'Mata Pelajaran'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300 mt-1">
                                          <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800">
                                            Kelas {sch.class?.name || '-'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {sch.startTime} - {sch.endTime}
                                      </span>
                                      <Link href={`/akademik/jurnal-mengajar/tambah?scheduleId=${sch.id}`}>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                                          Isi Jurnal <ChevronRight className="w-2.5 h-2.5" />
                                        </span>
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : viewMode === 'cards' ? (
          /* KARTU HARIAN JADWAL MENGAJAR */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ACTIVE_DAYS.map((dayNum) => {
              const dayLessons = groupedByDay[dayNum] || []
              const isToday = new Date().getDay() === dayNum

              return (
                <Card
                  key={dayNum}
                  className={`flex flex-col rounded-2xl border transition-all ${
                    isToday
                      ? 'border-blue-500/80 shadow-md bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 ring-1 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900'
                  }`}
                >
                  <CardHeader className={`p-4 pb-3 border-b ${isToday ? 'border-blue-100 dark:border-blue-900/50' : 'border-slate-100 dark:border-slate-800/80'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isToday ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <CardTitle className={`text-base font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {DAYS_MAP[dayNum]}
                        </CardTitle>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs font-medium">
                      {dayLessons.length > 0 ? `${dayLessons.length} Jam Pelajaran Mengajar` : 'Tidak ada jadwal mengajar'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-3.5 flex-1 space-y-2.5">
                    {dayLessons.length === 0 ? (
                      <div className="h-24 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500">
                        <Clock className="w-5 h-5 mb-1 opacity-40" />
                        <span className="text-xs font-medium">Tidak Ada Jam Mengajar</span>
                      </div>
                    ) : (
                      dayLessons.map((sch: any, idx: number) => (
                        <div
                          key={sch.id || idx}
                          className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 transition-all hover:shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {sch.startTime} - {sch.endTime}
                            </span>
                            <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              Kelas {sch.class?.name || '-'}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                                {sch.subject?.name || 'Mata Pelajaran'}
                              </h4>
                            </div>
                            <Link href={`/akademik/jurnal-mengajar/tambah?scheduleId=${sch.id}`}>
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs font-semibold text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50">
                                Jurnal
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* TABEL DAFTAR SESI MENGAJAR & JURNAL (Rule 15, Rule 16, & Rule 20) */
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Daftar Sesi Mengajar Terpadu
                </CardTitle>
                <CardDescription className="text-xs">
                  Sesi jam mengajar bersambung (1–3 JP) yang langsung terhubung ke pengisian jurnal ajar harian.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <TableHead className="w-10 pl-4 pr-2 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedListSchedules.length > 0 && selectedRowIds.length === paginatedListSchedules.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 w-3.5 h-3.5"
                      />
                    </TableHead>
                    <TableHead className="w-24">Hari</TableHead>
                    <TableHead className="w-36">Waktu / Alokasi</TableHead>
                    <TableHead className="w-32">Kelas</TableHead>
                    <TableHead className="min-w-[200px]">Mata Pelajaran</TableHead>
                    <TableHead className="text-right pr-4 w-32">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-500">
                        Tidak ada sesi mengajar yang sesuai filter atau pencarian.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedListSchedules.map((item: any) => {
                      const isSelected = selectedRowIds.includes(item.id)
                      return (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <TableCell className="pl-4 pr-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                              className="rounded border-slate-300 w-3.5 h-3.5"
                            />
                          </TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                            {DAYS_NAME[item.dayOfWeek] || 'Senin'}
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Kelas {item.class?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-white">
                            {item.subject?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Link href={`/akademik/jurnal-mengajar/tambah?scheduleId=${item.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2.5 font-semibold text-blue-600 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
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

            {/* Paginasi Terstandar (Rule 20: 10 / 50 / 100) */}
            {filteredListSchedules.length > 0 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredListSchedules.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="sesi mengajar"
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
