'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Banknote, Settings, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'

type PayrollSummary = {
  id: string
  name: string
  roles: string
  totalHadir: number
  totalIzin: number
  estimasiPenghasilan: number
}

export default function PenggajianPage() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')
  const authenticatedQuery = useAuthenticatedQuery()

  const { data: payroll, isLoading } = useQuery<PayrollSummary[]>({
    queryKey: ['payroll-summary', selectedYear, selectedMonth],
    queryFn: () => authenticatedQuery(`/api-backend/finance/payroll-summary?year=${selectedYear}&month=${selectedMonth}`)
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
    if (!payroll || payroll.length === 0) return;
    
    const exportData = payroll.map((log, i) => ({
      'No': i + 1,
      'Nama Pegawai': log.name,
      'Jabatan': log.roles,
      'Total Kehadiran': log.totalHadir,
      'Total Izin': log.totalIzin,
      'Estimasi Penghasilan': log.estimasiPenghasilan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Penggajian");
    XLSX.writeFile(wb, `Rekap_Penggajian_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`);
  }

  const { sortConfig, handleSort, sortedItems: sortedPayroll } = useSorting(payroll || [])

  const searchedPayroll = filterDataBySearch(sortedPayroll, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Banknote className="w-8 h-8 text-emerald-600" />
            Penggajian Pegawai
          </h1>
          <p className="text-slate-500 mt-1">Estimasi penghasilan bulanan berdasarkan rekapitulasi kehadiran.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100">
            <Settings className="w-4 h-4 mr-2" />
            Atur Parameter Gaji
          </Button>

          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
              <SelectTrigger className="w-[100px] bg-white">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Daftar Gaji Pegawai & Guru</CardTitle>
              <CardDescription>
                Bulan {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari pegawai..."
            />
            <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50" onClick={handleExportExcel} disabled={!payroll || payroll.length === 0 || isLoading}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[60px] text-center">No</TableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="name">Nama Pegawai</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="roles">Jabatan / Role</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="totalHadir" className="text-center">Total Hadir</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="totalIzin" className="text-center">Total Izin</SortableTableHead>
                  <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="estimasiPenghasilan" className="text-right">Estimasi Penghasilan (Rp)</SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                        Memuat data penggajian...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : searchedPayroll.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      {searchQuery ? 'Tidak ada data pegawai yang sesuai dengan pencarian.' : 'Tidak ada data pegawai yang ditemukan.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  searchedPayroll.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{item.name}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{item.roles}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                          {item.totalHadir} Hari
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.totalIzin > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                            {item.totalIzin} Kali
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800 text-base">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.estimasiPenghasilan || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
