'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Video, 
  Cpu, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  Users, 
  Activity, 
  Sliders, 
  ShieldCheck,
  Zap,
  Trash2,
  HelpCircle,
  Sparkles,
  Server,
  Search,
  GraduationCap,
  Briefcase,
  UserCheck,
  Maximize2,
  Play,
  Square,
  Volume2,
  Clock,
  Radio,
  Eye
} from 'lucide-react'

interface FaceCameraConfig {
  streamUrl: string
  cameraName: string
  location: string
  threshold: number
  cooldownMinutes: number
  isActive: boolean
  welcomeVoice: boolean
  apiKeySecret: string
  updatedAt: string
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

interface UsersDatasetResponse {
  totalUsers: number
  usersWithPhoto: number
  breakdown?: {
    students: { total: number; withPhoto: number }
    teachers: { total: number; withPhoto: number }
    staff: { total: number; withPhoto: number }
  }
  dataset: Array<{
    userId: string
    name: string
    username: string
    role: string
    avatarUrl?: string | null
    localPath?: string | null
    identifier: string
    className?: string | null
    hasPhoto: boolean
  }>
}

export default function FaceAttendanceCameraPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [activeTab, setActiveTab] = useState<'monitor' | 'config' | 'dataset' | 'logs' | 'guide'>('monitor')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null)
  const [streamError, setStreamError] = useState(false)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Dataset filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SISWA' | 'GURU' | 'PEGAWAI'>('ALL')
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL')

  // Local form state for config
  const [formConfig, setFormConfig] = useState<FaceCameraConfig | null>(null)

  // 1. Fetch Config
  const { data: configData, refetch: refetchConfig } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: async () => {
      const res = await authenticatedQuery('/api-backend/face-attendance/config')
      if (res && !formConfig) {
        setFormConfig(res)
      }
      return res
    },
  })

  // 2. Fetch Users Dataset stats
  const { data: datasetData, isLoading: isDatasetLoading, refetch: refetchDataset } = useQuery<UsersDatasetResponse>({
    queryKey: ['face-attendance-users-dataset'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/users-dataset'),
  })

  // 3. Fetch Live Logs (refetches every 2 seconds for real-time scanner feed)
  const { data: logsData, refetch: refetchLogs } = useQuery<FaceDetectionLog[]>({
    queryKey: ['face-attendance-logs'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/logs'),
    refetchInterval: 2000,
  })

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    if (!datasetData?.dataset) return []
    return datasetData.dataset.filter((user) => {
      if (roleFilter === 'SISWA' && user.role !== 'SISWA') return false
      if (roleFilter === 'GURU' && user.role !== 'GURU') return false
      if (roleFilter === 'PEGAWAI' && (user.role === 'SISWA' || user.role === 'GURU')) return false

      if (photoFilter === 'WITH_PHOTO' && !user.hasPhoto) return false
      if (photoFilter === 'NO_PHOTO' && user.hasPhoto) return false

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        const matchName = user.name?.toLowerCase().includes(q)
        const matchId = user.identifier?.toLowerCase().includes(q)
        const matchClass = user.className?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchClass) return false
      }

      return true
    })
  }, [datasetData, roleFilter, photoFilter, searchQuery])

  // Count stats from logs
  const logStats = useMemo(() => {
    if (!logsData) return { masuk: 0, pulang: 0, total: 0 }
    const masuk = logsData.filter(l => l.scanType === 'MASUK').length
    const pulang = logsData.filter(l => l.scanType === 'PULANG').length
    return { masuk, pulang, total: logsData.length }
  }, [logsData])

  // Mutation to save config
  const { mutate: updateConfig, isPending: isSaving } = useMutation({
    mutationFn: async (updated: Partial<FaceCameraConfig>) => {
      const res = await authenticatedFetch('/api-backend/face-attendance/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error('Gagal menyimpan konfigurasi')
      return res.json()
    },
    onSuccess: (savedData) => {
      queryClient.setQueryData(['face-attendance-config'], savedData)
      setFormConfig(savedData)
      setSaveSuccess(true)
      setStreamError(false)
      setStreamKey(Date.now())
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  // Mutation to clear logs
  const { mutate: clearLogs, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/logs/clear', { method: 'POST' })
      if (!res.ok) throw new Error('Gagal mengosongkan log')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
    },
  })

  const currentConfig = formConfig || configData

  const handleSave = () => {
    if (!currentConfig) return
    updateConfig(currentConfig)
  }

  const handleSyncDatabase = async () => {
    await refetchDataset()
    setSyncSuccessMsg(
      `Berhasil memperbarui dataset wajah! ${datasetData?.usersWithPhoto || 0} dari ${datasetData?.totalUsers || 0} profil pengguna siap dicocokkan oleh sistem AI.`
    )
    setTimeout(() => setSyncSuccessMsg(null), 5000)
  }

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => console.error(err))
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(err => console.error(err))
      setIsFullscreen(false)
    }
  }

  const handleReconnectStream = () => {
    setStreamError(false)
    setStreamKey(Date.now())
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-7 rounded-2xl text-white shadow-xl border border-indigo-900/30">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Live RTSP Camera Stream & YOLOv11 Face Matcher
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Presensi Camera AI</h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl">
            Area monitoring realtime live capture kamera RTSP dengan pelacakan wajah YOLOv11 dan feed scanner log presensi otomatis.
          </p>
        </div>
        <div className="flex flex-row md:flex-col gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${currentConfig?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="font-medium">Status: {currentConfig?.isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-300" />
            <span className="font-medium">{datasetData?.usersWithPhoto || 0} Profil Wajah Siap</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'monitor' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Live Monitor & Scanner</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'config' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Konfigurasi Stream</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dataset')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'dataset' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Dataset Profil Wajah</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'logs' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Riwayat Log</span>
          {logsData && logsData.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-700">
              {logsData.length}
            </Badge>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-lg transition-all col-span-2 md:col-span-1 ${
            activeTab === 'guide' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Panduan RTSP</span>
        </button>
      </div>

      {/* TAB 1: LIVE MONITOR & SCANNER LOG (SPLIT SCREEN) */}
      {activeTab === 'monitor' && (
        <div className="space-y-6">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl p-4 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Presensi Masuk Hari Ini</p>
                <p className="text-2xl md:text-3xl font-extrabold mt-1">{logStats.masuk}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Presensi Pulang Hari Ini</p>
                <p className="text-2xl md:text-3xl font-extrabold mt-1">{logStats.pulang}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl p-4 text-white shadow-md flex items-center justify-between border border-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Total Deteksi Terverifikasi</p>
                <p className="text-2xl md:text-3xl font-extrabold mt-1">{logStats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
                <Activity className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </div>

          {/* SPLIT SCREEN LAYOUT: LEFT = LIVE RTSP CAPTURE | RIGHT = SCANNER LOGS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT BOX (7 COLS): REALTIME LIVE CAPTURE STREAM */}
            <div className="lg:col-span-7 space-y-3">
              <Card className="shadow-lg border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
                {/* Header Stream Bar */}
                <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {currentConfig?.cameraName || 'Camera Gerbang Utama'}
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 text-indigo-300 font-mono">
                          YOLOv11 LIVE
                        </Badge>
                      </h2>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs md:max-w-md">
                        {currentConfig?.streamUrl || 'rtsp://...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReconnectStream}
                      title="Hubungkan Ulang Stream"
                      className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      title="Layar Penuh"
                      className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 px-2"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Video Box Canvas */}
                <div 
                  ref={videoContainerRef}
                  className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden group"
                >
                  {!streamError ? (
                    <img
                      key={streamKey}
                      src={`http://localhost:8005/video_feed?t=${streamKey}`}
                      alt="Live Capture RTSP Camera Stream"
                      className="w-full h-full object-contain"
                      onError={() => setStreamError(true)}
                    />
                  ) : (
                    /* Fallback when stream is offline / connecting */
                    <div className="text-center p-6 space-y-4 max-w-md">
                      <div className="w-16 h-16 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                        <Video className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-200">Menghubungkan ke Stream RTSP Camera...</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Pastikan microservice AI Python aktif pada port <code className="text-indigo-300 font-mono">8005</code> dan link RTSP kamera dapat diakses di jaringan lokal.
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center gap-2">
                        <Button 
                          onClick={handleReconnectStream} 
                          size="sm" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Coba Sambungkan Ulang
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Corner Visual HUD Targets */}
                  <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>RTSP DIRECT</span>
                  </div>

                  <div className="absolute bottom-3 right-3 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur-xs text-[11px] font-mono text-slate-300 border border-white/10">
                    <span>Threshold: {Math.round((currentConfig?.threshold || 0.7) * 100)}%</span>
                    <span>•</span>
                    <span>Cooldown: {currentConfig?.cooldownMinutes || 10}m</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lokasi: <strong className="text-slate-200">{currentConfig?.location || 'Gerbang Depan Sekolah'}</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium">● AI Face Matching Active</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* RIGHT BOX (5 COLS): REALTIME LIVE SCANNER LOGS */}
            <div className="lg:col-span-5 space-y-3">
              <Card className="shadow-lg border-slate-200 flex flex-col h-[520px] rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">Scanner Log Wajah Realtime</CardTitle>
                        <CardDescription className="text-[11px]">Wajah yang berhasil dicocokkan & waktu presensi</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="h-7 w-7 p-0 text-slate-500">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => clearLogs()} 
                        disabled={isClearing} 
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Scrollable Live Scan List */}
                <CardContent className="p-3 flex-1 overflow-y-auto divide-y divide-slate-100 space-y-2">
                  {logsData && logsData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <Camera className="w-10 h-10 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium text-slate-600">Menunggu Wajah Terdeteksi</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Arahkan wajah siswa atau guru ke depan kamera. Hasil identifikasi akan otomatis muncul di sini secara langsung.
                      </p>
                    </div>
                  ) : (
                    logsData?.map((log, index) => (
                      <div 
                        key={log.id} 
                        className={`pt-2.5 first:pt-0 p-2.5 rounded-xl transition-all ${
                          index === 0 ? 'bg-indigo-50/70 border border-indigo-200/80 shadow-xs' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          {/* Avatar & User Details */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border-2 border-white shadow-xs">
                                {log.avatarUrl ? (
                                  <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-slate-600 text-xs">{log.userName.charAt(0)}</span>
                                )}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                log.scanType === 'MASUK' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">{log.userName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-500">{log.identifier}</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] text-indigo-700 font-medium truncate max-w-[120px]">{log.userRole}</span>
                              </div>
                            </div>
                          </div>

                          {/* Time & Attendance Badge */}
                          <div className="text-right shrink-0">
                            <Badge className={`text-[10px] font-bold py-0.5 px-2 ${
                              log.scanType === 'MASUK' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none' :
                              log.scanType === 'PULANG' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-none' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {log.scanType}
                            </Badge>
                            <p className="text-[11px] font-mono font-bold text-slate-700 mt-1 flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {log.timestamp}
                            </p>
                          </div>
                        </div>

                        {/* Match Confidence progress indicator */}
                        <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Akurasi Kemiripan AI:</span>
                          <span className="font-bold text-indigo-600">{Math.round(log.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KONFIGURASI CAMERA & AI */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Settings */}
            <Card className="md:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Parameter Camera & Stream RTSP</CardTitle>
                    <CardDescription>Tentukan URL RTSP/RTMP serta batas sensitivitas pengenalan wajah</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stream URL */}
                <div className="space-y-2">
                  <Label htmlFor="streamUrl" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    URL Stream RTSP / RTMP Camera
                  </Label>
                  <Input
                    id="streamUrl"
                    placeholder="rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101 atau 0 untuk webcam"
                    value={currentConfig?.streamUrl || ''}
                    onChange={(e) => setFormConfig((prev) => prev ? { ...prev, streamUrl: e.target.value } : null)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Masukkan URL RTSP/RTMP dari IP Camera / NVR, OBS virtual camera, atau ketik <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">0</code> untuk webcam USB komputer.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cameraName" className="text-sm font-medium text-slate-700">Nama Titik Camera</Label>
                    <Input
                      id="cameraName"
                      placeholder="Contoh: Camera Gerbang Utama"
                      value={currentConfig?.cameraName || ''}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, cameraName: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium text-slate-700">Lokasi Penempatan</Label>
                    <Input
                      id="location"
                      placeholder="Contoh: Gerbang Depan Timur"
                      value={currentConfig?.location || ''}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, location: e.target.value } : null)}
                    />
                  </div>
                </div>

                {/* Range: Threshold */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-slate-700">
                      Tingkat Kemiripan Wajah (*Confidence Threshold*)
                    </Label>
                    <Badge variant="outline" className="text-xs font-bold text-indigo-600 border-indigo-200">
                      {Math.round((currentConfig?.threshold || 0.70) * 100)}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={Math.round((currentConfig?.threshold || 0.70) * 100)}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormConfig((prev) => prev ? { ...prev, threshold: num / 100 } : null)
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    Standar rekomendasi: <strong>70%</strong>. Nilai lebih tinggi meningkatkan presisi agar tidak tertukar, nilai lebih rendah mempermudah deteksi dari jarak lebih jauh.
                  </p>
                </div>

                {/* Range: Cooldown */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-slate-700">
                      Jeda Cooldown Presensi Antar Scan (*Anti-Spam*)
                    </Label>
                    <Badge variant="outline" className="text-xs font-bold text-indigo-600 border-indigo-200">
                      {currentConfig?.cooldownMinutes || 10} Menit
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={currentConfig?.cooldownMinutes || 10}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormConfig((prev) => prev ? { ...prev, cooldownMinutes: num } : null)
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    Mencegah siswa/guru tercatat dobel saat berdiri lama di depan camera sebelum jeda waktu ini terlewati untuk absen pulang.
                  </p>
                </div>

                {/* Switches */}
                <div className="pt-3 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">Status Aktif Presensi Camera</Label>
                      <p className="text-xs text-slate-500">Nyalakan atau nonaktifkan pemrosesan stream secara global</p>
                    </div>
                    <Switch
                      checked={currentConfig?.isActive ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, isActive: checked } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">Suara Sambutan Otomatis (*Voice Greeting*)</Label>
                      <p className="text-xs text-slate-500">Memberikan feedback audio saat presensi siswa/guru berhasil terdeteksi</p>
                    </div>
                    <Switch
                      checked={currentConfig?.welcomeVoice ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, welcomeVoice: checked } : null)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Konfigurasi berhasil disimpan!
                    </span>
                  )}
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </CardFooter>
            </Card>

            {/* Service & Security Info Card */}
            <div className="space-y-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    Microservice Worker AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Port Service:</span>
                    <span className="font-mono font-semibold text-slate-800">8005</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Detektor AI:</span>
                    <span className="font-semibold text-slate-800">YOLOv11 Nano</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Basis Data Wajah:</span>
                    <span className="font-semibold text-slate-800">Foto Profil User</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Target Database:</span>
                    <span className="font-semibold text-slate-800">PostgreSQL (Prisma)</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 bg-amber-50/40 border-amber-200/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    Keamanan & Hak Akses
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-800/90 leading-relaxed space-y-2">
                  <p>
                    Menu ini hanya dapat dikonfigurasi oleh role <strong>SUPERADMIN</strong> dan <strong>ADMIN_IT</strong>.
                  </p>
                  <p>
                    Foto profil pengguna otomatis dikonversi menjadi vektor wajah berkecepatan tinggi tanpa perlu training ulang model.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATASET PROFIL PENGGUNA */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Basis Data Deteksi Wajah (Foto Profil Pengguna)
                </CardTitle>
                <CardDescription>
                  Sistem AI mencocokkan wajah dari kamera secara langsung dengan foto profil siswa, guru, dan karyawan yang tersimpan di basis data SIMASMUH.
                </CardDescription>
              </div>
              <Button onClick={handleSyncDatabase} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 self-start shrink-0">
                <RefreshCw className="w-4 h-4" />
                Perbarui & Sinkronkan Vektor Wajah
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {syncSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-medium">{syncSuccessMsg}</span>
                </div>
              )}

              {/* Stats Summary Breakdown by Role */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">Semua Pengguna</p>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{datasetData?.totalUsers || 0}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    {datasetData?.usersWithPhoto || 0} memiliki foto ({datasetData?.totalUsers ? Math.round(((datasetData.usersWithPhoto || 0) / datasetData.totalUsers) * 100) : 0}%)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-700 font-medium">Siswa</p>
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-950 mt-1">{datasetData?.breakdown?.students.total || 0}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">
                    {datasetData?.breakdown?.students.withPhoto || 0} foto terdaftar
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-purple-700 font-medium">Guru</p>
                    <UserCheck className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-purple-950 mt-1">{datasetData?.breakdown?.teachers.total || 0}</p>
                  <p className="text-xs text-purple-700 font-medium mt-1">
                    {datasetData?.breakdown?.teachers.withPhoto || 0} foto terdaftar
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-700 font-medium">Pegawai / Staf</p>
                    <Briefcase className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-950 mt-1">{datasetData?.breakdown?.staff.total || 0}</p>
                  <p className="text-xs text-amber-700 font-medium mt-1">
                    {datasetData?.breakdown?.staff.withPhoto || 0} foto terdaftar
                  </p>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-2">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Cari nama, NIS, NIP, atau kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRoleFilter('ALL')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        roleFilter === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Role
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('SISWA')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        roleFilter === 'SISWA' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Siswa
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('GURU')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        roleFilter === 'GURU' ? 'bg-white shadow text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Guru
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('PEGAWAI')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        roleFilter === 'PEGAWAI' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pegawai
                    </button>
                  </div>

                  <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPhotoFilter('ALL')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        photoFilter === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoFilter('WITH_PHOTO')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        photoFilter === 'WITH_PHOTO' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ada Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoFilter('NO_PHOTO')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        photoFilter === 'NO_PHOTO' ? 'bg-white shadow text-rose-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tanpa Foto
                    </button>
                  </div>
                </div>
              </div>

              {/* Table User Profiles */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">Foto Profil</th>
                        <th className="py-3 px-4">Nama Pengguna</th>
                        <th className="py-3 px-4">Role / Jabatan</th>
                        <th className="py-3 px-4">ID / NIS / NIP</th>
                        <th className="py-3 px-4 text-center">Status Vektor Wajah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isDatasetLoading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-500">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                            Memuat basis data profil wajah...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-slate-500">
                            Tidak ada data pengguna yang sesuai dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">{user.name.charAt(0)}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-semibold text-slate-900 block">{user.name}</span>
                              <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                user.role === 'SISWA' ? 'bg-blue-50 text-blue-700' :
                                user.role === 'GURU' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {user.role} {user.className ? `• ${user.className}` : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-700 font-medium">
                              {user.identifier}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {user.hasPhoto ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Vektor Aktif
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal text-xs">
                                  Belum Ada Foto
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                  <span>Menampilkan {filteredUsers.length} pengguna</span>
                  <span>Foto profil dapat diperbarui langsung melalui menu Master Data</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: RIWAYAT LOG LENGKAP */}
      {activeTab === 'logs' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Riwayat Log Presensi Camera
              </CardTitle>
              <CardDescription>
                Daftar lengkap seluruh aktivitas presensi wajah yang berhasil terverifikasi.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchLogs()} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => clearLogs()} disabled={isClearing} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Log
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsData && logsData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <Camera className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="font-medium text-slate-600">Belum ada aktivitas presensi wajah hari ini.</p>
                <p className="text-xs text-slate-400">Log akan otomatis muncul saat siswa atau guru terdeteksi di depan camera.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logsData?.map((log) => (
                  <div key={log.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-xl transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                        {log.avatarUrl ? (
                          <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-slate-500">{log.userName.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.userName}</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                            {log.userRole}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>NIS/NIP: <strong className="font-mono text-slate-700">{log.identifier}</strong></span>
                          <span>•</span>
                          <span>Kemiripan: <strong className="text-indigo-600 font-semibold">{Math.round(log.confidence * 100)}%</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.scanType === 'MASUK' ? 'bg-emerald-100 text-emerald-800' :
                          log.scanType === 'PULANG' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.scanType}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{log.timestamp}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PANDUAN RTSP */}
      {activeTab === 'guide' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Panduan Integrasi RTSP / RTMP Camera
            </CardTitle>
            <CardDescription>
              Format URL stream standar untuk menghubungkan berbagai merk IP Camera ke SIMASMUH
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-slate-700">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-600" />
                Format RTSP Camera Populer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">Hikvision / Hilook</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">Dahua / IMOU</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    rtsp://admin:password@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">TP-Link Tapo</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    rtsp://admin:password@192.168.1.50:554/stream1
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">OBS Studio / Media Server RTMP</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    rtmp://127.0.0.1:1935/live/stream_key
                  </code>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-indigo-950">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Tips Posisi Camera Presensi yang Optimal:
              </h4>
              <ul className="list-disc list-inside text-xs space-y-1 text-indigo-900/90 leading-relaxed">
                <li>Posisikan camera setinggi 1.6 - 1.8 meter menghadap ke lorong / gerbang masuk siswa.</li>
                <li>Hindari posisi *backlight* (menghadap langsung ke arah sinar matahari terik).</li>
                <li>Gunakan resolusi stream 720p / 1080p dengan frame rate 15–25 FPS untuk efisiensi komputasi server.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
