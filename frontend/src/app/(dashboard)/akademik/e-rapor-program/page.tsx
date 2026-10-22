'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Save,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  Award,
  ChevronDown,
  Printer,
  SlidersHorizontal,
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
import Swal from 'sweetalert2'

export default function ERaporProgramPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Role detection
  const userRolesList = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean)
  const isSuperAdmin = userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'GOD', 'GOD_USER'].includes(r))
  const isKepalaSekolah = userRolesList.includes('KEPALA_SEKOLAH')
  const isKurikulum = userRolesList.includes('KURIKULUM')
  const isWaliKelas = userRolesList.includes('WALI_KELAS')
  const isGuru = userRolesList.some(r => ['GURU', 'HONORER'].includes(r))
  const isSiswa = user?.role === 'SISWA' && !isGuru && !isWaliKelas && !isSuperAdmin
  const isWaliMurid = user?.role === 'WALI_MURID' && !isGuru && !isWaliKelas && !isSuperAdmin

  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [selectedSemester, setSelectedSemester] = useState<string>('1')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2025/2026')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination & Checkbox selection
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Local Edits State: key = assessmentId -> { raporCapaianKompetensi, raporCatatanWali }
  const [descEdits, setDescEdits] = useState<Record<string, { raporCapaianKompetensi?: string; raporCatatanWali?: string }>>({})
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // 1. Fetch Teacher Context (Kelas Binaan Wali Kelas)
  const { data: teacherContext } = useQuery({
    queryKey: ['teacher-context-rapor-program', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/grades/teacher-context?userId=${userId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId && !isSiswa && !isWaliMurid,
  })

  // 0. Fetch Setting Sistem Sekolah (Tahun Pelajaran & Semester Aktif Resmi)
  const { data: systemSettings } = useQuery({
    queryKey: ['system-public-settings-program'],
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

  // 2. Fetch Master Kelas
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ['classes-list-program'],
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
    // Jika user menjabat sebagai wali kelas (memiliki kelas binaan), kunci hanya ke kelas binaannya
    if (hasHomeroom) {
      return homeroomClasses
    }
    // Jika admin/kepsek/kurikulum yang tidak memiliki kelas binaan pribadi, tampilkan seluruh kelas
    if (isSuperAdmin || isKepalaSekolah || isKurikulum) {
      return allClasses
    }
    return []
  }, [allClasses, homeroomClasses, hasHomeroom, isSuperAdmin, isKepalaSekolah, isKurikulum])

  // Inisialisasi otomatis kelas & tahun ajaran pertama kali
  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id)
      if (!systemSettings?.academicYear && availableClasses[0].academicYear) {
        setSelectedAcademicYear(availableClasses[0].academicYear)
      }
    }
  }, [availableClasses, selectedClassId, systemSettings])

  // Sinkronkan tahun ajaran secara otomatis saat kelas terpilih berganti (jika sistem belum menentukan)
  useEffect(() => {
    if (selectedClassId && !systemSettings?.academicYear) {
      const cls = availableClasses.find(c => c.id === selectedClassId)
      if (cls?.academicYear) {
        setSelectedAcademicYear(cls.academicYear)
      }
    }
  }, [selectedClassId, availableClasses, systemSettings])

  // Fetch Master Mata Pelajaran Program (Non-Dapodik)
  const { data: allSubjects = [] } = useQuery<any[]>({
    queryKey: ['all-subjects-program'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // 2b. Fetch Jadwal Kelas untuk menyaring Mapel Program yang diajarkan di kelas terpilih
  const { data: classSchedules = [] } = useQuery<any[]>({
    queryKey: ['class-schedules-for-program', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return []
      const res = await authenticatedFetch(`/api-backend/schedules?classId=${selectedClassId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId,
  })

  // 3. Fetch Data Nilai E-Rapor Program dari Endpoint Khusus
  const {
    data: rawAssessments = [],
    isLoading: loadingAssessments,
  } = useQuery<any[]>({
    queryKey: ['program-rapor-assessments', selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear],
    queryFn: async () => {
      if (!selectedClassId) return []
      let url = `/api-backend/grades/program-assessments?classId=${selectedClassId}&semester=${selectedSemester}&academicYear=${selectedAcademicYear}`
      if (selectedSubjectId && selectedSubjectId !== 'ALL') {
        url += `&subjectId=${selectedSubjectId}`
      }
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!selectedClassId,
  })

  // Filter Mata Pelajaran Khusus Program Unggulan (Hanya yang relevan dengan kelas terpilih)
  const programSubjects = useMemo(() => {
    const isProgMatch = (s: any) => {
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

    // Jika kelas memiliki jadwal program spesifik, tampilkan hanya mapel jadwal kelas tersebut
    const scheduledProgSubs = classSchedules
      .map((sc: any) => sc.subject)
      .filter((s: any) => isProgMatch(s))

    if (scheduledProgSubs.length > 0) {
      const map = new Map<string, any>()
      scheduledProgSubs.forEach((s: any) => map.set(s.id, s))
      return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
    }

    // Fallback jika belum ada jadwal kelas khusus: ambil dari data asesmen yang masuk di kelas ini
    if (rawAssessments.length > 0) {
      const map = new Map<string, any>()
      rawAssessments.forEach((item: any) => {
        if (item.subject && isProgMatch(item.subject)) {
          map.set(item.subject.id, item.subject)
        }
      })
      if (map.size > 0) {
        return Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
      }
    }

    // Jika kelas belum memiliki jadwal atau data sama sekali, tampilkan kosong agar tidak memunculkan mapel program lain
    return []
  }, [allSubjects, classSchedules, rawAssessments])

  // Informasi Konteks
  const currentSelectedClass = availableClasses.find((c: any) => c.id === selectedClassId)
  const currentHomeroomName = currentSelectedClass?.homeroomTeacher?.user?.name || currentSelectedClass?.homeroomTeacher?.name || user?.name || '-'

  // Generator Deskripsi Capaian Program Otomatis
  const generateSuggestedDescription = (item: any) => {
    const subjectName = item.subject?.name || 'program unggulan'
    const score = item.finalScore ?? item.sts ?? 80

    if (score >= 90) {
      return `Menunjukkan bakat istimewa, kreativitas unggul, dan kepemimpinan luar biasa dalam implementasi karya projek ${subjectName}. Memiliki portofolio karya yang sangat membanggakan.`
    } else if (score >= 80) {
      return `Menunjukkan kompetensi yang baik, dedikasi tinggi, dan konsistensi praktik yang positif dalam kegiatan ${subjectName}. Mampu berkolaborasi aktif dalam tim projek.`
    } else if (score >= 70) {
      return `Mampu mengikuti rangkaian program ${subjectName} dengan cukup baik. Perlu terus meningkatkan frekuensi latihan mandiri dan eksplorasi karya.`
    } else {
      return `Perlu pembimbingan intensif dan penguatan komitmen latihan dalam kegiatan program ${subjectName}.`
    }
  }

  // Merging data asesmen dengan perubahan lokal (khusus kelas terpilih)
  const mergedAssessments = useMemo(() => {
    return rawAssessments
      .filter(item => {
        if (selectedClassId && selectedClassId !== 'ALL') {
          const itemClassId = item.classId || item.class?.id || item.student?.classId || item.student?.class?.id
          if (itemClassId && itemClassId !== selectedClassId) return false
        }
        return true
      })
      .map(item => {
        const edit = descEdits[item.id] || {}
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
        item.subject?.name?.toLowerCase().includes(q) ||
        item.student?.program?.toLowerCase().includes(q)
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

  // Terapkan Deskripsi Otomatis ke Seluruh Data Tampil
  const handleApplyAutoDescription = () => {
    const newEdits = { ...descEdits }
    filteredList.forEach(item => {
      const suggested = generateSuggestedDescription(item)
      newEdits[item.id] = {
        ...(newEdits[item.id] || {}),
        raporCapaianKompetensi: suggested,
      }
    })
    setDescEdits(newEdits)
    setIsDirty(true)
    Swal.fire({
      icon: 'success',
      title: 'Deskripsi Capaian Terpasang',
      text: `Berhasil merumuskan narasi capaian kompetensi untuk ${filteredList.length} peserta didik. Klik Simpan Perubahan untuk membukukan.`,
      confirmButtonColor: '#4f46e5',
      timer: 2000,
    })
  }

  // Mutasi Simpan Deskripsi ke Database via Endpoint Program
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(descEdits).map(([id, val]) => ({
        id,
        raporCapaianKompetensi: val.raporCapaianKompetensi,
        raporCatatanWali: val.raporCatatanWali,
      }))

      const res = await authenticatedFetch('/api-backend/grades/program-assessments/homeroom-descriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan deskripsi rapor program')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-rapor-assessments'] })
      setDescEdits({})
      setIsDirty(false)
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Capaian dan catatan program unggulan berhasil disimpan ke sistem.',
        confirmButtonColor: '#4f46e5',
        timer: 2000,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem.',
        confirmButtonColor: '#ef4444',
      })
    },
  })

  // Checkbox Selection
  const allCurrentIds = useMemo(() => paginatedList.map(item => item.id), [paginatedList])
  const isAllSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.includes(id))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allCurrentIds])))
    } else {
      setSelectedIds(prev => prev.filter(id => !allCurrentIds.includes(id)))
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  // Mutation Reset Nilai Multi-Select (E-Rapor Pilihan/Program: Reset Nilai Siswa)
  const resetProgramScoresMutation = useMutation({
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
          resetMode: 'SCORES_ONLY',
        }),
      })
      if (!res.ok) throw new Error('Gagal mereset nilai program siswa')
      return res.json()
    },
    onSuccess: (res) => {
      setSelectedIds([])
      queryClient.invalidateQueries({ queryKey: ['program-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student-my-grades'] })
      Swal.fire({
        icon: 'success',
        title: 'Nilai Program Berhasil Direset',
        text: `Sebanyak ${res.count || 0} nilai program siswa telah dikosongkan dan disinkronkan kembali.`,
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

  const handleConfirmResetProgramScores = () => {
    if (selectedIds.length === 0) return
    Swal.fire({
      title: 'Reset Nilai Program Terpilih?',
      html: `Apakah Anda yakin ingin mereset/mengosongkan nilai untuk <strong>${selectedIds.length} rekaman</strong> program terpilih?<br/><span class="text-xs text-red-500 font-semibold">Tindakan ini akan mengosongkan nilai capaian siswa pada mapel program pilihan ini.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Nilai Program',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        resetProgramScoresMutation.mutate(selectedIds)
      }
    })
  }

  // Hitung jumlah filter aktif
  const activeFiltersCount = (selectedSubjectId !== 'ALL' ? 1 : 0) + (selectedSemester !== '1' ? 1 : 0)

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-20">
      {/* Header Halaman Fungsional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                E-Rapor Program
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan capaian program non-Dapodik (Seni Tari, AI, Olahraga Khusus, Entrepreneur, Tahfidz).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyAutoDescription}
            disabled={filteredList.length === 0}
            className="text-xs h-9 gap-1.5"
            title="Rumuskan narasi capaian program otomatis"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Auto Narasi
          </Button>

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
            className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Capaian'}
          </Button>

          {/* Tombol Reset Nilai Program Multi-Select */}
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold rounded-xl border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 hover:text-red-700 transition-all shadow-xs"
              onClick={handleConfirmResetProgramScores}
              disabled={resetProgramScoresMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span>Reset Nilai ({selectedIds.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Daftar Penilaian Program Siswa
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total {filteredList.length} rekaman program ditemukan di kelas ini
            </CardDescription>
          </div>

          {/* Filter Dropdown Kelas & Mapel Program + Searchbar Siswa */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Pemilihan Kelas Langsung */}
            <div className="w-32 sm:w-36">
              <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || '')}>
                <SelectTrigger className="h-8.5 text-xs font-bold rounded-xl border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300">
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

            {/* Pemilihan Mapel Program Langsung */}
            <div className="w-48 sm:w-56">
              <Select value={selectedSubjectId} onValueChange={(val) => setSelectedSubjectId(val || 'ALL')}>
                <SelectTrigger className="h-8.5 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <span className="truncate">
                    {selectedSubjectId === 'ALL'
                      ? 'Semua Program'
                      : programSubjects.find((s: any) => s.id === selectedSubjectId)?.name || 'Pilih Program'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL" className="text-xs font-semibold">
                    Semua Program Unggulan
                  </SelectItem>
                  {programSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Searchbar Siswa */}
            <div className="flex-1 min-w-[180px] sm:w-56">
              <TableSearch
                placeholder="Cari siswa, NIS, atau program..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto select-none">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="min-w-[160px] max-w-[220px]">Peserta Didik</TableHead>
                  <TableHead className="min-w-[130px] max-w-[180px]">Program Unggulan</TableHead>
                  <TableHead className="w-16 text-center">STS</TableHead>
                  <TableHead className="w-16 text-center">SAS</TableHead>
                  <TableHead className="w-20 text-center font-bold text-slate-800 dark:text-slate-200">Nilai Akhir</TableHead>
                  <TableHead className="min-w-[260px]">Capaian Kompetensi Program</TableHead>
                  <TableHead className="min-w-[220px]">Catatan Pembina / Wali</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingAssessments ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                      Memuat data penilaian program...
                    </TableCell>
                  </TableRow>
                ) : paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                      Belum ada data nilai program untuk filter yang dipilih.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map(item => {
                    const isSelected = selectedIds.includes(item.id)
                    const finalScore = item.finalScore ?? 0

                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : undefined}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => handleSelectRow(item.id, e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={item.student?.name}>
                            {item.student?.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            NIS: {item.student?.nis || '-'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={item.subject?.name}>
                            {item.subject?.name}
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-amber-200 text-amber-700 dark:border-amber-900/50 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                            Non-Dapodik
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs">
                          {item.sts ?? 0}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs">
                          {item.sas ?? 0}
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {finalScore}
                        </TableCell>

                        <TableCell>
                          <textarea
                            rows={2}
                            value={item.raporCapaianKompetensi || ''}
                            onChange={e => handleDescChange(item.id, 'raporCapaianKompetensi', e.target.value)}
                            placeholder="Tuliskan narasi capaian program..."
                            className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </TableCell>

                        <TableCell>
                          <textarea
                            rows={2}
                            value={item.raporCatatanWali || ''}
                            onChange={e => handleDescChange(item.id, 'raporCatatanWali', e.target.value)}
                            placeholder="Catatan motivasi atau progres portofolio..."
                            className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredList.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
