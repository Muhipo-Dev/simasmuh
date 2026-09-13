'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  Clock,
  Radio,
  Power,
  Globe,
  QrCode,
  Lock,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import NextImage from 'next/image'
import { toast } from 'sonner'
import { PublicNavbar, AppFooter } from '@/components/layout'

interface FaceCameraConfig {
  streamSourceType?: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO'
  streamUrl: string
  cameraName: string
  location: string
  threshold: number
  cooldownMinutes: number
  isActive: boolean
  welcomeVoice: boolean
  showPublicStream?: boolean
  showPublicLogs?: boolean
  apiKeySecret: string
  updatedAt: string
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

// Fungsi masking aman untuk menyembunyikan username & password pada link RTSP (contoh: rtsp://***:***@host:554/...)
function maskStreamUrl(url?: string): string {
  if (!url) return '-'
  if (url === 'BROWSER_WEBCAM') return 'Webcam Langsung Browser'
  if (url === '0' || url === '1') return `USB Webcam Lokal (${url})`
  // Masking kredensial RTSP rtsp://user:pass@host:port/path
  return url.replace(/^(rtsp:\/\/[^:]+):([^@]+)@/i, 'rtsp://***:***@')
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
    example: 'rtsp://user:password@192.168.1.64:554/Streaming/Channels/101',
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

export default function FaceNetAiStandalonePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [localSuperadminAuthed, setLocalSuperadminAuthed] = useState(false)

  const userRoles = useMemo(() => {
    const u = session?.user as any
    return [u?.role, u?.subRole, u?.subRole2, u?.subRole3, u?.subRole4, u?.subRole5].filter(Boolean) as string[]
  }, [session])

  // Otoritas superadmin khusus yang dapat menyalakan/mematikan AI Microservice & mengubah konfigurasi stream
  const isSuperAdmin = useMemo(() => {
    if (localSuperadminAuthed) return true
    return userRoles.some(r => ['SUPERADMIN', 'ADMIN_IT'].includes(r))
  }, [userRoles, localSuperadminAuthed])

  // Konfigurasi stream area juga hanya dapat diubah oleh superadmin
  const canConfigure = isSuperAdmin

  const isAuthenticated = (status === 'authenticated' && !!session?.user) || localSuperadminAuthed

  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [activeTab, setActiveTab] = useState<'monitor' | 'config' | 'dataset' | 'logs'>('monitor')
  const [showStreamUrl, setShowStreamUrl] = useState(false)
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
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isBrowserCamStreaming, setIsBrowserCamStreaming] = useState(false)
  const [browserCamError, setBrowserCamError] = useState<string | null>(null)
  const [browserFps, setBrowserFps] = useState<number>(0)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  // Dataset filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SISWA' | 'GURU' | 'PEGAWAI'>('ALL')
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL')

  // Log filter states (default: hari ini saja)
  const [logFilterMode, setLogFilterMode] = useState<'TODAY' | 'ALL'>('TODAY')
  const [logSearchQuery, setLogSearchQuery] = useState('')

  // Local form state for config
  const [formConfig, setFormConfig] = useState<FaceCameraConfig | null>(null)

