'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useActiveUser } from '@/hooks/useActiveUser'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  Search,
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  Filter,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileText,
  BadgeAlert,
  ArrowUpDown,
  Lock,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/TablePagination'
import { TableSearch } from '@/components/TableSearch'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import * as XLSX from 'xlsx'

export default function ArsipERaporPage() {
  const { user: activeUser } = useActiveUser()
  const user = activeUser as any
  const userId = user?.id
  const authenticatedFetch = useAuthenticatedFetch()

  // Hak akses ketat: Hanya Admin TU, Superadmin, Kurikulum, Kepsek
  const userRolesList = [
    user?.role,
    user?.subRole,
    user?.subRole2,
    user?.subRole3,
    user?.subRole4,
    user?.subRole5,
  ].filter(Boolean)

  const isSuperAdmin = userRolesList.some((r) =>
    ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'GOD', 'GOD_USER'].includes(r)
  )
  const isBauAdmin = userRolesList.some((r) =>
    ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(r)
  )
  const isKepalaSekolah = userRolesList.includes('KEPALA_SEKOLAH')
  const isKurikulum = userRolesList.some((r) =>
    ['KURIKULUM', 'WAKA_KURIKULUM'].includes(r)
  )

  const isAuthorized = isSuperAdmin || isBauAdmin || isKepalaSekolah || isKurikulum

  // Filter States
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('')
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL')
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(50)

  // 1. Fetch Periode Arsip & Tahun Aktif Sistem
  const { data: archivePeriodsData, isLoading: loadingPeriods } = useQuery({
    queryKey: ['archive-periods-meta'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/grades/archive-periods')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60000,
    enabled: isAuthorized,
  })

  const availableYears = useMemo(() => {
    if (!archivePeriodsData?.periods) return []
    const set = new Set<string>()
    archivePeriodsData.periods.forEach((p: any) => set.add(p.academicYear))
    return Array.from(set)
  }, [archivePeriodsData])

  // Set default academic year saat data periode termuat
  React.useEffect(() => {
    if (!selectedAcademicYear && availableYears.length > 0) {
      setSelectedAcademicYear(availableYears[0])
    }
  }, [availableYears, selectedAcademicYear])

  // 2. Fetch Master Kelas & Mapel untuk Filter
  const { data: allClasses = [] } = useQuery<any[]>({
    queryKey: ['classes-list-archive'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
    enabled: isAuthorized,
  })

  const { data: allSubjects = [] } = useQuery<any[]>({
    queryKey: ['subjects-list-archive'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60000,
    enabled: isAuthorized,
  })

  // 3. Fetch Data Nilai Arsip
  const { data: archiveItems = [], isLoading: loadingItems } = useQuery<any[]>({
    queryKey: [
      'archive-assessments',
      selectedAcademicYear,
      selectedSemester,
      selectedClassId,
      selectedSubjectId,
    ],
    queryFn: async () => {
      if (!selectedAcademicYear) return []
      let url = `/api-backend/grades/archive?academicYear=${encodeURIComponent(
        selectedAcademicYear
      )}`
      if (selectedSemester && selectedSemester !== 'ALL') {
        url += `&semester=${selectedSemester}`
      }
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
    enabled: isAuthorized && !!selectedAcademicYear,
  })

  // Filter Search Client-Side (Nama, NIS, NISN, atau Nama Mapel)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return archiveItems
    const q = searchQuery.toLowerCase().trim()
    return archiveItems.filter((item: any) => {
      const stName = item.student?.name?.toLowerCase() || ''
      const nis = item.student?.nis || ''
      const nisn = item.student?.nisn || ''
      const subName = item.subject?.name?.toLowerCase() || ''
      const clsName = item.class?.name?.toLowerCase() || ''
      return (
        stName.includes(q) ||
        nis.includes(q) ||
        nisn.includes(q) ||
        subName.includes(q) ||
        clsName.includes(q)
      )
    })
  }, [archiveItems, searchQuery])

  // Pagination Slice
  const totalItems = filteredItems.length
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // Reset pagination jika filter berubah
  React.useEffect(() => {
    setCurrentPage(1)
  }, [
    selectedAcademicYear,
    selectedSemester,
    selectedClassId,
    selectedSubjectId,
    searchQuery,
    pageSize,
  ])

  // Handler Export Arsip ke Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) return

    const exportRows = filteredItems.map((item: any, idx: number) => ({
      No: idx + 1,
      'Tahun Pelajaran': item.academicYear,
      Semester: item.semester === 1 ? 'Ganjil' : 'Genap',
      Kelas: item.class?.name || item.student?.class?.name || '-',
      NIS: item.student?.nis || '-',
      NISN: item.student?.nisn || '-',
      'Nama Siswa': item.student?.name || '-',
      'Mata Pelajaran': item.subject?.name || '-',
      Kategori:
        item.subject?.category === 'PILIHAN_PROGRAM'
          ? 'Program Unggulan'
          : 'Reguler (Dapodik)',
      'Guru Pengampu': item.teacher?.user?.name || '-',
      'Rata Formatif (LM)': item.formatifAvg ?? '-',
      'Sumatif LM': item.sumatifLmAvg ?? '-',
      STS: item.sts ?? '-',
      SAS: item.sas ?? '-',
      'Nilai Akhir (NA)': item.finalScore ?? '-',
      'Capaian Kompetensi': item.raporCapaianKompetensi || '-',
      'Catatan Wali': item.raporCatatanWali || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Arsip_ERapor_${selectedAcademicYear.replace('/', '-')}`
    )
    XLSX.writeFile(
      workbook,
      `Arsip_ERapor_SIMASMUH_${selectedAcademicYear.replace('/', '-')}.xlsx`
    )
  }

  // Jika Pengguna Bukan Otoritas Administrasi TU / Superadmin / Kepsek
  if (!isAuthorized) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-center p-8 rounded-2xl shadow-sm">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Akses Arsip E-Rapor Dibatasi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
            Modul Arsip E-Rapor historis hanya diperuntukkan bagi Administrator Tata Usaha (Admin TU),
            Superadmin, dan Tim Supervisi Kurikulum. Siswa dan Wali Murid dapat melihat histori nilai pribadi
            melalui menu <strong>Capaian Siswa</strong> akun masing-masing.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto px-2 sm:px-4 pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Arsip E-Rapor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Repositori penyimpanan dan pencarian data nilai E-Rapor historis seluruh tahun pelajaran.
          </p>
        </div>

        {/* Tombol Ekspor Arsip */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0}
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ekspor Arsip Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. Toolbar Filter Berdasarkan Tahun Pelajaran, Semester, Kelas, dan Mapel */}
      <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs w-full lg:w-auto">
            <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">Filter Arsip:</span>

            {/* Dropdown Tahun Pelajaran */}
            <div className="w-36">
              <Select
                value={selectedAcademicYear}
                onValueChange={(val) => setSelectedAcademicYear(val || '')}
              >
                <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300">
                  <span className="truncate">TP {selectedAcademicYear || 'Pilih TP'}</span>
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => {
                    const isCur = year === archivePeriodsData?.currentSystem?.academicYear
                    return (
                      <SelectItem key={year} value={year} className="text-xs font-semibold">
                        <span>{year}</span>
                        {isCur && (
                          <span className="ml-1 text-[10px] text-emerald-600 font-bold">
                            (Aktif)
                          </span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown Semester */}
            <div className="w-32">
              <Select
                value={selectedSemester}
                onValueChange={(val) => setSelectedSemester(val || 'ALL')}
              >
                <SelectTrigger className="h-8 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <span className="truncate">
                    {selectedSemester === 'ALL'
                      ? 'Semua Sem'
                      : selectedSemester === '1'
                      ? 'Sem 1 (Ganjil)'
                      : 'Sem 2 (Genap)'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">Semua Semester</SelectItem>
                  <SelectItem value="1" className="text-xs">Semester 1 (Ganjil)</SelectItem>
                  <SelectItem value="2" className="text-xs">Semester 2 (Genap)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown Kelas */}
            <div className="w-32 sm:w-36">
              <Select
                value={selectedClassId}
                onValueChange={(val) => setSelectedClassId(val || 'ALL')}
              >
                <SelectTrigger className="h-8 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <span className="truncate">
                    {selectedClassId === 'ALL'
                      ? 'Semua Kelas'
                      : allClasses.find((c: any) => c.id === selectedClassId)?.name || 'Pilih Kelas'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL" className="text-xs font-medium">Semua Kelas</SelectItem>
                  {allClasses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dropdown Mapel */}
            <div className="w-44 sm:w-52">
              <Select
                value={selectedSubjectId}
                onValueChange={(val) => setSelectedSubjectId(val || 'ALL')}
              >
                <SelectTrigger className="h-8 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <span className="truncate">
                    {selectedSubjectId === 'ALL'
                      ? 'Semua Mapel'
                      : allSubjects.find((s: any) => s.id === selectedSubjectId)?.name || 'Pilih Mapel'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL" className="text-xs font-medium">Semua Mapel</SelectItem>
                  {allSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50">
              Total {totalItems} Nilai Terarsip
            </Badge>
          </div>

          {/* Searchbar Pencarian Siswa / NIS / Mapel */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:w-64">
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari siswa, NIS, atau mapel..."
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Tabel Data Arsip E-Rapor */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
              <TableRow className="text-xs font-bold text-slate-700 dark:text-slate-300">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead className="w-24">Tahun / Sem</TableHead>
                <TableHead className="w-20">Kelas</TableHead>
                <TableHead className="w-24">NIS / NISN</TableHead>
                <TableHead className="min-w-[180px]">Nama Siswa</TableHead>
                <TableHead className="min-w-[160px]">Mata Pelajaran</TableHead>
                <TableHead className="w-20 text-center">Formatif</TableHead>
                <TableHead className="w-20 text-center">Sumatif</TableHead>
                <TableHead className="w-16 text-center font-bold text-blue-600">STS</TableHead>
                <TableHead className="w-16 text-center font-bold text-emerald-600">SAS</TableHead>
                <TableHead className="w-20 text-center font-black text-slate-900 dark:text-white">NA</TableHead>
                <TableHead className="min-w-[200px]">Capaian Kompetensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItems ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-xs text-slate-500">
                    Memuat data arsip E-Rapor...
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-xs text-slate-500">
                    Tidak ada rekaman data arsip E-Rapor untuk periode tahun ajaran yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item: any, idx: number) => {
                  const rowNum = (currentPage - 1) * pageSize + idx + 1
                  return (
                    <TableRow
                      key={item.id || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 text-xs border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <TableCell className="text-center font-medium text-slate-500">{rowNum}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                        <div>{item.academicYear}</div>
                        <div className="text-[10px] text-slate-400">
                          Sem {item.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-bold">
                          {item.class?.name || item.student?.class?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{item.student?.nis || '-'}</div>
                        <div className="text-[10px] text-slate-400">{item.student?.nisn || '-'}</div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">
                        {item.student?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.subject?.name || '-'}
                        </div>
                        {item.subject?.category === 'PILIHAN_PROGRAM' && (
                          <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold mt-0.5">
                            Program
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">
                        {item.formatifAvg ?? '-'}
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400">
                        {item.sumatifLmAvg ?? '-'}
                      </TableCell>
                      <TableCell className="text-center font-bold text-blue-600">
                        {item.sts ?? '-'}
                      </TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">
                        {item.sas ?? '-'}
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white">
                        {item.finalScore ?? '-'}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        <div className="line-clamp-2 text-[11px]" title={item.raporCapaianKompetensi}>
                          {item.raporCapaianKompetensi || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Paginasi Tabel Terstandar (10 / 50 / 100 per page) */}
        {totalItems > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
