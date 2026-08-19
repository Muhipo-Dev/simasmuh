'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Swal from 'sweetalert2'
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
  Eye,
  Power,
  Tv,
  Film,
  Globe,
  UserX
} from 'lucide-react'

import { toast } from 'sonner'

interface FaceCameraConfig {
  streamSourceType?: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO'
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

interface ServiceStatusResponse {
  isOnline: boolean
  is_running?: boolean
  stream_status?: string
  stream_url?: string
  camera_name?: string
  device?: string
  fps?: number
  threshold?: number
  cooldown_minutes?: number
  users_cached?: number
  total_scans_today?: number
}

const STREAM_PRESETS = [
  {
    id: 'BROWSER_WEBCAM',
    title: 'Webcam Browser (Langsung)',
    description: 'Kamera webcam laptop / HP / USB yang terhubung di browser (Rekomendasi)',
    icon: Camera,
    example: 'BROWSER_WEBCAM',
    badge: 'Browser Direct',
  },
  {
    id: 'RTSP',
    title: 'IP Camera RTSP',
    description: 'Kamera CCTV, DVR, NVR (Hikvision, Dahua, Tapo, dll)',
    icon: Video,
    example: 'rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101',
    badge: 'RTSP Stream',
  },
  {
    id: 'WEBCAM',
    title: 'Webcam USB Server (0)',
    description: 'Kamera bawaan komputer / USB webcam lokal pada server',
    icon: Camera,
    example: '0',
    badge: 'Server Direct USB',
  },
]

export default function FaceAttendanceCameraPage() {
  const { data: session } = useSession()
  const userRoles = useMemo(() => {
    const u = session?.user as any
    return [u?.role, u?.subRole, u?.subRole2, u?.subRole3].filter(Boolean)
  }, [session])
  const isSuperAdmin = userRoles.includes('ADMIN_IT') || userRoles.includes('SUPERADMIN')

  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [activeTab, setActiveTab] = useState<'monitor' | 'config' | 'dataset' | 'logs' | 'guide'>('monitor')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null)
  const [streamError, setStreamError] = useState(false)
  const [isStreamLoading, setIsStreamLoading] = useState(true)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const streamRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleStreamImgError = () => {
    if (streamRetryTimeoutRef.current) clearTimeout(streamRetryTimeoutRef.current)
    streamRetryTimeoutRef.current = setTimeout(() => {
      setStreamError(true)
      setIsStreamLoading(false)
    }, 3000)
  }

  const handleStreamImgLoad = () => {
    if (streamRetryTimeoutRef.current) {
      clearTimeout(streamRetryTimeoutRef.current)
      streamRetryTimeoutRef.current = null
    }
    setStreamError(false)
    setIsStreamLoading(false)
  }

