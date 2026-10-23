'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Download,
  Upload,
  Save,
  RefreshCcw,
  BookOpen,
  GraduationCap,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpDown,
  UserCheck,
  Check,
  FileCheck,
  Award,
  Trash2,
  HeartHandshake,
  LayoutGrid,
  Trophy,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/TablePagination'
import { TableSearch } from '@/components/TableSearch'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import {
  generateAssessmentExcel,
  generateTeacherMultiClassAssessmentExcel,
  parseAssessmentExcel,
  AssessmentExcelType,
} from '@/lib/assessment-excel-helper'
import Swal from 'sweetalert2'

export default function PenilaianAkademikPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Role detection
  const userRolesList = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean)
  const isSuperAdmin = userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'GOD', 'GOD_USER'].includes(r))
  const isBauAdmin = userRolesList.some(r => ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(r))
  const isKepalaSekolah = userRolesList.includes('KEPALA_SEKOLAH')
  const isKurikulum = userRolesList.includes('KURIKULUM')
  const isWaliKelas = userRolesList.includes('WALI_KELAS')
  const isGuru = userRolesList.some(r => ['GURU', 'HONORER'].includes(r))
  const isSiswa = user?.role === 'SISWA' && !isGuru && !isWaliKelas && !isSuperAdmin
  const isWaliMurid = user?.role === 'WALI_MURID' && !isGuru && !isWaliKelas && !isSuperAdmin
  const isTeacher = isGuru || isWaliKelas

  // State Tabs & Filters (Formatif Lingkup Materi di posisi paling depan / default)
  const [selectedTab, setSelectedTab] = useState<'sts' | 'sas' | 'kd'>('kd')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedSemester, setSelectedSemester] = useState<string>('1')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026/2027')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination & Row selection
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50) // Default 50 baris sesuai standar kelas
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Local grid edits state: key = `${studentId}` -> object of fields
  const [editGrid, setEditGrid] = useState<Record<string, any>>({})
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // Import Modal & File ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false)
  const [importingType, setImportingType] = useState<AssessmentExcelType>('sts')
  const [importLoading, setImportLoading] = useState<boolean>(false)

  // 1. Fetch Setting Sistem Sekolah (Tahun Pelajaran & Semester Aktif Resmi)
  const { data: systemSettings } = useQuery({
    queryKey: ['system-public-settings'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/public')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60000,
  })

  // Sinkronkan Tahun Pelajaran & Semester dari Sistem Sekolah
  useEffect(() => {
    if (systemSettings?.academicYear) {
      setSelectedAcademicYear(systemSettings.academicYear)
    }
    if (systemSettings?.semester) {
      const semStr = systemSettings.semester.toString().toLowerCase()
      setSelectedSemester(semStr === '2' || semStr.includes('genap') ? '2' : '1')
    }
  }, [systemSettings])

  // 1b. Fetch Teacher Context (Jadwal & Kelas Binaan Guru)
  const { data: teacherContext } = useQuery({
    queryKey: ['teacher-context', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/grades/teacher-context?userId=${userId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId && !isSiswa && !isWaliMurid,
  })

  // 2. Fetch Master Kelas & Mapel (untuk Superadmin, Kurikulum, atau Fallback)
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  const { data: allSubjects = [] } = useQuery<any[]>({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // 3. Tentukan daftar kelas & mapel yang tersedia bagi user yang login (Guru Pengampu berbasis Kelas)
  const teacherSchedules = useMemo(() => teacherContext?.schedules || [], [teacherContext])
  const hasTeacherSchedule = teacherSchedules.length > 0

  const availableClasses = useMemo<any[]>(() => {
    // Jika user adalah guru pengampu (memiliki jadwal mengajar riil), kunci HANYA ke kelas yang diajarnya saja
    if (hasTeacherSchedule) {
      const scheduleClasses = teacherSchedules.map((s: any) => s.class).filter(Boolean)
      const map = new Map<string, any>()
      scheduleClasses.forEach((c: any) => map.set(c.id, c))
      if (map.size > 0) {
        return Array.from(map.values())
      }
    }

    // Hanya jika murni Admin TU / Superadmin / Kepsek / Kurikulum tanpa jadwal guru pribadi, dapat mengakses semua kelas
    if (isSuperAdmin || isBauAdmin || isKepalaSekolah || isKurikulum) {
      return allClasses
    }

    return []
  }, [allClasses, teacherContext, teacherSchedules, hasTeacherSchedule, isSuperAdmin, isBauAdmin, isKepalaSekolah, isKurikulum])

  // Filter mapel yang diajar oleh guru pengampu di kelas yang sedang dipilih (HANYA mapel yang diampu di kelas tersebut)
  const availableSubjects = useMemo<any[]>(() => {
    // Jika user adalah guru pengampu, kunci HANYA ke mapel yang diampunya di kelas tersebut
    if (hasTeacherSchedule) {
      const classSchedulesForTeacher = teacherSchedules.filter(
        (s: any) => !selectedClassId || s.classId === selectedClassId || s.class?.id === selectedClassId
      )
      const scheduleSubjects = classSchedulesForTeacher.map((s: any) => s.subject).filter(Boolean)
      const map = new Map<string, any>()
      scheduleSubjects.forEach((s: any) => map.set(s.id, s))

      if (map.size > 0) {
        return Array.from(map.values())
      }
      return []
    }

    // Hanya Admin TU / Superadmin / Kepsek / Kurikulum murni yang dapat mengakses seluruh mapel
    if (isSuperAdmin || isBauAdmin || isKepalaSekolah || isKurikulum) {
      return allSubjects
    }

    return []
  }, [allSubjects, teacherContext, teacherSchedules, hasTeacherSchedule, isSuperAdmin, isBauAdmin, isKepalaSekolah, isKurikulum, selectedClassId])

  // Inisialisasi otomatis pilihan Kelas & Mapel pertama kali
  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id)
      if (!systemSettings?.academicYear && availableClasses[0].academicYear) {
        setSelectedAcademicYear(availableClasses[0].academicYear)
      }
    }
  }, [availableClasses, selectedClassId, systemSettings])

  // Sinkronkan tahun ajaran jika sistem belum menentukan
  useEffect(() => {
    if (selectedClassId && !systemSettings?.academicYear) {
      const cls = availableClasses.find(c => c.id === selectedClassId)
      if (cls?.academicYear) {
        setSelectedAcademicYear(cls.academicYear)
      }
    }
  }, [selectedClassId, availableClasses, systemSettings])

  useEffect(() => {
    if (availableSubjects.length > 0) {
      // Jika subject yang terpilih saat ini tidak ada di daftar mapel kelas tersebut, reset ke mapel pertama
      const exists = availableSubjects.some(s => s.id === selectedSubjectId)
      if (!selectedSubjectId || !exists) {
        setSelectedSubjectId(availableSubjects[0].id)
      }
    }
  }, [availableSubjects, selectedSubjectId])

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1)
    setSelectedStudentIds([])
  }, [selectedTab, selectedClassId, selectedSubjectId, selectedSemester, searchQuery, pageSize])

  // 4. Fetch Data Siswa di Kelas Terpilih
  const { data: studentsInClass = [], isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students-in-class', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return []
      const res = await authenticatedFetch(`/api-backend/students?classId=${selectedClassId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId && !isSiswa && !isWaliMurid,
  })

  // 5. Fetch Nilai Asesmen Terkini (StudentAssessment) dari Database
  const {
    data: assessments = [],
    isLoading: loadingAssessments,
    refetch: refetchAssessments,
  } = useQuery<any[]>({
    queryKey: ['student-assessments', selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear],
    queryFn: async () => {
      if (!selectedClassId || !selectedSubjectId) return []
      const url = `/api-backend/grades/assessments?classId=${selectedClassId}&subjectId=${selectedSubjectId}&semester=${selectedSemester}&academicYear=${selectedAcademicYear}`
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId && !!selectedSubjectId && !isSiswa && !isWaliMurid,
  })

  // 5b. Fetch Periode Tersimpan di Database untuk Riwayat E-Rapor Siswa
  const { data: archivePeriodsData } = useQuery({
    queryKey: ['archive-periods-grades'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/grades/archive-periods')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60000,
  })

  // 6. Khusus Siswa & Wali Murid: Fetch Nilai Pribadi (Akumulasi, Rata-Rata, & Peringkat Paralel Kelas)
  const { data: myStudentGrades = null, isLoading: loadingMyGrades } = useQuery<any>({
    queryKey: ['student-my-grades', userId, selectedSemester, selectedAcademicYear],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(
        `/api-backend/grades/my-grades?userId=${userId}&semester=${selectedSemester}&academicYear=${selectedAcademicYear}`
      )
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId && (isSiswa || isWaliMurid),
  })

  // Map penilaian ke setiap siswa
  const assessmentMap = useMemo(() => {
    const map = new Map<string, any>()
    assessments.forEach(item => {
      map.set(item.studentId, item)
    })
    return map
  }, [assessments])

  // Gabungkan siswa dengan assessment dan perubahan grid lokal (dengan filter ketat kelas terpilih)
  const mergedStudentRows = useMemo(() => {
    const classFiltered = selectedClassId
      ? studentsInClass.filter(s => s.classId === selectedClassId || s.class?.id === selectedClassId)
      : studentsInClass

    return classFiltered.map(s => {
      const dbAssess = assessmentMap.get(s.id) || {}
      const edited = editGrid[s.id] || {}
      return {
        ...s,
        assessment: {
          ...dbAssess,
          ...edited,
        },
      }
    })
  }, [studentsInClass, selectedClassId, assessmentMap, editGrid])

  // Filter Search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return mergedStudentRows
    const q = searchQuery.toLowerCase()
    return mergedStudentRows.filter(
      s => s.name?.toLowerCase().includes(q) || s.nis?.includes(q) || s.nisn?.includes(q)
    )
  }, [mergedStudentRows, searchQuery])

  // Paginasi
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, currentPage, pageSize])

  // Info Context Aktif (Nama Kelas, Wali Kelas, Nama Mapel)
  const currentSelectedClass = availableClasses.find(c => c.id === selectedClassId)
  const currentSelectedSubject = availableSubjects.find(s => s.id === selectedSubjectId)
  const currentHomeroomName = currentSelectedClass?.homeroomTeacher?.user?.name || currentSelectedClass?.homeroomTeacher?.name || '-'
  const currentTeacherName = teacherContext?.user?.name || user?.name || '-'

  // Handler Nilai Grid Cell Change dengan kalkulasi otomatis Rata-Rata Formatif TP -> Sumatif LM
  const handleScoreChange = (studentId: string, field: string, valStr: string) => {
    const num = valStr === '' ? null : parseFloat(valStr)
    const validNum = num === null || isNaN(num) ? null : Math.min(100, Math.max(0, num))

    setEditGrid(prev => {
      const currentStudentEdits = {
        ...(prev[studentId] || {}),
        [field]: validNum,
      }

      // Ambil nilai eksisting dari DB sebagai baseline
      const dbAssess = assessmentMap.get(studentId) || {}

      // Jika field yang diubah adalah bagian dari TP (contoh: lm1_tp1 .. lm5_tp4),
      // hitung rata-rata TP pada Lingkup Materi tersebut dan perbarui sum_lm terkait otomatis
      const tpMatch = field.match(/^(lm[1-5])_tp[1-4]$/)
      if (tpMatch) {
        const lmPrefix = tpMatch[1] // contoh: 'lm1'
        const sumField = `sum_${lmPrefix}` // contoh: 'sum_lm1'
        
        const tpVals: number[] = []
        for (let i = 1; i <= 4; i++) {
          const k = `${lmPrefix}_tp${i}`
          const val = k === field ? validNum : (currentStudentEdits[k] !== undefined ? currentStudentEdits[k] : dbAssess[k])
          if (typeof val === 'number' && !isNaN(val)) {
            tpVals.push(val)
          }
        }

        if (tpVals.length > 0) {
          const avg = Math.round(tpVals.reduce((a, b) => a + b, 0) / tpVals.length)
          currentStudentEdits[sumField] = avg
        }
      }

      return {
        ...prev,
        [studentId]: currentStudentEdits,
      }
    })
    setIsDirty(true)
  }

  // Mutation Simpan Grid ke Database (Batch Upsert)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Ambil seluruh siswa yang ada di editGrid
      const itemsToSave: any[] = []
      studentsInClass.forEach(s => {
        const rowEdits = editGrid[s.id]
        if (!rowEdits && !assessmentMap.has(s.id)) return // tidak ada perubahan dan belum ada data
        const currentData = {
          ...(assessmentMap.get(s.id) || {}),
          ...(rowEdits || {}),
        }

        itemsToSave.push({
          studentId: s.id,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          teacherId: teacherContext?.id || null,
          academicYear: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          ...currentData,
        })
      })

      if (itemsToSave.length === 0) return { count: 0 }

      const res = await authenticatedFetch('/api-backend/grades/assessments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan penilaian')
      return res.json()
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['homeroom-rapor-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['program-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-my-grades'] })
      setEditGrid({})
      setIsDirty(false)
      Swal.fire({
        icon: 'success',
        title: 'Penilaian Berhasil Disimpan',
        text: `Sebanyak ${res.count || 0} nilai siswa telah berhasil disinkronisasikan ke E-Rapor Kelas, E-Rapor Program, dan Akun Siswa/Wali Murid.`,
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan sistem saat menyimpan nilai.',
      })
    },
  })

  // Select all & Row select checkboxes (Rule 16)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(paginatedStudents.map(s => s.id))
    } else {
      setSelectedStudentIds([])
    }
  }

  const handleSelectRow = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(prev => [...prev, studentId])
    } else {
      setSelectedStudentIds(prev => prev.filter(id => id !== studentId))
    }
  }

  // Mutation Reset Nilai Multi-Select
  const resetMutation = useMutation({
    mutationFn: async (targetStudentIds: string[]) => {
      const res = await authenticatedFetch('/api-backend/grades/assessments/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: targetStudentIds,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          academicYear: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          resetMode: 'SCORES_ONLY',
        }),
      })
      if (!res.ok) throw new Error('Gagal mereset nilai')
      return res.json()
    },
    onSuccess: (res) => {
      // Bersihkan nilai di local editGrid untuk siswa terpilih
      setEditGrid(prev => {
        const next = { ...prev }
        selectedStudentIds.forEach(id => {
          delete next[id]
        })
        return next
      })
      setSelectedStudentIds([])
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['homeroom-rapor-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['program-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-my-grades'] })
      Swal.fire({
        icon: 'success',
        title: 'Nilai Berhasil Direset',
        text: `Sebanyak ${res.count || 0} rekaman nilai siswa telah dikosongkan dan disinkronkan kembali.`,
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Reset Nilai',
        text: err?.message || 'Terjadi kesalahan sistem saat mereset nilai.',
      })
    },
  })

  const handleConfirmReset = () => {
    if (selectedStudentIds.length === 0) return
    Swal.fire({
      title: 'Reset Nilai Terpilih?',
      html: `Apakah Anda yakin ingin mereset/mengosongkan nilai untuk <strong>${selectedStudentIds.length} siswa</strong> terpilih pada mapel ini?<br/><span class="text-xs text-red-500 font-semibold">Tindakan ini akan mengosongkan nilai formatif, sumatif, STS, dan SAS siswa terpilih.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Nilai',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        resetMutation.mutate(selectedStudentIds)
      }
    })
  }

  // Export Excel Handler (Satuan Kelas yang Sedang Dipilih)
  const handleExportExcel = async (exportType: AssessmentExcelType) => {
    try {
      const blob = await generateAssessmentExcel({
        type: exportType,
        className: currentSelectedClass?.name || 'Kelas',
        subjectName: currentSelectedSubject?.name || 'Mata Pelajaran',
        homeroomTeacherName: currentHomeroomName,
        teacherName: currentTeacherName,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
        students: mergedStudentRows,
      })

      const typeLabel = exportType === 'sts' ? 'STS' : exportType === 'sas' ? 'SAS' : 'KD_Formatif'
      const fileName = `Format_Nilai_${typeLabel}_${currentSelectedClass?.name?.replace(/\s+/g, '_')}_${currentSelectedSubject?.name?.replace(/\s+/g, '_')}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil',
        text: `Template nilai ${typeLabel} siap digunakan untuk input offline.`,
        timer: 1800,
        showConfirmButton: false,
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor',
        text: err?.message || 'Gagal membuat file Excel penilaian.',
      })
    }
  }

  // Export Excel Multi-Sheet: 1 File Excel berisi Semua Kelas yang Diampu Guru untuk Mapel Ini
  const [exportingMultiSheet, setExportingMultiSheet] = useState(false)
  const handleExportTeacherMultiClassExcel = async (exportType: AssessmentExcelType, targetSubjectId?: string) => {
    const subjId = targetSubjectId || selectedSubjectId
    const subjectObj = (availableSubjects.length > 0 ? availableSubjects : allSubjects).find(s => s.id === subjId)
    const subjectName = subjectObj?.name || currentSelectedSubject?.name || 'Mata Pelajaran'

    // Cari seluruh kelas yang diampu guru ini untuk mapel tersebut
    let targetClasses: any[] = []
    if (hasTeacherSchedule) {
      const schedulesForSubject = teacherSchedules.filter((s: any) => s.subjectId === subjId || s.subject?.id === subjId)
      const classMap = new Map<string, any>()
      schedulesForSubject.forEach((s: any) => {
        if (s.class) classMap.set(s.class.id, s.class)
      })
      targetClasses = Array.from(classMap.values())
    }

    // Jika targetClasses kosong (misal superadmin atau belum ada relasi jadwal spesifik), gunakan kelas terpilih
    if (targetClasses.length === 0) {
      if (currentSelectedClass) targetClasses = [currentSelectedClass]
      else if (availableClasses.length > 0) targetClasses = availableClasses
    }

    if (targetClasses.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Ada Kelas',
        text: 'Tidak ditemukan rombel kelas yang diampu untuk mata pelajaran ini.',
      })
      return
    }

    setExportingMultiSheet(true)
    Swal.fire({
      title: 'Menyiapkan Format Excel Multi-Sheet...',
      html: `Sedang memuat data siswa & nilai untuk <strong>${targetClasses.length} rombel kelas</strong> (${subjectName})...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      // Ambil data siswa & nilai untuk setiap kelas secara paralel
      const classSheetList = await Promise.all(
        targetClasses.map(async (cls: any) => {
          // Ambil daftar siswa kelas
          const sRes = await authenticatedFetch(`/api-backend/students?classId=${cls.id}`)
          const students: any[] = sRes.ok ? await sRes.json() : []

          // Ambil assessment yang sudah ada di database untuk kelas & mapel ini
          const aRes = await authenticatedFetch(
            `/api-backend/grades/assessments?classId=${cls.id}&subjectId=${subjId}&academicYear=${selectedAcademicYear}&semester=${selectedSemester}`
          )
          const assessList: any[] = aRes.ok ? await aRes.json() : []
          const aMap = new Map<string, any>()
          assessList.forEach((item: any) => {
            if (item.studentId) aMap.set(item.studentId, item)
          })

          const studentRows = students.map((s) => ({
            id: s.id,
            nis: s.nis || '',
            name: s.name || '',
            gender: s.gender || 'L',
            assessment: aMap.get(s.id) || null,
          }))

          const homeroom = cls.homeroomTeacher?.user?.name || cls.homeroomTeacher?.name || '-'

          return {
            className: cls.name,
            homeroomTeacherName: homeroom,
            students: studentRows,
          }
        })
      )

      const typeLabel = exportType === 'sts' ? 'STS' : exportType === 'sas' ? 'SAS' : 'KD_Formatif'
      const blob = await generateTeacherMultiClassAssessmentExcel({
        type: exportType,
        subjectName,
        subjectCode: subjectObj?.code,
        teacherName: currentTeacherName,
        academicYear: selectedAcademicYear,
        semester: selectedSemester,
        classes: classSheetList,
      })

      const safeTeacher = (currentTeacherName || 'Guru').replace(/[^a-zA-Z0-9]/g, '_')
      const safeSubject = subjectName.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `Format_Nilai_${typeLabel}_${safeSubject}_${safeTeacher}_Sem${selectedSemester}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Multi-Sheet Berhasil!',
        html: `File Excel <strong>${fileName}</strong> telah terunduh dengan <strong>${classSheetList.length} sheet kelas</strong> (${classSheetList.map(c => c.className).join(', ')}).`,
        confirmButtonColor: '#2563eb',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Multi-Sheet',
        text: err?.message || 'Terjadi kesalahan sistem saat memproses berkas Excel.',
      })
    } finally {
      setExportingMultiSheet(false)
    }
  }

  // Import Excel Handler
  // Import Excel Handler (Mendukung Satuan Kelas Maupun Multi-Sheet Rombel Guru)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    try {
      const result = await parseAssessmentExcel(file, importingType)
      const parsed = result.parsedRows
      const isMultiSheet = (result.sheetCount || 1) > 1

      // 1. Jika Multi-Sheet: Tawarkan apakah ingin langsung sinkronisasi seluruh sheet kelas ke E-Rapor database
      if (isMultiSheet) {
        setImportModalOpen(false)
        const totalRows = parsed.length
        const sheetNames = (result.sheetSummaries || []).map(s => `${s.className || s.sheetName} (${s.studentCount} siswa)`).join(', ')

        const confirm = await Swal.fire({
          title: 'Terdeteksi File Multi-Sheet Rombel!',
          html: `File Excel ini memuat <strong>${result.sheetCount} rombel kelas</strong>:<br/><span class="text-xs text-slate-500 font-medium">${sheetNames}</span><br/><br/>Apakah Anda ingin langsung <strong>menyimpan & menyinkronisasikan nilai seluruh ${totalRows} siswa</strong> dari seluruh rombel ke database E-Rapor?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#2563eb',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Ya, Sinkronkan Semua Rombel',
          cancelButtonText: 'Hanya Rombel Aktif Saat Ini',
        })

        if (confirm.isConfirmed) {
          Swal.fire({
            title: 'Menyinkronkan Nilai ke E-Rapor...',
            html: `Sedang memetakan dan menyimpan ${totalRows} data nilai siswa...`,
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading()
            },
          })

          // Kumpulkan mapping kelas dan siswa
          // Ambil mapping kelas dari availableClasses / allClasses
          const classLookup = new Map<string, string>()
          allClasses.forEach((c: any) => {
            const cleanName = c.name.trim().toLowerCase()
            classLookup.set(cleanName, c.id)
            classLookup.set(cleanName.replace(/\s+/g, ''), c.id)
          })

          // Dapatkan daftar siswa untuk kelas-kelas ini
          const itemsToSave: any[] = []

          // Ambil semua siswa dari seluruh kelas yang bersangkutan
          for (const sSummary of (result.sheetSummaries || [])) {
            const cName = (sSummary.className || sSummary.sheetName || '').trim()
            const clean = cName.toLowerCase()
            const targetClassId = classLookup.get(clean) || classLookup.get(clean.replace(/\s+/g, '')) || selectedClassId

            // Ambil siswa untuk kelas ini
            const sRes = await authenticatedFetch(`/api-backend/students?classId=${targetClassId}`)
            const classStudents: any[] = sRes.ok ? await sRes.json() : []

            const rowsInSheet = parsed.filter(p => (p.className || p.sheetName) === (sSummary.className || sSummary.sheetName))

            classStudents.forEach(st => {
              const found = rowsInSheet.find(
                p => (p.nis && String(p.nis).trim() === String(st.nis).trim()) ||
                     (p.name && p.name.trim().toLowerCase() === st.name.trim().toLowerCase())
              )
              if (found) {
                itemsToSave.push({
                  studentId: st.id,
                  classId: targetClassId,
                  subjectId: selectedSubjectId,
                  teacherId: teacherContext?.id || null,
                  academicYear: selectedAcademicYear,
                  semester: parseInt(selectedSemester, 10),
                  ...found,
                })
              }
            })
          }

          if (itemsToSave.length > 0) {
            const res = await authenticatedFetch('/api-backend/grades/assessments/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: itemsToSave }),
            })
            if (!res.ok) throw new Error('Gagal menyimpan nilai multi-sheet ke database')

            queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
            queryClient.invalidateQueries({ queryKey: ['homeroom-rapor-assessments'] })
            queryClient.invalidateQueries({ queryKey: ['program-assessments'] })
            queryClient.invalidateQueries({ queryKey: ['student-my-grades'] })

            Swal.fire({
              icon: 'success',
              title: 'Sinkronisasi E-Rapor Berhasil!',
              html: `Berhasil menyinkronkan <strong>${itemsToSave.length} nilai siswa</strong> dari <strong>${result.sheetCount} rombel</strong> ke sistem E-Rapor secara otomatis.`,
              confirmButtonColor: '#2563eb',
            })
            return
          }
        }
      }

      // 2. Jika single-sheet atau memilih hanya kelas aktif: Cocokkan ke siswa di kelas aktif
      const newGridEdits: Record<string, any> = { ...editGrid }
      let matchedCount = 0

      studentsInClass.forEach(s => {
        const found = parsed.find(
          p => (p.nis && String(p.nis).trim() === String(s.nis).trim()) || (p.name && p.name.trim().toLowerCase() === s.name.trim().toLowerCase())
        )
        if (found) {
          matchedCount++
          newGridEdits[s.id] = {
            ...(newGridEdits[s.id] || {}),
            ...found,
          }
        }
      })

      setEditGrid(newGridEdits)
      setIsDirty(true)
      setImportModalOpen(false)

      Swal.fire({
        icon: 'success',
        title: 'Import Excel Berhasil',
        text: `Berhasil mencocokkan ${matchedCount} siswa dari file Excel untuk kelas ${currentSelectedClass?.name || 'aktif'}. Klik "Simpan Perubahan" untuk memvalidasi ke database.`,
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Import Excel Gagal',
        text: err?.message || 'Format template Excel tidak valid.',
      })
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }


  // ==================== TAMPILAN KHUSUS SISWA & WALI MURID ====================
  if (isSiswa || isWaliMurid) {
    const studentInfo = (myStudentGrades as any)?.student
    const studentStats = (myStudentGrades as any)?.stats
    const assessmentsList = (myStudentGrades as any)?.assessments || []

    return (
      <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
        {/* Header Bersih & Ringkas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Laporan Capaian Akademik
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ringkasan nilai akumulasi, rata-rata kompetensi, dan capaian juara paralel kelas.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {studentInfo && (
              <>
                <Badge variant="outline" className="text-xs px-2.5 py-1 font-semibold border-indigo-200 text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-300">
                  {studentInfo.className}
                </Badge>
                <Badge variant="secondary" className="text-xs px-2.5 py-1">
                  NIS: {studentInfo.nis || '-'}
                </Badge>
              </>
            )}

            <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val || '1')}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">Semester 1 (Ganjil)</SelectItem>
                <SelectItem value="2" className="text-xs">Semester 2 (Genap)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedAcademicYear} onValueChange={(val) => setSelectedAcademicYear(val || '2026/2027')}>
              <SelectTrigger className="h-8 text-xs w-32 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {archivePeriodsData?.periods && archivePeriodsData.periods.length > 0 ? (
                  Array.from(new Set(archivePeriodsData.periods.map((p: any) => p.academicYear))).map((year: any) => (
                    <SelectItem key={year} value={year} className="text-xs font-semibold">
                      {year}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="2026/2027" className="text-xs">2026/2027</SelectItem>
                    <SelectItem value="2025/2026" className="text-xs">2025/2026</SelectItem>
                    <SelectItem value="2024/2025" className="text-xs">2024/2025</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 4 Kartu Statistik Utama: Akumulasi, Rata-Rata, Peringkat Angkatan, & Peringkat Kelas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Kartu 1: Total Nilai Akumulasi */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Nilai Akumulasi
                </p>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {loadingMyGrades ? '-' : studentStats?.totalAkumulasi ?? 0}
                </div>
                <p className="text-[11px] text-slate-400">
                  Dari {studentStats?.totalMataPelajaran || 0} mata pelajaran aktif
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Kartu 2: Nilai Rata-Rata */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Rata-Rata Nilai
                </p>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {loadingMyGrades ? '-' : studentStats?.rataRata ?? 0}
                </div>
                <p className="text-[11px] text-slate-400">
                  Ketuntasan Akademik Terpenuhi
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Kartu 3: Peringkat Juara Angkatan */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1 font-semibold">
                  Juara Angkatan
                </p>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                  {loadingMyGrades ? '-' : studentStats?.rankAngkatanLabel || '1/1'}
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 font-medium truncate max-w-[190px]">
                  {loadingMyGrades ? 'Menghitung...' : studentStats?.rankAngkatanDescription || 'Seluruh siswa se-angkatan'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <GraduationCap className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Kartu 4: Peringkat Juara Paralel Kelas */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 font-semibold">
                  Juara Paralel Kelas
                </p>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {loadingMyGrades ? '-' : studentStats?.rankLabel || '1/1'}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                  {loadingMyGrades ? 'Menghitung...' : studentStats?.rankDescription || 'Urut dalam kelas'}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <Award className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabel 1: Ringkasan Nilai Capaian Mata Pelajaran */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Rincian Capaian Mata Pelajaran
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Nilai akhir terverifikasi formatif, sumatif, STS, dan SAS oleh guru pengampu mapel
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-semibold text-xs">
              {assessmentsList.length} Mata Pelajaran
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto select-none">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    <TableHead className="min-w-[200px]">Mata Pelajaran</TableHead>
                    <TableHead className="w-28 text-center">Semester</TableHead>
                    <TableHead className="w-24 text-center">Rata Formatif</TableHead>
                    <TableHead className="w-24 text-center">Sumatif LM</TableHead>
                    <TableHead className="w-20 text-center font-bold text-blue-600">STS</TableHead>
                    <TableHead className="w-20 text-center font-bold text-emerald-600">SAS</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-900 dark:text-white">Nilai Akhir</TableHead>
                    <TableHead className="min-w-[240px]">Capaian Kompetensi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMyGrades ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-xs text-slate-500">
                        Memuat data penilaian akademik siswa...
                      </TableCell>
                    </TableRow>
                  ) : assessmentsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-xs text-slate-500">
                        Belum ada data nilai akademik yang diinput oleh guru pengampu mapel.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assessmentsList.map((g: any, idx: number) => (
                      <TableRow key={g.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 text-xs">
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{g.subject?.name || '-'}</span>
                            {g.subject?.category === 'PILIHAN_PROGRAM' ? (
                              <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold">
                                Program Unggulan
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-[11px] font-normal text-slate-400">
                            Guru: {g.teacher?.user?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {g.semester === 1 ? 'Ganjil' : 'Genap'} ({g.academicYear})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{g.formatifAvg ?? '-'}</TableCell>
                        <TableCell className="text-center font-medium">{g.sumatifLmAvg ?? '-'}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                          {g.sts ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {g.sas ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-900 dark:text-white">
                          <Badge className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold">
                            {g.finalScore ?? '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          {g.raporCapaianKompetensi || g.notes || 'Menunjukkan penguasaan materi yang baik pada capaian kompetensi dasar semester ini.'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tabel 2: Capaian Nilai Ekstrakurikuler */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-amber-600" />
                Capaian Kegiatan Ekstrakurikuler
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Nilai predikat, partisipasi, dan catatan perkembangan pembina ekstrakurikuler
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-semibold text-xs border-amber-300 text-amber-700 dark:text-amber-400">
              {((myStudentGrades as any)?.extracurriculars || []).length} Kegiatan
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto select-none">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                  <TableRow className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    <TableHead className="min-w-[180px]">Nama Ekstrakurikuler</TableHead>
                    <TableHead className="w-28 text-center">Peran / Jabatan</TableHead>
                    <TableHead className="w-36">Pembina / Pelatih</TableHead>
                    <TableHead className="w-24 text-center">Kehadiran</TableHead>
                    <TableHead className="w-24 text-center">Predikat</TableHead>
                    <TableHead className="min-w-[260px]">Keterangan Capaian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((myStudentGrades as any)?.extracurriculars || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                        Belum ada kegiatan ekstrakurikuler aktif yang diikuti siswa pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ((myStudentGrades as any)?.extracurriculars || []).map((ekskul: any, idx: number) => (
                      <TableRow key={ekskul.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 text-xs">
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          {ekskul.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] font-bold">
                            {ekskul.role || 'ANGGOTA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {ekskul.pembinaName || '-'}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {ekskul.pctHadir}% ({ekskul.hadirCount}/{ekskul.totalSessions})
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-purple-600 text-white font-black text-xs px-2.5 py-0.5">
                            {ekskul.predicate || 'A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                          {ekskul.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Seksi Bawah: Grid 2 Kolom untuk Capaian Karakter/Adab & Rekam Prestasi Siswa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bagian Kiri: Capaian Karakter, Ibadah, & Tata Tertib Siswa */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Capaian Karakter &amp; Tata Tertib
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Evaluasi adab, ibadah, dan kedisiplinan pembinaan karakter ISMUBA
                </CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                Skor: {studentStats?.skorKedisiplinan ?? 100}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Highlight Indikator */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Kedisiplinan</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {studentStats?.skorKedisiplinan ?? 100}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Presensi KBM</span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {studentStats?.persentaseKehadiran ?? 100}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Predikat Disiplin</span>
                  <span className="text-base font-black text-purple-600 dark:text-purple-400">
                    Grade {studentStats?.kedisiplinanGrade || ((studentStats?.skorKedisiplinan ?? 100) >= 90 ? 'A' : (studentStats?.skorKedisiplinan ?? 100) >= 70 ? 'B' : 'C')}
                  </span>
                </div>
              </div>

              {/* Daftar Riwayat Catatan Karakter Terbaru */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Riwayat Evaluasi Pembinaan (Ketertiban &amp; Adab)
                </h4>
                {((myStudentGrades as any)?.characterAssessments || []).length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    Alhamdulillah, siswa senantiasa taat tata tertib, bebas dari catatan pelanggaran, dan berakhlak mulia.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {((myStudentGrades as any)?.characterAssessments || []).map((c: any) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {c.title}
                            </span>
                            <Badge
                              className={`text-[9px] font-bold px-1.5 py-0 ${
                                c.type === 'POSITIF'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {c.category?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.description || 'Catatan ketertiban dan kedisiplinan siswa.'}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            Evaluator: {c.evaluator?.name || 'Tim Tatib & BK'} • {new Date(c.date).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-black shrink-0 ${c.points >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.points > 0 ? `+${c.points}` : c.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bagian Kanan: Capaian Prestasi, Portofolio & Penghargaan Siswa */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Prestasi &amp; Penghargaan Siswa
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Capaian kejuaraan akademik, sains, olahraga, dan seni budaya yang telah terverifikasi
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold text-xs border-amber-300 text-amber-700 dark:text-amber-400">
                {((myStudentGrades as any)?.achievements || []).length} Prestasi
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {((myStudentGrades as any)?.achievements || []).length === 0 ? (
                <div className="py-8 text-center rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 space-y-1">
                  <Sparkles className="w-6 h-6 mx-auto text-amber-400" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Belum Ada Rekam Prestasi Khusus</p>
                  <p className="text-[11px]">Siswa dapat mendaftarkan bukti sertifikat lomba atau kejuaraan melalui wali kelas / kesiswaan.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {((myStudentGrades as any)?.achievements || []).map((ach: any) => (
                    <div
                      key={ach.id}
                      className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {ach.judul}
                          </h4>
                          {ach.source === 'KETERTIBAN' && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-bold px-1.5 py-0 shrink-0">
                              Adab &amp; Ketertiban
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-amber-500 text-white font-black text-[9.5px] px-2 py-0 shrink-0">
                          {ach.peringkat || 'Juara'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span className="truncate">
                          Tingkat: <strong className="font-semibold text-slate-700 dark:text-slate-200">{ach.tingkat}</strong> • {ach.penyelenggara || 'Sekolah'}
                        </span>
                        <span className="shrink-0 font-medium">
                          Tahun {ach.tahun}
                        </span>
                      </div>
                      {ach.deskripsi && (
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-100 dark:border-amber-900/40">
                          {ach.deskripsi}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ==================== TAMPILAN GURU PENGAMPU & WALI KELAS ====================
  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto px-2 sm:px-4 pb-12">
      {/* 1. Header Toolbar Bersih & Aksi Cepat */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            E-Rapor Internal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Penilaian capaian formatif dan sumatif internal mata pelajaran oleh guru pengampu.
          </p>
        </div>

        {/* Tombol Aksi Utama: Export, Import, dan Simpan */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Popover Ekspor Excel Multi-Sheet & Satuan Kelas */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingMultiSheet}
                  className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <Download className={`w-3.5 h-3.5 text-blue-600 ${exportingMultiSheet ? 'animate-bounce' : ''}`} />
                  <span>{exportingMultiSheet ? 'Mengunduh...' : 'Ekspor Excel'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-72 p-2.5 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800">
              {/* Opsi Multi-Sheet: 1 File Excel berisi seluruh rombel kelas yang diampu guru */}
              <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    1 File Semua Rombel (Multi-Sheet)
                  </span>
                  <Badge variant="outline" className="text-[9px] font-bold px-1 py-0 border-blue-300 text-blue-700 dark:text-blue-300">
                    Rekomendasi
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 px-2 mb-1.5 leading-tight">
                  Tiap kelas otomatis tersusun dalam sheet terpisah untuk guru mapel ini.
                </p>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={exportingMultiSheet}
                    className="w-full justify-start text-xs font-semibold h-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200"
                    onClick={() => handleExportTeacherMultiClassExcel('sts')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 mr-2 shrink-0" />
                    <span>Format Nilai STS (Semua Rombel)</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={exportingMultiSheet}
                    className="w-full justify-start text-xs font-semibold h-8 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200"
                    onClick={() => handleExportTeacherMultiClassExcel('sas')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                    <span>Format Nilai SAS (Semua Rombel)</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={exportingMultiSheet}
                    className="w-full justify-start text-xs font-semibold h-8 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200"
                    onClick={() => handleExportTeacherMultiClassExcel('kd')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 mr-2 shrink-0" />
                    <span>Format Formatif & TP (Semua Rombel)</span>
                  </Button>
                </div>
              </div>

              {/* Opsi Satuan: Hanya Kelas Aktif */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-0.5 mb-1">
                  Hanya Kelas Aktif ({currentSelectedClass?.name || 'Pilihan'})
                </div>
                <div className="space-y-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-normal h-7 rounded-lg text-slate-600 dark:text-slate-400"
                    onClick={() => handleExportExcel('sts')}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-blue-500 mr-2 shrink-0" />
                    <span>STS ({currentSelectedClass?.name || 'Kelas'})</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-normal h-7 rounded-lg text-slate-600 dark:text-slate-400"
                    onClick={() => handleExportExcel('sas')}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-emerald-500 mr-2 shrink-0" />
                    <span>SAS ({currentSelectedClass?.name || 'Kelas'})</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs font-normal h-7 rounded-lg text-slate-600 dark:text-slate-400"
                    onClick={() => handleExportExcel('kd')}
                  >
                    <FileSpreadsheet className="w-3 h-3 text-amber-500 mr-2 shrink-0" />
                    <span>Formatif & TP ({currentSelectedClass?.name || 'Kelas'})</span>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Tombol Import Excel */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Nilai</span>
          </Button>

          {/* Tombol Simpan Perubahan */}
          <Button
            size="sm"
            className={`h-9 gap-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
            }`}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveMutation.isPending ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan' : 'Tersimpan'}</span>
          </Button>

          {/* Tombol Reset Nilai Multi-Select */}
          {selectedStudentIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold rounded-xl border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 hover:text-red-700 transition-all shadow-xs"
              onClick={handleConfirmReset}
              disabled={resetMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Reset Nilai ({selectedStudentIds.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Informasi Metadata Terpadu & Filter Popover */}
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          {/* Pemilihan Kelas Langsung (Bukan di dalam filter) & Info Konteks */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs w-full lg:w-auto">
            <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">Kelas & Mapel:</span>
            
            {/* Pemilihan Kelas Langsung */}
            <div className="w-32 sm:w-36">
              <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || '')}>
                <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300">
                  <span className="truncate">{currentSelectedClass?.name || 'Pilih Kelas'}</span>
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pemilihan Mapel Langsung */}
            <div className="w-44 sm:w-56">
              <Select value={selectedSubjectId} onValueChange={(val) => setSelectedSubjectId(val || '')}>
                <SelectTrigger className="h-8 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <span className="truncate">{currentSelectedSubject?.name || 'Pilih Mapel'}</span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {availableSubjects.map(s => {
                    const isPilihan = s.category === 'PILIHAN_PROGRAM'
                    return (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        <span className="font-medium">{s.name}</span>
                        {isPilihan && (
                          <span className="ml-1.5 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                            (Pilihan {s.program === 'ai' ? 'AI' : s.program === 'seni budaya' ? 'Seni' : s.program?.toUpperCase() || ''})
                          </span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {currentSelectedSubject?.category === 'PILIHAN_PROGRAM' && (
              <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold">
                {currentSelectedSubject?.program === 'ai' ? 'Pilihan AI' : currentSelectedSubject?.program === 'seni budaya' ? 'Pilihan Seni' : 'Pilihan Khusus'}
              </Badge>
            )}

            <Badge variant="outline" className="text-[11px] text-slate-500">
              Sem {selectedSemester === '1' ? 'Ganjil' : 'Genap'} ({selectedAcademicYear})
            </Badge>
          </div>

          {/* Searchbar Pencarian Siswa */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:w-60">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari nama atau NIS..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Tab Navigasi Mode Asesmen: Formatif Lingkup Materi Terdepan */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setSelectedTab('kd')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'kd'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Formatif & Lingkup Materi</span>
        </button>

        <button
          onClick={() => setSelectedTab('sts')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'sts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Sumatif Tengah Semester (STS)</span>
        </button>

        <button
          onClick={() => setSelectedTab('sas')}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            selectedTab === 'sas'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Sumatif Akhir Semester (SAS)</span>
        </button>
      </div>

      {/* 4. Tabel Matriks Penilaian Interaktif Sesuai Gambar Resmi */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {selectedTab === 'sts' || selectedTab === 'sas' ? (
              // ==================== TABEL MODE STS & SAS ====================
              <Table className="border-collapse">
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                  {/* Row Header 1 */}
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 text-center">
                    <TableHead rowSpan={2} className="w-10 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      <input
                        type="checkbox"
                        checked={paginatedStudents.length > 0 && selectedStudentIds.length === paginatedStudents.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 w-3.5 h-3.5"
                      />
                    </TableHead>
                    <TableHead rowSpan={2} className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      No. Induk
                    </TableHead>
                    <TableHead rowSpan={2} className="w-48 sm:w-56 text-left border-r border-slate-200 dark:border-slate-700 px-3">
                      Nama
                    </TableHead>
                    <TableHead rowSpan={2} className="w-10 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      L/P
                    </TableHead>
                    <TableHead colSpan={5} className="text-center border-r border-slate-200 dark:border-slate-700 p-2 bg-slate-100/60 dark:bg-slate-800">
                      SUMATIF LINGKUP MATERI
                    </TableHead>
                    <TableHead rowSpan={2} className={`w-28 text-center p-2 font-black ${selectedTab === 'sts' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-950/20' : 'text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'}`}>
                      {selectedTab === 'sts' ? 'NILAI STS' : 'NILAI SAS'}
                    </TableHead>
                  </TableRow>
                  {/* Row Header 2 */}
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 text-center bg-slate-100/60 dark:bg-slate-800">
                    <TableHead className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-1">LM1</TableHead>
                    <TableHead className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-1">LM2</TableHead>
                    <TableHead className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-1">LM3</TableHead>
                    <TableHead className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-1">LM4</TableHead>
                    <TableHead className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-1">LM5</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingStudents || loadingAssessments ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-xs text-slate-500">
                        Memuat data siswa dan nilai asesmen...
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-xs text-slate-500">
                        Tidak ada data siswa ditemukan untuk filter ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((s) => {
                      const a = s.assessment || {}
                      const isSelected = selectedStudentIds.includes(s.id)

                      return (
                        <TableRow
                          key={s.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(s.id, e.target.checked)}
                              className="rounded border-slate-300 w-3.5 h-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium border-r border-slate-100 dark:border-slate-800 p-2">
                            {s.nis || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 px-3 truncate max-w-[180px]" title={s.name}>
                            {s.name}
                          </TableCell>
                          <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2 font-medium">
                            {(s.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L'}
                          </TableCell>

                          {/* Sumatif Lingkup Materi LM1 - LM5 Inputs */}
                          <TableCell className="p-1 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sum_lm1 ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sum_lm1', e.target.value)}
                              className="w-full text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sum_lm2 ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sum_lm2', e.target.value)}
                              className="w-full text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sum_lm3 ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sum_lm3', e.target.value)}
                              className="w-full text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sum_lm4 ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sum_lm4', e.target.value)}
                              className="w-full text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="p-1 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sum_lm5 ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sum_lm5', e.target.value)}
                              className="w-full text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>

                          {/* Nilai STS atau SAS Utama */}
                          <TableCell className="p-1 text-center font-bold">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selectedTab === 'sts' ? (a.sts ?? '') : (a.sas ?? '')}
                              onChange={(e) => handleScoreChange(s.id, selectedTab === 'sts' ? 'sts' : 'sas', e.target.value)}
                              className={`w-full text-center py-1 text-xs font-black rounded border border-transparent focus:outline-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                selectedTab === 'sts'
                                    ? 'text-blue-600 focus:bg-white dark:focus:bg-slate-800 hover:border-blue-300'
                                    : 'text-emerald-600 focus:bg-white dark:focus:bg-slate-800 hover:border-emerald-300'
                              }`}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              // ==================== TABEL MODE FORMATIF / NILAI KD ====================
              <Table className="min-w-[1500px] border-collapse">
                <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                  {/* Header Row 1: FORMATIF grouping */}
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-center">
                    <TableHead rowSpan={3} className="w-10 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      <input
                        type="checkbox"
                        checked={paginatedStudents.length > 0 && selectedStudentIds.length === paginatedStudents.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 w-3.5 h-3.5"
                      />
                    </TableHead>
                    <TableHead rowSpan={3} className="w-20 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      No. Induk
                    </TableHead>
                    <TableHead rowSpan={3} className="w-48 sm:w-56 text-left border-r border-slate-200 dark:border-slate-700 px-3">
                      Nama
                    </TableHead>
                    <TableHead rowSpan={3} className="w-10 text-center border-r border-slate-200 dark:border-slate-700 p-2">
                      L/P
                    </TableHead>
                    <TableHead colSpan={20} className="text-center border-r border-slate-200 dark:border-slate-700 p-2 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                      FORMATIF (TUJUAN PEMBELAJARAN)
                    </TableHead>
                    <TableHead colSpan={5} className="text-center border-r border-slate-200 dark:border-slate-700 p-2 bg-slate-100 dark:bg-slate-800">
                      SUMATIF LINGKUP MATERI
                    </TableHead>
                    <TableHead rowSpan={3} className="w-16 text-center border-r border-slate-200 dark:border-slate-700 p-2 font-bold text-blue-600">
                      STS
                    </TableHead>
                    <TableHead rowSpan={3} className="w-16 text-center p-2 font-bold text-emerald-600">
                      SAS
                    </TableHead>
                  </TableRow>

                  {/* Header Row 2: LM 1 - LM 5 Subheaders */}
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-center">
                    <TableHead colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-amber-50/40">LM 1</TableHead>
                    <TableHead colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-amber-50/40">LM 2</TableHead>
                    <TableHead colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-amber-50/40">LM 3</TableHead>
                    <TableHead colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-amber-50/40">LM 4</TableHead>
                    <TableHead colSpan={4} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-amber-50/40">LM 5</TableHead>
                    {/* Sumatif LM subheader span */}
                    <TableHead colSpan={5} className="border-r border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800">
                      LM1 .. LM5
                    </TableHead>
                  </TableRow>

                  {/* Header Row 3: TP1 - TP4 Columns */}
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 text-center">
                    {/* LM1 */}
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP1</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP2</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP3</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP4</TableHead>
                    {/* LM2 */}
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP1</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP2</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP3</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP4</TableHead>
                    {/* LM3 */}
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP1</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP2</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP3</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP4</TableHead>
                    {/* LM4 */}
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP1</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP2</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP3</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP4</TableHead>
                    {/* LM5 */}
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP1</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP2</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP3</TableHead>
                    <TableHead className="w-12 min-w-[48px] p-1 border-r border-slate-200 text-center">TP4</TableHead>
                    {/* Sumatif LM1..LM5 */}
                    <TableHead className="w-14 min-w-[54px] p-1 border-r border-slate-200 text-center">LM1</TableHead>
                    <TableHead className="w-14 min-w-[54px] p-1 border-r border-slate-200 text-center">LM2</TableHead>
                    <TableHead className="w-14 min-w-[54px] p-1 border-r border-slate-200 text-center">LM3</TableHead>
                    <TableHead className="w-14 min-w-[54px] p-1 border-r border-slate-200 text-center">LM4</TableHead>
                    <TableHead className="w-14 min-w-[54px] p-1 border-r border-slate-200 text-center">LM5</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingStudents || loadingAssessments ? (
                    <TableRow>
                      <TableCell colSpan={31} className="text-center py-12 text-xs text-slate-500">
                        Memuat formatif dan capaian siswa...
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={31} className="text-center py-12 text-xs text-slate-500">
                        Tidak ada siswa pada kelas terpilih.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((s) => {
                      const a = s.assessment || {}
                      const isSelected = selectedStudentIds.includes(s.id)

                      return (
                        <TableRow
                          key={s.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs ${
                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(s.id, e.target.checked)}
                              className="rounded border-slate-300 w-3.5 h-3.5"
                            />
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium border-r border-slate-100 dark:border-slate-800 p-2">
                            {s.nis || '-'}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 px-3 truncate max-w-[180px]" title={s.name}>
                            {s.name}
                          </TableCell>
                          <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2 font-medium">
                            {(s.gender || 'L').toUpperCase().startsWith('P') ? 'P' : 'L'}
                          </TableCell>

                          {/* Formatif TP1..TP4 per LM1..LM5 */}
                          {['lm1', 'lm2', 'lm3', 'lm4', 'lm5'].map((lm) =>
                            ['tp1', 'tp2', 'tp3', 'tp4'].map((tp) => {
                              const fieldKey = `${lm}_${tp}`
                              return (
                                <TableCell key={fieldKey} className="p-0.5 border-r border-slate-100 dark:border-slate-800 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={a[fieldKey] ?? ''}
                                    onChange={(e) => handleScoreChange(s.id, fieldKey, e.target.value)}
                                    className="w-11 min-w-[42px] text-center py-1 text-xs font-semibold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </TableCell>
                              )
                            })
                          )}

                          {/* Sumatif LM1..LM5 */}
                          {['sum_lm1', 'sum_lm2', 'sum_lm3', 'sum_lm4', 'sum_lm5'].map((sumField) => (
                            <TableCell key={sumField} className="p-0.5 border-r border-slate-100 dark:border-slate-800 text-center font-semibold">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={a[sumField] ?? ''}
                                onChange={(e) => handleScoreChange(s.id, sumField, e.target.value)}
                                className="w-12 min-w-[46px] text-center py-1 text-xs font-bold rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 border border-transparent hover:border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </TableCell>
                          ))}

                          {/* STS & SAS */}
                          <TableCell className="p-0.5 border-r border-slate-100 dark:border-slate-800 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sts ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sts', e.target.value)}
                              className="w-12 min-w-[46px] text-center py-1 text-xs font-bold text-blue-600 rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                          <TableCell className="p-0.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.sas ?? ''}
                              onChange={(e) => handleScoreChange(s.id, 'sas', e.target.value)}
                              className="w-12 min-w-[46px] text-center py-1 text-xs font-bold text-emerald-600 rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}

          {/* 5. Kontrol Paginasi Terstandar (10 / 50 / 100) */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredStudents.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 50, 100]}
              itemLabel="siswa"
            />
          </div>
        </CardContent>
      </Card>

      {/* MODAL IMPORT EXCEL PENILAIAN */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Import Nilai dari File Excel
            </DialogTitle>
            <DialogDescription className="text-xs">
              Unggah file Excel penilaian (.xlsx). Sistem akan mencocokkan No. Induk (NIS) siswa secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipe Template yang Diunggah</Label>
              <Select value={importingType} onValueChange={(val: any) => setImportingType(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sts" className="text-xs">Format Nilai STS (Sumatif Tengah Semester)</SelectItem>
                  <SelectItem value="sas" className="text-xs">Format Nilai SAS (Sumatif Akhir Semester)</SelectItem>
                  <SelectItem value="kd" className="text-xs">Format Formatif (LM1 - LM5 & TP1 - TP4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={importLoading}
                className="hidden"
                id="assessment-file-input"
              />
              <label htmlFor="assessment-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {importLoading ? 'Memproses File...' : 'Klik untuk Pilih File Excel'}
                </span>
                <span className="text-[11px] text-slate-400">Format file yang didukung: .xlsx</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)} className="text-xs rounded-xl">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
