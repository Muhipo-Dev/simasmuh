'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BookOpen,
  Sparkles,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  GraduationCap,
  Users,
  ShieldCheck,
  Building2,
  RefreshCw,
  FileText
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
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

type ScopeTab = 'ALL' | 'KURIKULUM' | 'PROGRAM'

export default function MasterDataERaporPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()

  // State Tabs Lingkup Data E-Rapor
  const [activeTab, setActiveTab] = useState<ScopeTab>('ALL')

  // Filter State
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [selectedSemester, setSelectedSemester] = useState<string>('1')
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2025/2026')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination & Seleksi Baris
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 1. Fetch Seluruh Master Kelas
  const { data: allClasses = [], isLoading: loadingClasses } = useQuery<any[]>({
    queryKey: ['master-classes-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // 2. Fetch Seluruh Master Mata Pelajaran
  const { data: allSubjects = [], isLoading: loadingSubjects } = useQuery<any[]>({
    queryKey: ['master-subjects-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
  })

  // Deteksi Mapel Program Unggulan (Pilihan Non-Dapodik)
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

  // Filter list mapel dropdown sesuai activeTab
  const filteredSubjectOptions = useMemo(() => {
    if (activeTab === 'KURIKULUM') {
      return allSubjects.filter(s => !isProgramSubject(s))
    }
    if (activeTab === 'PROGRAM') {
      return allSubjects.filter(s => isProgramSubject(s))
    }
    return allSubjects
  }, [allSubjects, activeTab])

  // Reset selectedSubjectId jika tidak kompatibel saat tab berganti
  useEffect(() => {
    if (selectedSubjectId !== 'ALL') {
      const stillAvailable = filteredSubjectOptions.some(s => s.id === selectedSubjectId)
      if (!stillAvailable) {
        setSelectedSubjectId('ALL')
      }
    }
  }, [activeTab, filteredSubjectOptions, selectedSubjectId])

  // 3. Fetch Data Penilaian (Assessments)
  // a. Reguler / Kurikulum
  const {
    data: kurikulumAssessments = [],
    isLoading: loadingKurikulum,
    refetch: refetchKurikulum,
  } = useQuery<any[]>({
    queryKey: ['master-rapor-kurikulum', selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear, activeTab],
    queryFn: async () => {
      if (activeTab === 'PROGRAM') return []
      let url = `/api-backend/grades/assessments?semester=${selectedSemester}&academicYear=${selectedAcademicYear}`
      if (selectedClassId && selectedClassId !== 'ALL') {
        url += `&classId=${selectedClassId}`
      }
      if (selectedSubjectId && selectedSubjectId !== 'ALL') {
        url += `&subjectId=${selectedSubjectId}`
      }
      if (activeTab === 'KURIKULUM') {
        url += `&excludeProgram=true`
      }
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: activeTab !== 'PROGRAM',
  })

  // b. Program Unggulan
  const {
    data: programAssessments = [],
    isLoading: loadingProgram,
    refetch: refetchProgram,
  } = useQuery<any[]>({
    queryKey: ['master-rapor-program', selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear, activeTab],
    queryFn: async () => {
      if (activeTab === 'KURIKULUM') return []
      let url = `/api-backend/grades/program-assessments?semester=${selectedSemester}&academicYear=${selectedAcademicYear}`
      if (selectedClassId && selectedClassId !== 'ALL') {
        url += `&classId=${selectedClassId}`
      }
      if (selectedSubjectId && selectedSubjectId !== 'ALL') {
        url += `&subjectId=${selectedSubjectId}`
      }
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    },
    enabled: activeTab !== 'KURIKULUM',
  })

  // Gabungkan assessments berdasarkan Tab aktif
  const combinedAssessments = useMemo(() => {
    if (activeTab === 'KURIKULUM') {
      return kurikulumAssessments.filter(item => !isProgramSubject(item.subject))
    }
    if (activeTab === 'PROGRAM') {
      return programAssessments
    }
    // Tab ALL: satukan dengan deduplikasi ID
    const map = new Map<string, any>()
    kurikulumAssessments.forEach(item => map.set(item.id, item))
    programAssessments.forEach(item => map.set(item.id, item))
    let list = Array.from(map.values())
    if (selectedClassId && selectedClassId !== 'ALL') {
      list = list.filter(item => {
        const cId = item.classId || item.class?.id || item.student?.classId || item.student?.class?.id
        return cId === selectedClassId
      })
    }
    return list
  }, [activeTab, kurikulumAssessments, programAssessments, selectedClassId])

  // Filter Search
  const filteredData = useMemo(() => {
    let result = combinedAssessments
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(item => {
        const studentName = (item.student?.name || '').toLowerCase()
        const nis = (item.student?.nis || '').toLowerCase()
        const nisn = (item.student?.nisn || '').toLowerCase()
        const className = (item.class?.name || item.student?.class?.name || '').toLowerCase()
        const subjectName = (item.subject?.name || '').toLowerCase()
        const teacherName = (item.teacher?.user?.name || item.teacher?.name || '').toLowerCase()
        return (
          studentName.includes(q) ||
          nis.includes(q) ||
          nisn.includes(q) ||
          className.includes(q) ||
          subjectName.includes(q) ||
          teacherName.includes(q)
        )
      })
    }
    return result
  }, [combinedAssessments, searchQuery])

  // Reset page saat filter/search berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedClassId, selectedSubjectId, selectedSemester, selectedAcademicYear, activeTab])

  // Pagination Data Slice
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  // Checkbox Selection
  const isAllSelected = filteredData.length > 0 && selectedIds.length === filteredData.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredData.map(i => i.id))
    }
  }

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Statistik Ringkasan Cepat
  const stats = useMemo(() => {
    const totalEntries = filteredData.length
    const scores = filteredData
      .map(i => (typeof i.finalScore === 'number' && !isNaN(i.finalScore) ? i.finalScore : null))
      .filter((s): s is number => s !== null && s > 0)
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0'
    const completedDesc = filteredData.filter(i => (i.raporCapaianKompetensi || '').trim().length > 0).length
    const programCount = filteredData.filter(i => isProgramSubject(i.subject)).length
    return {
      totalEntries,
      avgScore,
      completedDesc,
      programCount,
      regulerCount: totalEntries - programCount,
    }
  }, [filteredData])

  // Ekspor Excel Data Lengkap
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      Swal.fire({
        title: 'Tidak Ada Data',
        text: 'Tidak ada baris data nilai untuk diekspor pada filter ini.',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false,
      })
      return
    }

    const rows = filteredData.map((item, index) => {
      const isProg = isProgramSubject(item.subject)
      return {
        'No': index + 1,
        'NIS': item.student?.nis || '-',
        'NISN': item.student?.nisn || '-',
        'Nama Peserta Didik': item.student?.name || '-',
        'Kelas': item.class?.name || item.student?.class?.name || '-',
        'Kategori': isProg ? 'E-Rapor Pilihan Unggul' : 'E-Rapor Reguler (Dapodik)',
        'Mata Pelajaran': item.subject?.name || '-',
        'Guru Pengampu': item.teacher?.user?.name || item.teacher?.name || '-',
        'Rata-Rata Formatif': item.formatifAvg ?? 0,
        'Rata-Rata Sumatif LM': item.sumatifLmAvg ?? 0,
        'STS': item.sts ?? 0,
        'SAS': item.sas ?? 0,
        'Nilai Akhir Rapor': item.finalScore ?? 0,
        'Capaian Kompetensi': item.raporCapaianKompetensi || '-',
        'Catatan Rapor': item.raporCatatanWali || '-',
        'Semester': item.semester || selectedSemester,
        'Tahun Ajaran': item.academicYear || selectedAcademicYear,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master E-Rapor')

    const filename = `Master_ERapor_${activeTab}_Sem${selectedSemester}_${selectedAcademicYear.replace('/', '-')}.xlsx`
    XLSX.writeFile(workbook, filename)

    Swal.fire({
      title: 'Ekspor Berhasil!',
      text: `File ${filename} berhasil diunduh.`,
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    })
  }

  const isLoading = loadingKurikulum || loadingProgram || loadingClasses || loadingSubjects

  return (
    <div className="space-y-4">
      {/* Header Utama Modul Master E-Rapor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Master Data Akademik
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-2 border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-semibold">
              Supervisi Administratif Penuh
            </Badge>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Master Data E-Rapor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Pusat data penilaian holistik seluruh rombongan belajar, mata pelajaran nasional Dapodik, hingga E-Rapor program pilihan unggulan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchKurikulum()
              refetchProgram()
            }}
            className="text-xs h-9 rounded-xl font-bold border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Ekspor Master Excel
          </Button>
        </div>
      </div>

      {/* Tab Switcher Lingkup E-Rapor (Semua / Kurikulum Dapodik / Program Pilihan) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua E-Rapor</span>
          <Badge className="px-1.5 py-0 h-4 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {stats.totalEntries}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('KURIKULUM')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'KURIKULUM'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>E-Rapor Kurikulum (Dapodik)</span>
          <Badge className="px-1.5 py-0 h-4 text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {stats.regulerCount}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROGRAM')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PROGRAM'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>E-Rapor Program Pilihan (Unggulan)</span>
          <Badge className="px-1.5 py-0 h-4 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            {stats.programCount}
          </Badge>
        </button>
      </div>

      {/* Grid Statistik Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Rekod Nilai</span>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.totalEntries} <span className="text-xs font-normal text-slate-400">baris</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Rata-Rata Nilai Akhir</span>
          <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Deskripsi Terisi</span>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.completedDesc} <span className="text-xs font-normal text-slate-400">siswa</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Mapel Program Unggulan</span>
          <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {stats.programCount} <span className="text-xs font-normal text-slate-400">rekod</span>
          </div>
        </div>
      </div>

      {/* Main Content Card: Tabel E-Rapor */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold">
              {activeTab === 'ALL' && 'Rekapitulasi E-Rapor Seluruh Mapel & Kelas'}
              {activeTab === 'KURIKULUM' && 'Rekapitulasi E-Rapor Kurikulum Nasional (Dapodik)'}
              {activeTab === 'PROGRAM' && 'Rekapitulasi E-Rapor Program Pilihan Unggulan'}
            </CardTitle>
            <CardDescription className="text-xs">
              Akses menyeluruh seluruh rombel kelas dan mata pelajaran tanpa sekat pengampu.
            </CardDescription>
          </div>

          {/* Searchbar & Popover Filter Terpusat */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-64">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari siswa/NIS/kelas/mapel/guru..."
              />
            </div>

            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs font-semibold rounded-xl shrink-0 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filter</span>
                    {(selectedClassId !== 'ALL' || selectedSubjectId !== 'ALL' || selectedSemester !== '1') && (
                      <Badge className="ml-1 px-1.5 py-0 h-4 text-[10px] bg-blue-600 text-white rounded-full">
                        {(selectedClassId !== 'ALL' ? 1 : 0) + (selectedSubjectId !== 'ALL' ? 1 : 0) + (selectedSemester !== '1' ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                }
              />
              <PopoverContent align="end" className="w-80 p-4 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Filter Master E-Rapor</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Filter Kelas */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Rombongan Belajar (Kelas)</Label>
                  <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || 'ALL')}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Semua Kelas</SelectItem>
                      {allClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter Mapel */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mata Pelajaran</Label>
                  <Select value={selectedSubjectId} onValueChange={(val) => setSelectedSubjectId(val || 'ALL')}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Semua Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Semua Mata Pelajaran</SelectItem>
                      {filteredSubjectOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} {isProgramSubject(s) ? '(Program)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Semester */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Semester</Label>
                  <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val || '1')}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">Semester Ganjil (1)</SelectItem>
                      <SelectItem value="2" className="text-xs">Semester Genap (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tahun Ajaran */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                  <Select value={selectedAcademicYear} onValueChange={(val) => setSelectedAcademicYear(val || '2025/2026')}>
                    <SelectTrigger className="h-8 text-xs rounded-lg">
                      <SelectValue placeholder="Tahun Ajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025/2026" className="text-xs">2025/2026</SelectItem>
                      <SelectItem value="2024/2025" className="text-xs">2024/2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(selectedClassId !== 'ALL' || selectedSubjectId !== 'ALL' || selectedSemester !== '1') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedClassId('ALL')
                      setSelectedSubjectId('ALL')
                      setSelectedSemester('1')
                    }}
                    className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                  >
                    Reset Filter
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                  <TableHead className="w-28 text-xs font-bold">NIS / NISN</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-bold">Peserta Didik</TableHead>
                  <TableHead className="w-24 text-xs font-bold">Kelas</TableHead>
                  <TableHead className="min-w-[180px] text-xs font-bold">Mata Pelajaran</TableHead>
                  <TableHead className="min-w-[150px] text-xs font-bold">Guru Pengampu</TableHead>
                  <TableHead className="w-20 text-center text-xs font-bold">Formatif</TableHead>
                  <TableHead className="w-20 text-center text-xs font-bold">Sumatif LM</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold">STS</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold">SAS</TableHead>
                  <TableHead className="w-20 text-center text-xs font-bold">Nilai Akhir</TableHead>
                  <TableHead className="w-28 text-center text-xs font-bold">Kategori</TableHead>
                  <TableHead className="min-w-[220px] text-xs font-bold">Capaian Kompetensi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-10 text-xs text-slate-500">
                      Memuat data Master E-Rapor...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-10 text-xs text-slate-400">
                      Belum ada data nilai tercatat pada filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1
                    const isChecked = selectedIds.includes(item.id)
                    const isProg = isProgramSubject(item.subject)
                    const score = item.finalScore ?? 0

                    return (
                      <TableRow
                        key={item.id}
                        className={`text-xs transition-colors ${
                          isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(item.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          />
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-500">{rowNumber}</TableCell>
                        <TableCell>
                          <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                            {item.student?.nis || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.student?.nisn || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          {item.student?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-[10px] py-0 px-2 bg-slate-50 dark:bg-slate-800">
                            {item.class?.name || item.student?.class?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.subject?.name || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.subject?.code || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {item.teacher?.user?.name || item.teacher?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.formatifAvg ? Math.round(item.formatifAvg) : '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.sumatifLmAvg ? Math.round(item.sumatifLmAvg) : '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.sts ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.sas ?? '-'}
                        </TableCell>
                        <TableCell className="text-center font-black">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono ${
                              score >= 80
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : score >= 70
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {score}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isProg ? (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-0 text-[10px] font-bold">
                              Pilihan Program
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-0 text-[10px] font-bold">
                              Rapor Dapodik
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600 dark:text-slate-400 max-w-[260px] truncate" title={item.raporCapaianKompetensi || '-'}>
                          {item.raporCapaianKompetensi || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Terstandar (10 / 50 / 100) */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredData.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
