'use client'

import { useState, useMemo } from 'react'
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
import { TableSelectionBar, TableCheckboxHeader, TableCheckboxCell } from '@/components/TableSelectionBar'
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
  date?: string
  dateFormatted?: string
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
  const [selectedRowDates, setSelectedRowDates] = useState<string[]>([])
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
  const { data: rawLiveLogs, refetch: refetchLiveLogs } = useQuery<FaceDetectionLog[]>({
    queryKey: ['face-attendance-live-logs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/logs')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 2500,
  })

  const todayIsoStr = useMemo(() => {
    const today = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  }, [])

  const liveLogs = useMemo(() => {
    if (!rawLiveLogs) return []
    return rawLiveLogs.filter((l) => l.date === todayIsoStr)
  }, [rawLiveLogs, todayIsoStr])

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

  const currentMonth = new Date().getMonth() + 1
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
    <div className="space-y-4 sm:space-y-5">
      {/* Header Glassmorphic Standar CBT MUHIPO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
            Presensi & Kehadiran
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Kehadiran Pegawai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Rekapitulasi riwayat presensi kerja dan kalkulasi estimasi penghasilan bulanan Anda.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={!logs || logs.length === 0}
            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold text-xs h-9 px-3 rounded-xl touch-manipulation"
          >
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* AREA PREVIEW LIVE REALTIME CAMERA & LOG SCANNER WAJAH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: LIVE CAMERA FEED (7 COLS) */}
        <div className="lg:col-span-7 space-y-3">
          <Card className="shadow-xs border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
            <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                    <span className="truncate">{cameraConfig?.cameraName || 'Camera Presensi AI'}</span>
                    <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 rounded-full border-slate-700 text-indigo-300 font-mono shrink-0">
                      {cameraConfig?.streamSourceType || 'LIVE STREAM'}
                    </Badge>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
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
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2 rounded-lg text-xs touch-manipulation"
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
                <div className="text-center p-4 sm:p-6 space-y-2.5 max-w-sm">
                  <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <Video className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs sm:text-sm text-slate-200">
                      {serviceStatus?.isOnline ? 'Camera Standby (Siap Memindai)' : 'AI Service Offline'}
                    </p>
                    <p className="text-[10.5px] text-slate-400">
                      {serviceStatus?.is_running 
                        ? 'Memuat live feed kamera presensi...' 
                        : 'Microservice AI FaceNet (Port 8089) dalam status standby.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setStreamError(false)
                      setStreamKey(Date.now())
                    }}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white rounded-lg touch-manipulation"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Hubungkan Ulang
                  </Button>
                </div>
              )}

              <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9.5px] font-mono text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>LIVE SCANNER</span>
              </div>

              <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9.5px] font-mono text-slate-300 border border-white/10">
                Sensitivitas: {Math.round((cameraConfig?.threshold || 0.70) * 100)}%
              </div>
            </div>

            {/* Bottom Camera Info Bar */}
            <div className="p-2 sm:p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Biometrik AI : <strong className="text-slate-200">FaceNet & MTCNN</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.is_running ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {serviceStatus?.is_running ? 'Live Active' : 'Standby'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: REALTIME DETECTION LOGS (5 COLS) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 flex flex-col h-[480px] rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl">
            <CardHeader className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold shadow-xs">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Scanner Log Realtime</CardTitle>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                        Live Sync
                      </span>
                    </div>
                    <CardDescription className="text-[10.5px] text-slate-500 dark:text-slate-400">Verifikasi snapshot wajah & pencatatan presensi</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchLiveLogs()}
                  title="Segarkan Log"
                  className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 rounded-lg touch-manipulation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
              {!liveLogs || liveLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="w-6 h-6 stroke-1" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">Menunggu Wajah Terdeteksi</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Arahkan wajah ke depan kamera. Hasil identifikasi dan snapshot akan otomatis tampil di sini.
                  </p>
                </div>
              ) : (
                liveLogs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className={`p-3 rounded-xl transition-all border ${
                      idx === 0
                        ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 border-indigo-300/80 dark:border-indigo-700/60 shadow-xs ring-1 ring-indigo-400/20'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                    }`}
                  >
                    {/* Header: User identity & Scan status */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">{log.userName}</h4>
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                            log.userRole?.includes('SISWA') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            log.userRole?.includes('GURU') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {log.userRole}
                          </span>
                        </div>
                        <p className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          ID: {log.identifier}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold py-0.5 px-2 rounded-full ${
                          log.scanType === 'MASUK'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.scanType === 'PULANG'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          {log.scanType}
                        </span>
                        <p className="text-[10.5px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{log.dateFormatted || log.date}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {log.timestamp}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Visual Face Comparison Box */}
                    <div className="py-2 grid grid-cols-2 gap-2 items-center">
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs flex items-center justify-center">
                          {log.avatarUrl ? (
                            <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-extrabold text-slate-500 text-xs">{log.userName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Database</span>
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">Foto Profil</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 overflow-hidden shrink-0 border-2 border-emerald-500 shadow-2xs flex items-center justify-center">
                          {log.snapshotUrl ? (
                            <img src={log.snapshotUrl} alt="Snapshot Kamera Realtime" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            Live Shot
                          </span>
                          <p className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 truncate">Snapshot AI</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer: AI FaceNet Match Confidence */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[10.5px] font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          Kemiripan AI:
                        </span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-[10.5px]">
                          {Math.round(log.confidence * 100)}%
                        </span>
                      </div>

                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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

      <Card className="shadow-xs border-slate-200/80 dark:border-slate-800 overflow-hidden rounded-2xl">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg text-slate-900 dark:text-white">Riwayat Jam Kerja & Presensi - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">Rincian jam kerja harian, status kehadiran kerja, dan estimasi penghasilan harian pegawai.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari tanggal/keterangan..."
            activeFiltersCount={
              (selectedMonth !== currentMonth.toString() ? 1 : 0) +
              (selectedYear !== currentYear.toString() ? 1 : 0)
            }
            onResetFilters={() => {
              setSelectedMonth(currentMonth.toString())
              setSelectedYear(currentYear.toString())
            }}
            filters={
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Bulan</label>
                    <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
                      <SelectTrigger className="w-full h-9 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl">
                        <SelectValue placeholder="Pilih Bulan" />
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
                        <SelectValue placeholder="Pilih Tahun" />
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
        </CardHeader>
        {selectedRowDates.length > 0 && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <TableSelectionBar
              selectedCount={selectedRowDates.length}
              totalCount={searchedLogs.length}
              onClearSelection={() => setSelectedRowDates([])}
              onSelectAll={() => setSelectedRowDates(searchedLogs.map(l => l.date))}
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const selectedItems = searchedLogs.filter(l => selectedRowDates.includes(l.date))
                  const ws = XLSX.utils.json_to_sheet(selectedItems.map((l, idx) => ({
                    No: idx + 1,
                    Tanggal: `${l.dayNumber} ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
                    Hari: l.dayName,
                    'Jam Masuk': l.checkIn,
                    'Jam Pulang': l.checkOut,
                    Keterangan: l.keterangan,
                    'Estimasi Penghasilan': l.estimasiPenghasilan
                  })))
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Presensi Terpilih')
                  XLSX.writeFile(wb, `Presensi_Terpilih_${selectedMonth}_${selectedYear}.xlsx`)
                }}
                className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor Terpilih ({selectedRowDates.length})
              </Button>
            </TableSelectionBar>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : searchedLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{searchQuery ? 'Tidak ada data presensi yang sesuai dengan pencarian.' : 'Belum ada data presensi kerja pada bulan yang dipilih.'}</p>
              </div>
            ) : (
              <Table className="w-full table-auto">
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-10 pl-4 text-center">
                      <TableCheckboxHeader
                        checked={searchedLogs.length > 0 && selectedRowDates.length === searchedLogs.length}
                        indeterminate={selectedRowDates.length > 0 && selectedRowDates.length < searchedLogs.length}
                        onChange={(checked) => {
                          if (checked) {
                            setSelectedRowDates(searchedLogs.map(l => l.date))
                          } else {
                            setSelectedRowDates([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-xs px-2">No</TableHead>
                    <SortableTableHead sortKey="dayNumber" sortConfig={sortConfig} onSort={handleSort} className="w-32 text-xs">
                      Tanggal
                    </SortableTableHead>
                    <SortableTableHead sortKey="dayName" sortConfig={sortConfig} onSort={handleSort} className="w-28 text-xs">
                      Hari Kerja
                    </SortableTableHead>
                    <SortableTableHead sortKey="checkIn" sortConfig={sortConfig} onSort={handleSort} className="w-28 text-xs">
                      Jam Masuk
                    </SortableTableHead>
                    <SortableTableHead sortKey="checkOut" sortConfig={sortConfig} onSort={handleSort} className="w-28 text-xs">
                      Jam Pulang
                    </SortableTableHead>
                    <SortableTableHead sortKey="keterangan" sortConfig={sortConfig} onSort={handleSort} className="min-w-[180px] text-xs">
                      Keterangan Status
                    </SortableTableHead>
                    <SortableTableHead sortKey="estimasiPenghasilan" sortConfig={sortConfig} onSort={handleSort} className="w-36 text-right pr-6 text-xs">
                      Estimasi Harian
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedLogs.map((log, index) => {
                    const isHadir = log.checkIn !== '-'
                    const isSelected = selectedRowDates.includes(log.date)
                    return (
                      <TableRow key={index} className={isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                        <TableCell className="pl-4 text-center">
                          <TableCheckboxCell
                            checked={isSelected}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedRowDates(prev => [...prev, log.date])
                              } else {
                                setSelectedRowDates(prev => prev.filter(d => d !== log.date))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-500 text-xs px-2">{index + 1}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                          {log.dayNumber} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{log.dayName}</TableCell>
                        <TableCell>
                          <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${isHadir ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {log.checkIn}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${log.checkOut !== '-' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {log.checkOut}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                          {log.keterangan}
                        </TableCell>
                        <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(log.estimasiPenghasilan || 0)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
