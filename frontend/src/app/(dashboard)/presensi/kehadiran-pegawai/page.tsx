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
  Power,
  Sparkles,
  Camera,
  Zap
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
  snapshotUrl?: string | null
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
        <div className="lg:col-span-7 space-y-3">
          <Card className="shadow-lg border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
            <div className="p-3 sm:p-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-3 w-3 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate">
                    <span className="truncate">{cameraConfig?.cameraName || 'Camera Presensi AI'}</span>
                    <Badge variant="outline" className="text-[10px] py-0 px-2 rounded-full border-slate-700 text-indigo-300 font-mono shrink-0">
                      {cameraConfig?.streamSourceType || 'LIVE STREAM'}
                    </Badge>
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                    Lokasi: {cameraConfig?.location || 'Gerbang Depan Sekolah'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStreamError(false)
                    setStreamKey(Date.now())
                  }}
                  title="Segarkan Stream Video"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2.5 rounded-lg text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Video Feed Canvas (16:9 Widescreen) */}
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
                <span>LIVE SCANNER AKTIF</span>
              </div>

              <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                Sensitivitas: {Math.round((cameraConfig?.threshold || 0.7) * 100)}%
              </div>
            </div>

            {/* Bottom Camera Info Bar */}
            <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Sistem Biometrik AI: <strong className="text-slate-200">FaceNet Inception-V1</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.is_running ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {serviceStatus?.is_running ? 'Live Active' : 'Standby'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: REALTIME DETECTION LOGS (5 COLS) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 flex flex-col h-[520px] rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shadow-xs">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Scanner Log Realtime</CardTitle>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                        Live Sync
                      </span>
                    </div>
                    <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">Verifikasi snapshot wajah & pencatatan presensi</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLiveLogs()}
                  title="Segarkan Log"
                  className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-3">
              {!liveLogs || liveLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-7 h-7 stroke-1" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Menunggu Wajah Terdeteksi</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Arahkan wajah Anda ke depan kamera. Hasil identifikasi dan foto snapshot akan otomatis muncul di sini.
                  </p>
                </div>
              ) : (
                liveLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-3.5 rounded-2xl transition-all border ${
                      idx === 0
                        ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border-indigo-300/80 dark:border-indigo-700/60 shadow-md ring-1 ring-indigo-400/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    {/* Header: User identity & Scan status */}
                    <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">{log.userName}</h4>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            log.userRole?.includes('SISWA') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            log.userRole?.includes('GURU') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {log.userRole}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          ID: {log.identifier}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full ${
                          log.scanType === 'MASUK'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.scanType === 'PULANG'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          {log.scanType}
                        </span>
                        <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {log.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Visual Face Comparison Box (Profil vs Snapshot Kamera Realtime) */}
                    <div className="py-2.5 grid grid-cols-2 gap-3 items-center">
                      {/* 1. Foto Profil Terdaftar */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 shadow-xs flex items-center justify-center">
                          {log.avatarUrl ? (
                            <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-extrabold text-slate-500 text-xs">{log.userName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Database</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">Foto Profil</p>
                        </div>
                      </div>

                      {/* 2. Hasil Snapshot Kamera Realtime */}
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 overflow-hidden shrink-0 border-2 border-emerald-500 shadow-xs flex items-center justify-center">
                          {log.snapshotUrl ? (
                            <img src={log.snapshotUrl} alt="Snapshot Kamera Realtime" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            Live Shot
                          </span>
                          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">Snapshot AI</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer: AI FaceNet Match Confidence & Details */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          Akurasi Kemiripan AI:
                        </span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                          {Math.round(log.confidence * 100)}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, log.confidence * 100))}%` }}
                        />
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
