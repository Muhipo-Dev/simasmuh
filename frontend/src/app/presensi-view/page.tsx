'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
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
  RefreshCw
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
  }, [selectedDate])

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

      {/* Navbar Atas */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={100} height={40} className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105" />
          <div>
            <span className="font-extrabold text-base sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 block">
              SIMASMUH
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold block -mt-0.5">Portal Presensi Real-Time</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {academicYear && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>TA: {academicYear}</span>
              {semester && <span className="hidden sm:inline font-medium text-[11px]">({semester})</span>}
            </div>
          )}
          <Link href="/login">
            <Button variant="outline" className="h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
              <span>Kembali ke Login</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Konten Utama */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Banner Utama */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-800 p-6 sm:p-8 rounded-2xl text-white shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Monitoring Real-Time</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Presensi Kehadiran Guru & Karyawan
            </h1>
            <p className="text-blue-100 text-sm sm:text-base font-medium max-w-2xl">
              Daftar rekapitulasi kehadiran Pegawai, Guru dan Karyawan SMA Muhipo secara transparan dan real-time
            </p>
          </div>
          <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-white/20 shadow-inner flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div className="text-xs sm:text-sm font-bold text-blue-100 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-300" />
              <span>Tanggal Presensi:</span>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none font-bold text-sm h-11 rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-slate-200 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Total Pegawai</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{stats.total} <span className="text-xs sm:text-sm font-semibold text-slate-500 font-normal">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Sudah Hadir</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.hadir} <span className="text-xs sm:text-sm font-semibold text-slate-500 font-normal">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Belum Hadir</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-2xs">
                <UserX className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{stats.belum} <span className="text-xs sm:text-sm font-semibold text-slate-500 font-normal">Orang</span></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Kehadiran Staf</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.percent}%</div>
            </CardContent>
          </Card>
        </div>

        {/* AREA PREVIEW LIVE REALTIME CAMERA & LOG SCANNER WAJAH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT: LIVE CAMERA FEED (7 COLS) */}
          <div className="lg:col-span-7">
            <Card className="shadow-lg border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
              <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-3 w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate">
                      <span className="truncate">{cameraConfig?.cameraName || 'Camera Gerbang Utama'}</span>
                      <span className="text-[10px] py-0.5 px-1.5 rounded bg-indigo-500/20 text-indigo-300 font-mono shrink-0 border border-indigo-500/30">
                        {cameraConfig?.streamSourceType || 'LIVE STREAM'}
                      </span>
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
                  <img
                    key={streamKey}
                    src={`http://localhost:8089/video_feed?t=${streamKey}`}
                    alt="Live Camera Presensi"
                    className="w-full h-full object-contain"
                    onError={() => setStreamError(true)}
                  />
                ) : (
                  <div className="text-center p-6 space-y-3 max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                      <Video className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-200">
                        {serviceStatus?.isOnline ? 'Camera Standby (Siap Memindai)' : 'Camera Standby'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {serviceStatus?.is_running 
                          ? 'Memuat live feed kamera presensi...' 
                          : 'Arahkan wajah ke depan kamera untuk mencatat presensi harian otomatis.'}
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
                  Sensitivitas: {Math.round((cameraConfig?.threshold || 0.7) * 100)}%
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: REALTIME DETECTION LOGS (5 COLS) */}
          <div className="lg:col-span-5">
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 flex flex-col h-[320px] sm:h-[350px] md:h-[390px] rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
              <CardHeader className="p-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
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
                          <span className={`text-[9px] font-bold py-0.5 px-2 rounded-full ${
                            log.scanType === 'MASUK'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {log.scanType}
                          </span>
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

        {/* Filter dan Tabel Presensi */}
        <Card className="border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Daftar Kehadiran</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900">
                    {formattedDate}
                  </span>
                </CardTitle>
                <CardDescription className="dark:text-slate-400 mt-1">
                  Menampilkan {filteredData.length} dari total {data.length} pegawai dan guru
                </CardDescription>
              </div>

              {/* Input Search dan Tombol Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari nama pegawai/guru..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-medium shadow-2xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
                  <Button size="sm" variant={statusFilter === 'SEMUA' ? 'default' : 'ghost'} onClick={() => setStatusFilter('SEMUA')} className={`rounded-lg font-bold text-xs px-2.5 h-8 ${statusFilter === 'SEMUA' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Semua</Button>
                  <Button size="sm" variant={statusFilter === 'HADIR' ? 'default' : 'ghost'} onClick={() => setStatusFilter('HADIR')} className={`rounded-lg font-bold text-xs px-2.5 h-8 ${statusFilter === 'HADIR' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Hadir</Button>
                  <Button size="sm" variant={statusFilter === 'IZIN' ? 'default' : 'ghost'} onClick={() => setStatusFilter('IZIN')} className={`rounded-lg font-bold text-xs px-2.5 h-8 ${statusFilter === 'IZIN' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Izin</Button>
                  <Button size="sm" variant={statusFilter === 'BELUM' ? 'default' : 'ghost'} onClick={() => setStatusFilter('BELUM')} className={`rounded-lg font-bold text-xs px-2.5 h-8 ${statusFilter === 'BELUM' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}`}>Belum</Button>
                </div>
                <Button size="sm" variant="outline" className="h-10 border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold" onClick={handleExportExcel} disabled={loading || filteredData.length === 0}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="font-semibold text-sm">Memuat rekapitulasi kehadiran pegawai...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-rose-500 gap-2 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500/80" />
                <p className="font-bold">{error}</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="mt-2 rounded-xl">
                  Coba Lagi
                </Button>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-[1.5]" />
                <p className="font-bold text-base">Tidak ada data pegawai yang sesuai pencarian/filter.</p>
                <p className="text-xs mt-1">Coba ubah kata kunci atau ganti filter status di atas.</p>
              </div>
            ) : (
              <>
                {/* Tampilan Tabel untuk Laptop/Desktop (Hidden di Mobile) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-4 px-6 w-12 text-center">No.</th>
                        <th className="py-4 px-6">Nama Pegawai / Guru</th>
                        <th className="py-4 px-6 text-center">Jam Masuk</th>
                        <th className="py-4 px-6 text-center">Jam Pulang</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {filteredData.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-6 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                            {item.checkIn !== '-' ? (
                              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                                {item.checkIn}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                            {item.checkOut !== '-' ? (
                              <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                                {item.checkOut}
                              </span>
                            ) : <span className="text-slate-400 dark:text-slate-600 font-sans text-xs font-normal">Belum</span>}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {item.status === 'HADIR' || item.status === 'HADIR + IZIN KELUAR' ? (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'HADIR + IZIN KELUAR'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                : 'bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                }`}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                                {item.status === 'HADIR + IZIN KELUAR' ? 'Hadir + Izin' : 'Hadir'}
                              </span>
                            ) : item.status === 'IZIN KELUAR' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />
                                Izin Keluar
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                <UserX className="w-3.5 h-3.5 mr-1 shrink-0" />
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-xs font-medium text-slate-600 dark:text-slate-400 max-w-xs">
                            {item.keterangan}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tampilan Kartu Responsif untuk Ponsel/Tablet */}
                <div className="lg:hidden p-4 sm:p-6 space-y-4">
                  {filteredData.map((item, index) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">No. {index + 1}</span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{item.name}</h4>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${item.status === 'HADIR'
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

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Jam Masuk</span>
                          <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {item.checkIn !== '-' ? `${item.checkIn} WIB` : '-'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">Jam Pulang</span>
                          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                            {item.checkOut !== '-' ? `${item.checkOut} WIB` : 'Belum'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 text-xs font-medium text-slate-600 dark:text-slate-400 flex items-start gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span><strong className="text-slate-800 dark:text-slate-200">{item.keterangan}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-center mt-auto">
        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          Copyright &copy; 2026 - Muhipo Dev
        </p>
      </footer>
    </div>
  )
}
