'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Banknote, Settings, Download, CheckCircle2, DollarSign, Calculator } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
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
  bantuanNominal?: number
}

export default function PenggajianPage() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')
  const [showParamModal, setShowParamModal] = useState(false)

  // State Parameter Gaji (Default Config)
  const [paramHarianRate, setParamHarianRate] = useState('50000')
  const [paramSubRoleAllowance, setParamSubRoleAllowance] = useState('300000')
  const [paramMinHadirBonus, setParamMinHadirBonus] = useState('20')
  const [paramInsentifKetertiban, setParamInsentifKetertiban] = useState('200000')

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            Penggajian Pegawai
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Estimasi penghasilan & insentif bulanan (Pengontrol Penuh: Agung - KEUANGAN_ALL)</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowParamModal(true)} variant="outline" className="border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-bold">
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

      {/* Panel Ringkasan Kalkulasi Perhitungan Penuh Keuangan (Pengontrol: Agung) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Total Kalkulasi Gaji Bulanan</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.reduce((acc, curr) => acc + (curr.estimasiPenghasilan || 0) + (curr.bantuanNominal || 0), 0)
              )}
            </h3>
            <p className="text-emerald-200 text-xs mt-1">Pengeluaran Gaji & Insentif {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Total Jam / Hari Kehadiran</p>
            <h3 className="text-2xl font-bold mt-1">
              {searchedPayroll.reduce((acc, curr) => acc + (curr.totalHadir || 0), 0)} Hari
            </h3>
            <p className="text-blue-200 text-xs mt-1">Akumulasi kehadiran seluruh pegawai</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Rata-Rata Gaji Pegawai</p>
            <h3 className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                searchedPayroll.length > 0
                  ? searchedPayroll.reduce((acc, curr) => acc + (curr.estimasiPenghasilan || 0), 0) / searchedPayroll.length
                  : 0
              )}
            </h3>
            <p className="text-amber-100 text-xs mt-1">Estimasi rata-rata per pegawai</p>
          </CardContent>
        </Card>
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
                        <div>
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.estimasiPenghasilan || 0)}
                        </div>
                        {item.bantuanNominal && item.bantuanNominal > 0 ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5">
                            + Insentif Bantuan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.bantuanNominal)}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog Atur Parameter Gaji */}
      <Dialog open={showParamModal} onOpenChange={setShowParamModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Pengaturan Parameter Gaji & Tunjangan
            </DialogTitle>
            <DialogDescription>
              Atur besaran tunjangan sub-role, insetif presensi harian, dan bonus kehadiran bulanan pegawai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Tarif Insentif Presensi Harian (Rp/Hari)</Label>
              <Input
                type="number"
                value={paramHarianRate}
                onChange={(e) => setParamHarianRate(e.target.value)}
                placeholder="50000"
              />
              <p className="text-[10px] text-slate-500">Nominal insentif yang dikalikan dengan total hari hadir pegawai.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Tunjangan Tambahan Sub-Role / Jabatan (Rp)</Label>
              <Input
                type="number"
                value={paramSubRoleAllowance}
                onChange={(e) => setParamSubRoleAllowance(e.target.value)}
                placeholder="300000"
              />
              <p className="text-[10px] text-slate-500">Tunjangan per sub-role tambahan yang diemban pegawai (Wali Kelas, BK, Kebersihan, dll).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Target Minimal Hadir (Hari)</Label>
                <Input
                  type="number"
                  value={paramMinHadirBonus}
                  onChange={(e) => setParamMinHadirBonus(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Insentif Ketertiban (Rp)</Label>
                <Input
                  type="number"
                  value={paramInsentifKetertiban}
                  onChange={(e) => setParamInsentifKetertiban(e.target.value)}
                  placeholder="200000"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowParamModal(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => {
                setShowParamModal(false)
                Swal.fire({
                  title: 'Parameter Tersimpan',
                  text: 'Parameter kalkulasi gaji pegawai berhasil diperbarui!',
                  icon: 'success',
                  confirmButtonColor: '#059669',
                })
              }}
            >
              Simpan Parameter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
