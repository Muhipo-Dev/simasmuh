'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  CalendarDays, 
  Download, 
  Briefcase, 
  Video, 
  Radio, 
  Activity, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Maximize2, 
  Power 
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Badge } from '@/components/ui/badge'

type LogEntry = {
  date: string
  dayName: string
  dayNumber: number
  checkIn: string
  checkOut: string
  keterangan: string
  estimasiPenghasilan: number
}

interface FaceDetectionLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  userRole: string
  avatarUrl?: string | null
  identifier: string
  confidence: number
  scanType: 'MASUK' | 'PULANG' | 'SUDAH_LENGKAP'
  message: string
  cameraName: string
}

interface FaceCameraConfig {
  streamSourceType?: string
  streamUrl: string
  cameraName: string
  location: string
  threshold: number
  cooldownMinutes: number
  isActive: boolean
}

export default function LogKehadiranPegawaiPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const authenticatedFetch = useAuthenticatedFetch()

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [searchQuery, setSearchQuery] = useState('')
  const [streamKey, setStreamKey] = useState(Date.now())
  const [streamError, setStreamError] = useState(false)

  // 1. Fetch Config Presensi Camera
  const { data: cameraConfig } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/config')
      if (!res.ok) return null
      return res.json()
    },
  })

  // 2. Fetch AI Service Status
  const { data: serviceStatus } = useQuery({
    queryKey: ['face-attendance-service-status'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/service-status')
      if (!res.ok) return { isOnline: false, is_running: false }
      return res.json()
    },
    refetchInterval: 3000,
  })

  // 3. Fetch Live Logs Realtime
  const { data: liveLogs, refetch: refetchLiveLogs } = useQuery<FaceDetectionLog[]>({
    queryKey: ['face-attendance-live-logs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/logs')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 2500,
  })

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

      {/* AREA PREVIEW LIVE REALTIME CAMERA & LOG SCANNER WAJAH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* LEFT: LIVE CAMERA FEED (7 COLS) */}
        <div className="lg:col-span-7">
          <Card className="shadow-lg border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
            <div className="p-3 sm:p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-3 w-3 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate">
                    <span className="truncate">{cameraConfig?.cameraName || 'Camera Presensi AI'}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 text-indigo-300 font-mono shrink-0">
                      {cameraConfig?.streamSourceType || 'LIVE STREAM'}
                    </Badge>
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    Lokasi: {cameraConfig?.location || 'Gerbang Depan Sekolah'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStreamError(false)
                    setStreamKey(Date.now())
                  }}
                  title="Refresh Stream"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 sm:h-8 px-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Video Feed Canvas */}
            <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
              {!streamError && serviceStatus?.is_running ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={streamKey}
                    src={`/api/face-stream?t=${streamKey}`}
                    alt="Live Camera Presensi"
                    className="w-full h-full object-contain"
                    onError={() => setStreamError(true)}
                  />

                  {/* REALTIME BOUNDING BOX OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                    <div className="relative w-44 h-52 sm:w-52 sm:h-60 rounded-2xl border-2 border-dashed border-emerald-400/40 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.15)] flex flex-col justify-between p-3">
                      {/* 4 Corner Brackets */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg shadow-[0_0_8px_#10b981]" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg shadow-[0_0_8px_#10b981]" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg shadow-[0_0_8px_#10b981]" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-lg shadow-[0_0_8px_#10b981]" />

                      {/* Animated Scan Line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />

                      {/* Top Bounding Box Label */}
                      <div className="self-center -mt-6 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-sm text-[9px] font-mono font-bold text-emerald-300 tracking-wider">
                        AREA SCAN WAJAH
                      </div>

                      {/* Bottom Instruction */}
                      <div className="self-center -mb-5 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 backdrop-blur-sm text-[9px] font-mono text-slate-300 text-center">
                        Posisikan Wajah di Kotak
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <Video className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-xs sm:text-sm text-slate-200">
                      {serviceStatus?.isOnline ? 'Camera Standby (Siap Memindai)' : 'AI Service Offline'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {serviceStatus?.is_running 
                        ? 'Memuat live feed kamera presensi...' 
                        : 'Pastikan Microservice AI FaceNet (Port 8089) sedang aktif di sistem untuk melihat live streaming.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStreamError(false)
                      setStreamKey(Date.now())
                    }}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Hubungkan Ulang
                  </Button>
                </div>
              )}

              <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>REALTIME FACE SCANNER</span>
              </div>

              <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                Threshold: {Math.round((cameraConfig?.threshold || 0.7) * 100)}%
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: REALTIME DETECTION LOGS (5 COLS) */}
        <div className="lg:col-span-5">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800 flex flex-col h-[320px] sm:h-[350px] md:h-[390px] rounded-2xl overflow-hidden">
            <CardHeader className="p-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Log Presensi Wajah Realtime</CardTitle>
                    <CardDescription className="text-[10px]">Aktivitas presensi guru & karyawan hari ini</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLiveLogs()}
                  className="h-7 w-7 p-0 text-slate-500"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-2.5 flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1.5">
              {!liveLogs || liveLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-1.5">
                  <Radio className="w-8 h-8 text-slate-300 dark:text-slate-700 stroke-1 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Menunggu Deteksi Wajah</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    Presensi otomatis tercatat saat Anda berada di depan kamera.
                  </p>
                </div>
              ) : (
                liveLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-2 rounded-xl transition-all ${
                      idx === 0
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-white dark:border-slate-700">
                            {log.avatarUrl ? (
                              <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-slate-600 dark:text-slate-300 text-[10px]">{log.userName.charAt(0)}</span>
                            )}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            log.scanType === 'MASUK' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{log.userName}</p>
                          <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium truncate">{log.userRole}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge className={`text-[9px] font-bold py-0 px-1.5 ${
                          log.scanType === 'MASUK'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-none'
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border-none'
                        }`}>
                          {log.scanType}
                        </Badge>
                        <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {log.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
