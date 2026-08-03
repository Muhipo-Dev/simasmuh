'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, CalendarDays, Download, Briefcase } from 'lucide-react'
import * as XLSX from 'xlsx'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'

type LogEntry = {
  date: string
  dayName: string
  dayNumber: number
  checkIn: string
  checkOut: string
  keterangan: string
  estimasiPenghasilan: number
}

export default function LogKehadiranPegawaiPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const authenticatedFetch = useAuthenticatedFetch()

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')

  const { data: logs, isLoading } = useQuery<LogEntry[]>({
    queryKey: ['monthly-log-pegawai', userId, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!userId) return []
      const res = await authenticatedFetch(`/api-backend/daily-attendances/monthly?userId=${userId}&year=${selectedYear}&month=${selectedMonth}`)
      if (!res.ok) throw new Error('Gagal memuat log presensi pegawai')
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
      'Hari Kerja': log.dayName,
      'Jam Masuk Kerja': log.checkIn,
      'Jam Pulang Kerja': log.checkOut,
      'Keterangan Status Kerja': log.keterangan,
      'Estimasi Gaji / Penghasilan': log.estimasiPenghasilan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log Presensi & Jam Kerja");
    XLSX.writeFile(wb, `Log_Presensi_Pegawai_Kerja_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`);
  }

  const { sortConfig, handleSort, sortedItems: sortedLogs } = useSorting(logs || [])
  const searchedLogs = filterDataBySearch(sortedLogs, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Kehadiran Pegawai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Rekapitulasi riwayat presensi kerja dan kalkulasi estimasi penghasilan bulanan Anda.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
            <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={!logs || logs.length === 0}
            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold text-xs"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
        </div>
      </div>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-white">Riwayat Jam Kerja & Presensi - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Rincian jam kerja harian, status kehadiran kerja, dan kalkulasi estimasi penghasilan harian pegawai.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari tanggal/keterangan..."
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : searchedLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>{searchQuery ? 'Tidak ada data presensi yang sesuai dengan pencarian.' : 'Belum ada data presensi kerja pada bulan yang dipilih.'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="w-[60px] pl-6">No</TableHead>
                  <SortableTableHead sortKey="dayNumber" sortConfig={sortConfig} onSort={handleSort}>
                    Tanggal
                  </SortableTableHead>
                  <SortableTableHead sortKey="dayName" sortConfig={sortConfig} onSort={handleSort}>
                    Hari Kerja
                  </SortableTableHead>
                  <SortableTableHead sortKey="checkIn" sortConfig={sortConfig} onSort={handleSort}>
                    Jam Masuk Kerja
                  </SortableTableHead>
                  <SortableTableHead sortKey="checkOut" sortConfig={sortConfig} onSort={handleSort}>
                    Jam Pulang Kerja
                  </SortableTableHead>
                  <SortableTableHead sortKey="keterangan" sortConfig={sortConfig} onSort={handleSort}>
                    Keterangan Status Kerja
                  </SortableTableHead>
                  <SortableTableHead sortKey="estimasiPenghasilan" sortConfig={sortConfig} onSort={handleSort} className="text-right pr-6">
                    Estimasi Penghasilan Harian
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedLogs.map((log, index) => {
                  const isHadir = log.checkIn !== '-'
                  return (
                    <TableRow key={index}>
                      <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">
                        {log.dayNumber} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700 dark:text-slate-300">{log.dayName}</TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${isHadir ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {log.checkIn}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${log.checkOut !== '-' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {log.checkOut}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                        {log.keterangan}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(log.estimasiPenghasilan || 0)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
