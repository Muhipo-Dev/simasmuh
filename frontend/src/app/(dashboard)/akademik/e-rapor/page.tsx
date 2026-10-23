'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap,
  Save,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  Award,
  Layers,
  ChevronDown,
  Printer,
  Sparkles,
  SlidersHorizontal,
  FileText,
  UserCheck,
  FileCheck,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/TablePagination'
import { TableSearch } from '@/components/TableSearch'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useActiveUser } from '@/hooks/useActiveUser'
import Swal from 'sweetalert2'

export default function ERaporWaliKelasPage() {
  const { data: session } = useSession()
  const { user: activeUser, isOverride } = useActiveUser()
  const user = (activeUser || session?.user) as any
  const userId = user?.id
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Role detection
  const userRolesList = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean)
  const isSuperAdmin = !isOverride && userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'GOD', 'GOD_USER'].includes(r))
  const isBauAdmin = !isOverride && userRolesList.some(r => ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(r))
  const isKepalaSekolah = !isOverride && userRolesList.includes('KEPALA_SEKOLAH')
  const isKurikulum = !isOverride && userRolesList.includes('KURIKULUM')
  const isWaliKelas = userRolesList.includes('WALI_KELAS')
  const isGuru = userRolesList.some(r => ['GURU', 'HONORER'].includes(r))
  const isSiswa = user?.role === 'SISWA' && !isGuru && !isWaliKelas && !isSuperAdmin
  const isWaliMurid = user?.role === 'WALI_MURID' && !isGuru && !isWaliKelas && !isSuperAdmin

  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [selectedSemester, setSelectedSemester] = useState<string>('1')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026/2027')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination & Checkbox selection
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Local Edits State: key = assessmentId -> { raporCapaianKompetensi, raporCatatanWali }
  const [descEdits, setDescEdits] = useState<Record<string, { raporCapaianKompetensi?: string; raporCatatanWali?: string }>>({})
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // 0. Fetch Setting Sistem Sekolah (Tahun Pelajaran & Semester Aktif Resmi)
  const { data: systemSettings } = useQuery({
    queryKey: ['system-public-settings-rapor'],
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

  // 1. Fetch Teacher Context (Kelas Binaan Wali Kelas)
  const { data: teacherContext } = useQuery({
    queryKey: ['teacher-context-rapor', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/grades/teacher-context?userId=${userId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId && !isSiswa && !isWaliMurid,
  })

  // 2. Fetch Master Kelas & Mapel
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // Available classes khusus untuk Wali Kelas (Fokus kelas binaannya sendiri)
  const homeroomClasses = useMemo(() => teacherContext?.homeroomClasses || [], [teacherContext])
  const hasHomeroom = homeroomClasses.length > 0

  const availableClasses = useMemo<any[]>(() => {
    // Jika user menjabat sebagai wali kelas (memiliki kelas binaan), kunci HANYA ke kelas binaannya saja
    if (hasHomeroom) {
      return homeroomClasses
    }
    // Jika Admin TU / Superadmin / Kepsek / Kurikulum murni yang tidak memiliki kelas binaan pribadi, dapat melihat seluruh kelas
    if (isSuperAdmin || isBauAdmin || isKepalaSekolah || isKurikulum) {
      return allClasses
    }
    return []
  }, [allClasses, homeroomClasses, hasHomeroom, isSuperAdmin, isBauAdmin, isKepalaSekolah, isKurikulum])

  // Inisialisasi otomatis kelas & tahun ajaran pertama kali
  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id)
      if (!systemSettings?.academicYear && availableClasses[0].academicYear) {
        setSelectedAcademicYear(availableClasses[0].academicYear)
      }
    }
  }, [availableClasses, selectedClassId, systemSettings])

  // Sinkronkan tahun ajaran secara otomatis saat kelas terpilih berganti (hanya jika sistem belum menentukan)
  useEffect(() => {
    if (selectedClassId && !systemSettings?.academicYear) {
      const cls = availableClasses.find(c => c.id === selectedClassId)
      if (cls?.academicYear) {
        setSelectedAcademicYear(cls.academicYear)
      }
    }
  }, [selectedClassId, availableClasses, systemSettings])

  // 2b. Fetch Jadwal Kelas untuk menyaring Mapel yang ada di kelas ini saja (Hemat space & presisi rombel)
  const { data: classSchedules = [] } = useQuery<any[]>({
    queryKey: ['class-schedules-for-rapor', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return []
      const res = await authenticatedFetch(`/api-backend/schedules?classId=${selectedClassId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId,
  })

  // Program mapel keyword detection helper
  const isProgramSubject = (s: any) => {
    if (!s) return false
    if (s.category === 'PILIHAN_PROGRAM' || s.program) return true
    const n = (s.name || '').toLowerCase()
    return (
      n.includes('tari') ||
      n.includes('seni tari') ||
      n.includes('artificial intelligence') ||
      n.includes(' ai') ||
      n.startsWith('ai ') ||
      n === 'ai' ||
      n.includes('tahfidz') ||
      n.includes('tahfiz') ||
      n.includes('entrepreneur') ||
      n.includes('enterpreneur') ||
      n.includes('kewirausahaan') ||
      n.includes('olahraga khusus') ||
      n.includes('bakat olahraga')
    )
  }

  // Daftar mapel khusus kelas yang terpilih (hanya mapel reguler/umum sekolah, mapel program dipisahkan ke E-Rapor Program)
  const classSubjects = useMemo(() => {
    const map = new Map<string, any>()
    classSchedules.forEach((sc: any) => {
      if (sc.subject && !map.has(sc.subject.id) && !isProgramSubject(sc.subject)) {
        map.set(sc.subject.id, {
          ...sc.subject,
          teacherName: sc.teacher?.user?.name || sc.teacher?.name,
          teacherId: sc.teacher?.id,
          teacherUserId: sc.teacher?.userId || sc.teacher?.user?.id,
        })
      }
    })

    // Sertakan juga mapel yang diampu oleh profil guru saat ini
    const myTeacherSubjects = (teacherContext?.teacherSubjects || []).map((ts: any) => ts.subject).filter(Boolean)
    myTeacherSubjects.forEach((subj: any) => {
      if (!map.has(subj.id) && !isProgramSubject(subj)) {
        map.set(subj.id, {
          ...subj,
          teacherName: user?.name,
          teacherId: teacherContext?.id,
          teacherUserId: userId,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [classSchedules, teacherContext, user, userId])

  // Wali kelas secara otomatis dapat melihat seluruh nilai mapel (ALL) di kelas binaannya
  // Tidak ada pembatasan paksa ke 1 mapel agar rekapitulasi nilai rapor kelas langsung tampil lengkap
  useEffect(() => {
    // Default tetap 'ALL' untuk menyajikan seluruh nilai mapel siswa di kelas
  }, [])

  // 3. Fetch Data Nilai Masuk dari Guru Mapel di Kelas Terpilih
  const {
    data: rawAssessments = [],
    isLoading: loadingAssessments,
  } = useQuery<any[]>({
    queryKey: ['homeroom-rapor-assessments', selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear],
    queryFn: async () => {
      if (!selectedClassId) return []
      let url = `/api-backend/grades/assessments?classId=${selectedClassId}&semester=${selectedSemester}&academicYear=${selectedAcademicYear}&excludeProgram=true`
      if (selectedSubjectId && selectedSubjectId !== 'ALL') {
        url += `&subjectId=${selectedSubjectId}`
      }
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId,
  })

  // 4. Fetch Seluruh Siswa di Kelas Terpilih
  const { data: studentsInClass = [] } = useQuery<any[]>({
    queryKey: ['students-in-class-rapor', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return []
      const res = await authenticatedFetch(`/api-backend/students?classId=${selectedClassId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId,
  })

  // Informasi Konteks
  const currentSelectedClass = availableClasses.find((c: any) => c.id === selectedClassId)
  const currentHomeroomName = currentSelectedClass?.homeroomTeacher?.user?.name || currentSelectedClass?.homeroomTeacher?.name || user?.name || '-'

  // Generator Deskripsi Capaian Otomatis (Kurikulum Merdeka)
  const generateSuggestedDescription = (item: any) => {
    const studentName = item.student?.name || 'Peserta didik'
    const subjectName = item.subject?.name || 'mata pelajaran'
    const score = item.finalScore ?? item.sts ?? 80

    if (score >= 90) {
      return `Menunjukkan penguasaan yang sangat istimewa dan melampaui capaian pembelajaran pada seluruh lingkup materi ${subjectName}. Memiliki ketelitian tinggi dan penalaran kritis yang sangat matang.`
    } else if (score >= 80) {
      return `Menunjukkan pemahaman yang baik dan konsisten dalam mencapai tujuan pembelajaran utama ${subjectName}. Perlu mempertahankan konsistensi belajar pada pendalaman materi mandiri.`
    } else if (score >= 70) {
      return `Mampu mencapai ketuntasan kriteria tujuan pembelajaran ${subjectName} dengan cukup baik. Masih memerlukan bimbingan tambahan dan pendampingan berkala pada penyelesaian tugas analisis.`
    } else {
      return `Perlu pendampingan intensif dan program remedial pada ketercapaian tujuan pembelajaran ${subjectName} guna menguatkan konsep dasar materi.`
    }
  }

  // Merging data asesmen dengan perubahan lokal (khusus mapel umum / reguler & kelas terpilih)
  const mergedAssessments = useMemo(() => {
    return rawAssessments
      .filter(item => {
        if (isProgramSubject(item.subject)) return false
        if (selectedClassId && selectedClassId !== 'ALL') {
          const itemClassId = item.classId || item.class?.id || item.student?.classId || item.student?.class?.id
          if (itemClassId && itemClassId !== selectedClassId) return false
        }
        return true
      })
      .map(item => {
        const edit = descEdits[item.id] || {}
        // Cari guru pengampu dari jadwal kelas jika item.teacher belum ada
        const scheduleItem = classSchedules.find((sc: any) => sc.subjectId === item.subjectId || sc.subject?.id === item.subjectId)
        const resolvedTeacher = item.teacher || scheduleItem?.teacher || null

        return {
          ...item,
          teacher: resolvedTeacher,
          raporCapaianKompetensi: edit.raporCapaianKompetensi !== undefined ? edit.raporCapaianKompetensi : (item.raporCapaianKompetensi || ''),
          raporCatatanWali: edit.raporCatatanWali !== undefined ? edit.raporCatatanWali : (item.raporCatatanWali || ''),
        }
      })
  }, [rawAssessments, selectedClassId, classSchedules, descEdits])

  // Filter Search
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return mergedAssessments
    const q = searchQuery.toLowerCase()
    return mergedAssessments.filter(
      item =>
        item.student?.name?.toLowerCase().includes(q) ||
        item.student?.nis?.includes(q) ||
        item.subject?.name?.toLowerCase().includes(q)
    )
  }, [mergedAssessments, searchQuery])

  // Pagination
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [selectedClassId, selectedSubjectId, selectedSemester, searchQuery, pageSize])

  // Handler Perubahan Textarea Deskripsi
  const handleDescChange = (id: string, field: 'raporCapaianKompetensi' | 'raporCatatanWali', val: string) => {
    setDescEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: val,
      },
    }))
    setIsDirty(true)
  }

  // Handler Auto-Generate Seluruh Deskripsi yang Masih Kosong
  const handleAutoFillDescriptions = () => {
    const newEdits: Record<string, any> = { ...descEdits }
    let filledCount = 0

    mergedAssessments.forEach(item => {
      if (!item.raporCapaianKompetensi) {
        const autoDesc = generateSuggestedDescription(item)
        newEdits[item.id] = {
          ...(newEdits[item.id] || {}),
          raporCapaianKompetensi: autoDesc,
        }
        filledCount++
      }
    })

    setDescEdits(newEdits)
    setIsDirty(true)

    Swal.fire({
      icon: 'success',
      title: 'Deskripsi Otomatis Dibuat',
      text: `Sebanyak ${filledCount} capaian kompetensi e-raport telah di-generate otomatis berdasarkan kalkulasi skor guru mapel.`,
      timer: 2000,
      showConfirmButton: false,
    })
  }

  // Mutation Simpan Deskripsi Capaian ke Database
  const saveDescriptionsMutation = useMutation({
    mutationFn: async () => {
      const itemsToSave: any[] = []
      Object.entries(descEdits).forEach(([id, edits]) => {
        const original = rawAssessments.find(a => a.id === id)
        if (!original) return

        itemsToSave.push({
          id,
          studentId: original.studentId,
          subjectId: original.subjectId,
          academicYear: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          raporCapaianKompetensi: edits.raporCapaianKompetensi ?? original.raporCapaianKompetensi ?? null,
          raporCatatanWali: edits.raporCatatanWali ?? original.raporCatatanWali ?? null,
        })
      })

      if (itemsToSave.length === 0) return { count: 0 }

      const res = await authenticatedFetch('/api-backend/grades/assessments/homeroom-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSave }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan deskripsi e-raport')
      return res.json()
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['homeroom-rapor-assessments'] })
      setDescEdits({})
      setIsDirty(false)
      Swal.fire({
        icon: 'success',
        title: 'Deskripsi E-Rapor Tersimpan',
        text: `Sebanyak ${res.count || 0} deskripsi capaian rapor berhasil diperbarui dan tersinkronisasi utuh.`,
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan sistem.',
      })
    },
  })

  // Select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedList.map(item => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  // Mutation Reset Deskripsi & Catatan Wali Multi-Select (E-Rapor Kelas: Hanya reset deskripsi capaian & catatan wali kelas)
  const resetDescriptionsMutation = useMutation({
    mutationFn: async (targetIds: string[]) => {
      const res = await authenticatedFetch('/api-backend/grades/assessments/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetIds,
          classId: selectedClassId,
          subjectId: selectedSubjectId,
          academicYear: selectedAcademicYear,
          semester: parseInt(selectedSemester, 10),
          resetMode: 'DESCRIPTIONS_ONLY',
        }),
      })
      if (!res.ok) throw new Error('Gagal mereset deskripsi capaian belajar')
      return res.json()
    },
    onSuccess: (res) => {
      // Bersihkan state lokal descEdits untuk targetIds
      setDescEdits(prev => {
        const next = { ...prev }
        selectedIds.forEach(id => {
          delete next[id]
        })
        return next
      })
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['homeroom-rapor-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-my-grades'] })
      Swal.fire({
        icon: 'success',
        title: 'Deskripsi Berhasil Direset',
        text: `Sebanyak ${res.count || 0} deskripsi capaian dan catatan wali kelas telah berhasil dikosongkan. Nilai angka siswa tetap terjaga aman.`,
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Reset Deskripsi',
        text: err?.message || 'Terjadi kesalahan sistem saat mereset deskripsi.',
      })
    },
  })

  const handleConfirmResetDescriptions = () => {
    if (selectedIds.length === 0) return
    Swal.fire({
      title: 'Reset Deskripsi Capaian?',
      html: `Apakah Anda yakin ingin mereset deskripsi capaian belajar dan catatan wali kelas untuk <strong>${selectedIds.length} rekaman</strong> terpilih?<br/><span class="text-xs text-amber-600 font-semibold">Perhatian: Nilai angka siswa TIDAK akan terhapus, hanya teks deskripsi capaian dan catatan wali kelas yang dikosongkan.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Deskripsi & Catatan',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        resetDescriptionsMutation.mutate(selectedIds)
      }
    })
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* 1. Header Toolbar Bersih */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            E-Rapor Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Penyusunan capaian akhir mapel kurikulum nasional untuk sinkronisasi rapor Dapodik (tanpa mapel program unggulan).
          </p>
        </div>

        {/* Tombol Aksi Utama */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Tombol Generate Otomatis */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            onClick={handleAutoFillDescriptions}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Generate Deskripsi Otomatis</span>
          </Button>

          {/* Tombol Simpan Perubahan */}
          <Button
            size="sm"
            className={`h-9 gap-1.5 text-xs font-bold rounded-xl transition-all shadow-sm ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
            }`}
            onClick={() => saveDescriptionsMutation.mutate()}
            disabled={saveDescriptionsMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {saveDescriptionsMutation.isPending ? 'Menyimpan...' : isDirty ? 'Simpan Deskripsi Rapor' : 'Tersimpan'}
            </span>
          </Button>

          {/* Tombol Reset Deskripsi & Catatan Wali Multi-Select */}
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold rounded-xl border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 hover:text-amber-800 transition-all shadow-xs"
              onClick={handleConfirmResetDescriptions}
              disabled={resetDescriptionsMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Reset Deskripsi ({selectedIds.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Informasi Konteks & Searchbar dengan Tombol Filter Terpusat */}
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
                  {availableClasses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pemilihan Mapel Langsung */}
            <div className="w-44 sm:w-56">
              <Select value={selectedSubjectId} onValueChange={(val) => setSelectedSubjectId(val || 'ALL')}>
                <SelectTrigger className="h-8 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <span className="truncate">
                    {selectedSubjectId === 'ALL'
                      ? `Semua Mapel (${classSubjects.length})`
                      : classSubjects.find((s: any) => s.id === selectedSubjectId)?.name || 'Pilih Mapel'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL" className="text-xs font-medium">Semua Mapel ({classSubjects.length})</SelectItem>
                  {classSubjects.map((s: any) => {
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

            <Badge variant="outline" className="text-[11px] text-slate-500">
              Sem {selectedSemester === '1' ? 'Ganjil' : 'Genap'} ({selectedAcademicYear})
            </Badge>
          </div>

          {/* Searchbar Siswa atau Mapel */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:w-60">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari siswa atau mapel..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Tabel Kerja E-Rapor Wali Kelas */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                <TableRow className="border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <TableHead className="w-10 text-center p-2">
                    <input
                      type="checkbox"
                      checked={paginatedList.length > 0 && selectedIds.length === paginatedList.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 w-3.5 h-3.5"
                    />
                  </TableHead>
                  <TableHead className="w-20 text-center p-2">NIS</TableHead>
                  <TableHead className="min-w-[150px] max-w-[200px] text-left px-3">Nama Siswa</TableHead>
                  <TableHead className="min-w-[140px] max-w-[180px] text-left px-3">Mata Pelajaran</TableHead>
                  <TableHead className="w-14 text-center p-2 text-blue-600">STS</TableHead>
                  <TableHead className="w-14 text-center p-2 text-emerald-600">SAS</TableHead>
                  <TableHead className="w-16 text-center p-2 font-black">Nilai Akhir</TableHead>
                  <TableHead className="min-w-[260px] text-left px-3 text-amber-700 dark:text-amber-400">
                    Capaian Kompetensi
                  </TableHead>
                  <TableHead className="min-w-[180px] text-left px-3">
                    Catatan Wali Kelas
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingAssessments ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-xs text-slate-500">
                      Memuat rekapan nilai masuk dari guru mapel...
                    </TableCell>
                  </TableRow>
                ) : paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-xs text-slate-500">
                      Belum ada siswa atau mata pelajaran terdaftar pada rombel kelas ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const isPendingScore = item.isVirtual || ((item.sts === null || item.sts === 0) && (item.sas === null || item.sas === 0) && (item.finalScore === null || item.finalScore === 0))

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-xs transition-colors ${
                          isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                            className="rounded border-slate-300 w-3.5 h-3.5"
                          />
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium border-r border-slate-100 dark:border-slate-800 p-2 text-slate-600 dark:text-slate-300">
                          {item.student?.nis || '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 px-3 truncate max-w-[200px]" title={item.student?.name}>
                          {item.student?.name}
                        </TableCell>
                        <TableCell className="border-r border-slate-100 dark:border-slate-800 px-3 font-medium text-slate-700 dark:text-slate-200">
                          <div className="truncate max-w-[180px] font-semibold text-slate-800 dark:text-slate-200" title={item.subject?.name}>
                            {item.subject?.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]" title={item.teacher?.user?.name || item.teacher?.name}>
                            Guru: {item.teacher?.user?.name || item.teacher?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2 font-bold text-blue-600">
                          {isPendingScore && (item.sts === null || item.sts === 0) ? (
                            <span className="text-slate-400 font-normal">0</span>
                          ) : (
                            item.sts ?? 0
                          )}
                        </TableCell>
                        <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2 font-bold text-emerald-600">
                          {isPendingScore && (item.sas === null || item.sas === 0) ? (
                            <span className="text-slate-400 font-normal">0</span>
                          ) : (
                            item.sas ?? 0
                          )}
                        </TableCell>
                        <TableCell className="text-center border-r border-slate-100 dark:border-slate-800 p-2">
                          {isPendingScore && (item.finalScore === null || item.finalScore === 0) ? (
                            <Badge variant="outline" className="text-[10px] text-slate-400 font-semibold px-1.5 py-0 border-slate-200 dark:border-slate-700" title="Nilai belum diinput oleh guru mapel">
                              0
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-800 text-white font-bold text-[11px] px-2 py-0.5">
                              {item.finalScore ?? item.sts ?? 0}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Textarea Deskripsi Capaian Kompetensi Rapor */}
                        <TableCell className="p-2 border-r border-slate-100 dark:border-slate-800">
                          <textarea
                            rows={2}
                            value={item.raporCapaianKompetensi || ''}
                            onChange={(e) => handleDescChange(item.id, 'raporCapaianKompetensi', e.target.value)}
                            placeholder="Ketik atau klik 'Generate' untuk mengisi deskripsi capaian..."
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 resize-none transition-colors"
                          />
                        </TableCell>

                        {/* Textarea Catatan Wali Kelas */}
                        <TableCell className="p-2">
                          <textarea
                            rows={2}
                            value={item.raporCatatanWali || ''}
                            onChange={(e) => handleDescChange(item.id, 'raporCatatanWali', e.target.value)}
                            placeholder="Catatan motivasi / perkembangan..."
                            className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 resize-none transition-colors"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginasi Terstandar (10 / 50 / 100) */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredList.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 50, 100]}
              itemLabel="rekaman"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