  // Browser Webcam Direct Hook
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isBrowserCamStreaming, setIsBrowserCamStreaming] = useState(false)
  const [browserCamError, setBrowserCamError] = useState<string | null>(null)
  const [browserFps, setBrowserFps] = useState<number>(0)

  // Dataset filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SISWA' | 'GURU' | 'PEGAWAI'>('ALL')
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL')

  // Local form state for config
  const [formConfig, setFormConfig] = useState<FaceCameraConfig | null>(null)

  // 1. Fetch Config
  const { data: configData, refetch: refetchConfig } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/config'),
  })

  useEffect(() => {
    if (configData) {
      setFormConfig(configData)
    }
  }, [configData])

  // Start browser webcam stream dengan resolusi dan FPS ramah CPU
  const startBrowserWebcam = async () => {
    try {
      setBrowserCamError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 800 },
          height: { ideal: 480, max: 600 },
          frameRate: { ideal: 20, max: 24 },
          facingMode: 'user'
        },
        audio: false,
      })
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(() => {})
        setIsBrowserCamStreaming(true)
      }
    } catch (err: any) {
      setBrowserCamError(err?.message || 'Izin kamera ditolak atau perangkat webcam tidak terdeteksi.')
      setIsBrowserCamStreaming(false)
    }
  }

  const stopBrowserWebcam = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      localVideoRef.current.srcObject = null
    }
    setIsBrowserCamStreaming(false)
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)
    }
  }

  // Draw YOLO bounding box over video canvas (Terdaftar = Hijau, Tamu / Orang Asing = Kuning Amber)
  const drawYoloBoundingBoxes = (faces: any[], vWidth: number, vHeight: number) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== vWidth || canvas.height !== vHeight) {
      canvas.width = vWidth
      canvas.height = vHeight
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    faces.forEach((f) => {
      const [x, y, w, h] = f.box
      const isReg = f.is_registered
      // Hijau Zamrud untuk terdaftar, Kuning Amber untuk Tamu/Orang Asing
      const color = isReg ? '#10b981' : '#f59e0b'
      const tagBg = isReg ? '#059669' : '#d97706'

      // 1. Bounding Box Segiempat
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.strokeRect(x, y, w, h)

      // 2. Corner accents
      const cLen = Math.max(6, Math.min(18, w / 4))
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      // Top-left
      ctx.beginPath(); ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y); ctx.stroke()
      // Top-right
      ctx.beginPath(); ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen); ctx.stroke()
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h); ctx.stroke()
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen); ctx.stroke()

      // 3. YOLO Tag Label di atas kotak
      const labelText = isReg 
        ? `${f.name || 'Terdaftar'} (${Math.round((f.confidence || 0) * 100)}%)` 
        : 'Tamu / Orang Asing'
      
      const subLabelText = isReg 
        ? (f.sub_label || `${f.role || ''} - ${f.identifier || ''}`)
        : 'Wajah Belum Terdaftar'

      const fullText = `${labelText} • ${subLabelText}`
      ctx.font = 'bold 11px sans-serif'
      const textWidth = ctx.measureText(fullText).width
      const tagH = 22
      const tagW = Math.max(120, textWidth + 16)
      const tagY = y - tagH >= 0 ? y - tagH : y

      ctx.fillStyle = tagBg
      ctx.fillRect(x, tagY, tagW, tagH)
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.strokeRect(x, tagY, tagW, tagH)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(fullText, x + 8, tagY + 15)
    })
  }

  const isBrowserMode = formConfig?.streamSourceType === 'BROWSER_WEBCAM'

  // Effect untuk mengaktifkan / menonaktifkan webcam browser
  useEffect(() => {
    if (isBrowserMode && activeTab === 'monitor') {
      startBrowserWebcam()
    } else {
      stopBrowserWebcam()
    }
    return () => {
      stopBrowserWebcam()
    }
  }, [isBrowserMode, activeTab])

  // Periodic frame scanning ke FaceNet backend (mode CPU Eco hemat daya ~3 FPS inferensi)
  useEffect(() => {
    if (!isBrowserCamStreaming) return
    let isProcessing = false
    let frameCount = 0
    let lastTime = Date.now()

    const interval = setInterval(async () => {
      if (isProcessing || !localVideoRef.current || !overlayCanvasRef.current) return
      const video = localVideoRef.current
      if (video.readyState < 2 || video.videoWidth === 0) return

      isProcessing = true
      try {
        const offscreen = document.createElement('canvas')
        const scale = Math.min(1.0, 640 / video.videoWidth)
        offscreen.width = Math.round(video.videoWidth * scale)
        offscreen.height = Math.round(video.videoHeight * scale)
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height)
          const base64 = offscreen.toDataURL('image/jpeg', 0.65)
          const res = await authenticatedFetch('/api-backend/face-attendance/scan-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
          })
          if (res.ok) {
            const data = await res.json()
            const rawFaces = data.faces || []
            const invScale = 1.0 / scale
            const scaledFaces = rawFaces.map((f: any) => ({
              ...f,
              box: [
                Math.round(f.box[0] * invScale),
                Math.round(f.box[1] * invScale),
                Math.round(f.box[2] * invScale),
                Math.round(f.box[3] * invScale),
              ],
            }))
            drawYoloBoundingBoxes(scaledFaces, video.videoWidth, video.videoHeight)
          }
        }
        frameCount++
        const now = Date.now()
        if (now - lastTime >= 1000) {
          setBrowserFps(frameCount)
          frameCount = 0
          lastTime = now
        }
      } catch (err) {
        // silent
      } finally {
        isProcessing = false
      }
    }, 320)

    return () => clearInterval(interval)
  }, [isBrowserCamStreaming])

  // 2. Fetch Users Dataset stats
  const { data: datasetData, isLoading: isDatasetLoading, refetch: refetchDataset } = useQuery<UsersDatasetResponse>({
    queryKey: ['face-attendance-users-dataset'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/users-dataset'),
  })

  // 3. Fetch Live Logs (refetches every 2 seconds)
  const { data: logsData, refetch: refetchLogs } = useQuery<FaceDetectionLog[]>({
    queryKey: ['face-attendance-logs'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/logs'),
    refetchInterval: 2000,
  })

  // 4. Fetch Python AI Service Status (Port 8089)
  const { data: serviceStatus, refetch: refetchServiceStatus } = useQuery<ServiceStatusResponse>({
    queryKey: ['face-attendance-service-status'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/service-status'),
    refetchInterval: 2500,
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

  // Mutation to start AI service worker
  const { mutate: startServiceWorker, isPending: isStartingWorker } = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/service/start', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyalakan AI worker')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['face-attendance-service-status'], (prev: any) => ({
        ...(prev || {}),
        isOnline: true,
        is_running: true,
        stream_status: 'LIVE_STREAMING',
      }))
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      setStreamError(false)
      setStreamKey(Date.now())
      toast.success(data?.message || 'AI Microservice FaceNet berhasil diaktifkan!')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyalakan AI Microservice FaceNet')
    },
  })

  // Mutation to stop AI service worker
  const { mutate: stopServiceWorker, isPending: isStoppingWorker } = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/face-attendance/service/stop', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menghentikan AI worker')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['face-attendance-service-status'], (prev: any) => ({
        ...(prev || {}),
        is_running: false,
        stream_status: 'STANDBY',
      }))
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      toast.info(data?.message || 'AI Microservice FaceNet dimatikan (Standby)')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mematikan AI Microservice FaceNet')
    },
  })

  // Mutation to clear logs and reset attendance database
  const { mutate: clearLogs, isPending: isClearing } = useMutation({
    mutationFn: async ({ resetDb = true }: { resetDb?: boolean } = {}) => {
      const res = await authenticatedFetch('/api-backend/face-attendance/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetDb }),
      })
      if (!res.ok) throw new Error('Gagal mengosongkan log')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
      queryClient.invalidateQueries({ queryKey: ['daily-attendances'] })
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      Swal.fire({
        title: 'Berhasil Direset!',
        text: data?.message || 'Seluruh scanner log dan data presensi hari ini berhasil direset.',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal',
        text: err?.message || 'Gagal mereset data presensi',
        icon: 'error',
      })
    },
  })

  // Mutation to delete single log & reset individual attendance
  const { mutate: deleteSingleLog, isPending: isDeletingSingle } = useMutation({
    mutationFn: async ({ id, resetDb = true }: { id: string; resetDb?: boolean }) => {
      const res = await authenticatedFetch(`/api-backend/face-attendance/logs/${id}?resetDb=${resetDb}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus log')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
      queryClient.invalidateQueries({ queryKey: ['daily-attendances'] })
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      toast.success(data?.message || 'Log dan status presensi berhasil dihapus')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus log scan')
    },
  })

  const handleConfirmClearLogs = () => {
    Swal.fire({
      title: 'Reset Seluruh Log & Presensi Hari Ini?',
      text: 'Semua riwayat scanner log dan catatan presensi hari ini di database utama (Supabase/PostgreSQL) akan ikut direset. Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Semua',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        clearLogs({ resetDb: true })
      }
    })
  }

  const handleConfirmDeleteSingle = (log: FaceDetectionLog) => {
    Swal.fire({
      title: 'Hapus Log & Reset Presensi?',
      html: `Hapus log scanner dan reset presensi <strong>${log.userName}</strong> (${log.scanType}) dari database utama?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus & Reset',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteSingleLog({ id: log.id, resetDb: true })
      }
    })
  }

  const currentConfig = formConfig || configData

  const handleSave = () => {
    if (!currentConfig) return
    updateConfig(currentConfig)
  }

  const handleSelectPreset = (preset: typeof STREAM_PRESETS[0]) => {
    setFormConfig((prev) => {
      if (!prev) return null
      return {
        ...prev,
        streamSourceType: preset.id as any,
        streamUrl: preset.example,
      }
    })
  }

  const handleSyncDatabase = async () => {
    try {
      await authenticatedFetch('/api-backend/face-attendance/sync-dataset', { method: 'POST' })
    } catch {}
    const updated = await refetchDataset()
    const usersCount = updated.data?.totalUsers || datasetData?.totalUsers || 0
    const photosCount = updated.data?.usersWithPhoto || datasetData?.usersWithPhoto || 0
    setSyncSuccessMsg(
      `Sinkronisasi FaceNet Sukses! ${photosCount} dari ${usersCount} profil pengguna siap dicocokkan untuk absensi wajah AI.`
    )
    setTimeout(() => setSyncSuccessMsg(null), 6000)
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
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto pb-12 px-2 sm:px-4 md:px-0">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-4 sm:p-6 md:p-7 rounded-2xl text-white shadow-xl border border-indigo-900/30">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] sm:text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            Live Camera Stream & FaceNet Biometric Engine
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Presensi Camera AI FaceNet</h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Sistem absensi biometrik wajah real-time terintegrasi dengan deteksi FaceNet (512-D), penandaan tamu otomatis, dan sinkronisasi instan ke basis data SIMASMUH.
          </p>
        </div>
        
        {/* Top Control Action Badges */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                serviceStatus?.isOnline && serviceStatus?.is_running ? 'bg-emerald-400 animate-ping' : serviceStatus?.isOnline ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              <span className="font-semibold text-[11px] sm:text-xs">
                {serviceStatus?.isOnline ? (serviceStatus.is_running ? 'STREAM ACTIVE' : 'AI STANDBY (HEMAT DAYA)') : 'AI STANDBY (OFF)'}
              </span>
            </div>
            {isSuperAdmin ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => serviceStatus?.is_running ? stopServiceWorker() : startServiceWorker()}
                disabled={isStartingWorker || isStoppingWorker}
                className={`h-6 px-2.5 text-[11px] font-bold rounded-md ${
                  serviceStatus?.is_running ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-200' : 'bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200'
                }`}
              >
                <Power className="w-3 h-3 mr-1" />
                {isStartingWorker ? 'Memuat...' : isStoppingWorker ? 'Mematikan...' : serviceStatus?.is_running ? 'Matikan AI' : 'Nyalakan AI'}
              </Button>
            ) : (
              <Badge variant="outline" className="text-[10px] text-slate-300 border-white/20">
                Superadmin Only
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 text-xs w-full sm:w-auto">
            <Users className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span className="font-medium truncate text-[11px] sm:text-xs">{datasetData?.usersWithPhoto || 0} Profil Wajah Terdaftar</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'monitor' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Video className="w-4 h-4 shrink-0" />
          <span>Live Monitor & Scanner</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'config' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>Konfigurasi Stream</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dataset')}
          className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'dataset' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Dataset Profil Wajah</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'logs' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
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
          className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'guide' ? 'bg-white shadow text-indigo-600 font-bold dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Panduan Stream</span>
        </button>
      </div>

      {/* TAB 1: LIVE MONITOR & SCANNER LOG */}
      {activeTab === 'monitor' && (
        <div className="space-y-4 md:space-y-6">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-100 uppercase tracking-wider">Masuk</p>
                <p className="text-xl sm:text-2xl font-extrabold mt-0.5">{logStats.masuk}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-blue-100 uppercase tracking-wider">Pulang</p>
                <p className="text-xl sm:text-2xl font-extrabold mt-0.5">{logStats.pulang}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between border border-slate-700">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">Total</p>
                <p className="text-xl sm:text-2xl font-extrabold mt-0.5">{logStats.total}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs shrink-0">
                <Activity className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-700 to-indigo-900 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between border border-purple-600/30">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-semibold text-purple-200 uppercase tracking-wider truncate">Status AI</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${serviceStatus?.isOnline && serviceStatus?.is_running ? 'bg-emerald-400 animate-pulse' : serviceStatus?.isOnline ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  <span className="font-bold text-[11px] sm:text-sm truncate">
                    {serviceStatus?.isOnline ? (serviceStatus.is_running ? 'STREAMING' : 'STANDBY') : 'OFFLINE'}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shrink-0">
                <Cpu className="w-5 h-5 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Quick Stream Preset Selector Bar */}
          <div className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white shadow-md space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-200">Pilih Sumber Kamera Aktif:</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono truncate">
                Aktif: <span className="text-emerald-400 font-semibold">{currentConfig?.streamSourceType || 'RTSP'}</span> ({currentConfig?.streamUrl})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {STREAM_PRESETS.map((preset) => {
                const IconComponent = preset.icon
                const isSelected = formConfig?.streamSourceType === preset.id || (!formConfig?.streamSourceType && preset.id === 'RTSP')
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...(currentConfig || {}),
                        streamSourceType: preset.id as any,
                        streamUrl: preset.example,
                      }
                      setFormConfig(updated as any)
                      updateConfig(updated as any)
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all text-xs ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold ring-1 ring-indigo-400'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/60 text-slate-300'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{preset.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.badge}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SPLIT SCREEN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
            {/* LEFT BOX (7 COLS): REALTIME LIVE CAPTURE STREAM */}
            <div className="lg:col-span-7 space-y-3">
              <Card className="shadow-lg border-slate-800 bg-slate-950 text-white overflow-hidden rounded-2xl">
                {/* Header Stream Bar */}
                <div className="p-3 sm:p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-3 w-3 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate">
                        <span className="truncate">{currentConfig?.cameraName || 'Camera Gerbang Utama'}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 text-indigo-300 font-mono shrink-0">
                          {currentConfig?.streamSourceType || 'RTSP'}
                        </Badge>
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                        {currentConfig?.streamUrl || 'rtsp://...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReconnectStream}
                      title="Hubungkan Ulang Stream"
                      className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 sm:h-8 px-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      title="Layar Penuh"
                      className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 sm:h-8 px-2"
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
                  {isBrowserMode ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        onPlay={() => setIsBrowserCamStreaming(true)}
                      />
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none object-contain"
                      />

                      {browserCamError && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                          <Camera className="w-10 h-10 text-rose-400 animate-pulse" />
                          <p className="text-sm font-bold text-white">Gagal Mengakses Webcam Browser</p>
                          <p className="text-xs text-slate-300 max-w-sm">{browserCamError}</p>
                          <Button size="sm" onClick={startBrowserWebcam} className="bg-indigo-600 text-white text-xs">
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Coba Lagi
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : !streamError && serviceStatus?.is_running ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      {isStreamLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-300 font-medium">Menghubungkan Sinyal Kamera...</span>
                          </div>
                        </div>
                      )}
                      <img
                        key={streamKey}
                        src={`/api/face-stream?t=${streamKey}`}
                        alt="Live Capture FaceNet Camera Stream"
                        className="w-full h-full object-contain"
                        onLoad={handleStreamImgLoad}
                        onError={handleStreamImgError}
                      />
                    </div>
                  ) : (
                    <div className="text-center p-4 sm:p-6 space-y-3 max-w-md pointer-events-none select-none">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                        <Video className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-xs sm:text-sm text-slate-200">
                          {serviceStatus?.isOnline 
                            ? (serviceStatus?.is_running ? 'Menghubungkan Sinyal Kamera...' : 'AI FaceNet Standby') 
                            : 'Microservice AI FaceNet Offline'}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                          {serviceStatus?.is_running 
                            ? 'Menunggu sinyal frame aktif dari perangkat kamera...'
                            : 'Nyalakan AI melalui tombol di atas untuk memulai streaming deteksi.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Corner Visual HUD Targets */}
                  <div className="absolute top-2 sm:top-3 left-2 sm:left-3 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{isBrowserMode ? `BROWSER WEBCAM (${browserFps} FPS)` : currentConfig?.streamSourceType || 'DIRECT STREAM'}</span>
                  </div>

                  <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 pointer-events-none flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-black/60 backdrop-blur-xs text-[10px] sm:text-[11px] font-mono text-slate-300 border border-white/10">
                    <span>Sensitivitas: {Math.round((currentConfig?.threshold || 0.48) * 100)}%</span>
                    <span>•</span>
                    <span>Cooldown: {currentConfig?.cooldownMinutes || 10}m</span>
                  </div>
                </div>

                {/* Footer Controls - Clean Information Only */}
                <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Lokasi Kamera: <strong className="text-slate-200">{currentConfig?.location || 'Gerbang Depan Sekolah'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.is_running ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {serviceStatus?.is_running ? 'Stream Aktif' : 'Standby'}
                    </span>
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
                        <CardDescription className="text-[11px]">Wajah terdaftar & waktu presensi otomatis</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => refetchLogs()} className="h-7 w-7 p-0 text-slate-500">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleConfirmClearLogs} 
                        disabled={isClearing} 
                        title="Reset Seluruh Log & Presensi Hari Ini di Database"
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
                        Arahkan wajah siswa atau guru ke depan kamera. Hasil identifikasi akan otomatis muncul di sini dan tersimpan ke basis data secara realtime.
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

                          {/* Time, Attendance Badge & Single Delete */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmDeleteSingle(log)}
                              disabled={isDeletingSingle}
                              title="Hapus log & reset presensi pengguna ini dari database"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Match Confidence progress indicator */}
                        <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Akurasi Kemiripan AI FaceNet:</span>
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

      {/* TAB 2: KONFIGURASI CAMERA & PILIHAN STREAM */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Stream Type Selection Presets */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-600" />
              Pilih Tipe Sumber Kamera / Stream (*Input Preset*)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {STREAM_PRESETS.map((preset) => {
                const IconComponent = preset.icon
                const isSelected = formConfig?.streamSourceType === preset.id || 
                  (!formConfig?.streamSourceType && preset.id === 'RTSP')

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        isSelected ? 'border-indigo-300 text-indigo-700 font-bold' : 'text-slate-500'
                      }`}>
                        {preset.badge}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{preset.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{preset.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Settings */}
            <Card className="md:col-span-2 shadow-sm border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Parameter Kamera & Stream AI</CardTitle>
                    <CardDescription>Tentukan URL stream serta batas sensitivitas pengenalan wajah</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stream URL */}
                <div className="space-y-2">
                  <Label htmlFor="streamUrl" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Target Link / Path Stream Camera
                  </Label>
                  <Input
                    id="streamUrl"
                    placeholder="Contoh: rtsp://admin:pass@192.168.1.100:554/Streaming/Channels/101 atau 0 untuk webcam"
                    value={currentConfig?.streamUrl || ''}
                    onChange={(e) => setFormConfig((prev) => prev ? { ...prev, streamUrl: e.target.value } : null)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Masukkan URL RTSP (IP Camera/CCTV), index USB webcam <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">0</code>, atau <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">BROWSER_WEBCAM</code>.
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
                    <Label htmlFor="location" className="text-sm font-medium text-slate-700">Lokasi / Area Pemasangan</Label>
                    <Input
                      id="location"
                      placeholder="Contoh: Gerbang Depan Sekolah"
                      value={currentConfig?.location || ''}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, location: e.target.value } : null)}
                    />
                  </div>
                </div>

                {/* Range: Threshold */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-slate-700">
                      Batas Kemiripan Wajah (*Cosine Threshold*)
                    </Label>
                    <Badge variant="outline" className="text-xs font-bold text-indigo-600 border-indigo-200">
                      {Math.round((currentConfig?.threshold || 0.48) * 100)}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={85}
                    step={1}
                    value={Math.round((currentConfig?.threshold || 0.48) * 100)}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormConfig((prev) => prev ? { ...prev, threshold: num / 100 } : null)
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-xs text-slate-500">
                    Standar optimal FaceNet CPU: <strong>48% - 55%</strong>. Nilai ini menangkap variasi pencahayaan foto profil secara akurat dan otomatis menandai wajah lain sebagai Tamu / Orang Asing.
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

            {/* Service & Worker Controls Card */}
            <div className="space-y-6">
              <Card className="shadow-sm border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-600" />
                      Microservice AI FaceNet Engine
                    </span>
                    <Badge className={serviceStatus?.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                      {serviceStatus?.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Status Worker:</span>
                    <span className="font-semibold text-slate-800">
                      {serviceStatus?.is_running ? 'STREAMING (ACTIVE)' : 'STANDBY'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Mode Komputasi:</span>
                    <span className="font-semibold text-emerald-700">CPU Eco-Safe Mode</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Arsitektur AI:</span>
                    <span className="font-semibold text-slate-800">FaceNet (512-D) + MTCNN</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Basis Data Wajah:</span>
                    <span className="font-semibold text-slate-800">Foto Profil SIMASMUH</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Total Scan Hari Ini:</span>
                    <span className="font-bold text-indigo-600">{serviceStatus?.total_scans_today || 0}</span>
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
                    Foto profil pengguna otomatis dikonversi menjadi vektor 512-D berkecepatan tinggi tanpa perlu training ulang model.
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConfirmClearLogs} 
                disabled={isClearing} 
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Semua Log & Presensi DB
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsData && logsData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <Camera className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="font-medium text-slate-600">Belum ada aktivitas presensi wajah hari ini.</p>
                <p className="text-xs text-slate-400">Log akan otomatis muncul saat siswa atau guru terdeteksi di depan camera dan tersinkronisasi ke basis data Supabase.</p>
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

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.scanType === 'MASUK' ? 'bg-emerald-100 text-emerald-800' :
                          log.scanType === 'PULANG' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {log.scanType}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{log.timestamp}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirmDeleteSingle(log)}
                        disabled={isDeletingSingle}
                        title="Hapus log dan reset presensi pengguna ini dari database"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PANDUAN INTEGRASI STREAM */}
      {activeTab === 'guide' && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Panduan Integrasi Sumber Kamera & Stream
            </CardTitle>
            <CardDescription>
              Format URL stream standar untuk menghubungkan berbagai jenis sumber kamera ke SIMASMUH
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-slate-700">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-600" />
                Format Sumber Kamera Populer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">1. IP Camera RTSP (Hikvision / Hilook / Dahua / Tapo)</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">2. Webcam USB Server</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    0 (atau 1, 2 untuk webcam eksternal)
                  </code>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-xs text-slate-800">3. Webcam Browser Direct</p>
                  <code className="block text-xs bg-slate-200/70 p-2 rounded text-slate-800 font-mono">
                    BROWSER_WEBCAM
                  </code>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2 text-indigo-950">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Tips Pengaturan Kamera Presensi:
              </h4>
              <ul className="list-disc list-inside text-xs space-y-1 text-indigo-900/90 leading-relaxed">
                <li>Untuk pengujian di laptop/PC tanpa CCTV, Anda dapat memilih preset <strong>Webcam Browser (Langsung)</strong> atau <strong>Webcam USB (0)</strong>.</li>
                <li>Posisikan camera setinggi 1.6 - 1.8 meter menghadap ke lorong / gerbang masuk siswa.</li>
                <li>Hindari posisi *backlight* (menghadap langsung ke arah sinar matahari terik).</li>
                <li>Resolusi ideal adalah 640x480 pada 18-20 FPS untuk pemrosesan CPU yang dingin dan stabil.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
