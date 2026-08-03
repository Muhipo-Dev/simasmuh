'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, CalendarDays, Download, UserCheck } from 'lucide-react'
import * as XLSX from 'xlsx'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'

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

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')

  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ['monthly-log-siswa', userId, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!userId) return []
      const res = await authenticatedFetch(`/api-backend/daily-attendances/monthly?userId=${userId}&year=${selectedYear}&month=${selectedMonth}`)
      if (!res.ok) throw new Error('Gagal memuat log presensi siswa')
      return res.json()
    },
    enabled: !!userId,
  })

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

  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

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

  const { sortConfig, handleSort, sortedItems: sortedLogs } = useSorting(logs || [])
  const searchedLogs = filterDataBySearch(sortedLogs, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Kehadiran Siswa
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Rekapitulasi riwayat presensi masuk harian Anda.</p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900">
              <SelectValue placeholder="Pilih Bulan" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
            <SelectTrigger className="w-[100px] bg-white dark:bg-slate-900">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
               {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold text-xs" onClick={handleExportExcel} disabled={!logs || logs.length === 0 || isLoading}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900 dark:text-white">Riwayat Kehadiran Siswa</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">Menampilkan jam presensi masuk harian siswa di sekolah.</CardDescription>
            </div>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari tanggal/keterangan..."
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-[60px] text-center">No</TableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="dayNumber">Tanggal & Hari</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="checkIn" className="text-center">Jam Masuk Sekolah</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="keterangan">Keterangan Kehadiran</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                      Memuat log presensi...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                    {searchQuery ? 'Tidak ada data presensi yang sesuai dengan pencarian.' : 'Belum ada data presensi untuk bulan ini.'}
                  </TableCell>
                </TableRow>
              ) : (
                searchedLogs.map((log, index) => {
                  const isWeekend = log.dayName === 'Sabtu' || log.dayName === 'Minggu'
                  return (
                    <TableRow key={log.date} className={isWeekend ? "bg-slate-50/50 dark:bg-slate-900/30" : ""}>
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 dark:text-white">{log.dayNumber} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</div>
                        <div className="text-xs text-slate-500">{log.dayName}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md font-mono text-xs font-bold ${
                          log.checkIn !== '-' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {log.checkIn}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300">
                        {log.keterangan !== '-' ? (
                          <span className="text-sm font-medium">{log.keterangan}</span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Tidak ada catatan</span>
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