  // 1. Fetch Config
  const { data: configData } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/config'),
  })

  useEffect(() => {
    if (configData) {
      setFormConfig(configData)
    }
  }, [configData])

  // Attach stream to video node whenever ref is attached
  const setVideoRef = (node: HTMLVideoElement | null) => {
    ;(localVideoRef as any).current = node
    if (node && mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current
      node.muted = true
      node.playsInline = true
      node.play().catch(() => {})
    }
  }

  // Start browser webcam stream
  const startBrowserWebcam = async (deviceId?: string) => {
    try {
      setBrowserCamError(null)
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        setBrowserCamError('Akses webcam browser memerlukan koneksi aman (localhost atau HTTPS) atau perangkat tidak memiliki dukungan webcam.')
        setIsBrowserCamStreaming(false)
        return
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => {
          try { t.stop() } catch {}
        })
        mediaStreamRef.current = null
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }

      const targetDeviceId = deviceId || selectedDeviceId

      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetDeviceId
            ? { deviceId: { exact: targetDeviceId }, width: { ideal: 960 }, height: { ideal: 540 } }
            : { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' },
          audio: false,
        })
      } catch (hdErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true,
          audio: false,
        })
      }

      mediaStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        await localVideoRef.current.play().catch(() => {})
      }

      setIsBrowserCamStreaming(true)

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cams = devices.filter((d) => d.kind === 'videoinput')
        setVideoDevices(cams)
        if (!selectedDeviceId && cams.length > 0) {
          setSelectedDeviceId(cams[0].deviceId)
        }
      } catch {}
    } catch (err: any) {
      console.error('Gagal mengakses webcam browser:', err)
      setBrowserCamError(err?.message || 'Tidak dapat mengakses perangkat kamera.')
      setIsBrowserCamStreaming(false)
    }
  }

  const stopBrowserWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch {}
      })
      mediaStreamRef.current = null
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    setIsBrowserCamStreaming(false)
  }

  const drawYoloBoundingBoxes = (activeFaces: any[], videoW: number, videoH: number) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (canvas.width !== videoW || canvas.height !== videoH) {
      canvas.width = videoW
      canvas.height = videoH
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!activeFaces || activeFaces.length === 0) return

    activeFaces.forEach((f) => {
      const [x, y, w, h] = f.box
      const isReg = f.is_registered
      const color = isReg ? '#10b981' : '#f59e0b'
      const tagBg = isReg ? '#059669' : '#d97706'
      const boxFill = isReg ? 'rgba(16, 185, 129, 0.10)' : 'rgba(245, 158, 11, 0.10)'

      ctx.fillStyle = boxFill
      ctx.fillRect(x, y, w, h)

      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      ctx.strokeRect(x, y, w, h)

      const cLen = Math.max(5, Math.min(14, w / 4))
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen); ctx.stroke()

      const labelText = isReg 
        ? `${f.name || 'Terdaftar'} (${Math.round((f.confidence || 0) * 100)}%)` 
        : 'Tamu / Orang Asing'
      
      const subLabelText = isReg 
        ? (f.sub_label || `${f.role || ''} - ${f.identifier || ''}`)
        : 'Wajah Belum Terdaftar'

      const fullText = `${labelText} • ${subLabelText}`
      ctx.font = '600 10px system-ui, -apple-system, sans-serif'
      const textWidth = ctx.measureText(fullText).width
      const tagH = 18
      const tagW = Math.max(80, textWidth + 12)
      const tagY = y - tagH >= 0 ? y - tagH : y

      ctx.fillStyle = tagBg
      ctx.fillRect(x, tagY, tagW, tagH)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.0
      ctx.strokeRect(x, tagY, tagW, tagH)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(fullText, x + 6, tagY + 12.5)
    })
  }

  const isBrowserMode = formConfig?.streamSourceType === 'BROWSER_WEBCAM' || (!formConfig && configData?.streamSourceType === 'BROWSER_WEBCAM')

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

  // Periodic frame scanning ke FaceNet backend
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
        const scale = Math.min(1.0, 360 / video.videoWidth)
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
            if (rawFaces.length > 0) {
              if (rawFaces.some((f: any) => f.is_registered)) {
                queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
              }
              // Cooldown 2.0 detik setelah objek terdeteksi sebelum memindai frame berikutnya
              await new Promise((r) => setTimeout(r, 2000))
            } else {
              // Mode Sleep Hemat Daya Ringan (Standby 200ms) saat tidak ada objek wajah di depan kamera
              await new Promise((r) => setTimeout(r, 200))
            }
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
    }, 100)

    return () => clearInterval(interval)
  }, [isBrowserCamStreaming])

  // 2. Fetch Users Dataset (Diizinkan untuk dilihat oleh semua pengunjung)
  const { data: datasetData, refetch: refetchDataset } = useQuery<UsersDatasetResponse>({
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
  const { data: serviceStatus } = useQuery<ServiceStatusResponse>({
    queryKey: ['face-attendance-service-status'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/service-status'),
    refetchInterval: 2500,
  })

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    if (!datasetData?.dataset) return []
    return datasetData.dataset.filter((user) => {
      // Kecualikan akun wali murid dari deteksi & absensi wajah
      if (user.role === 'WALI_MURID') return false

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

  // Filtered logs (Hari ini vs Semua tersimpan)
  const todayIsoStr = useMemo(() => {
    const today = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  }, [])

  const displayedLogs = useMemo(() => {
    if (!logsData) return []
    let list = logsData

    // Default atau saat mode TODAY: hanya tampilkan log hari ini
    if (logFilterMode === 'TODAY') {
      list = list.filter((l) => l.date === todayIsoStr)
    }

    if (logSearchQuery.trim() !== '') {
      const q = logSearchQuery.toLowerCase()
      list = list.filter(
        (l) =>
          l.userName?.toLowerCase().includes(q) ||
          l.identifier?.toLowerCase().includes(q) ||
          l.userRole?.toLowerCase().includes(q) ||
          l.cameraName?.toLowerCase().includes(q)
      )
    }

    return list
  }, [logsData, logFilterMode, todayIsoStr, logSearchQuery])

  // Count stats from logs hari ini
  const logStats = useMemo(() => {
    if (!logsData) return { masuk: 0, pulang: 0, total: 0 }
    const todayLogs = logsData.filter((l) => l.date === todayIsoStr)
    const masuk = todayLogs.filter((l) => l.scanType === 'MASUK').length
    const pulang = todayLogs.filter((l) => l.scanType === 'PULANG').length
    return { masuk, pulang, total: todayLogs.length }
  }, [logsData, todayIsoStr])

  // Mutation to save config
  const { mutate: updateConfig, isPending: isSaving } = useMutation({
    mutationFn: async (updated: Partial<FaceCameraConfig>) => {
      if (!isAuthenticated) {
        throw new Error('Silakan login terlebih dahulu untuk menyimpan pengaturan.')
      }
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
      toast.success('Pengaturan presensi camera berhasil disimpan!')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan pengaturan')
    }
  })

  // Mutation to start AI service worker (Hanya Superadmin)
  const { mutate: startServiceWorker, isPending: isStartingWorker } = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('Silakan login sebagai Superadmin untuk menyalakan AI.')
      }
      if (!isSuperAdmin) {
        throw new Error('Hanya Superadmin yang memiliki otoritas untuk menyalakan AI Microservice.')
      }
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
      queryClient.setQueryData(['face-attendance-config'], (prev: any) => prev ? { ...prev, isActive: true } : prev)
      setFormConfig((prev) => prev ? { ...prev, isActive: true } : prev)
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      queryClient.invalidateQueries({ queryKey: ['face-attendance-config'] })
      setStreamError(false)
      setStreamKey(Date.now())
      toast.success(data?.message || 'AI Microservice FaceNet berhasil diaktifkan!')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyalakan AI Microservice FaceNet')
    },
  })

  // Mutation to stop AI service worker (Hanya Superadmin)
  const { mutate: stopServiceWorker, isPending: isStoppingWorker } = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('Silakan login sebagai Superadmin untuk menghentikan AI.')
      }
      if (!isSuperAdmin) {
        throw new Error('Hanya Superadmin yang memiliki otoritas untuk menghentikan AI Microservice.')
      }
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
      queryClient.setQueryData(['face-attendance-config'], (prev: any) => prev ? { ...prev, isActive: false } : prev)
      setFormConfig((prev) => prev ? { ...prev, isActive: false } : prev)
      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      queryClient.invalidateQueries({ queryKey: ['face-attendance-config'] })
      toast.info(data?.message || 'AI Microservice FaceNet dimatikan (Standby)')
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mematikan AI Microservice FaceNet')
    },
  })

  // Mutation to clear logs
  const { mutate: clearLogs, isPending: isClearing } = useMutation({
    mutationFn: async ({ resetDb = true }: { resetDb?: boolean } = {}) => {
      if (!isAuthenticated) throw new Error('Harus login terlebih dahulu')
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

  const handleConfirmClearLogs = () => {
    if (!isAuthenticated) {
      promptLogin()
      return
    }
    Swal.fire({
      title: 'Reset Seluruh Log & Presensi Hari Ini?',
      text: 'Semua riwayat scanner log dan catatan presensi hari ini di database utama akan direset. Lanjutkan?',
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

  // Modal popup otorisasi Superadmin instan langsung di halaman facenetai
  const promptSuperadminAuth = (onSuccessAction?: () => void) => {
    Swal.fire({
      title: 'Otoritas Superadmin Diperlukan',
      html: `
        <div style="text-align: left; font-size: 13px; color: #64748b; margin-bottom: 12px;">
          Masukkan akun <strong>Superadmin</strong> untuk menyalakan / mengontrol AI Microservice:
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
          <label style="font-size: 12px; font-weight: 600; color: #334155;">Username / Email</label>
          <input id="swal-input-username" class="swal2-input" placeholder="Username Superadmin" style="margin: 0; width: 100%; font-size: 13px; height: 38px;" />
          <label style="font-size: 12px; font-weight: 600; color: #334155; margin-top: 6px;">Kata Sandi</label>
          <input id="swal-input-password" type="password" class="swal2-input" placeholder="Kata Sandi" style="margin: 0; width: 100%; font-size: 13px; height: 38px;" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Verifikasi & Lanjutkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const username = (document.getElementById('swal-input-username') as HTMLInputElement)?.value
        const password = (document.getElementById('swal-input-password') as HTMLInputElement)?.value
        if (!username || !password) {
          Swal.showValidationMessage('Username dan kata sandi wajib diisi')
          return false
        }
        try {
          const res = await signIn('credentials', {
            redirect: false,
            email: username,
            password: password,
          })
          if (res?.error) {
            Swal.showValidationMessage('Autentikasi gagal. Akun tidak sesuai atau bukan Superadmin.')
            return false
          }
          return true
        } catch (err: any) {
          Swal.showValidationMessage('Terjadi kesalahan koneksi saat memverifikasi akun.')
          return false
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed) {
        setLocalSuperadminAuthed(true)
        Swal.fire({
          icon: 'success',
          title: 'Otoritas Diterima',
          text: 'Berhasil terautentikasi sebagai Superadmin!',
          timer: 1500,
          showConfirmButton: false,
        })
        if (onSuccessAction) {
          setTimeout(() => onSuccessAction(), 400)
        }
      }
    })
  }

  const promptLogin = () => {
    promptSuperadminAuth()
  }

  const currentConfig = formConfig || configData

  const handleSave = () => {
    if (!isAuthenticated) {
      promptLogin()
      return
    }
    if (!canConfigure) {
      toast.error('Akun Anda tidak memiliki hak akses mengubah konfigurasi kamera.')
      return
    }
    if (!currentConfig) return
    updateConfig(currentConfig)
  }

  const handleSyncDatabase = async () => {
    if (!isAuthenticated) {
      promptLogin()
      return
    }
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
    if (isBrowserMode) {
      stopBrowserWebcam()
      setTimeout(() => startBrowserWebcam(), 300)
    } else {
      setStreamError(false)
      setIsStreamLoading(true)
      setStreamKey(Date.now())
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 overflow-x-hidden font-sans">
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
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
      <div className="fixed inset-0 bg-slate-900/85 dark:bg-slate-950/90 backdrop-blur-[4px] -z-20" />

      {/* Navbar Induk Terpadu */}
      <PublicNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        {/* Header Banner Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 p-4 sm:p-5 rounded-2xl text-white shadow-lg border border-slate-800">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                FaceNet AI
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                /facenetai
              </span>
              {!isAuthenticated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                  <Lock className="w-3 h-3" /> Mode Publik
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Presensi Kamera AI Biometrik
            </h1>
            <p className="text-slate-400 text-xs truncate max-w-2xl">
              Monitoring realtime presensi biometrik & kendali AI microservice sekolah.
            </p>
          </div>

          {/* Top Status & Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${
                serviceStatus?.isOnline && serviceStatus?.is_running ? 'bg-emerald-400 animate-ping' : serviceStatus?.isOnline ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              <span className="font-semibold text-xs">
                {serviceStatus?.isOnline ? (serviceStatus.is_running ? 'STREAMING' : 'STANDBY') : 'OFFLINE'}
              </span>

              {/* Tombol Kontrol Daya AI */}
              {isAuthenticated && isSuperAdmin ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => serviceStatus?.is_running ? stopServiceWorker() : startServiceWorker()}
                  disabled={isStartingWorker || isStoppingWorker}
                  className={`h-7 px-2.5 text-xs font-bold rounded-lg ${
                    serviceStatus?.is_running 
                      ? 'bg-rose-500/30 hover:bg-rose-500/50 text-rose-200' 
                      : 'bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5 mr-1" />
                  {isStartingWorker ? '...' : isStoppingWorker ? '...' : serviceStatus?.is_running ? 'Matikan AI' : 'Nyalakan AI'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => promptSuperadminAuth(() => {
                    startServiceWorker()
                  })}
                  disabled={isStartingWorker || isStoppingWorker}
                  className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  <Power className="w-3.5 h-3.5 mr-1" /> Nyalakan AI
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === 'monitor' ? 'bg-indigo-600 shadow text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Live Monitor & Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === 'config' ? 'bg-indigo-600 shadow text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Konfigurasi Stream</span>
            {!isSuperAdmin && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 ml-1">
                Lihat Saja
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dataset')}
            className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === 'dataset' ? 'bg-indigo-600 shadow text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Dataset Profil Wajah</span>
            {!isSuperAdmin && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 ml-1">
                Lihat Saja
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center shrink-0 gap-2 py-2 sm:py-2.5 px-3.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === 'logs' ? 'bg-indigo-600 shadow text-white font-bold' : 'text-slate-400 hover:text-white'
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
        </div>

        {/* TAB 1: LIVE MONITOR & SCANNER LOG */}
        {activeTab === 'monitor' && (
          <div className="space-y-4 md:space-y-6">
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between">
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-emerald-100 uppercase tracking-wider">Masuk</p>
                  <p className="text-xl sm:text-2xl font-extrabold mt-0.5">{logStats.masuk}</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between">
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

              <div className="bg-gradient-to-br from-purple-800 to-indigo-950 rounded-xl p-3.5 sm:p-4 text-white shadow-md flex items-center justify-between border border-purple-600/30">
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


            {/* SPLIT SCREEN: LIVE STREAM & LOGS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
              {/* LEFT: REALTIME LIVE CAPTURE STREAM (7 COLS) */}
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
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-md flex items-center gap-1.5">
                          <span>{currentConfig?.location || 'Lokasi Belum Diatur'}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-slate-400">{maskStreamUrl(currentConfig?.streamUrl)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {isBrowserMode && videoDevices.length > 1 && (
                        <select
                          aria-label="Pilih Perangkat Kamera"
                          value={selectedDeviceId}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value)
                            startBrowserWebcam(e.target.value)
                          }}
                          className="h-7 text-[11px] bg-slate-800 text-slate-200 border border-slate-700 rounded-md px-1.5 max-w-[130px] truncate"
                        >
                          {videoDevices.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || `Kamera ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      )}
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
                          ref={setVideoRef}
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
                            <Button size="sm" onClick={() => startBrowserWebcam()} className="bg-indigo-600 text-white text-xs">
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
                      <div className="text-center p-4 sm:p-6 space-y-3 max-w-md select-none z-10">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                          <Video className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-xs sm:text-sm text-slate-200">
                            {serviceStatus?.isOnline 
                              ? (serviceStatus?.is_running ? 'Menghubungkan Sinyal Kamera...' : 'AI FaceNet Standby') 
                              : 'Microservice AI FaceNet Standby / Offline'}
                          </p>
                          <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                            {serviceStatus?.is_running 
                              ? 'Menunggu sinyal frame aktif dari perangkat kamera...'
                              : 'Nyalakan AI atau pilih Webcam Browser untuk memulai streaming deteksi.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                          {!serviceStatus?.is_running && (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (isAuthenticated && isSuperAdmin) {
                                  startServiceWorker()
                                } else {
                                  promptSuperadminAuth(() => {
                                    startServiceWorker()
                                  })
                                }
                              }}
                              disabled={isStartingWorker}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              <Power className="w-3 h-3 mr-1" /> Nyalakan AI FaceNet
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleReconnectStream}
                            className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white bg-slate-800/80"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" /> Hubungkan Ulang
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Corner Visual HUD Targets */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{isBrowserMode ? `BROWSER WEBCAM (${browserFps} FPS)` : currentConfig?.streamSourceType || 'DIRECT STREAM'}</span>
                    </div>

                    <div className="absolute bottom-2 sm:top-auto sm:bottom-3 right-2 sm:right-3 pointer-events-none flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-black/60 backdrop-blur-xs text-[10px] sm:text-[11px] font-mono text-slate-300 border border-white/10">
                      <span>Sensitivitas: {Math.round((currentConfig?.threshold || 0.48) * 100)}%</span>
                      <span>•</span>
                      <span>Cooldown: {currentConfig?.cooldownMinutes || 10}m</span>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-3 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">Biometrik AI : <strong className="text-slate-200">FaceNet & MTCNN</strong></span>
                      </div>
                      <span className="hidden sm:inline text-slate-600">•</span>
                      <span className="hidden md:inline truncate text-slate-400">
                        Lokasi: <strong className="text-slate-300 font-medium">{currentConfig?.location || 'Gerbang Depan'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus?.is_running ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {serviceStatus?.is_running ? 'Stream Aktif' : 'Standby'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* RIGHT: REALTIME LIVE SCANNER LOGS (5 COLS) */}
              <div className="lg:col-span-5 space-y-3">
                <Card className="shadow-xs border-slate-800 flex flex-col h-[580px] rounded-2xl overflow-hidden bg-slate-950/90 text-white backdrop-blur-xl">
                  <CardHeader className="p-4 sm:p-5 border-b border-slate-800/80 shrink-0 bg-slate-900/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-950 text-indigo-300 flex items-center justify-center font-bold shadow-xs border border-indigo-800/60">
                          <Activity className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-white">Scanner Log Realtime</CardTitle>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 animate-pulse">
                              Live Sync
                            </span>
                          </div>
                          <CardDescription className="text-[11px] text-slate-400">Verifikasi snapshot wajah & pencatatan presensi</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Toggle Filter Hari Ini vs Semua Arsip */}
                        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setLogFilterMode('TODAY')}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                              logFilterMode === 'TODAY'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Hari Ini
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogFilterMode('ALL')}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                              logFilterMode === 'ALL'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Semua Arsip
                          </button>
                        </div>

                        <Button variant="ghost" size="sm" onClick={() => refetchLogs()} title="Segarkan Log" className="h-7 w-7 p-0 text-slate-400 hover:text-white rounded-lg">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        {isSuperAdmin ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleConfirmClearLogs} 
                            disabled={isClearing} 
                            title="Reset Seluruh Log & Presensi Hari Ini"
                            className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => promptSuperadminAuth(() => handleConfirmClearLogs())} 
                            title="Otoritas Superadmin Diperlukan untuk Reset"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Scrollable Live Scan List */}
                  <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-3">
                    {displayedLogs && displayedLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2.5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 border border-slate-800">
                          <Camera className="w-7 h-7 stroke-1" />
                        </div>
                        <p className="text-sm font-bold text-slate-200">Belum Ada Presensi Hari Ini</p>
                        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                          Arahkan wajah siswa atau guru ke depan kamera. Hasil identifikasi dan foto snapshot kamera hari ini akan otomatis muncul di sini.
                        </p>
                      </div>
                    ) : (
                      displayedLogs?.map((log, index) => (
                        <div 
                          key={log.id} 
                          className={`p-3.5 rounded-2xl transition-all border ${
                            index === 0 
                              ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-indigo-950/30 border-indigo-700/60 shadow-md ring-1 ring-indigo-400/20' 
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-xs'
                          }`}
                        >
                          {/* Header: User identity & Scan status */}
                          <div className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">{log.userName}</h4>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  log.userRole?.includes('SISWA') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                                  log.userRole?.includes('GURU') ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                  'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}>
                                  {log.userRole}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                ID: {log.identifier}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold py-0.5 px-2.5 rounded-full ${
                                  log.scanType === 'MASUK' 
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                    : log.scanType === 'PULANG' 
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800' 
                                      : 'bg-slate-800 text-slate-300'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  {log.scanType}
                                </span>
                                <p className="text-[11px] font-mono font-bold text-slate-300 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                                  <span className="text-[10px] font-semibold text-slate-400">{log.dateFormatted || log.date}</span>
                                  <span className="text-slate-600">•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {log.timestamp}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Middle: Visual Comparison Box */}
                          <div className="py-2.5 grid grid-cols-2 gap-3 items-center">
                            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/70 border border-slate-700/60 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-700 overflow-hidden shrink-0 border border-slate-600 shadow-xs flex items-center justify-center">
                                {log.avatarUrl ? (
                                  <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-extrabold text-slate-400 text-xs">{log.userName.charAt(0)}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Database</span>
                                <p className="text-xs font-semibold text-slate-200 truncate">Foto Profil</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/60 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-emerald-950 overflow-hidden shrink-0 border border-emerald-700 shadow-xs flex items-center justify-center">
                                {log.snapshotUrl ? (
                                  <img src={log.snapshotUrl} alt="Snapshot Kamera" className="w-full h-full object-cover" />
                                ) : (
                                  <Camera className="w-5 h-5 text-emerald-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Realtime</span>
                                <p className="text-xs font-semibold text-emerald-200 truncate">Hasil Scan</p>
                              </div>
                            </div>
                          </div>

                          {/* Footer: Matching Confidence Bar */}
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                Akurasi Kemiripan AI:
                              </span>
                              <span className="font-extrabold text-indigo-400 font-mono text-[11px]">
                                {Math.round(log.confidence * 100)}%
                              </span>
                            </div>

                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
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
          </div>
        )}

        {/* TAB 2: KONFIGURASI STREAM & PARAMETER */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            {!isSuperAdmin && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <p>
                    Konfigurasi stream & parameter kamera hanya dapat diubah dan disimpan oleh <strong>Superadmin</strong>.
                  </p>
                </div>
                {!isAuthenticated && (
                  <Button size="sm" onClick={() => promptSuperadminAuth()} className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-bold">
                    Otorisasi Superadmin
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form Settings */}
              <Card className="md:col-span-2 shadow-sm border-slate-800 bg-slate-900/90 text-white">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Parameter Kamera & Stream AI</CardTitle>
                      <CardDescription className="text-slate-400">Tentukan sumber kamera, URL stream, serta batas sensitivitas pengenalan wajah</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Pilihan Sumber Kamera (Hanya bisa diubah di sini oleh Superadmin) */}
                  <div className="space-y-2.5 pb-3 border-b border-slate-800">
                    <Label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      Pilihan Sumber Kamera Aktif
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {STREAM_PRESETS.map((preset) => {
                        const IconComponent = preset.icon
                        const isSelected = formConfig?.streamSourceType === preset.id || (!formConfig?.streamSourceType && preset.id === 'RTSP')
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={!isAuthenticated || !canConfigure}
                            onClick={() => {
                              if (!isAuthenticated) {
                                promptSuperadminAuth()
                                return
                              }
                              if (!canConfigure) {
                                toast.error('Hanya Superadmin yang berwenang mengubah sumber kamera')
                                return
                              }
                              if (preset.id === 'BROWSER_WEBCAM') {
                                setFormConfig((prev) => prev ? {
                                  ...prev,
                                  streamSourceType: 'BROWSER_WEBCAM',
                                  streamUrl: 'BROWSER_WEBCAM',
                                } : null)
                              } else {
                                stopBrowserWebcam()
                                setFormConfig((prev) => prev ? {
                                  ...prev,
                                  streamSourceType: preset.id as any,
                                  streamUrl: preset.example,
                                } : null)
                              }
                            }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border transition-all text-xs disabled:opacity-50 ${
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="streamUrl" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Target Link / Path Stream Camera
                      </Label>
                      {currentConfig?.streamSourceType !== 'BROWSER_WEBCAM' && (
                        <button
                          type="button"
                          onClick={() => setShowStreamUrl(!showStreamUrl)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                        >
                          {showStreamUrl ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Sembunyikan Link
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Tampilkan Link Lengkap
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        id="streamUrl"
                        type={showStreamUrl || currentConfig?.streamSourceType === 'BROWSER_WEBCAM' ? 'text' : 'password'}
                        placeholder="rtsp://***:***@host:554/... atau BROWSER_WEBCAM"
                        value={currentConfig?.streamUrl || ''}
                        disabled={!isAuthenticated || !canConfigure}
                        onChange={(e) => setFormConfig((prev) => prev ? { ...prev, streamUrl: e.target.value } : null)}
                        className="font-mono text-sm bg-slate-800 border-slate-700 text-white pr-9"
                      />
                      {currentConfig?.streamSourceType !== 'BROWSER_WEBCAM' && (
                        <button
                          type="button"
                          onClick={() => setShowStreamUrl(!showStreamUrl)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                          title={showStreamUrl ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {showStreamUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Format tersamar: <span className="font-mono text-slate-300">{maskStreamUrl(currentConfig?.streamUrl)}</span>
                      </span>
                      <span className="text-emerald-400">Kredensial dilindungi</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cameraName" className="text-sm font-medium text-slate-200">Nama Titik Camera</Label>
                      <Input
                        id="cameraName"
                        placeholder="Contoh: Camera Gerbang Utama"
                        value={currentConfig?.cameraName || ''}
                        disabled={!isAuthenticated || !canConfigure}
                        onChange={(e) => setFormConfig((prev) => prev ? { ...prev, cameraName: e.target.value } : null)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm font-medium text-slate-200">Lokasi / Area Pemasangan</Label>
                      <Input
                        id="location"
                        placeholder="Contoh: Gerbang Depan Sekolah"
                        value={currentConfig?.location || ''}
                        disabled={!isAuthenticated || !canConfigure}
                        onChange={(e) => setFormConfig((prev) => prev ? { ...prev, location: e.target.value } : null)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  {/* Range: Threshold */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <Label className="text-sm font-semibold text-slate-200">
                          Batas Sensitivitas Deteksi Wajah (*Detection Threshold*)
                        </Label>
                        <p className="text-[11px] text-slate-400">
                          Batas kemiripan kamera untuk mendeteksi & menandai wajah di layar monitor (Default: 70%).
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold text-indigo-400 border-indigo-800 bg-indigo-950/50 px-2.5 py-0.5 shrink-0">
                        {Math.round((currentConfig?.threshold || 0.70) * 100)}%
                      </Badge>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      disabled={!isSuperAdmin}
                      value={Math.round((currentConfig?.threshold || 0.70) * 100)}
                      onChange={(e) => {
                        const num = Number(e.target.value)
                        setFormConfig((prev) => prev ? { ...prev, threshold: num / 100 } : null)
                      }}
                      className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>1% (Sangat Sensitif)</span>
                      <span className="text-indigo-400 font-bold">Default Sensitif: 70%</span>
                      <span>100% (Sangat Ketat)</span>
                    </div>

                    {/* Catatan Perbedaan Batas Sensitif vs Batas Input Log */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Batas Input Log Sistem & Absensi: Mutlak &ge; 90%
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Wajah dengan kemiripan antara <strong className="text-slate-300">70% s/d 89%</strong> akan tetap teridentifikasi di monitor/layar kamera, namun <strong className="text-amber-400">TIDAK</strong> akan dicatat ke riwayat log dan database absensi. Hanya kemiripan <strong className="text-emerald-400">&ge; 90%</strong> yang sah dicatat ke log sistem.
                      </p>
                    </div>
                  </div>

                  {/* Range: Cooldown */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold text-slate-200">
                        Jeda Cooldown Presensi Antar Scan (*Anti-Spam*)
                      </Label>
                      <Badge variant="outline" className="text-xs font-bold text-indigo-400 border-indigo-800 bg-indigo-950/50 px-2.5 py-0.5">
                        {currentConfig?.cooldownMinutes || 10} Menit
                      </Badge>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={240}
                      step={1}
                      disabled={!isAuthenticated || !canConfigure}
                      value={currentConfig?.cooldownMinutes || 10}
                      onChange={(e) => {
                        const num = Number(e.target.value)
                        setFormConfig((prev) => prev ? { ...prev, cooldownMinutes: num } : null)
                      }}
                      className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Switches */}
                  <div className="pt-3 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-slate-200">Status Aktif Presensi Camera</Label>
                        <p className="text-xs text-slate-400">Nyalakan atau nonaktifkan pemrosesan stream secara global</p>
                      </div>
                      <Switch
                        disabled={!isAuthenticated || !canConfigure}
                        checked={currentConfig?.isActive ?? true}
                        onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, isActive: checked } : null)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-slate-200">Suara Sambutan Otomatis (*Voice Greeting*)</Label>
                        <p className="text-xs text-slate-400">Memberikan feedback audio saat presensi siswa/guru terdeteksi</p>
                      </div>
                      <Switch
                        disabled={!isAuthenticated || !canConfigure}
                        checked={currentConfig?.welcomeVoice ?? true}
                        onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, welcomeVoice: checked } : null)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          Tampilkan Live Stream di Halaman Publik (/presensi-view)
                        </Label>
                        <p className="text-xs text-slate-400">Mengizinkan tamu/pengguna melihat live stream video di portal presensi umum</p>
                      </div>
                      <Switch
                        disabled={!isAuthenticated || !canConfigure}
                        checked={currentConfig?.showPublicStream ?? true}
                        onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, showPublicStream: checked } : null)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          Tampilkan Scanner Log Realtime di Halaman Publik (/presensi-view)
                        </Label>
                        <p className="text-xs text-slate-400">Menampilkan feed hasil pencatatan presensi di portal presensi umum</p>
                      </div>
                      <Switch
                        disabled={!isAuthenticated || !canConfigure}
                        checked={currentConfig?.showPublicLogs ?? true}
                        onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, showPublicLogs: checked } : null)}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    {saveSuccess ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Konfigurasi berhasil disimpan!
                      </span>
                    ) : !isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        Mode Lihat Saja: Pengubahan parameter stream hanya dapat dilakukan oleh Superadmin.
                      </span>
                    ) : null}
                  </div>
                  {isSuperAdmin ? (
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold text-xs"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => promptSuperadminAuth()} 
                      className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/40 gap-2 font-bold text-xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Buka Akses Edit (Login Superadmin)
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {/* Server Info Card */}
              <div className="space-y-6">
                <Card className="shadow-sm border-slate-800 bg-slate-900/90 text-white">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-indigo-400" />
                        AI Microservice
                      </span>
                      <Badge className={serviceStatus?.isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'}>
                        {serviceStatus?.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Status Worker:</span>
                      <span className="font-semibold text-slate-200">
                        {serviceStatus?.is_running ? 'STREAMING (ACTIVE)' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Arsitektur AI:</span>
                      <span className="font-semibold text-slate-200">FaceNet (512-D) + MTCNN</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Mode Komputasi:</span>
                      <span className="font-semibold text-emerald-400">CPU Eco Mode</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800 text-xs">
                      <span className="text-slate-400">Kendali Daya:</span>
                      <span className="font-semibold text-indigo-400">Khusus Superadmin</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-xs">
                      <span className="text-slate-400">Total Scan Hari Ini:</span>
                      <span className="font-bold text-indigo-400">{serviceStatus?.total_scans_today || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-indigo-900/60 bg-indigo-950/30 text-indigo-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-indigo-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Otoritas & Keamanan Akses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs leading-relaxed space-y-2 text-indigo-300/90">
                    <p>
                      • Tautan halaman <code className="bg-indigo-900/40 px-1 py-0.5 rounded font-mono">/facenetai</code> ini bersifat <strong>direct link</strong> (hanya yang mengetahui tautan yang dapat membukanya).
                    </p>
                    <p>
                      • Otoritas untuk <strong>menyalakan atau mematikan AI microservice</strong> secara ketat dibatasi untuk akun <strong>SUPERADMIN</strong> dan <strong>ADMIN_IT</strong> setelah melakukan login.
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
            <Card className="shadow-sm border-slate-800 bg-slate-900/90 text-white">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-400" />
                      Basis Data Deteksi Wajah (Foto Profil Pengguna)
                    </CardTitle>
                    {!isSuperAdmin && (
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/80 bg-amber-950/40">
                        Mode Lihat Saja
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-400">
                    Sistem AI mencocokkan wajah kamera secara langsung dengan foto profil siswa, guru, dan karyawan.
                  </CardDescription>
                </div>
                {isSuperAdmin ? (
                  <Button onClick={handleSyncDatabase} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 self-start shrink-0 font-bold text-xs">
                    <RefreshCw className="w-4 h-4" />
                    Sinkronkan Vektor Wajah
                  </Button>
                ) : (
                  <Button 
                    onClick={() => promptSuperadminAuth()} 
                    className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/40 gap-1.5 self-start shrink-0 font-bold text-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Buka Akses Sinkronisasi
                  </Button>
                )}
              </CardHeader>
                <CardContent className="space-y-6">
                  {syncSuccessMsg && (
                    <div className="p-4 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium">{syncSuccessMsg}</span>
                    </div>
                  )}

                  {/* Filter Dataset */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <Input
                        placeholder="Cari berdasarkan nama, NIS, NIP, kelas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                      {(['ALL', 'SISWA', 'GURU', 'PEGAWAI'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            roleFilter === r
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {r === 'ALL' ? 'Semua Peran' : r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto">
                    {filteredUsers.slice(0, 120).map((user) => (
                      <div key={user.userId} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center space-y-1.5">
                        <div className="w-12 h-12 rounded-xl mx-auto overflow-hidden bg-slate-700 flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-400">{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{user.identifier}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          </div>
        )}

        {/* TAB 4: RIWAYAT LOG LENGKAP */}
        {activeTab === 'logs' && (
          <Card className="shadow-sm border-slate-800 bg-slate-900/90 text-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Riwayat Log Scan Wajah</CardTitle>
                <CardDescription className="text-slate-400">
                  {logFilterMode === 'TODAY' 
                    ? `Menampilkan pencatatan presensi biometrik hari ini (${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})`
                    : 'Menampilkan seluruh arsip pencatatan presensi biometrik'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Toggle Filter Hari Ini vs Semua */}
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLogFilterMode('TODAY')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      logFilterMode === 'TODAY'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilterMode('ALL')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      logFilterMode === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua Arsip
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetchLogs()} className="border-slate-700 text-slate-300">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Segarkan
                </Button>
                {isSuperAdmin ? (
                  <Button variant="destructive" size="sm" onClick={handleConfirmClearLogs}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Reset Semua
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => promptSuperadminAuth()} 
                    className="border-amber-700/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 text-xs"
                  >
                    <Lock className="w-3 h-3 mr-1" /> Otoritas Reset
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Bar Log */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Cari berdasarkan nama, NIS/NIP, atau peran..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3">Nama</th>
                      <th className="py-2.5 px-3">Peran / ID</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Kemiripan</th>
                      <th className="py-2.5 px-3">Titik Kamera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {displayedLogs && displayedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          {logFilterMode === 'TODAY' 
                            ? 'Belum ada data scan presensi wajah untuk hari ini.' 
                            : 'Tidak ada data log yang sesuai pencarian.'}
                        </td>
                      </tr>
                    ) : (
                      displayedLogs?.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono text-slate-300">
                            <div className="flex flex-col">
                              <span className="font-sans font-semibold text-slate-300 text-[11px]">{log.dateFormatted || log.date}</span>
                              <span className="font-bold text-slate-400">{log.timestamp}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-semibold text-white">{log.userName}</td>
                          <td className="py-2 px-3 text-slate-400">{log.userRole} ({log.identifier})</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.scanType === 'MASUK' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                            }`}>
                              {log.scanType}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-indigo-400">{Math.round(log.confidence * 100)}%</td>
                          <td className="py-2 px-3 text-slate-400">{log.cameraName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
