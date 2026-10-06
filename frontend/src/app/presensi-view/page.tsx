'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PublicNavbar, AppFooter } from '@/components/layout'
import {
  ClipboardCheck,
  Search,
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  Clock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Video,
  Radio,
  Activity,
  RefreshCw,
  Sparkles,
  Camera,
  Zap,
  PowerOff,
  ShieldAlert,
  QrCode
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getPublicApiUrl } from '@/lib/api-config'
import { useQuery } from '@tanstack/react-query'

interface StaffAttendance {
  id: string
  name: string
  role: string
  nip?: string
  status: string
  checkIn: string
  checkOut: string
  keterangan: string
  hasIzin: boolean
  date: string
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

interface SingleCameraConfig {
  id: string
  name: string
  streamSourceType: string
  streamUrl: string
  location: string
  isActive: boolean
}

interface FaceCameraConfig {
  streamSourceType?: string
  streamUrl: string
  cameraName: string
  location: string
  cameras?: SingleCameraConfig[]
  threshold: number
  cooldownMinutes: number
  isActive: boolean
  welcomeVoice?: boolean
  showPublicStream?: boolean
  showPublicLogs?: boolean
}

export default function PresensiPegawaiPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [data, setData] = useState<StaffAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'HADIR' | 'BELUM' | 'IZIN'>('SEMUA')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')
  const [streamKey, setStreamKey] = useState(Date.now())
  const [streamError, setStreamError] = useState(false)
  const [activeCamId, setActiveCamId] = useState<string>('cam-1')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // 1. Fetch Config Presensi Camera (Realtime Polling)
  const { data: cameraConfig } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/config')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 3000,
  })

  // 2. Fetch AI Service Status (Realtime Polling)
  const { data: serviceStatus } = useQuery({
    queryKey: ['face-attendance-service-status'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/service-status')
      if (!res.ok) return { isOnline: false, is_running: false }
      return res.json()
    },
    refetchInterval: 2500,
  })

  // 3. Fetch Live Logs Realtime (Realtime Polling)
  const { data: rawLiveLogs, refetch: refetchLiveLogs } = useQuery<FaceDetectionLog[]>({
    queryKey: ['face-attendance-live-logs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/logs')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 2000,
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

  useEffect(() => {
    fetch(getPublicApiUrl('/settings/public'), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.academicYear) setAcademicYear(data.academicYear)
        if (data?.semester) setSemester(data.semester)
      })
      .catch(() => {})
  }, [])

  // Default ke tanggal hari ini dalam format YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true)
      setError('')
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api-backend'

        const apiKey = process.env.NEXT_PUBLIC_API_KEY || ''
        const res = await authenticatedFetch(`${apiUrl}/daily-attendances/staff/summary?date=${selectedDate}`, {
          headers: {
            'x-api-key': apiKey
          }
        })
        if (!res.ok) {
          throw new Error('Gagal mengambil data dari server')
        }
        const result = await res.json()
        setData(Array.isArray(result) ? result : [])
      } catch (err: any) {
        console.error(err)
        setError('Gagal memuat data presensi pegawai. Pastikan server aktif.')
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [selectedDate, liveLogs])

  // Filter & Pencarian
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchSearch) return false

      if (statusFilter === 'HADIR') return item.status === 'HADIR' || item.status === 'HADIR + IZIN KELUAR'
      if (statusFilter === 'BELUM') return item.status === 'Belum Hadir'
      if (statusFilter === 'IZIN') return item.hasIzin
      return true
    })
  }, [data, searchTerm, statusFilter])

  // Statistika
  const stats = useMemo(() => {
    const total = data.length
    const hadir = data.filter((i) => i.status === 'HADIR' || i.status === 'HADIR + IZIN KELUAR').length
    const izin = data.filter((i) => i.hasIzin).length
    const belum = data.filter((i) => i.status === 'Belum Hadir' && !i.hasIzin).length
    const percent = total > 0 ? Math.round(((hadir + izin) / total) * 100) : 0
    return { total, hadir, belum, izin, percent }
  }, [data])

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) return;
    
    const exportData = filteredData.map((item, i) => ({
      'No': i + 1,
      'Nama Pegawai / Guru': item.name,
      'Jam Masuk': item.checkIn,
      'Jam Pulang': item.checkOut,
      'Status': item.status,
      'Keterangan': item.keterangan
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Presensi");
    XLSX.writeFile(wb, `Rekap_Presensi_Pegawai_${selectedDate}.xlsx`);
  }

  const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden">
        <NextImage
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105"
        />
      </div>
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/85 backdrop-blur-[3px] -z-20" />

      {/* Navbar Induk Terpadu */}
      <PublicNavbar academicYear={academicYear} semester={semester} />

      {/* Konten Utama */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 transition-all duration-200">
        {/* Header Bersih & Modern Institutional */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Presensi Pegawai &amp; Guru
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Rekapitulasi kehadiran harian guru dan staf SMA Muhammadiyah 1 Ponorogo
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 font-semibold text-xs h-9 sm:h-10 rounded-xl shadow-2xs touch-manipulation pl-3 pr-3"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={loading || filteredData.length === 0}
              className="h-9 sm:h-10 px-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs shadow-2xs touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export Excel</span>
            </Button>
          </div>
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3.5 sm:p-4 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Pegawai</CardTitle>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.total} <span className="text-xs font-medium text-slate-500">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3.5 sm:p-4 space-y-0">
              <CardTitle className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Sudah Hadir</CardTitle>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.hadir} <span className="text-xs font-medium text-slate-500">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3.5 sm:p-4 space-y-0">
              <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-400">Belum Hadir</CardTitle>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <UserX className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.belum} <span className="text-xs font-medium text-slate-500">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3.5 sm:p-4 space-y-0">
              <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400">Tingkat Kehadiran</CardTitle>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.percent}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Pemberitahuan Standby Kamera */}
        {cameraConfig && !cameraConfig.isActive && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300/70 dark:border-amber-700/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <PowerOff className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-100">
                    Pemindai Wajah AI Sedang Standby
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/90 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-semibold border border-amber-400/40">
                    Scan QR Tersedia
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  Layanan pemindaian wajah otomatis sedang standby. Presensi alternatif dapat dilakukan melalui QR Code.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Link href="/presensi/scan-qr">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-2xs h-8 px-3 rounded-xl">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR Cadangan</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* AREA PREVIEW LIVE REALTIME CAMERA & LOG SCANNER WAJAH */}
        {(() => {
          const isStreamVisible = (cameraConfig?.showPublicStream ?? true)
          const isLogsVisible = (cameraConfig?.showPublicLogs ?? true)
          const isAnyLiveVisible = isStreamVisible || isLogsVisible

          if (!isAnyLiveVisible) return null

          const camerasList = Array.isArray(cameraConfig?.cameras) && cameraConfig.cameras.length > 0
            ? cameraConfig.cameras
            : [
                {
                  id: 'cam-1',
                  name: cameraConfig?.cameraName || 'Kamera 1',
                  streamSourceType: cameraConfig?.streamSourceType || 'LIVE STREAM',
                  streamUrl: cameraConfig?.streamUrl || '',
                  location: cameraConfig?.location || 'Gerbang Depan Sekolah',
                  isActive: true,
                },
                {
                  id: 'cam-2',
                  name: 'Kamera 2',
                  streamSourceType: 'RTSP',
                  streamUrl: '',
                  location: 'Area Presensi 2',
                  isActive: true,
                },
              ]

          const activeCameraObj = camerasList.find((c) => c.id === activeCamId) || camerasList[0]

          return (
            <div className={`grid grid-cols-1 ${isStreamVisible && isLogsVisible ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-4 sm:gap-6 items-start`}>
              {/* LEFT: LIVE CAMERA FEED */}
              {isStreamVisible && (
                <div className={`${isLogsVisible ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
                  <Card className="shadow-sm border-slate-200/80 dark:border-slate-800/80 bg-slate-950 text-white overflow-hidden rounded-2xl">
                    <div className="p-3 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {cameraConfig?.isActive && serviceStatus?.is_running ? (
                          <span className="flex h-2.5 w-2.5 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 inline-block"></span>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                            <span className="truncate">{activeCameraObj?.name || cameraConfig?.cameraName || 'Kamera Presensi'}</span>
                            <span className="text-[10px] py-0.5 px-2 rounded-full bg-slate-800 text-slate-300 font-mono shrink-0 border border-slate-700">
                              {activeCameraObj?.streamSourceType || cameraConfig?.streamSourceType || 'LIVE STREAM'}
                            </span>
                          </h2>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                            Lokasi: {activeCameraObj?.location || cameraConfig?.location || 'Area Presensi'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Multi-Camera Channel Switcher Tabs (Cam 1 / Cam 2) */}
                        <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                          {camerasList.map((cam, cIdx) => (
                            <button
                              key={cam.id || cIdx}
                              type="button"
                              onClick={() => {
                                setActiveCamId(cam.id)
                                setStreamError(false)
                                setStreamKey(Date.now())
                              }}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
                                activeCamId === cam.id
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {cam.name.replace(/Kamera\s*/i, 'Cam ')}
                            </button>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStreamError(false)
                            setStreamKey(Date.now())
                          }}
                          title="Segarkan Sinyal Video"
                          className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2.5 rounded-lg text-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          <span className="hidden sm:inline">Segarkan</span>
                        </Button>
                      </div>
                    </div>

                    {/* Video Feed Canvas (16:9 Widescreen) */}
                    <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                      {!streamError && serviceStatus?.is_running && cameraConfig?.isActive ? (
                        <img
                          key={`${activeCamId}-${streamKey}`}
                          src={`/api/face-stream?cam_id=${encodeURIComponent(activeCamId)}&t=${streamKey}`}
                          alt={`Live Feed ${activeCameraObj?.name || 'Kamera Presensi'}`}
                          className="w-full h-full object-contain"
                          onError={() => setStreamError(true)}
                        />
                      ) : (
                        <div className="text-center p-6 space-y-3 max-w-sm">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                            !cameraConfig?.isActive 
                              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400' 
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}>
                            {!cameraConfig?.isActive ? (
                              <PowerOff className="w-6 h-6" />
                            ) : (
                              <Video className="w-6 h-6" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-xs sm:text-sm text-slate-200">
                              {!cameraConfig?.isActive
                                ? 'Pemindai Wajah AI Dinonaktifkan'
                                : (serviceStatus?.isOnline && cameraConfig?.isActive 
                                    ? (serviceStatus?.is_running ? 'Menghubungkan sinyal video...' : 'Kamera Standby (Siap Memindai)') 
                                    : 'Layanan AI FaceNet Standby')}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {!cameraConfig?.isActive
                                ? 'Layanan pemindaian wajah otomatis sedang dinonaktifkan.'
                                : (serviceStatus?.is_running && cameraConfig?.isActive
                                    ? 'Menghubungkan sinyal video presensi...' 
                                    : 'Silakan posisikan wajah Anda di depan kamera untuk mencatat presensi.')}
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            {cameraConfig?.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setStreamError(false)
                                  setStreamKey(Date.now())
                                }}
                                className="h-8 text-xs border-slate-700 text-slate-300 hover:text-white rounded-xl"
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                Hubungkan Ulang
                              </Button>
                            )}
                            <Link href="/presensi/scan-qr">
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 rounded-xl"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                Gunakan Scan QR
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                        <span className={`w-1.5 h-1.5 rounded-full ${cameraConfig?.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span>{cameraConfig?.isActive ? 'LIVE MONITOR' : 'STANDBY'}</span>
                      </div>

                      <div className="absolute bottom-2 right-2 pointer-events-none px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-[10px] font-mono text-slate-300 border border-white/10">
                        Akurasi: {Math.round((cameraConfig?.threshold || 0.70) * 100)}%
                      </div>
                    </div>

                    {/* Bottom Camera Info Bar */}
                    <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">Model: <strong className="text-slate-200">FaceNet 512-D</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.is_running && cameraConfig?.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {serviceStatus?.is_running && cameraConfig?.isActive ? 'Aktif' : 'Standby'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* RIGHT: REALTIME DETECTION LOGS */}
              {isLogsVisible && (
                <div className={`${isStreamVisible ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
                  <Card className="shadow-2xs border-slate-200/80 dark:border-slate-800/80 flex flex-col h-[520px] rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl">
                    <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            <Activity className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Scanner Log Realtime</CardTitle>
                              {cameraConfig?.isActive ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Live Sync
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  Standby
                                </span>
                              )}
                            </div>
                            <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">Verifikasi snapshot wajah &amp; presensi</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refetchLiveLogs()}
                          title="Segarkan Log"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 rounded-lg"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-3">
                      {!liveLogs || liveLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2.5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            {!cameraConfig?.isActive ? (
                              <PowerOff className="w-7 h-7 stroke-1 text-amber-500" />
                            ) : (
                              <Camera className="w-7 h-7 stroke-1" />
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {!cameraConfig?.isActive 
                              ? 'Layanan AI Microservice Sedang Dinonaktifkan' 
                              : 'Menunggu Wajah Terdeteksi'}
                          </p>
                          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                            {!cameraConfig?.isActive
                              ? 'Superadmin menonaktifkan pemindai AI kamera. Hasil pemindaian akan otomatis tampil saat layanan diaktifkan kembali.'
                              : 'Arahkan wajah Anda ke depan kamera. Hasil identifikasi dan foto snapshot akan otomatis muncul di sini secara langsung.'}
                          </p>
                        </div>
                      ) : (
                        liveLogs.map((log, idx) => (
                          <div
                            key={log.id || idx}
                            className={`p-3.5 rounded-2xl transition-all border ${
                              idx === 0
                                ? 'bg-indigo-50/70 dark:bg-slate-800/90 border-indigo-300 dark:border-indigo-600/60 shadow-md'
                                : 'bg-white dark:bg-slate-800/50 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
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
                               <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold py-0.5 px-2 rounded-full ${
                                 log.scanType === 'MASUK'
                                   ? 'bg-emerald-500 text-white'
                                   : log.scanType === 'PULANG'
                                     ? 'bg-blue-600 text-white'
                                     : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                               }`}>
                                 <CheckCircle2 className="w-3 h-3 shrink-0" />
                                 {log.scanType}
                               </span>
                               <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
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
                           <div className="py-2.5 grid grid-cols-2 gap-2.5 items-center">
                             {/* 1. Foto Profil Terdaftar */}
                             <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                               <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs flex items-center justify-center">
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
                             <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
                               <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 overflow-hidden shrink-0 border border-emerald-300/80 dark:border-emerald-700 shadow-2xs flex items-center justify-center">
                                 {log.snapshotUrl ? (
                                   <img src={log.snapshotUrl} alt="Snapshot Kamera" className="w-full h-full object-cover" />
                                 ) : (
                                   <Camera className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                                 )}
                               </div>
                               <div className="min-w-0 flex-1">
                                 <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Realtime</span>
                                 <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">Hasil Scan</p>
                               </div>
                             </div>
                           </div>

                           {/* Footer: Matching Confidence Bar */}
                           <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-slate-500 dark:text-slate-400 text-[10.5px] font-medium flex items-center gap-1">
                                 <Sparkles className="w-3 h-3 text-indigo-500" />
                                 Akurasi Kemiripan AI:
                               </span>
                               <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                                 {Math.round(log.confidence * 100)}%
                               </span>
                             </div>

                             <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all"
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
              )}
            </div>
          )
        })()}

        {/* Filter dan Tabel Presensi */}
        <Card className="border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Daftar Kehadiran Pegawai</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {formattedDate}
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">
                  Menampilkan {filteredData.length} dari total {data.length} pegawai dan guru
                </CardDescription>
              </div>

              {/* Searchbar & Tombol Filter Bersebelahan (Standar Rule 16) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari nama pegawai..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 sm:h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs font-semibold shadow-2xs touch-manipulation"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex-wrap">
                  <Button size="sm" variant={statusFilter === 'SEMUA' ? 'default' : 'ghost'} onClick={() => setStatusFilter('SEMUA')} className={`rounded-lg font-bold text-xs px-2.5 h-7 sm:h-8 touch-manipulation ${statusFilter === 'SEMUA' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Semua</Button>
                  <Button size="sm" variant={statusFilter === 'HADIR' ? 'default' : 'ghost'} onClick={() => setStatusFilter('HADIR')} className={`rounded-lg font-bold text-xs px-2.5 h-7 sm:h-8 touch-manipulation ${statusFilter === 'HADIR' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Hadir</Button>
                  <Button size="sm" variant={statusFilter === 'IZIN' ? 'default' : 'ghost'} onClick={() => setStatusFilter('IZIN')} className={`rounded-lg font-bold text-xs px-2.5 h-7 sm:h-8 touch-manipulation ${statusFilter === 'IZIN' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Izin</Button>
                  <Button size="sm" variant={statusFilter === 'BELUM' ? 'default' : 'ghost'} onClick={() => setStatusFilter('BELUM')} className={`rounded-lg font-bold text-xs px-2.5 h-7 sm:h-8 touch-manipulation ${statusFilter === 'BELUM' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Belum</Button>
                </div>
              </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedIds.length > 0 && (
              <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {selectedIds.length} baris dipilih
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    className="h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportExcel}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-2.5"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Export Terpilih
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <p className="font-semibold text-xs">Memuat rekapitulasi kehadiran...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-rose-500 gap-2 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-rose-500/80" />
                <p className="font-bold text-xs">{error}</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="mt-2 rounded-xl text-xs h-8">
                  Coba Lagi
                </Button>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="font-bold text-sm">Tidak ada data pegawai yang sesuai pencarian/filter.</p>
                <p className="text-xs mt-0.5">Coba ubah kata kunci atau ganti filter status di atas.</p>
              </div>
            ) : (
              <>
                {/* Tampilan Tabel untuk Laptop/Desktop (Hidden di Mobile) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(filteredData.map(d => d.id))
                              } else {
                                setSelectedIds([])
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                            title="Pilih Semua"
                          />
                        </th>
                        <th className="py-3 px-3 w-12 text-center">No.</th>
                        <th className="py-3 px-4 min-w-[220px]">Nama Pegawai / Guru</th>
                        <th className="py-3 px-4 w-28 text-center">Jam Masuk</th>
                        <th className="py-3 px-4 w-28 text-center">Jam Pulang</th>
                        <th className="py-3 px-4 w-32 text-center">Status</th>
                        <th className="py-3 px-4 min-w-[160px]">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredData.map((item, index) => {
                        const isSelected = selectedIds.includes(item.id)
                        return (
                          <tr key={item.id} className={`h-11 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds(prev => [...prev, item.id])
                                  } else {
                                    setSelectedIds(prev => prev.filter(id => id !== item.id))
                                  }
                                }}
                                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                              {item.checkIn !== '-' ? (
                                <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  {item.checkIn}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                              {item.checkOut !== '-' ? (
                                <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                  {item.checkOut}
                                </span>
                              ) : <span className="text-slate-400 dark:text-slate-600 font-sans text-xs font-normal">Belum</span>}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {item.status === 'HADIR' || item.status === 'HADIR + IZIN KELUAR' ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${item.status === 'HADIR + IZIN KELUAR'
                                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                  }`}>
                                  <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                                  {item.status === 'HADIR + IZIN KELUAR' ? 'Hadir + Izin' : 'Hadir'}
                                </span>
                              ) : item.status === 'IZIN KELUAR' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3 mr-1 shrink-0" />
                                  Izin Keluar
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                  <UserX className="w-3 h-3 mr-1 shrink-0" />
                                  Belum Hadir
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 max-w-xs truncate" title={item.keterangan}>
                              {item.keterangan}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tampilan Kartu Responsif untuk Ponsel/Tablet */}
                <div className="lg:hidden p-3 sm:p-4 space-y-2.5">
                  {filteredData.map((item, index) => (
                    <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shadow-xs space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">No. {index + 1}</span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">{item.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${item.status === 'HADIR'
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/90 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : item.status === 'IZIN KELUAR'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/90 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : item.status === 'HADIR + IZIN KELUAR'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/90 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          }`}>
                          {item.status === 'HADIR' ? 'Hadir'
                            : item.status === 'IZIN KELUAR' ? 'Izin Keluar'
                              : item.status === 'HADIR + IZIN KELUAR' ? 'Hadir + Izin'
                                : 'Belum Hadir'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Jam Masuk</span>
                          <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {item.checkIn !== '-' ? `${item.checkIn} WIB` : '-'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Jam Pulang</span>
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {item.checkOut !== '-' ? `${item.checkOut} WIB` : 'Belum'}
                          </span>
                        </div>
                      </div>

                      {item.keterangan && item.keterangan !== '-' && (
                        <div className="pt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-start gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span><strong className="text-slate-800 dark:text-slate-200">{item.keterangan}</strong></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
