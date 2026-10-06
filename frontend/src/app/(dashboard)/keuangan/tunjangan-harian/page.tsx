'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, Banknote, Clock, CalendarDays, CheckCircle2, 
  AlertTriangle, DollarSign, Utensils, Bus, Sparkles, UserCheck,
  Info, ChevronRight
} from 'lucide-react'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export default function TunjanganHarianPage() {
  const authenticatedQuery = useAuthenticatedQuery()

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())

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

  // Query Data Slip Gaji & Rekap Presensi Harian Milik Akun Sendiri
  const { data: slipData, isLoading } = useQuery<any>({
    queryKey: ['my-slip-gaji', selectedYear, selectedMonth],
    queryFn: () => authenticatedQuery(
      `/api-backend/finance/payroll/my-slip-gaji?year=${selectedYear}&month=${selectedMonth}`
    ),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  })

  const dailyDetails: any[] = slipData?.attendance?.dailyDetails || []
  const calculation = slipData?.calculation || {}
  const staff = slipData?.staff || {}

  // Format currency
  const formatRp = (num: number | undefined | null) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0)
  }

  // Format tanggal Indonesia
  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d)
    } catch {
      return dateStr
    }
  }

  // Format tanggal ringkas untuk mobile
  const formatDateMobile = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
    } catch {
      return dateStr
    }
  }

  // Helper untuk menentukan status kedatangan / pulang
  const isLate = (inTime: string, isCS: boolean) => {
    if (!inTime || inTime === '-') return false
    const [h, m] = inTime.split(':').map((v: string) => parseInt(v, 10) || 0)
    const inMinutes = h * 60 + m
    return isCS ? inMinutes > 365 : inMinutes > 425 // CS: >06:05, Guru/Staf: >07:05
  }

  const isEarlyLeave = (outTime: string, dateStr: string, isCS: boolean) => {
    if (!outTime || outTime === '-') return false
    const [h, m] = outTime.split(':').map((v: string) => parseInt(v, 10) || 0)
    const outMinutes = h * 60 + m
    const d = new Date(dateStr)
    const dayOfWeek = d.getDay() // 5 = Jumat

    if (isCS) {
      return dayOfWeek === 5 ? outMinutes < 780 : outMinutes < 840
    } else {
      return dayOfWeek === 5 ? outMinutes < 810 : outMinutes < 900
    }
  }

  const isCS = staff?.employmentStatus === 'CS' || 
               (staff?.roles && staff.roles.toLowerCase().includes('kebersihan')) ||
               (staff?.role && staff.role.toLowerCase().includes('kebersihan'))

  // Kalkulasi rekap dari dailyDetails
  const totalHadir = dailyDetails.length
  const totalLateCount = dailyDetails.filter(d => isLate(d.checkInTime, isCS)).length
  const totalEarlyLeaveCount = dailyDetails.filter(d => isEarlyLeave(d.checkOutTime, d.date, isCS)).length
  const totalHoursWorked = dailyDetails.reduce((sum, d) => sum + (Number(d.durationHours) || 0), 0)
  const totalTransportRecap = dailyDetails.reduce((sum, d) => sum + (Number(d.transportTotal) || 0), 0)
  const totalMealRecap = dailyDetails.reduce((sum, d) => sum + (Number(d.mealAllowance) || 0), 0)
  const totalAllowanceCombined = (calculation.transportAllowance || totalTransportRecap) + (calculation.mealAllowance || totalMealRecap)

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-7xl mx-auto">
      {/* Header & Filter Periode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-700 dark:text-emerald-300 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white leading-tight">
              Tunjangan Harian
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Periode {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>
        </div>

        {/* Filter Bulan & Tahun */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
            <SelectTrigger className="flex-1 sm:w-[125px] h-8 sm:h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-xs font-medium">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
            <SelectTrigger className="w-[88px] sm:w-[95px] h-8 sm:h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()} className="text-xs font-medium">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ringkasan Singkat & Total (Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Profil Pegawai */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl">
          <CardHeader className="p-3 sm:p-3.5 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-blue-600" /> Profil Pegawai</span>
              <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200 py-0 h-4">
                {staff.employmentStatus || 'GTTP'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 pt-0 space-y-1">
            <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate" title={staff.name}>
              {staff.name || '-'}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>NIP: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{staff.nip || '-'}</span></span>
              <span className="truncate max-w-[140px] text-right" title={staff.roles || staff.role}>{staff.roles || staff.role || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Rekap Kehadiran */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl">
          <CardHeader className="p-3 sm:p-3.5 pb-1.5 sm:pb-2">
            <CardTitle className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-600" /> Rekap Kehadiran</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 text-[10px]">
                {totalHadir} Hari
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 pt-0 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">Total Durasi:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                {totalHoursWorked.toFixed(1)} Jam
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className={`font-semibold flex items-center gap-0.5 ${totalLateCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                <AlertTriangle className="w-2.5 h-2.5" /> {totalLateCount} Terlambat
              </span>
              <span className={`font-semibold flex items-center gap-0.5 ${totalEarlyLeaveCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                <Clock className="w-2.5 h-2.5" /> {totalEarlyLeaveCount} Pulang Cepat
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Tunjangan Harian */}
        <Card className="sm:col-span-2 lg:col-span-1 border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-900 dark:to-emerald-950/20 shadow-xs rounded-xl">
          <CardHeader className="p-3 sm:p-3.5 pb-1 sm:pb-1.5">
            <CardTitle className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Total Tunjangan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-3.5 pt-0 space-y-1">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {formatRp(totalAllowanceCombined)}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 pt-0.5 border-t border-emerald-100/80 dark:border-emerald-900/40">
              <span>Transport: <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatRp(calculation.transportAllowance || totalTransportRecap)}</strong></span>
              <span>Makan: <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatRp(calculation.mealAllowance || totalMealRecap)}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rincian Log Harian */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        <CardHeader className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Rincian Log Harian
            </CardTitle>
            {/* Standar Waktu Ringkas */}
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
              <span>Masuk &le; {isCS ? '06.05' : '07.05'} (+5k)</span>
              <span>·</span>
              <span>Pulang &ge; {isCS ? '14.00' : '15.00'} (+5k)</span>
              <span>·</span>
              <span>&ge; 6 Jam (+8k)</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* TAMPILAN 1: MOBILE CARD LOGS (Hanya Muncul di Layar Handphone / Kecil < 768px) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mb-1.5 text-emerald-600" />
                Memuat data log presensi...
              </div>
            ) : dailyDetails.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs px-4">
                Belum ada data presensi yang tercatat pada periode ini.
              </div>
            ) : (
              dailyDetails.map((day, idx) => {
                const late = isLate(day.checkInTime, isCS)
                const early = isEarlyLeave(day.checkOutTime, day.date, isCS)
                const dayTotal = (day.transportTotal || 0) + (day.mealAllowance || 0)

                return (
                  <div key={day.date || idx} className="p-3 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Baris Atas: Tanggal & Total Tunjangan */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {formatDateMobile(day.date)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black font-mono ${dayTotal > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {formatRp(dayTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Baris Tengah: Jam Datang & Pulang + Badge Status */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
                      {/* Datang */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 font-medium">Datang:</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {day.checkInTime || '-'}
                        </div>
                        {day.checkInTime && day.checkInTime !== '-' && (
                          <div>
                            {late ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-2 h-2" /> Terlambat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2 h-2" /> Tepat
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pulang */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 font-medium">Pulang:</div>
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {day.checkOutTime || '-'}
                        </div>
                        {day.checkOutTime && day.checkOutTime !== '-' && (
                          <div>
                            {early ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-2 h-2" /> Cepat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2 h-2" /> Sesuai
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Baris Bawah: Durasi & Rincian Nominal */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>
                        Durasi: <strong className="font-mono font-semibold text-slate-700 dark:text-slate-300">{day.durationHours > 0 ? `${day.durationHours} Jam` : '-'}</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Trans: <strong className="font-mono font-semibold text-slate-700 dark:text-slate-300">{formatRp(day.transportTotal)}</strong></span>
                        <span>·</span>
                        <span>Makan: <strong className="font-mono font-semibold text-slate-700 dark:text-slate-300">{formatRp(day.mealAllowance)}</strong></span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* TAMPILAN 2: DESKTOP & TABLET TABLE (Muncul di Layar Desktop/Tablet >= 768px) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <Table className="w-full text-xs">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <TableRow>
                  <TableHead className="w-12 text-center py-2.5">No</TableHead>
                  <TableHead className="w-36 py-2.5">Hari & Tanggal</TableHead>
                  <TableHead className="w-20 text-center py-2.5">Datang</TableHead>
                  <TableHead className="w-20 text-center py-2.5">Pulang</TableHead>
                  <TableHead className="w-24 text-center py-2.5">Durasi</TableHead>
                  <TableHead className="w-28 text-center py-2.5">Status Masuk</TableHead>
                  <TableHead className="w-28 text-center py-2.5">Status Pulang</TableHead>
                  <TableHead className="w-24 text-right py-2.5">Transport</TableHead>
                  <TableHead className="w-24 text-right py-2.5">Makan</TableHead>
                  <TableHead className="w-28 text-right py-2.5 pr-4">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                        Memuat rincian tunjangan harian...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : dailyDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      Belum ada data presensi yang tercatat pada periode ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyDetails.map((day, idx) => {
                    const late = isLate(day.checkInTime, isCS)
                    const early = isEarlyLeave(day.checkOutTime, day.date, isCS)
                    const dayTotal = (day.transportTotal || 0) + (day.mealAllowance || 0)

                    return (
                      <TableRow key={day.date || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="text-center font-mono text-slate-400 py-2">{idx + 1}</TableCell>
                        <TableCell className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap py-2">
                          {formatDateIndo(day.date)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold whitespace-nowrap py-2">
                          {day.checkInTime || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold whitespace-nowrap py-2">
                          {day.checkOutTime || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono whitespace-nowrap py-2">
                          {day.durationHours > 0 ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {day.durationHours} Jam
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* Indikator Status Masuk */}
                        <TableCell className="text-center whitespace-nowrap py-2">
                          {day.checkInTime && day.checkInTime !== '-' ? (
                            late ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Terlambat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Tepat Waktu
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* Indikator Status Pulang */}
                        <TableCell className="text-center whitespace-nowrap py-2">
                          {day.checkOutTime && day.checkOutTime !== '-' ? (
                            early ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-500" /> Pulang Cepat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Sesuai Jam
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>

                        {/* Transport */}
                        <TableCell className="text-right font-mono whitespace-nowrap py-2">
                          <span className={day.transportTotal > 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-slate-400"}>
                            {formatRp(day.transportTotal)}
                          </span>
                        </TableCell>

                        {/* Makan */}
                        <TableCell className="text-right font-mono whitespace-nowrap py-2">
                          <span className={day.mealAllowance > 0 ? "text-blue-700 dark:text-blue-400 font-bold" : "text-slate-400"}>
                            {formatRp(day.mealAllowance)}
                          </span>
                        </TableCell>

                        {/* Total Harian */}
                        <TableCell className="text-right font-mono font-extrabold text-slate-900 dark:text-white pr-4 whitespace-nowrap py-2">
                          {formatRp(dayTotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
