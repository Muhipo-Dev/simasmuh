'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, 
  Calendar, 
  BookOpen, 
  Users, 
  Clock, 
  User, 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  FileCode, 
  Sparkles, 
  ShieldCheck, 
  Table as TableIcon, 
  LayoutGrid, 
  Printer, 
  GraduationCap,
  Sparkle,
  Bot,
  CheckCircle2,
  Layers,
  Zap,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  XCircle,
  Filter
} from 'lucide-react'
import { parseAscTimetableXml, detectScheduleConflicts, type ScheduleConflict } from '@/utils/ascParser'
import { sortClasses } from '@/lib/class-helper'

const DAYS_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat'
}

const ACTIVE_DAYS = [1, 2, 3, 4, 5]

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

  const isSuperAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(role) || 
    ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole || '') || 
    ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole2 || '') || 
    ['ADMIN_TU', 'BAU', 'TATA_USAHA', 'SUPERADMIN'].includes(subRole3 || '')

  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // View Mode: 'table' (Default: Tabel Matriks Mingguan) or 'cards' (Kartu Harian)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Grade filter tab: 'ALL' | 'X' | 'XI' | 'XII'
  const [gradeFilter, setGradeFilter] = useState<string>('ALL')

  // Selected Class state
  const [selectedClassId, setSelectedClassId] = useState<string>('')

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
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [conflictFilter, setConflictFilter] = useState<string>('ALL')
  const [activeImportTab, setActiveImportTab] = useState<'overview' | 'conflicts'>('overview')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal State for Delete All Schedules
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // 1. Fetch Daftar Kelas
  const { data: rawClasses, isLoading: loadingClasses } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    }
  })

  const classes = useMemo(() => sortClasses(rawClasses || []), [rawClasses])

  // 2. Fetch Profil Siswa Aktif (Fast direct query untuk SISWA)
  const { data: myStudentProfile } = useQuery<any>({
    queryKey: ['my-student-profile-schedule', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/students/by-user/${userId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: role === 'SISWA' && !!userId,
    staleTime: 60000,
  })

  // Fetch Semua Siswa (hanya untuk role Non-Siswa)
  const { data: students, isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) return []
      return res.json()
    },
    enabled: role !== 'SISWA'
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

  const isLoading = loadingClasses || (role !== 'SISWA' && loadingStudents) || loadingSchedules || loadingSubjects || loadingTeachers || status === 'loading'

  // Deteksi kelas siswa yang sedang login
  const myProfile = myStudentProfile || students?.find((s: any) => 
    s.userId === userId || 
    (s.user && (s.user.id === userId || s.user.username === username || s.user.email === userEmail)) ||
    s.nisn === username || 
    s.nis === username ||
    s.nisn === userEmail ||
    s.nis === userEmail ||
    (s.parentRelations && s.parentRelations.some((pr: any) => pr.parent?.userId === userId))
  )
  const myClassId = myProfile?.classId || myStudentProfile?.classId || myStudentProfile?.class?.id
  const activeStudentClass = myStudentProfile?.class || (classes ? classes.find((c: any) => c.id === myClassId) : null) || myProfile?.class || null

  // Default selected class: auto-select first available class for admin/guru or student's class
  useEffect(() => {
    if (classes && classes.length > 0) {
      if (role === 'SISWA' || role === 'WALI_MURID') {
        if (activeStudentClass?.id && selectedClassId !== activeStudentClass.id) {
          setSelectedClassId(activeStudentClass.id)
        }
      } else if (!selectedClassId) {
        setSelectedClassId(classes[0].id)
      }
    }
  }, [classes, role, activeStudentClass, selectedClassId])

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
    }
  })

  // Mutation Hapus Seluruh Jadwal Pelajaran (Otorisasi Password)
  const deleteAllMutation = useMutation({
    mutationFn: async (passwordConfirm: string) => {
      const res = await authenticatedFetch('/api-backend/schedules/delete-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, passwordConfirm })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus seluruh data jadwal pelajaran')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setDeleteAllModalOpen(false)
      setAuthPassword('')
      setAuthError('')
      alert(data.message || 'Seluruh data jadwal pelajaran berhasil dikosongkan. Data guru dan mata pelajaran tetap aman terjaga.')
    },
    onError: (err: any) => {
      setAuthError(err.message || 'Terjadi kesalahan saat memverifikasi password otorisasi.')
    }
  })

  // Bulk Import Mutation for aSc Timetables
  const bulkImportMutation = useMutation({
    mutationFn: async (schedulesToImport: any[]) => {
      const res = await authenticatedFetch('/api-backend/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedules: schedulesToImport,
          replaceExisting: true
        })
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
      const count = Array.isArray(data) ? data.length : data?.length || 0
      alert(`Berhasil mengimpor dan menyinkronkan ${count} jadwal pelajaran dari aSc Timetables via AI Scheduler! Seluruh guru pengampu, kelas, dan mata pelajaran telah disinkronkan rapi dan presisi ke database.`)
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
      classId: selectedClassId && selectedClassId !== 'ALL' ? selectedClassId : (classes && classes.length > 0 ? classes[0].id : ''),
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

  // Handle aSc Timetables XML File Upload & AI Conflict Analysis
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setXmlFile(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      try {
        const parsed = parseAscTimetableXml(text, classes || [], subjects || [], teachers || [])
        const detectedConflicts = detectScheduleConflicts(parsed)
        setParsedPreview(parsed)
        setConflicts(detectedConflicts)
        if (detectedConflicts.length > 0) {
          setActiveImportTab('conflicts')
        } else {
          setActiveImportTab('overview')
        }
      } catch (err: any) {
        alert(err?.message || 'Gagal membaca file aSc Timetables XML. Pastikan format XML valid.')
        setParsedPreview(null)
        setConflicts([])
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

  const parseTimeToMinutes = (t: string | undefined | null): number => {
    if (!t) return 0
    const clean = t.replace('.', ':').trim()
    const parts = clean.split(':')
    const hours = parseInt(parts[0] || '0', 10) || 0
    const minutes = parseInt(parts[1] || '0', 10) || 0
    return hours * 60 + minutes
  }

  // Active target class object
  const currentSelectedClass = useMemo(() => {
    if (role === 'SISWA' || role === 'WALI_MURID') {
      return activeStudentClass
    }
    if (selectedClassId === 'ALL') return null
    return classes.find((c: any) => c.id === selectedClassId) || classes[0] || null
  }, [classes, selectedClassId, role, activeStudentClass])

  // Filtered classes by grade tab
  const filteredClasses = useMemo(() => {
    if (gradeFilter === 'ALL') return classes
    return classes.filter((c: any) => {
      const name = (c.name || '').toUpperCase()
      if (gradeFilter === 'X') return name.startsWith('X ') || name.startsWith('KELAS X ') || name === 'X'
      if (gradeFilter === 'XI') return name.startsWith('XI ') || name.startsWith('KELAS XI ') || name === 'XI'
      if (gradeFilter === 'XII') return name.startsWith('XII ') || name.startsWith('KELAS XII ') || name === 'XII'
      return true
    })
  }, [classes, gradeFilter])

  // Schedules for currently selected class or all
  const activeClassSchedules = useMemo(() => {
    if (!currentSelectedClass) {
      return (schedules || []).filter((s: any) => {
        if (selectedClassId === 'ALL') return true
        return s.classId === selectedClassId
      })
    }
    return (schedules || []).filter((s: any) => s.classId === currentSelectedClass.id)
  }, [schedules, currentSelectedClass, selectedClassId])

  // Generate unique sorted time slots for matrix table
  const timeSlots = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string; startMinutes: number; endMinutes: number }>()
    activeClassSchedules.forEach((sch: any) => {
      if (!sch.startTime || !sch.endTime) return
      const s = sch.startTime.trim()
      const e = sch.endTime.trim()
      const key = `${s}-${e}`
      if (!map.has(key)) {
        map.set(key, {
          startTime: s,
          endTime: e,
          startMinutes: parseTimeToMinutes(s),
          endMinutes: parseTimeToMinutes(e)
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
      return a.endMinutes - b.endMinutes
    })
  }, [activeClassSchedules])

  // Grouped schedules by day (1..5 - Senin s.d. Jumat)
  const groupedByDay = useMemo(() => {
    const grouped: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    activeClassSchedules.forEach((sch: any) => {
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
  }, [activeClassSchedules])

  // Summary statistics for active class
  const classStats = useMemo(() => {
    const uniqueSubjects = new Set(activeClassSchedules.map((s: any) => s.subjectId || s.subject?.name)).size
    const uniqueTeachers = new Set(activeClassSchedules.map((s: any) => s.teacherId || s.teacher?.id)).size
    return {
      totalSessions: activeClassSchedules.length,
      totalSubjects: uniqueSubjects,
      totalTeachers: uniqueTeachers
    }
  }, [activeClassSchedules])

  // Menghitung Timestamp Pembaruan Terakhir Jadwal (Semua Jadwal & Jadwal Kelas Terpilih)
  const overallLastUpdated = useMemo(() => {
    if (!schedules || schedules.length === 0) return null
    const timestamps = schedules
      .map((s: any) => {
        const time = new Date(s.updatedAt || s.createdAt || 0).getTime()
        return isNaN(time) ? 0 : time
      })
      .filter((t: number) => t > 0)
    if (timestamps.length === 0) return null
    return new Date(Math.max(...timestamps))
  }, [schedules])

  const classLastUpdated = useMemo(() => {
    if (!activeClassSchedules || activeClassSchedules.length === 0) return null
    const timestamps = activeClassSchedules
      .map((s: any) => {
        const time = new Date(s.updatedAt || s.createdAt || 0).getTime()
        return isNaN(time) ? 0 : time
      })
      .filter((t: number) => t > 0)
    if (timestamps.length === 0) return null
    return new Date(Math.max(...timestamps))
  }, [activeClassSchedules])

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

  // Get color palette for subject badge based on string hash
  const getSubjectColorStyle = (name: string) => {
    const colors = [
      { bg: 'bg-blue-50 dark:bg-blue-950/60', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-200', dot: 'bg-blue-500' },
      { bg: 'bg-indigo-50 dark:bg-indigo-950/60', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-900 dark:text-indigo-200', dot: 'bg-indigo-500' },
      { bg: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-200', dot: 'bg-emerald-500' },
      { bg: 'bg-amber-50 dark:bg-amber-950/60', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-200', dot: 'bg-amber-500' },
      { bg: 'bg-purple-50 dark:bg-purple-950/60', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-200', dot: 'bg-purple-500' },
      { bg: 'bg-rose-50 dark:bg-rose-950/60', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-200', dot: 'bg-rose-500' },
      { bg: 'bg-teal-50 dark:bg-teal-950/60', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-900 dark:text-teal-200', dot: 'bg-teal-500' },
      { bg: 'bg-cyan-50 dark:bg-cyan-950/60', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-900 dark:text-cyan-200', dot: 'bg-cyan-500' }
    ]
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-3 print:bg-white print:text-black">
      {/* Print Specific CSS Rules (Standar A4 Margin Standar) */}
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

      {/* DEDICATED OFFICIAL PRINT TEMPLATE (HANYA DITAMPILKAN SAAT CETAK / EKSPOR PDF) */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:m-0 print:p-0">
        {/* KOP RESMI SMA MUHAMMADIYAH 1 PONOROGO */}
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
              <h4 className="text-[10.5px] font-bold tracking-wider uppercase text-black">
                MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL
              </h4>
              <h3 className="text-xs font-bold tracking-wider uppercase text-black">
                PIMPINAN DAERAH MUHAMMADIYAH PONOROGO
              </h3>
              <h2 className="text-base font-black tracking-wide uppercase text-black">
                SMA MUHAMMADIYAH 1 PONOROGO
              </h2>
              <p className="text-[9.5px] text-gray-800">
                Alamat: Jl. Batoro Katong No. 130 Ponorogo, Jawa Timur 63411 • Telp. (0352) 481521 • Website: smamuhipo.sch.id
              </p>
            </div>
            <div className="w-16 shrink-0"></div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-black flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase text-sm underline tracking-wide">
              JADWAL PELAJARAN KELAS {currentSelectedClass?.name || ''}
            </span>
            <div className="flex items-center gap-3 font-bold text-[10.5px]">
              <span>Tahun Ajaran: {currentSelectedClass?.academicYear || '2026/2027'}</span>
              <span>•</span>
              <span>Terakhir Diperbarui: {classLastUpdated ? formatScheduleUpdateTime(classLastUpdated) : overallLastUpdated ? formatScheduleUpdateTime(overallLastUpdated) : '-'}</span>
            </div>
          </div>
        </div>

        {/* TABEL MATRIKS JADWAL RESMI A4 LANDSCAPE */}
        <table className="w-full text-left border-collapse border border-black text-black text-[10pt] mb-4">
          <thead>
            <tr className="bg-gray-100 text-black border-b border-black">
              <th className="py-2 px-2 text-center border border-black w-24 font-bold text-xs uppercase">
                Waktu / Jam
              </th>
              {ACTIVE_DAYS.map((dayNum) => (
                <th key={dayNum} className="py-2 px-2 text-center border border-black font-bold text-xs uppercase">
                  {DAYS_MAP[dayNum]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center border border-black text-xs text-gray-600 italic">
                  Belum ada data jadwal pelajaran untuk kelas {currentSelectedClass?.name || ''}.
                </td>
              </tr>
            ) : (
              timeSlots.map((slot, slotIdx) => (
                <tr key={slotIdx} className="border border-black">
                  <td className="py-2 px-1.5 text-center font-mono font-bold text-black border border-black bg-gray-50/50 whitespace-nowrap">
                    <div className="text-[9.5px] text-gray-700 font-semibold uppercase">
                      Jam ke-{slotIdx + 1}
                    </div>
                    <div className="text-xs font-bold text-black">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </td>
                  {ACTIVE_DAYS.map((dayNum) => {
                    const dayLessons = (groupedByDay[dayNum] || []).filter((sch: any) => {
                      return (sch.startTime || '').trim() === slot.startTime || 
                        (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
                    })

                    return (
                      <td key={dayNum} className="p-2 border border-black align-top bg-white">
                        {dayLessons.length === 0 ? (
                          <div className="h-full min-h-[38px] flex items-center justify-center text-gray-400 text-xs">
                            —
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {dayLessons.map((sch: any) => (
                              <div key={sch.id} className="p-0.5">
                                <div className="font-bold text-xs text-black leading-tight">
                                  {sch.subject?.name || 'Mata Pelajaran'}
                                </div>
                                <div className="text-[10px] text-gray-800 font-medium mt-0.5">
                                  {sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tanda Tangan Resmi Pengesahan Kurikulum */}
        {currentSelectedClass && (
          <div className="mt-6 text-xs text-black print-break-inside-avoid">
            <div className="grid grid-cols-3 text-center gap-4">
              <div>
                <p className="font-medium">Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
                <div className="h-14"></div>
                <p className="font-extrabold underline">Drs. M. Dahron, M.Pd.</p>
                <p className="text-[10px] text-gray-800">NBM. 19680512 199403 1 002</p>
              </div>
              <div>
                <p className="font-medium">Menyetujui,</p>
                <p className="font-bold">Waka Kurikulum</p>
                <div className="h-14"></div>
                <p className="font-extrabold underline">Anik Yulaika, M.Pd.</p>
                <p className="text-[10px] text-gray-800">NBM. 19750820 200212 2 001</p>
              </div>
              <div>
                <p className="font-medium">
                  Ponorogo, {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())}
                </p>
                <p className="font-bold">Wali Kelas {currentSelectedClass?.name}</p>
                <div className="h-14"></div>
                <p className="font-extrabold underline">
                  {currentSelectedClass?.homeroomTeacher?.user?.name || '( .............................................. )'}
                </p>
                <p className="text-[10px] text-gray-800">
                  NIP/NBM. {currentSelectedClass?.homeroomTeacher?.nipNbm || '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INTERAKTIF SCREEN LAYOUT (SEMUA DISEMBUNYIKAN SAAT PRINT) */}
      <div className="print:hidden space-y-6">
        {/* Header Eksklusif */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 sm:p-7 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Manajemen Kurikulum & aSc TimeTables</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-300 drop-shadow-md" />
                Jadwal Pelajaran Sekolah
              </h1>
              <p className="text-blue-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
                {isSuperAdmin
                  ? 'Tabel jadwal pelajaran mingguan per kelas tersinkronisasi otomatis dari kurikulum dan file aSc TimeTables.'
                  : 'Tabel jadwal pelajaran mingguan yang terstruktur per kelas dan tersinkronisasi secara real-time.'}
              </p>

              {/* Status Pembaruan Terakhir Jadwal Pelajaran */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-xs shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>
                    Terakhir Diperbarui:{' '}
                    <strong className="font-bold text-white">
                      {overallLastUpdated ? formatScheduleUpdateTime(overallLastUpdated) : 'Belum Ada Pembaruan'}
                    </strong>
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Sinkronisasi Aktif</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 backdrop-blur-sm shadow-sm"
                title="Cetak Jadwal Pelajaran (A4 Landscape)"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Jadwal A4</span>
              </Button>

              {isSuperAdmin && (
                <>
                  <Button
                    onClick={() => setImportModalOpen(true)}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl shadow-md hover:shadow-amber-400/20 transition-all flex items-center justify-center gap-2 border border-amber-300 text-xs"
                  >
                    <FileCode className="w-4 h-4 text-indigo-900" />
                    <span>Import aSc (XML)</span>
                  </Button>
                  <Button
                    onClick={handleOpenAdd}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3.5 py-2 rounded-xl shadow-md hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Manual</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthPassword('')
                      setAuthError('')
                      setDeleteAllModalOpen(true)
                    }}
                    className="bg-rose-500/90 hover:bg-rose-600 text-white font-bold px-3.5 py-2 rounded-xl shadow-md hover:shadow-rose-500/20 transition-all flex items-center justify-center gap-2 border border-rose-400/40 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Control Bar: Pilihan Kelas & Mode Tampilan */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Sisi Kiri: Filter Tingkat & Pilihan Kelas */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Pilih Kelas:</span>
              </div>

              {role === 'SISWA' ? (
                <div className="px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-extrabold flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelas Saya: <strong>{activeStudentClass?.name || 'Belum Terdaftar'}</strong></span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Tingkat Tabs (Semua / X / XI / XII) */}
                  <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                    {['ALL', 'X', 'XI', 'XII'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGradeFilter(g)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                          gradeFilter === g
                            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {g === 'ALL' ? 'Semua Tingkat' : `Tingkat ${g}`}
                      </button>
                    ))}
                  </div>

                  {/* Select Dropdown Kelas */}
                  <Select 
                    value={selectedClassId || (classes[0]?.id || '')} 
                    onValueChange={(val) => val && setSelectedClassId(val)}
                  >
                    <SelectTrigger className="w-[180px] sm:w-[220px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs h-9">
                      <SelectValue placeholder="Pilih Kelas">
                        {classes.find((c: any) => c.id === selectedClassId)?.name 
                          ? `Kelas ${classes.find((c: any) => c.id === selectedClassId)?.name}`
                          : 'Pilih Kelas'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {filteredClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          Kelas {c.name} {c.academicYear ? `(${c.academicYear})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Switcher Mode Tampilan (Tabel Matriks vs Kartu Hari) */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Mode Tampilan:
              </span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabel Jadwal</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kartu Harian</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Kelas Chips (Horizontal Scroll) */}
          {role !== 'SISWA' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap mr-1">
                Akses Cepat:
              </span>
              {filteredClasses.map((c: any) => {
                const isSelected = (selectedClassId || classes[0]?.id) === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all border text-xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Ringkas Kelas Terpilih */}
        {currentSelectedClass && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 px-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Jadwal Kelas {currentSelectedClass.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Tahun Ajaran {currentSelectedClass.academicYear || '2026/2027'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>Update Kelas Ini: <strong className="text-slate-900 dark:text-white font-bold">{classLastUpdated ? formatScheduleUpdateTime(classLastUpdated) : 'Belum Ada Jadwal'}</strong></span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
              <span>Total: <strong className="text-blue-600 dark:text-blue-400 font-bold">{classStats.totalSessions}</strong> Sesi</span>
              <span>•</span>
              <span><strong className="text-slate-900 dark:text-white font-bold">{classStats.totalSubjects}</strong> Mapel</span>
              <span>•</span>
              <span><strong className="text-slate-900 dark:text-white font-bold">{classStats.totalTeachers}</strong> Guru</span>

              <Button
                onClick={handlePrint}
                size="sm"
                variant="outline"
                className="ml-2 h-7 px-2.5 text-xs font-bold rounded-lg border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Cetak Kelas Ini
              </Button>
            </div>
          </div>
        )}

        {/* Konten Utama Jadwal Pelajaran */}
        {isLoading ? (
          <div className="flex flex-col h-[40vh] items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
            <p className="font-semibold text-base">Memuat Jadwal Pelajaran...</p>
          </div>
        ) : activeClassSchedules.length === 0 ? (
          <Card className="border-dashed border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl">
            <Calendar className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3 stroke-[1.2]" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
              Belum Ada Jadwal Pelajaran untuk Kelas {currentSelectedClass?.name || ''}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto text-xs">
              {isSuperAdmin
                ? 'Silakan impor jadwal dari aSc TimeTables XML atau tambahkan jadwal mata pelajaran secara manual.'
                : 'Jadwal pelajaran untuk kelas ini belum ditentukan oleh Kurikulum.'}
            </p>
            {isSuperAdmin && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  onClick={handleOpenAdd}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tambah Jadwal Kelas Ini
                </Button>
              </div>
            )}
          </Card>
        ) : viewMode === 'table' ? (
          /* TABEL MATRIKS JADWAL MINGGUAN PER KELAS (DEFAULT) */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <th className="py-2.5 px-3 w-24 sm:w-28 text-center border-r border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Waktu</span>
                      </div>
                    </th>
                    {ACTIVE_DAYS.map((dayNum) => {
                      const isToday = new Date().getDay() === dayNum
                      return (
                        <th 
                          key={dayNum} 
                          className={`py-2.5 px-2.5 text-center border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 ${
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
                  {timeSlots.map((slot, slotIdx) => (
                    <tr 
                      key={slotIdx} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Kolom Jam / Waktu */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">
                          Jam ke-{slotIdx + 1}
                        </div>
                        <div className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 py-0.5 px-1.5 rounded border border-indigo-100 dark:border-indigo-900 inline-block">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </td>

                      {/* Kolom Tiap Hari (Senin - Sabtu) */}
                      {ACTIVE_DAYS.map((dayNum) => {
                        const dayLessons = (groupedByDay[dayNum] || []).filter((sch: any) => {
                          return (sch.startTime || '').trim() === slot.startTime || 
                            (parseTimeToMinutes(sch.startTime) <= slot.startMinutes && parseTimeToMinutes(sch.endTime) > slot.startMinutes)
                        })

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
                                {dayLessons.map((sch: any) => {
                                  const style = getSubjectColorStyle(sch.subject?.name || '')
                                  return (
                                    <div
                                      key={sch.id}
                                      className={`p-2 rounded-xl border ${style.border} ${style.bg} transition-all group relative`}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="min-w-0 flex-1">
                                          <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                                            {sch.subject?.name || 'Mata Pelajaran'}
                                          </div>
                                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                            <User className="w-3 h-3 text-blue-500 shrink-0" />
                                            <span className="truncate font-medium" title={sch.teacher?.user?.name || sch.teacher?.nip || ''}>
                                              {sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Superadmin Actions */}
                                        {isSuperAdmin && (
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                              onClick={() => handleOpenEdit(sch)}
                                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-white/80 dark:hover:bg-slate-700"
                                              title="Edit"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={() => handleDelete(sch.id)}
                                              className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-white/80 dark:hover:bg-slate-700"
                                              title="Hapus"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
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
          </div>
        ) : (
          /* TAMPILAN KARTU HARIAN (HARI PER HARI) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ACTIVE_DAYS.map((dayIndex) => {
              const daySchedules = groupedByDay[dayIndex] || []
              const isToday = new Date().getDay() === dayIndex

              return (
                <Card 
                  key={dayIndex} 
                  className={`flex flex-col rounded-2xl border transition-all ${
                    isToday 
                      ? 'border-blue-500/80 dark:border-blue-500/80 shadow-md bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-slate-800/80 dark:via-slate-900 dark:to-slate-900 ring-1 ring-blue-500/20' 
                      : 'border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900'
                  }`}
                >
                  <CardHeader className={`p-4 pb-3 border-b ${isToday ? 'border-blue-100 dark:border-blue-900/50' : 'border-slate-100 dark:border-slate-800/80'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isToday ? 'bg-blue-600 dark:bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        <CardTitle className={`text-base font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {DAYS_MAP[dayIndex]}
                        </CardTitle>
                      </div>
                      {isToday && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs font-medium dark:text-slate-400">
                      {daySchedules.length > 0 ? `${daySchedules.length} Sesi Mata Pelajaran` : 'Tidak ada pelajaran'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-3.5 flex-1 space-y-2.5">
                    {daySchedules.length === 0 ? (
                      <div className="h-24 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500">
                        <Clock className="w-5 h-5 mb-1 opacity-40" />
                        <span className="text-xs font-medium">Bebas Pelajaran / Libur</span>
                      </div>
                    ) : (
                      daySchedules.map((sch: any, idx: number) => {
                        const style = getSubjectColorStyle(sch.subject?.name || '')
                        return (
                          <div 
                            key={sch.id || idx} 
                            className={`p-3 rounded-xl border ${style.border} ${style.bg} transition-colors group relative overflow-hidden`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                {sch.startTime} - {sch.endTime}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                                {sch.class?.name || currentSelectedClass?.name || 'Kelas'}
                              </span>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                                  {sch.subject?.name || 'Mata Pelajaran'}
                                </h4>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                  <span className="truncate">Guru: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{sch.teacher?.user?.name || sch.teacher?.nip || 'Guru Pengampu'}</strong></span>
                                </p>
                              </div>

                              {/* Action edit/delete untuk Superadmin */}
                              {isSuperAdmin && (
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-500 hover:text-blue-600"
                                    onClick={() => handleOpenEdit(sch)}
                                    title="Edit Jadwal"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-500 hover:text-rose-600"
                                    onClick={() => handleDelete(sch.id)}
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Dialog Import aSc TimeTables XML */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                <FileCode className="w-4 h-4" />
              </div>
              <span>Import aSc Timetables (AI Scheduler)</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Upload file ekspor XML aSc Timetables. Algoritma AI SIMASMUH secara otomatis menormalisasi data mapel, jam pelajaran, dan menganalisis penugasan guru pengampu di setiap kelas tanpa bentrok jadwal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate px-4">
                {xmlFile ? xmlFile.name : 'Pilih atau Drag File aSc Timetables (.xml)'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Format file yang didukung: aSc Timetables XML (.xml)</p>
              
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
                className="mt-3 border-slate-300 dark:border-slate-700 font-semibold text-xs rounded-xl h-8"
              >
                {xmlFile ? 'Ganti File XML' : 'Pilih File XML'}
              </Button>
            </div>

            {/* Preview Hasil Analisis AI & Notifikasi Bentrok */}
            {parsedPreview && (
              <div className="space-y-3">
                {/* Notifikasi Deteksi Bentrok Jadwal Real-Time */}
                {conflicts.length > 0 ? (
                  <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>Peringatan: Terdeteksi {conflicts.length} Bentrok Jadwal!</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs">
                        Perlu Perhatian
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {conflicts.filter(c => c.type === 'TEACHER_CONFLICT').length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold">
                          👨‍🏫 {conflicts.filter(c => c.type === 'TEACHER_CONFLICT').length} Bentrok Guru
                        </span>
                      )}
                      {conflicts.filter(c => c.type === 'CLASS_CONFLICT').length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold">
                          🏛️ {conflicts.filter(c => c.type === 'CLASS_CONFLICT').length} Bentrok Kelas
                        </span>
                      )}
                      {conflicts.filter(c => c.type === 'TIME_CONFLICT').length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 font-semibold">
                          ⏰ {conflicts.filter(c => c.type === 'TIME_CONFLICT').length} Bentrok Jam
                        </span>
                      )}
                      {conflicts.filter(c => c.type === 'SUBJECT_CONFLICT').length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold">
                          📚 {conflicts.filter(c => c.type === 'SUBJECT_CONFLICT').length} Bentrok Mapel
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Verifikasi AI Sukses: 0 Bentrok Jadwal Terdeteksi</span>
                    </div>
                    <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                      Jadwal Bersih & Siap
                    </span>
                  </div>
                )}

                {/* Tab Navigasi: Ringkasan vs Daftar Bentrok */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <Button
                    type="button"
                    variant={activeImportTab === 'overview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveImportTab('overview')}
                    className={`h-7 px-3 text-xs rounded-lg font-bold ${
                      activeImportTab === 'overview' 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Ringkasan Jadwal ({parsedPreview.length})
                  </Button>
                  {conflicts.length > 0 && (
                    <Button
                      type="button"
                      variant={activeImportTab === 'conflicts' ? 'destructive' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveImportTab('conflicts')}
                      className={`h-7 px-3 text-xs rounded-lg font-bold flex items-center gap-1 ${
                        activeImportTab === 'conflicts'
                          ? 'bg-rose-600 text-white'
                          : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Daftar Bentrok ({conflicts.length})</span>
                    </Button>
                  )}
                </div>

                {/* Konten Tab Ringkasan */}
                {activeImportTab === 'overview' && (
                  <div className="space-y-2.5">
                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-2 border border-slate-200 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Jadwal</span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{parsedPreview.length} Sesi</strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-2 border border-slate-200 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Total Kelas</span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {Array.from(new Set(parsedPreview.map((p: any) => p.className))).length} Kelas
                        </strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-2 border border-slate-200 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Mata Pelajaran</span>
                        <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {Array.from(new Set(parsedPreview.map((p: any) => p.subjectName))).length} Mapel
                        </strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-2 border border-slate-200 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Guru Terpetakan</span>
                        <strong className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">100% Siap</strong>
                      </div>
                    </div>

                    {/* Sample List */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <span>Pratinjau Sampel Penjadwalan AI</span>
                        <span className="text-slate-400">Menampilkan {Math.min(parsedPreview.length, 4)} dari {parsedPreview.length}</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                        {parsedPreview.slice(0, 4).map((item: any, idx: number) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors">
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white truncate">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold shrink-0">
                                  {item.className}
                                </span>
                                <span className="truncate">{item.subjectName}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{DAYS_MAP[item.dayOfWeek] || 'Hari'} ({item.startTime} - {item.endTime})</span>
                                <span>•</span>
                                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                  Guru: <strong>{item.teacherName || item.rawTeacherName || 'AI Auto-Assign'}</strong>
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              AI Matched
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Konten Tab Daftar Bentrok */}
                {activeImportTab === 'conflicts' && (
                  <div className="space-y-2">
                    {/* Filter Kategori Bentrok */}
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConflictFilter('ALL')}
                        className={`h-6 px-2 text-[10px] rounded-md font-bold ${
                          conflictFilter === 'ALL' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : ''
                        }`}
                      >
                        Semua ({conflicts.length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConflictFilter('TEACHER_CONFLICT')}
                        className={`h-6 px-2 text-[10px] rounded-md font-bold ${
                          conflictFilter === 'TEACHER_CONFLICT' ? 'bg-rose-600 text-white' : ''
                        }`}
                      >
                        Guru ({conflicts.filter(c => c.type === 'TEACHER_CONFLICT').length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConflictFilter('CLASS_CONFLICT')}
                        className={`h-6 px-2 text-[10px] rounded-md font-bold ${
                          conflictFilter === 'CLASS_CONFLICT' ? 'bg-amber-600 text-white' : ''
                        }`}
                      >
                        Kelas ({conflicts.filter(c => c.type === 'CLASS_CONFLICT').length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConflictFilter('TIME_CONFLICT')}
                        className={`h-6 px-2 text-[10px] rounded-md font-bold ${
                          conflictFilter === 'TIME_CONFLICT' ? 'bg-purple-600 text-white' : ''
                        }`}
                      >
                        Jam ({conflicts.filter(c => c.type === 'TIME_CONFLICT').length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConflictFilter('SUBJECT_CONFLICT')}
                        className={`h-6 px-2 text-[10px] rounded-md font-bold ${
                          conflictFilter === 'SUBJECT_CONFLICT' ? 'bg-blue-600 text-white' : ''
                        }`}
                      >
                        Mapel ({conflicts.filter(c => c.type === 'SUBJECT_CONFLICT').length})
                      </Button>
                    </div>

                    {/* Conflict Cards List */}
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-0.5">
                      {conflicts
                        .filter(c => conflictFilter === 'ALL' || c.type === conflictFilter)
                        .map((conflict) => (
                          <div
                            key={conflict.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-1.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  conflict.type === 'TEACHER_CONFLICT'
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                    : conflict.type === 'CLASS_CONFLICT'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                    : conflict.type === 'TIME_CONFLICT'
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                }`}
                              >
                                {conflict.type === 'TEACHER_CONFLICT' && '👨‍🏫 BENTROK GURU'}
                                {conflict.type === 'CLASS_CONFLICT' && '🏛️ BENTROK KELAS'}
                                {conflict.type === 'TIME_CONFLICT' && '⏰ BENTROK JAM'}
                                {conflict.type === 'SUBJECT_CONFLICT' && '📚 BENTROK MAPEL'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                {conflict.dayName} • {conflict.startTime} - {conflict.endTime}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-normal font-medium">
                              {conflict.description}
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-lg p-2 border border-slate-100 dark:border-slate-700/60 flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                              <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-bold text-blue-700 dark:text-blue-300 block text-[10px]">
                                  Rekomendasi:
                                </strong>
                                <span>{conflict.aiRecommendation}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportModalOpen(false)
                setXmlFile(null)
                setParsedPreview(null)
              }}
              className="border-slate-200 dark:border-slate-700 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedPreview || parsedPreview.length === 0 || bulkImportMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-sm text-xs rounded-xl"
            >
              {bulkImportMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Impor & Terapkan Jadwal AI ({parsedPreview?.length || 0})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Form Single Tambah / Edit Jadwal Pelajaran */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {isEdit ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                Tentukan Kelas, Mata Pelajaran, Guru Pengampu, Hari, dan Jam Pelajaran.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              {/* Select Kelas */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kelas Target</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(val) => val && setFormData(prev => ({ ...prev, classId: val }))}
                >
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Pilih Kelas">
                      {classes?.find((c: any) => c.id === formData.classId)
                        ? `Kelas ${classes.find((c: any) => c.id === formData.classId).name}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                        Kelas {c.name} {c.academicYear ? `(${c.academicYear})` : ''}
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
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Pilih Mata Pelajaran">
                      {subjects?.find((s: any) => s.id === formData.subjectId)
                        ? `${subjects.find((s: any) => s.id === formData.subjectId).name} (${subjects.find((s: any) => s.id === formData.subjectId).code})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(subjects || []).map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
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
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Pilih Guru Pengampu">
                      {teachers?.find((t: any) => t.id === formData.teacherId)
                        ? (teachers.find((t: any) => t.id === formData.teacherId).user?.name || teachers.find((t: any) => t.id === formData.teacherId).nipNbm || 'Guru')
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(teachers || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
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
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs">
                    <SelectValue placeholder="Pilih Hari" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">Senin</SelectItem>
                    <SelectItem value="2" className="text-xs">Selasa</SelectItem>
                    <SelectItem value="3" className="text-xs">Rabu</SelectItem>
                    <SelectItem value="4" className="text-xs">Kamis</SelectItem>
                    <SelectItem value="5" className="text-xs">Jumat</SelectItem>
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
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono text-xs"
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
                className="border-slate-200 dark:border-slate-700 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl"
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

      {/* Modal Dialog Otorisasi Hapus Semua Jadwal Pelajaran */}
      <Dialog open={deleteAllModalOpen} onOpenChange={setDeleteAllModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!authPassword) {
                setAuthError('Silakan masukkan password akun Anda untuk otorisasi.')
                return
              }
              deleteAllMutation.mutate(authPassword)
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                Otorisasi Hapus Semua Jadwal
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Tindakan ini akan mengosongkan seluruh data jadwal pelajaran yang aktif di sistem. 
                <strong className="block mt-1 text-slate-800 dark:text-slate-200">
                  Data Guru, Mata Pelajaran, dan Kelas tetap aman utuh terlindungi.
                </strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>Verifikasi Keamanan Otoritas</span>
                </div>
                <p className="text-[11px] leading-normal">
                  Masukkan kata sandi akun Anda (<strong>{session?.user?.name || username}</strong>) untuk memproses penghapusan jadwal secara permanen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password Otorisasi Admin
                </Label>
                <PasswordInput
                  placeholder="Masukkan password akun Anda..."
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value)
                    setAuthError('')
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs"
                  required
                  autoFocus
                />
                {authError && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                    {authError}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteAllModalOpen(false)
                  setAuthPassword('')
                  setAuthError('')
                }}
                className="border-slate-200 dark:border-slate-700 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={deleteAllMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
              >
                {deleteAllMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Konfirmasi & Hapus Jadwal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

