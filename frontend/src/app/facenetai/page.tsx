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
  EyeOff,
  Volume2,
  VolumeX,
  Scan,
  Aperture,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle
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

  // State Mode Capture Presensi AI & Feedback
  const [scanMode, setScanMode] = useState<'MANUAL' | 'AUTO'>('MANUAL')
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentClock, setCurrentClock] = useState<string>('')
  const [currentDateStr, setCurrentDateStr] = useState<string>('')
  const [greetingText, setGreetingText] = useState<string>('Selamat Datang')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setCurrentDateStr(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
      const hour = now.getHours()
      if (hour >= 5 && hour < 11) setGreetingText('Selamat Pagi')
      else if (hour >= 11 && hour < 15) setGreetingText('Selamat Siang')
      else if (hour >= 15 && hour < 18) setGreetingText('Selamat Sore')
      else setGreetingText('Selamat Malam')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const [captureResult, setCaptureResult] = useState<{
    type: 'SUCCESS' | 'UNKNOWN' | 'NO_FACE' | 'ERROR' | 'TWIN_AMBIGUOUS'
    name?: string
    role?: string
    identifier?: string
    avatarUrl?: string | null
    confidence?: number
    scanType?: string
    message: string
    attendanceMsg?: string
    time?: string
    twinCandidates?: Array<{
      userId: string
      name: string
      role: string
      identifier: string
      avatarUrl?: string | null
      confidence?: number
    }>
  } | null>(null)
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | null>(null)
  const autoClearTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Sintesis Audio Biometrik Realtime tanpa ketergantungan file eksternal (Web Audio API)
  const playBiometricAudio = (type: 'shutter' | 'success' | 'warning') => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (type === 'shutter') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.09)
      } else if (type === 'success') {
        const now = ctx.currentTime
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(587.33, now) // D5
        osc2.frequency.setValueAtTime(880, now + 0.09) // A5
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.12)
        osc2.start(now + 0.09)
        osc2.stop(now + 0.45)
      } else if (type === 'warning') {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(320, now)
        osc.frequency.setValueAtTime(220, now + 0.12)
        gain.gain.setValueAtTime(0.18, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.3)
      }
    } catch {}
  }

  // Konfirmasi Presensi Siswa Kembar / Wajah Mirip secara Instan (1 Ketukan)
  const handleConfirmTwinAttendance = async (candidate: any) => {
    try {
      setIsCapturing(true)
      const res = await authenticatedFetch('/api-backend/face-attendance/confirm-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: candidate.userId, confidence: candidate.confidence || 0.95 }),
      })
      if (res.ok) {
        const data = await res.json()
        playBiometricAudio('success')
        setCaptureResult({
          type: 'SUCCESS',
          name: candidate.name,
          role: candidate.role,
          identifier: candidate.identifier,
          avatarUrl: candidate.avatarUrl,
          confidence: Math.round((candidate.confidence || 0.95) * 100),
          scanType: data?.attendance?.scanType || 'HADIR',
          message: 'Wajah Terverifikasi!',
          attendanceMsg: data?.message || 'Presensi berhasil dicatat!',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })
        toast.success(`Presensi Berhasil: ${candidate.name}`)
        queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
        queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      } else {
        toast.error('Gagal mengonfirmasi presensi.')
      }
    } catch (err) {
      toast.error('Kendala jaringan saat konfirmasi presensi.')
    } finally {
      setIsCapturing(false)
    }
  }

  // Fungsi Eksekusi Capture & Verifikasi Presensi Wajah
  const executeFaceCapture = async () => {
    if (isCapturing) return
    const video = localVideoRef.current
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      toast.error('Kamera belum siap. Pastikan preview webcam aktif.')
      return
    }

    setIsCapturing(true)
    setCaptureFlash(true)
    playBiometricAudio('shutter')
    setTimeout(() => setCaptureFlash(false), 180)

    if (autoClearTimeoutRef.current) {
      clearTimeout(autoClearTimeoutRef.current)
      autoClearTimeoutRef.current = null
    }

    try {
      const offscreen = document.createElement('canvas')
      const scale = Math.min(1.0, 640 / video.videoWidth)
      offscreen.width = Math.round(video.videoWidth * scale)
      offscreen.height = Math.round(video.videoHeight * scale)
      const ctx = offscreen.getContext('2d')
      if (!ctx) throw new Error('Context canvas tidak tersedia')

      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height)
      const base64 = offscreen.toDataURL('image/jpeg', 0.80)
      setCapturedSnapshotUrl(base64)

      const res = await authenticatedFetch('/api-backend/face-attendance/scan-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`)
      }

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
        const minThresh = currentConfig?.threshold || 0.70
        const registeredFace = rawFaces.find((f: any) => f.is_registered && (f.confidence || 0) >= minThresh)
        if (registeredFace) {
          // Kasus Siswa Kembar / Wajah Mirip yang memerlukan verifikasi cepat
          if (registeredFace.is_twin_ambiguous && registeredFace.twin_candidates && registeredFace.twin_candidates.length > 1) {
            playBiometricAudio('warning')
            setCaptureResult({
              type: 'TWIN_AMBIGUOUS',
              name: registeredFace.name,
              role: registeredFace.role,
              identifier: registeredFace.identifier,
              confidence: Math.round(registeredFace.confidence * 100),
              message: 'Wajah Mirip / Siswa Kembar Terdeteksi',
              attendanceMsg: 'Silakan ketuk nama Anda di bawah untuk konfirmasi:',
              twinCandidates: registeredFace.twin_candidates,
            })
            toast.info('Wajah mirip terdeteksi. Silakan ketuk nama Anda untuk konfirmasi.')
          } else {
            playBiometricAudio('success')
            const att = registeredFace.attendance
            const attMsg = att?.message || `Presensi berhasil diverifikasi (${Math.round(registeredFace.confidence * 100)}%)`
            
            setCaptureResult({
              type: 'SUCCESS',
              name: registeredFace.name,
              role: registeredFace.role,
              identifier: registeredFace.identifier,
              avatarUrl: registeredFace.avatarUrl,
              confidence: Math.round(registeredFace.confidence * 100),
              scanType: att?.scanType || 'HADIR',
              message: 'Wajah Terverifikasi!',
              attendanceMsg: attMsg,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            })

            toast.success(`Presensi Berhasil: ${registeredFace.name} (${Math.round(registeredFace.confidence * 100)}%)`)
            queryClient.invalidateQueries({ queryKey: ['face-attendance-logs'] })
            queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
          }
        } else {
          playBiometricAudio('warning')
          setCaptureResult({
            type: 'UNKNOWN',
            message: 'Wajah Belum Terdaftar',
            attendanceMsg: 'Wajah terdeteksi namun belum cocok dengan database pengguna SIMASMUH.',
          })
          toast.warning('Wajah tidak dikenali atau belum terdaftar di dataset profil.')
        }
      } else {
        playBiometricAudio('warning')
        setCaptureResult({
          type: 'NO_FACE',
          message: 'Wajah Tidak Terdeteksi',
          attendanceMsg: 'Pastikan wajah menghadap langsung ke kamera dengan pencahayaan yang cukup.',
        })
        toast.info('Wajah tidak terdeteksi. Posisikan wajah di dalam bingkai.')
      }
    } catch (err: any) {
      playBiometricAudio('warning')
      setCaptureResult({
        type: 'ERROR',
        message: 'Gagal Memproses Snapshot',
        attendanceMsg: 'Terjadi kendala jaringan atau layanan AI FaceNet sedang offline.',
      })
      toast.error('Gagal memproses snapshot kamera ke AI FaceNet.')
    } finally {
      setIsCapturing(false)
      autoClearTimeoutRef.current = setTimeout(() => {
        setCaptureResult(null)
        setCapturedSnapshotUrl(null)
        const canvas = overlayCanvasRef.current
        if (canvas) {
          const cCtx = canvas.getContext('2d')
          if (cCtx) cCtx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }, 5000)
    }
  }

  // Keyboard shortcut: Tombol Space / Enter untuk capture instan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'monitor') return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        executeFaceCapture()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, isCapturing, isBrowserCamStreaming, scanMode])

  // Periodic frame scanning HANYA saat Mode Auto-Scan diaktifkan (Mode Manual = 0 request latar belakang)
  useEffect(() => {
    if (!isBrowserCamStreaming || scanMode !== 'AUTO') return
    let isProcessing = false
    let frameCount = 0
    let lastTime = Date.now()

    const interval = setInterval(async () => {
      if (isProcessing || isCapturing || !localVideoRef.current || !overlayCanvasRef.current) return
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
              await new Promise((r) => setTimeout(r, 2000))
            } else {
              await new Promise((r) => setTimeout(r, 400))
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
    }, 250)

    return () => clearInterval(interval)
  }, [isBrowserCamStreaming, scanMode, isCapturing])

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
    <div className="min-h-screen lg:h-screen lg:max-h-screen flex flex-col relative text-slate-100 bg-slate-950 overflow-x-hidden lg:overflow-hidden font-sans select-none">
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        <NextImage
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105 opacity-20"
        />
      </div>
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-[6px] -z-20" />

      {/* TOPBAR / HEADER KOMPAK TERTATA (Height: ~50px) */}
      <header className="shrink-0 px-3 sm:px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-30 shadow-md">
        {/* Kiri: Identitas Sekolah & Link Beranda */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link 
            href="/"
            title="Kembali ke Beranda Utama"
            className="w-8 h-8 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 flex items-center justify-center shrink-0 transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-ping" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                PRESENSI BIOMETRIK AI
              </h1>
              <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                512-D BLAS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              SMA MUHAMMADIYAH 1 PONOROGO
            </p>
          </div>
        </div>

        {/* Tengah: 4 Tab Navigasi Terpadu */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950/90 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-1.5 py-1 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'monitor' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Live Monitor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 py-1 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'config' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Konfigurasi Stream</span>
            {!isSuperAdmin && (
              <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dataset')}
            className={`flex items-center gap-1.5 py-1 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'dataset' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Dataset Profil</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 py-1 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Riwayat Log</span>
            {logsData && logsData.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-300 font-mono">
                {logsData.length}
              </span>
            )}
          </button>
        </div>

        {/* Kanan: Ringkasan Presensi, Jam Digital, & Status AI */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Badge Statistik Cepat */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Masuk: {logStats.masuk}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-[11px] font-bold text-blue-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Pulang: {logStats.pulang}</span>
            </div>
            <div className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-400" />
              <span>Total: {logStats.total}</span>
            </div>
          </div>

          {/* Jam Digital Ringkas */}
          <div className="px-2.5 py-0.5 bg-slate-950/90 rounded-xl border border-indigo-500/30 text-center font-mono space-y-0 min-w-[110px]">
            <div className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 animate-pulse">
              {currentClock || '--:--:--'}
            </div>
            <div className="text-[9px] font-medium text-slate-400 truncate">
              {currentDateStr || 'Memuat Waktu...'}
            </div>
          </div>

          {/* AI Status Pill & Power Button */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              serviceStatus?.isOnline && serviceStatus?.is_running ? 'bg-emerald-400 animate-ping' : serviceStatus?.isOnline ? 'bg-amber-400' : 'bg-slate-500'
            }`} />
            <span className="font-bold text-[10px] sm:text-[11px] text-slate-200 hidden lg:inline">
              {serviceStatus?.isOnline ? (serviceStatus.is_running ? 'AI AKTIF' : 'STANDBY') : 'OFFLINE'}
            </span>
            {isAuthenticated && isSuperAdmin ? (
              <button
                type="button"
                onClick={() => serviceStatus?.is_running ? stopServiceWorker() : startServiceWorker()}
                disabled={isStartingWorker || isStoppingWorker}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ml-0.5 cursor-pointer ${
                  serviceStatus?.is_running 
                    ? 'bg-rose-500/30 text-rose-300 hover:bg-rose-500/50' 
                    : 'bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/50'
                }`}
              >
                <Power className="w-3 h-3 inline mr-0.5" />
                {serviceStatus?.is_running ? 'Off' : 'On'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => promptSuperadminAuth(() => startServiceWorker())}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white ml-0.5 cursor-pointer"
              >
                <Power className="w-3 h-3 inline mr-0.5" /> Start
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (Fit 100vh on 1080p Desktop) */}
      <main className="flex-1 min-h-0 w-full p-2 sm:p-2.5 flex flex-col gap-1.5 overflow-hidden">
        {/* TAB 1: LIVE MONITOR & SCANNER LOG */}
        {activeTab === 'monitor' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
            {/* KIRI: VIDEO STREAM 16:9 + ACTION CAPTURE PANEL (7 COLS) */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl">
              {/* Header Stream Bar (Compact) */}
              <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-2.5 w-2.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {currentConfig?.cameraName || 'Kamera Gerbang Depan'}
                  </span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-slate-700 text-indigo-300 font-mono shrink-0">
                    {currentConfig?.streamSourceType || 'RTSP'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                    {currentConfig?.location || 'Gerbang Utama'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isBrowserMode && videoDevices.length > 1 && (
                    <select
                      aria-label="Pilih Perangkat Kamera"
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value)
                        startBrowserWebcam(e.target.value)
                      }}
                      className="h-6 text-[10px] bg-slate-800 text-slate-200 border border-slate-700 rounded px-1 max-w-[120px] truncate"
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
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-6 w-6 p-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    title="Layar Penuh"
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-6 w-6 p-0"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Video Box Canvas (Expands to fill 100% available viewport height) */}
              <div 
                ref={videoContainerRef}
                onClick={() => {
                  if (isBrowserMode && isBrowserCamStreaming && !isCapturing && !captureResult) {
                    executeFaceCapture()
                  }
                }}
                className="flex-1 min-h-0 relative w-full bg-black flex items-center justify-center overflow-hidden group select-none cursor-pointer"
                title="Sentuh Layar / Tekan Tombol untuk Scan Wajah"
              >
                {/* Shutter Flash Visual Animation Effect */}
                {captureFlash && (
                  <div className="absolute inset-0 bg-white/95 z-40 pointer-events-none transition-opacity duration-150" />
                )}

                {isBrowserMode ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-contain ${capturedSnapshotUrl ? 'hidden' : 'block'}`}
                      onPlay={() => setIsBrowserCamStreaming(true)}
                    />
                    {capturedSnapshotUrl && (
                      <img
                        src={capturedSnapshotUrl}
                        alt="Captured Freeze Frame"
                        className="w-full h-full object-contain select-none"
                      />
                    )}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none object-contain z-10"
                    />

                    {/* Biometric Framing Guide (Idle State) */}
                    {!isCapturing && !captureResult && isBrowserCamStreaming && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                        {/* Face Oval Framing Target */}
                        <div className="relative w-40 h-52 sm:w-48 sm:h-60 rounded-[50%/45%] border-2 border-dashed border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] flex items-center justify-center animate-pulse">
                          <div className="absolute -top-2.5 -left-2.5 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                          <div className="absolute -top-2.5 -right-2.5 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                          <div className="absolute -bottom-2.5 -left-2.5 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                          <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                          <div className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_#34d399]" />
                        </div>
                        
                        <div className="mt-3 px-3.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-emerald-500/40 text-[11px] sm:text-xs font-bold text-emerald-300 flex items-center gap-1.5 shadow-xl">
                          <Aperture className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          <span>Posisikan Wajah & Sentuh Tombol Scan</span>
                        </div>
                      </div>
                    )}

                    {/* Laser Scanner Animation saat Memproses Frame */}
                    {isCapturing && (
                      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce top-1/3" />
                        
                        <div className="px-4 py-2 rounded-2xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl text-center space-y-1">
                          <div className="flex items-center justify-center gap-2 text-cyan-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs sm:text-sm font-extrabold tracking-wide">Menganalisis Biometrik FaceNet...</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">Pencocokan Cepat BLAS Matrix Vector</p>
                        </div>
                      </div>
                    )}

                    {/* Floating Result Feedback HUD Card */}
                    {captureResult && (
                      <div className="absolute inset-x-2 sm:inset-x-3 bottom-2 z-30 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
                        {captureResult.type === 'TWIN_AMBIGUOUS' ? (
                          <div className="p-3 rounded-2xl bg-slate-950/95 border-2 border-amber-500/80 shadow-2xl backdrop-blur-2xl text-white space-y-2">
                            <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 pb-1.5">
                              <div className="flex items-center gap-1.5 text-amber-400">
                                <AlertTriangle className="w-4 h-4 animate-bounce" />
                                <div>
                                  <h3 className="text-xs font-extrabold text-amber-300">Deteksi Siswa Kembar / Wajah Mirip</h3>
                                  <p className="text-[10px] text-slate-300">Ketuk nama Anda untuk memverifikasi:</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCaptureResult(null)
                                  setCapturedSnapshotUrl(null)
                                }}
                                className="h-6 text-[10px] text-slate-400 hover:text-white"
                              >
                                Tutup
                              </Button>
                            </div>

                            {/* Twin candidate list */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {captureResult.twinCandidates?.map((cand, cIdx) => (
                                <button
                                  key={cand.userId || cIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConfirmTwinAttendance(cand)
                                  }}
                                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 hover:bg-indigo-950/80 border border-slate-700 hover:border-emerald-500 text-left transition-all cursor-pointer"
                                >
                                  <div className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                                    {cand.avatarUrl ? (
                                      <img src={cand.avatarUrl} alt={cand.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="font-extrabold text-slate-300 text-xs">{cand.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white truncate">{cand.name}</p>
                                    <p className="text-[9px] text-slate-400 font-mono">{cand.role} • {cand.identifier}</p>
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 mt-0.5">
                                      <CheckCircle className="w-2.5 h-2.5" /> Ketuk Presensi
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className={`p-3 rounded-2xl backdrop-blur-2xl border-2 shadow-2xl transition-all duration-200 ${
                            captureResult.type === 'SUCCESS' 
                              ? 'bg-slate-950/95 border-emerald-500 shadow-emerald-950/70' 
                              : captureResult.type === 'UNKNOWN' 
                                ? 'bg-slate-950/95 border-amber-500 shadow-amber-950/70' 
                                : 'bg-slate-950/95 border-rose-500 shadow-rose-950/70'
                          }`}>
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-lg ${
                                  captureResult.type === 'SUCCESS'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/50'
                                    : captureResult.type === 'UNKNOWN'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-400/50'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-400/50'
                                }`}>
                                  {captureResult.type === 'SUCCESS' ? (
                                    <CheckCircle className="w-6 h-6" />
                                  ) : captureResult.type === 'UNKNOWN' ? (
                                    <AlertTriangle className="w-6 h-6" />
                                  ) : (
                                    <AlertCircle className="w-6 h-6" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  {captureResult.type === 'SUCCESS' ? (
                                    <>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h3 className="text-xs sm:text-sm font-black text-white truncate">{captureResult.name}</h3>
                                        <Badge className="bg-emerald-500/25 text-emerald-300 border-emerald-400/40 text-[10px] py-0 px-1.5 font-mono font-bold">
                                          {captureResult.confidence}% Akurat
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-700 text-slate-300">
                                          {captureResult.role} {captureResult.identifier ? `• ${captureResult.identifier}` : ''}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-emerald-300 font-bold mt-0.5 truncate">
                                        {captureResult.attendanceMsg}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <h3 className={`text-xs sm:text-sm font-bold ${
                                        captureResult.type === 'UNKNOWN' ? 'text-amber-300' : 'text-rose-300'
                                      }`}>
                                        {captureResult.message}
                                      </h3>
                                      <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                                        {captureResult.attendanceMsg}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCaptureResult(null)
                                    setCapturedSnapshotUrl(null)
                                    const canvas = overlayCanvasRef.current
                                    if (canvas) {
                                      const cCtx = canvas.getContext('2d')
                                      if (cCtx) cCtx.clearRect(0, 0, canvas.width, canvas.height)
                                    }
                                  }}
                                  className="h-7 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2"
                                >
                                  Tutup
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCapturedSnapshotUrl(null)
                                    executeFaceCapture()
                                  }}
                                  disabled={isCapturing}
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-md rounded-lg px-2.5 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Scan Lagi</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {browserCamError && (
                      <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-2 z-30 pointer-events-auto">
                        <Camera className="w-8 h-8 text-rose-400 animate-pulse" />
                        <p className="text-xs font-bold text-white">Gagal Mengakses Webcam Browser</p>
                        <p className="text-[11px] text-slate-300 max-w-sm">{browserCamError}</p>
                        <Button size="sm" onClick={() => startBrowserWebcam()} className="bg-indigo-600 text-white text-xs h-7">
                          <RefreshCw className="w-3 h-3 mr-1" /> Coba Lagi
                        </Button>
                      </div>
                    )}
                  </div>
                ) : !streamError && serviceStatus?.is_running ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {isStreamLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[11px] text-slate-300 font-medium">Menghubungkan Sinyal Kamera...</span>
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
                  <div className="text-center p-4 space-y-2 max-w-md select-none z-10 pointer-events-auto">
                    <div className="w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                      <Video className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-200">
                        {serviceStatus?.isOnline 
                          ? (serviceStatus?.is_running ? 'Menghubungkan Sinyal Kamera...' : 'AI FaceNet Standby') 
                          : 'Microservice AI FaceNet Standby / Offline'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {serviceStatus?.is_running 
                          ? 'Menunggu sinyal frame aktif dari kamera...'
                          : 'Nyalakan AI atau pilih Webcam Browser untuk memulai streaming deteksi.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 pt-1">
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
                          className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5"
                        >
                          <Power className="w-3 h-3 mr-1" /> Nyalakan AI
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReconnectStream}
                        className="h-6 text-[11px] border-slate-700 text-slate-300 hover:text-white bg-slate-800/80 px-2"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Hubungkan Ulang
                      </Button>
                    </div>
                  </div>
                )}

                {/* HUD Badges */}
                <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[9px] font-mono text-emerald-400 border border-emerald-500/30 z-20 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>{isBrowserMode ? `WEBCAM (${browserFps} FPS)` : currentConfig?.streamSourceType || 'DIRECT STREAM'}</span>
                </div>

                <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[9px] font-mono text-slate-300 border border-white/10 z-20 shadow-md">
                  <span className={scanMode === 'MANUAL' ? 'text-teal-300 font-bold' : 'text-amber-300 font-bold'}>
                    {scanMode === 'MANUAL' ? 'MODE MANUAL' : 'AUTO-SCAN'}
                  </span>
                </div>

                <div className="absolute bottom-2 right-2 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-xs text-[9px] font-mono text-slate-300 border border-white/10 z-20 shadow-md">
                  <span>Threshold: {Math.round((currentConfig?.threshold || 0.70) * 100)}%</span>
                  <span>•</span>
                  <span>Cooldown: {currentConfig?.cooldownMinutes || 10}m</span>
                </div>
              </div>

              {/* ACTION BUTTON BAR (Compact ~50px) */}
              <div className="p-2 sm:p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => executeFaceCapture()}
                  disabled={isCapturing || !isBrowserCamStreaming}
                  className="flex-1 h-11 text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-950/60 gap-2 border border-emerald-400/40 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menganalisis Biometrik Wajah...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 animate-pulse text-emerald-200" />
                      <span>SENTUH UNTUK SCAN WAJAH</span>
                      <span className="hidden sm:inline-block ml-1 text-[9px] font-mono font-normal px-2 py-0.5 rounded bg-black/40 border border-white/20">
                        SPASI / ENTER
                      </span>
                    </>
                  )}
                </Button>

                {/* Mode Manual/Auto switcher */}
                <div className="inline-flex p-0.5 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setScanMode('MANUAL')}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      scanMode === 'MANUAL' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mode Manual: Scan saat tombol ditekan"
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('AUTO')}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      scanMode === 'AUTO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mode Auto: Scan berkala otomatis"
                  >
                    Auto
                  </button>
                </div>

                {/* Sound toggle button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`h-9 px-2.5 rounded-xl border-slate-800 cursor-pointer ${
                    soundEnabled ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-950'
                  }`}
                  title={soundEnabled ? 'Audio Aktif' : 'Audio Senyap'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* KANAN: REALTIME SCANNER LOGS LIST (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl">
              {/* Log Header */}
              <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Scanner Log Realtime</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 animate-pulse">
                    Live Sync
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLogFilterMode('TODAY')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        logFilterMode === 'TODAY' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilterMode('ALL')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        logFilterMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => refetchLogs()} title="Segarkan Log" className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  {isSuperAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleConfirmClearLogs}
                      disabled={isClearing}
                      title="Reset Seluruh Log Hari Ini"
                      className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => promptSuperadminAuth(() => handleConfirmClearLogs())}
                      title="Otoritas Superadmin"
                      className="h-6 w-6 p-0 text-slate-500 hover:text-amber-400"
                    >
                      <Lock className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable Live Scan List */}
              <div className="p-2.5 flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar">
                {displayedLogs && displayedLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 border border-slate-800">
                      <Camera className="w-5 h-5 stroke-1" />
                    </div>
                    <p className="text-xs font-bold text-slate-200">Belum Ada Presensi Hari Ini</p>
                    <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                      Arahkan wajah ke depan kamera. Hasil identifikasi dan foto snapshot kamera akan otomatis muncul di sini.
                    </p>
                  </div>
                ) : (
                  displayedLogs?.map((log, index) => (
                    <div 
                      key={log.id} 
                      className={`p-2.5 rounded-xl transition-all border ${
                        index === 0 
                          ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-indigo-950/30 border-indigo-700/60 shadow-sm ring-1 ring-indigo-400/20' 
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Header: User identity & Scan status */}
                      <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-800/80">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-extrabold text-white truncate">{log.userName}</h4>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              log.userRole?.includes('SISWA') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                              log.userRole?.includes('GURU') ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                              'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {log.userRole}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            ID: {log.identifier}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold py-0.5 px-2 rounded-full ${
                              log.scanType === 'MASUK' 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                : log.scanType === 'PULANG' 
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800' 
                                  : 'bg-slate-800 text-slate-300'
                            }`}>
                              <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                              {log.scanType}
                            </span>
                            <p className="text-[10px] font-mono font-bold text-slate-300 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                              <span className="text-[9px] font-semibold text-slate-400">{log.dateFormatted || log.date}</span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {log.timestamp}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Visual Comparison Box */}
                      <div className="py-1.5 grid grid-cols-2 gap-2 items-center">
                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                            {log.avatarUrl ? (
                              <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-extrabold text-slate-400 text-[10px]">{log.userName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Database</span>
                            <p className="text-[10px] font-semibold text-slate-200 truncate">Foto Profil</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/60 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-950 overflow-hidden shrink-0 border border-emerald-700 flex items-center justify-center">
                            {log.snapshotUrl ? (
                              <img src={log.snapshotUrl} alt="Snapshot Kamera" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider block">Realtime</span>
                            <p className="text-[10px] font-semibold text-emerald-200 truncate">Hasil Scan</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Matching Confidence Bar */}
                      <div className="pt-1 border-t border-slate-800/80 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Kemiripan AI:
                          </span>
                          <span className="font-extrabold text-indigo-400 font-mono">
                            {Math.round(log.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, log.confidence * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KONFIGURASI STREAM & PARAMETER (FIT 1 SCREEN 1080p) */}
        {activeTab === 'config' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
            {/* KIRI: FORM PENGATURAN KAMERA (7 COLS) */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl">
              {/* Header */}
              <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Parameter Kamera & Stream AI</span>
                </div>
                {!isSuperAdmin && (
                  <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Mode Lihat Saja
                  </span>
                )}
              </div>

              {/* Body: Form Controls */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {/* 1. Preset Sumber Kamera */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    Pilihan Sumber Kamera Aktif
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
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
                          className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs disabled:opacity-50 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md font-bold'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-700/60 text-slate-300'
                          }`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[11px]">{preset.title}</p>
                            <p className="text-[9px] text-slate-400 truncate">{preset.badge}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Dynamic Input sesuai Preset */}
                {currentConfig?.streamSourceType === 'BROWSER_WEBCAM' && (
                  <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-200">Kamera Web Browser Lokal (Client)</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          startBrowserWebcam(selectedDeviceId)
                          toast.success('Memuat ulang webcam...')
                        }}
                        className="h-6 text-[10px] border-indigo-700 bg-indigo-900/60 text-indigo-200 hover:text-white px-2"
                      >
                        <RefreshCw className="w-2.5 h-2.5 mr-1" /> Segarkan
                      </Button>
                    </div>
                    {videoDevices.length > 0 ? (
                      <select
                        value={selectedDeviceId}
                        disabled={!isAuthenticated || !canConfigure}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value)
                          startBrowserWebcam(e.target.value)
                        }}
                        className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {videoDevices.map((dev, idx) => (
                          <option key={dev.deviceId || idx} value={dev.deviceId}>
                            {dev.label || `Kamera #${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                        <span>Menggunakan Kamera Default</span>
                        <button
                          type="button"
                          onClick={() => startBrowserWebcam()}
                          className="text-indigo-400 hover:text-indigo-300 font-bold"
                        >
                          Deteksi Kamera
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {currentConfig?.streamSourceType === 'WEBCAM' && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="streamUrl" className="text-xs font-semibold text-slate-200">
                        Indeks Port USB Kamera Server
                      </Label>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        OpenCV USB
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="streamUrl"
                        type="text"
                        placeholder="0, 1, 2, atau /dev/video0"
                        value={currentConfig?.streamUrl || '0'}
                        disabled={!isAuthenticated || !canConfigure}
                        onChange={(e) => setFormConfig((prev) => prev ? { ...prev, streamUrl: e.target.value } : null)}
                        className="font-mono text-xs bg-slate-800 border-slate-700 text-white h-8 flex-1"
                      />
                      <div className="inline-flex gap-1">
                        {['0', '1', '2'].map((idxVal) => (
                          <button
                            key={idxVal}
                            type="button"
                            disabled={!isAuthenticated || !canConfigure}
                            onClick={() => setFormConfig((prev) => prev ? { ...prev, streamUrl: idxVal } : null)}
                            className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                              currentConfig?.streamUrl === idxVal
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            Port {idxVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {currentConfig?.streamSourceType === 'RTSP' && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="streamUrl" className="text-xs font-semibold text-slate-200">
                        Target Link RTSP IP Camera
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowStreamUrl(!showStreamUrl)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        {showStreamUrl ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showStreamUrl ? 'Sembunyikan' : 'Tampilkan'}
                      </button>
                    </div>
                    <Input
                      id="streamUrl"
                      type={showStreamUrl ? 'text' : 'password'}
                      placeholder="rtsp://user:pass@192.168.1.64:554/ch1"
                      value={currentConfig?.streamUrl || ''}
                      disabled={!isAuthenticated || !canConfigure}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, streamUrl: e.target.value } : null)}
                      className="font-mono text-xs bg-slate-800 border-slate-700 text-white h-8"
                    />
                  </div>
                )}

                {/* 3. Nama Titik Kamera & Lokasi (2 Kolom) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="cameraName" className="text-[11px] font-medium text-slate-200">Nama Titik Kamera</Label>
                    <Input
                      id="cameraName"
                      placeholder="Camera Gerbang Utama"
                      value={currentConfig?.cameraName || ''}
                      disabled={!isAuthenticated || !canConfigure}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, cameraName: e.target.value } : null)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-[11px] font-medium text-slate-200">Lokasi / Area</Label>
                    <Input
                      id="location"
                      placeholder="Gerbang Depan Sekolah"
                      value={currentConfig?.location || ''}
                      disabled={!isAuthenticated || !canConfigure}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, location: e.target.value } : null)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                    />
                  </div>
                </div>

                {/* 4. Threshold Range Slider */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] font-semibold text-slate-200">
                      Batas Sensitivitas Presensi (Threshold)
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-bold text-indigo-400 border-indigo-800 bg-indigo-950/50 px-2 py-0.2">
                      {Math.round((currentConfig?.threshold || 0.70) * 100)}%
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={95}
                    step={1}
                    disabled={!isSuperAdmin}
                    value={Math.round((currentConfig?.threshold || 0.70) * 100)}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormConfig((prev) => prev ? { ...prev, threshold: num / 100 } : null)
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>30% (Sensitif)</span>
                    <span className="text-indigo-400 font-bold">Default: 70%</span>
                    <span>95% (Ketat)</span>
                  </div>
                </div>

                {/* 5. Cooldown Range Slider */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <Label className="text-[11px] font-semibold text-slate-200">
                      Jeda Cooldown Presensi (Anti-Spam)
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-bold text-indigo-400 border-indigo-800 bg-indigo-950/50 px-2 py-0.2">
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
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Footer: Save Button */}
              <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div>
                  {saveSuccess ? (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan!
                    </span>
                  ) : !isSuperAdmin ? (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Superadmin diperlukan untuk menyimpan perubahan.
                    </span>
                  ) : null}
                </div>
                {isSuperAdmin ? (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold text-xs px-3.5 rounded-lg cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => promptSuperadminAuth()}
                    className="h-8 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/40 gap-1.5 font-bold text-xs px-3.5 rounded-lg cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Otorisasi Superadmin
                  </Button>
                )}
              </div>
            </div>

            {/* KANAN: STATUS LAYANAN & PENGATURAN TAMPILAN PUBLIK (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl">
              <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Status Layanan & Tampilan Publik</span>
                </div>
                <Badge className={serviceStatus?.isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] py-0' : 'bg-rose-950 text-rose-300 border-rose-800 text-[10px] py-0'}>
                  {serviceStatus?.isOnline ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {/* Switches Grid */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium text-slate-200">Status Aktif Presensi Kamera</Label>
                      <p className="text-[10px] text-slate-400">Aktifkan pemrosesan stream secara global</p>
                    </div>
                    <Switch
                      disabled={!isAuthenticated || !canConfigure}
                      checked={currentConfig?.isActive ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, isActive: checked } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <div>
                      <Label className="text-xs font-medium text-slate-200">Suara Sambutan (*Voice Greeting*)</Label>
                      <p className="text-[10px] text-slate-400">Feedback audio saat wajah terdeteksi</p>
                    </div>
                    <Switch
                      disabled={!isAuthenticated || !canConfigure}
                      checked={currentConfig?.welcomeVoice ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, welcomeVoice: checked } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <div>
                      <Label className="text-xs font-medium text-slate-200 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-400" />
                        Tampilkan Stream di /presensi-view
                      </Label>
                      <p className="text-[10px] text-slate-400">Live stream di portal presensi umum</p>
                    </div>
                    <Switch
                      disabled={!isAuthenticated || !canConfigure}
                      checked={currentConfig?.showPublicStream ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, showPublicStream: checked } : null)}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <div>
                      <Label className="text-xs font-medium text-slate-200 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        Tampilkan Scanner Log di /presensi-view
                      </Label>
                      <p className="text-[10px] text-slate-400">Feed log scan di portal umum</p>
                    </div>
                    <Switch
                      disabled={!isAuthenticated || !canConfigure}
                      checked={currentConfig?.showPublicLogs ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, showPublicLogs: checked } : null)}
                    />
                  </div>
                </div>

                {/* AI Microservice telemetry card */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                    <span className="text-slate-400">Status Worker:</span>
                    <span className="font-semibold text-slate-200">
                      {serviceStatus?.is_running ? 'STREAMING (ACTIVE)' : 'STANDBY'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                    <span className="text-slate-400">Arsitektur AI:</span>
                    <span className="font-semibold text-slate-200">FaceNet 512-D + MTCNN</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                    <span className="text-slate-400">Mode Komputasi:</span>
                    <span className="font-semibold text-emerald-400">CPU Eco Mode</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
                    <span className="text-slate-400">Total Scan Hari Ini:</span>
                    <span className="font-bold text-indigo-400">{serviceStatus?.total_scans_today || 0}</span>
                  </div>
                </div>

                {/* Quick Action Button for Dataset Sync */}
                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/60 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-indigo-200">Sinkronisasi Database Vektor</p>
                    <p className="text-[10px] text-indigo-400">Perbarui model 512-D dari foto profil terbaru</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSyncDatabase}
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Sync
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATASET PROFIL PENGGUNA */}
        {activeTab === 'dataset' && (
          <div className="flex-1 min-h-0 flex flex-col bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-3 gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Basis Data Deteksi Wajah (Foto Profil Pengguna)</span>
                {!isSuperAdmin && (
                  <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-800/80 bg-amber-950/40">
                    Lihat Saja
                  </Badge>
                )}
              </div>

              {isSuperAdmin ? (
                <Button onClick={handleSyncDatabase} className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold text-xs px-2.5 rounded-lg cursor-pointer">
                  <RefreshCw className="w-3 h-3" />
                  Sinkronkan Vektor
                </Button>
              ) : (
                <Button 
                  onClick={() => promptSuperadminAuth()} 
                  className="h-7 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/40 gap-1 font-bold text-xs px-2.5 rounded-lg cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  Otorisasi
                </Button>
              )}
            </div>

            {syncSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-2 text-xs shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {/* Filter Dataset */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Cari nama, NIS, NIP, kelas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-slate-800 border-slate-700 text-white text-xs h-7 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
                {(['ALL', 'SISWA', 'GURU', 'PEGAWAI'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                      roleFilter === r
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {r === 'ALL' ? 'Semua' : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 p-1 custom-scrollbar">
              {filteredUsers.slice(0, 120).map((user) => (
                <div key={user.userId} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center space-y-1">
                  <div className="w-10 h-10 rounded-xl mx-auto overflow-hidden bg-slate-700 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-200 truncate">{user.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono truncate">{user.identifier}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RIWAYAT LOG LENGKAP */}
        {activeTab === 'logs' && (
          <div className="flex-1 min-h-0 flex flex-col bg-slate-950/95 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-3 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div>
                <span className="text-xs font-bold text-white">Riwayat Log Scan Wajah</span>
                <p className="text-[10px] text-slate-400">
                  {logFilterMode === 'TODAY' 
                    ? `Pencatatan presensi hari ini (${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})`
                    : 'Seluruh arsip pencatatan presensi biometrik'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLogFilterMode('TODAY')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      logFilterMode === 'TODAY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilterMode('ALL')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      logFilterMode === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetchLogs()} className="h-6 text-[10px] border-slate-700 text-slate-300 px-2">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" /> Segarkan
                </Button>
                {isSuperAdmin ? (
                  <Button variant="destructive" size="sm" onClick={handleConfirmClearLogs} className="h-6 text-[10px] px-2">
                    <Trash2 className="w-2.5 h-2.5 mr-1" /> Reset
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => promptSuperadminAuth()} 
                    className="h-6 text-[10px] border-amber-700/60 bg-amber-950/20 text-amber-300 px-2"
                  >
                    <Lock className="w-2.5 h-2.5 mr-1" /> Otoritas
                  </Button>
                )}
              </div>
            </div>

            {/* Search Bar Log */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari berdasarkan nama, NIS/NIP, atau peran..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="pl-8 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500 h-7 rounded-lg"
              />
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto border border-slate-800 rounded-xl custom-scrollbar">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-mono sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3">Tanggal & Waktu</th>
                    <th className="py-2 px-3">Nama</th>
                    <th className="py-2 px-3">Peran / ID</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Kemiripan</th>
                    <th className="py-2 px-3">Titik Kamera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {displayedLogs && displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        {logFilterMode === 'TODAY' 
                          ? 'Belum ada data scan presensi wajah untuk hari ini.' 
                          : 'Tidak ada data log yang sesuai pencarian.'}
                      </td>
                    </tr>
                  ) : (
                    displayedLogs?.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-1.5 px-3 font-mono text-slate-300">
                          <div className="flex flex-col">
                            <span className="font-sans font-semibold text-slate-300 text-[10px]">{log.dateFormatted || log.date}</span>
                            <span className="font-bold text-slate-400 text-[10px]">{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-white">{log.userName}</td>
                        <td className="py-1.5 px-3 text-slate-400">{log.userRole} ({log.identifier})</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.scanType === 'MASUK' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                          }`}>
                            {log.scanType}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-mono text-indigo-400">{Math.round(log.confidence * 100)}%</td>
                        <td className="py-1.5 px-3 text-slate-400">{log.cameraName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOTTOM TICKER: ARSITEKTUR ALGORITMA AI (Ultra-Compact Single Line ~28px) */}
        <div className="shrink-0 px-3 py-1 bg-slate-950/90 border border-slate-800/80 rounded-xl text-[10px] flex items-center justify-between text-slate-400 gap-2 backdrop-blur-xs">
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <span className="flex h-1.5 w-1.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-200 truncate">
              Bio-Fusion AI:
            </span>
            <span className="text-slate-400 truncate hidden sm:inline">
              8 Algoritma
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-[9px]">
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-semibold" title="Multi-Task Cascaded CNN 5-Point Landmark Detector">
              MTCNN 5-Point
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-semibold font-mono" title="Inception-ResNet-v1 512-Dimensional Deep Vector">
              Inception-ResNet-v1 (512-D)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-semibold" title="VGGFace2 Pretrained Biometric Feature Weights">
              VGGFace2
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-purple-800/50 text-purple-300 font-semibold" title="Dual-Stream Periocular (Solusi Siswa Kembar / Wajah Mirip)">
              Periocular
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-teal-800/50 text-teal-300 font-semibold" title="OpenCV CLAHE Adaptive Contrast & Anti-Glare Kacamata">
              CLAHE Anti-Glare
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-teal-800/50 text-teal-300 font-semibold" title="5-Point Similarity Affine Face Alignment">
              Affine 5-Point
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-cyan-800/50 text-cyan-300 font-semibold font-mono" title="BLAS Matrix Vectorized Dot-Product (<0.05ms)">
              BLAS (&lt;0.05ms)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-cyan-800/50 text-cyan-300 font-semibold" title="YOLO Multi-Angle Vision Tracker">
              YOLO Tracker
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
