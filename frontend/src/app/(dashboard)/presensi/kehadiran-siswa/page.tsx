'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, CalendarDays, Download, UserCheck, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { WaliKelasSiswaManagement } from '@/components/academic/WaliKelasSiswaManagement'

type LogEntry = {
  date: string
  dayName: string
  dayNumber: number
  checkIn: string
  keterangan: string
}

export default function LogPresensiSiswaPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const authenticatedFetch = useAuthenticatedFetch()
  const user = session?.user as any
  const userRolesList = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean)
  const isWaliKelas = userRolesList.includes('WALI_KELAS')
  const isSuperOrAdmin = userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(r))
  const isStaffOrGuru = isSuperOrAdmin || isWaliKelas || userRolesList.includes('GURU')

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentUserId, setSelectedStudentUserId] = useState<string>('')

  // 1. Ambil daftar anak jika user adalah wali murid
  const { data: myStudents = [] } = useQuery<any[]>({
    queryKey: ['my-students-for-attendance'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/my-students')
      if (!res.ok) return []
      return res.json()
    },
  })

  // 2. Ambil seluruh data siswa untuk Wali Kelas, Guru, Tatib, dan Admin
  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ['all-students-for-attendance'],
    queryFn: async () => {
      if (!isStaffOrGuru) return []
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) return []
      return res.json()
    },
    enabled: isStaffOrGuru,
  })

  // Ambil kelas perwalian jika Wali Kelas
  const { data: classesData = [] } = useQuery<any[]>({
    queryKey: ['classes-for-homeroom'],
    queryFn: async () => {
      if (!isStaffOrGuru) return []
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) return []
      return res.json()
    },
    enabled: isStaffOrGuru,
  })

  // Siswa yang diwalikan oleh wali kelas saat ini
  const homeroomClass = classesData.find((c: any) => 
    c.homeroomTeacher?.userId === userId || 
    c.homeroomTeacher?.user?.id === userId ||
    c.homeroomTeacherId === user?.teacherProfile?.id ||
    c.homeroomTeacherId === user?.teacherId ||
    (c.homeroomTeacher?.user?.email && user?.email && c.homeroomTeacher?.user?.email === user?.email) ||
    (c.homeroomTeacher?.user?.name && user?.name && c.homeroomTeacher?.user?.name.trim().toLowerCase() === user?.name.trim().toLowerCase())
  )

  const relevantStudents = isWaliKelas && homeroomClass
    ? allStudents.filter((s: any) => s.classId === homeroomClass.id)
    : allStudents

  const effectiveStudentList = myStudents.length > 0 ? myStudents : relevantStudents
  const targetUserId = selectedStudentUserId || (effectiveStudentList[0]?.student?.userId || effectiveStudentList[0]?.userId || userId)

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ]

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ['monthly-log-siswa', targetUserId, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!targetUserId) return []
      const res = await authenticatedFetch(`/api-backend/daily-attendances/monthly?userId=${targetUserId}&year=${selectedYear}&month=${selectedMonth}`)
      if (!res.ok) throw new Error('Gagal memuat log presensi siswa')
      return res.json()
    },
    enabled: !!targetUserId && (!isWaliKelas || isSuperOrAdmin),
  })

  const { sortConfig, handleSort, sortedItems: sortedLogs } = useSorting(logs || [])
  const searchedLogs = filterDataBySearch(sortedLogs, searchQuery)

  const handleExportExcel = () => {
    if (!logs || logs.length === 0) return;
    
    const exportData = logs.map((log, i) => ({
      'No': i + 1,
      'Tanggal': `${log.dayNumber} ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
      'Hari': log.dayName,
      'Jam Masuk Sekolah': log.checkIn,
      'Keterangan Kehadiran': log.keterangan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran Siswa");
    XLSX.writeFile(wb, `Log_Kehadiran_Siswa_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`);
  }

  // Jika user adalah Wali Kelas, tampilkan tampilan presensi kelas harian perwalian secara penuh
  if (isWaliKelas && !isSuperOrAdmin) {
    return <WaliKelasSiswaManagement homeroomClass={homeroomClass} initialTab="presensi" />
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Compact & Responsif */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
            Presensi & Kehadiran
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Kehadiran Siswa
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Rekapitulasi riwayat presensi masuk harian siswa.</p>
        </div>

          <Button 
            variant="outline" 
            className="h-9 px-3.5 text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs rounded-xl touch-manipulation" 
            onClick={handleExportExcel} 
            disabled={!logs || logs.length === 0 || isLoading}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export Excel
          </Button>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base text-slate-900 dark:text-white font-bold">Riwayat Kehadiran Siswa</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">Menampilkan jam presensi masuk harian siswa di sekolah.</CardDescription>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari tanggal / ket..."
              activeFiltersCount={
                (selectedMonth !== currentMonth.toString() ? 1 : 0) +
                (selectedYear !== currentYear.toString() ? 1 : 0) +
                (selectedStudentUserId ? 1 : 0)
              }
              onResetFilters={() => {
                setSelectedMonth(currentMonth.toString())
                setSelectedYear(currentYear.toString())
                if (effectiveStudentList.length > 0) {
                  const firstUid = effectiveStudentList[0]?.student?.userId || effectiveStudentList[0]?.userId || effectiveStudentList[0]?.id || ''
                  setSelectedStudentUserId(firstUid)
                }
              }}
              filters={
                <div className="space-y-3">
                  {effectiveStudentList.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Pilih Siswa</label>
                      <div className="relative">
                        <select 
                          value={targetUserId} 
                          onChange={(e) => { if (e.target.value) setSelectedStudentUserId(e.target.value) }}
                          aria-label="Pilih Siswa"
                          className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs h-9 px-3 py-1.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none truncate"
                        >
                          {effectiveStudentList.map((item: any, idx: number) => {
                            const sName = item.student?.name || item.name
                            const sNis = item.student?.nis || item.nis
                            const sUid = item.student?.userId || item.userId || item.id
                            return (
                              <option key={item.id || sUid || idx} value={sUid || ''}>
                                {sName} {sNis ? `(${sNis})` : ''}
                              </option>
                            )
                          })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Bulan</label>
                      <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
                        <SelectTrigger className="w-full h-9 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl">
                          <SelectValue placeholder="Bulan" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(m => (
                            <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Tahun</label>
                      <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
                        <SelectTrigger className="w-full h-9 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl">
                          <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(y => (
                            <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 dark:bg-slate-900/75 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-14 text-center text-xs font-bold text-slate-700 dark:text-slate-300">No</TableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="dayNumber" className="w-44 text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal & Hari</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="checkIn" className="w-40 text-center text-xs font-bold text-slate-700 dark:text-slate-300">Jam Masuk</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="keterangan" className="min-w-[200px] text-xs font-bold text-slate-700 dark:text-slate-300">Keterangan</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500 text-xs">
                      <Loader2 className="w-5 h-5 animate-spin mb-2 text-blue-600" />
                      Memuat data presensi...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-500 text-xs">
                    {searchQuery ? 'Tidak ada data presensi yang sesuai dengan pencarian.' : 'Belum ada data presensi untuk bulan ini.'}
                  </TableCell>
                </TableRow>
              ) : (
                searchedLogs.map((log, index) => {
                  const isWeekend = log.dayName === 'Sabtu' || log.dayName === 'Minggu'
                  return (
                    <TableRow key={log.date} className={`h-11 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${isWeekend ? "bg-slate-50/40 dark:bg-slate-900/20" : ""}`}>
                      <TableCell className="text-center font-bold text-xs text-slate-500">{index + 1}</TableCell>
                      <TableCell className="py-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{log.dayNumber} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</div>
                        <div className="text-[11px] font-medium text-slate-500">{log.dayName}</div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold ${
                          log.checkIn !== '-' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {log.checkIn}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-slate-600 dark:text-slate-300">
                        {log.keterangan !== '-' ? (
                          <div className="space-y-1">
                            {log.keterangan.includes('Dispensasi Resmi') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                🏆 {log.keterangan}
                              </span>
                            ) : log.keterangan.includes('Izin Sakit') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                🤒 {log.keterangan}
                              </span>
                            ) : log.keterangan.includes('Izin Keperluan Keluarga') || log.keterangan.includes('Izin') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                🏡 {log.keterangan}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{log.keterangan}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Tidak ada catatan</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
