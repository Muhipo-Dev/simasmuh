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
  Minimize2,
  Sun,
  SunMedium,
  Clock,
  Radio,
  Power,
  Globe,
  QrCode,
  Lock,
  Unlock,
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

export interface SingleCameraConfig {
  id: string
  name: string
  streamSourceType: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO'
  streamUrl: string
  location: string
  isActive: boolean
}

interface FaceCameraConfig {
  streamSourceType?: 'BROWSER_WEBCAM' | 'RTSP' | 'RTMP' | 'WEBCAM' | 'HTTP_STREAM' | 'LOCAL_VIDEO'
  streamUrl: string
  cameraName: string
  location: string
  cameras?: SingleCameraConfig[]
  threshold: number
  cooldownMinutes: number
  isActive: boolean
  welcomeVoice: boolean
  showPublicStream?: boolean
  showPublicLogs?: boolean
  continuousScanNoDelay?: boolean
  scanIntervalMs?: number
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
  const [activeCamId, setActiveCamId] = useState<string>('cam-1')
  const [showStreamUrl, setShowStreamUrl] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null)
  const [streamError, setStreamError] = useState(false)
  const [isStreamLoading, setIsStreamLoading] = useState(true)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const streamImgRef = useRef<HTMLImageElement>(null)
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
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
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
  const [isOutdoorMode, setIsOutdoorMode] = useState(false)
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

  // State kunci area sensitivitas threshold
  const [isSensitivityLocked, setIsSensitivityLocked] = useState(true)

  // Local form state for config
  const [formConfig, setFormConfig] = useState<FaceCameraConfig | null>(null)

  // 1. Fetch Config
  const { data: configData } = useQuery<FaceCameraConfig>({
    queryKey: ['face-attendance-config'],
    queryFn: () => authenticatedQuery('/api-backend/face-attendance/config'),
  })

  const currentConfig = formConfig || configData

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

      // 1. Inisialisasi getUserMedia dengan fallback legacy navigator.getUserMedia untuk browser lama
      const getMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
        (navigator as any).webkitGetUserMedia?.bind(navigator) ||
        (navigator as any).mozGetUserMedia?.bind(navigator) ||
        (navigator as any).msGetUserMedia?.bind(navigator)

      if (!getMedia) {
        setBrowserCamError('Akses webcam memerlukan izin browser dan koneksi aman (HTTPS / Localhost). Pastikan izin kamera aktif pada browser perangkat Anda.')
        setIsBrowserCamStreaming(false)
        return
      }

      let stream: MediaStream | null = null
      
      const attempts = [
        targetDeviceId ? { video: { deviceId: { exact: targetDeviceId } }, audio: false } : null,
        { video: { facingMode: 'user', width: { ideal: 1280, min: 480 }, height: { ideal: 720, min: 360 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        { video: true, audio: false }
      ].filter(Boolean) as MediaStreamConstraints[]

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          if (stream) break
        } catch {}
      }

      if (!stream) {
        throw new Error('Tidak dapat membuka stream kamera. Pastikan Anda telah menekan tombol "Izinkan" / "Allow" saat browser meminta izin akses kamera.')
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

  // Helper: Format nama agar dilafalkan utuh mengalir sebagai kata tanpa dieja per huruf
  const formatFullNameForSpeech = (rawName?: string) => {
    if (!rawName) return ''
    return rawName
      .replace(/[,._\-/\\|(){}\[\]]/g, ' ') // Hindari ejaan per karakter akibat tanda baca/titik singkatan
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Voice Greeting Text-to-Speech (Indonesian) - 100% Suara Wanita Indonesia Natural & Jernih
  const speakVoiceGreeting = (
    name?: string,
    scanType?: string,
    statusType: 'SUCCESS' | 'LOW_CONFIDENCE' | 'UNREGISTERED' | 'NO_FACE' | 'TWIN_AMBIGUOUS' | 'ERROR' = 'SUCCESS',
    confidence?: number,
    role?: string,
  ) => {
    if (!soundEnabled || typeof window === 'undefined') return
    try {
      let greeting = ''
      const spokenName = formatFullNameForSpeech(name)

      if (statusType === 'LOW_CONFIDENCE') {
        greeting = spokenName 
          ? `Mohon maaf ${spokenName}, akurasi belum cukup. Silakan posisikan wajah lebih dekat dan jelas ke kamera.` 
          : `Akurasi biometrik belum cukup sembilan puluh persen. Mohon posisikan wajah lebih dekat ke kamera.`
      } else if (statusType === 'UNREGISTERED') {
        greeting = 'Wajah belum terdaftar di sistem SIMASMUH. Silakan hubungi operator.'
      } else if (statusType === 'NO_FACE') {
        greeting = 'Wajah tidak terdeteksi. Silakan menghadap lurus ke kamera.'
      } else if (statusType === 'TWIN_AMBIGUOUS') {
        greeting = 'Terdeteksi kemiripan pada wajah. Silakan pilih siapa yang sesuai.'
      } else if (statusType === 'ERROR') {
        greeting = 'Kamera atau server presensi sedang mengalami kendala. Silakan coba sesaat lagi.'
      } else {
        // Status SUCCESS: Presensi Kedatangan, Pulang, dan Lengkap
        if (scanType === 'SUDAH_LENGKAP') {
          greeting = spokenName 
            ? `${spokenName}, sudah presensi.`
            : 'Sudah presensi.'
        } else if (scanType === 'PULANG') {
          greeting = spokenName ? `${spokenName}, pulang.` : 'Hadir pulang.'
        } else {
          // Presensi Masuk (Hadir)
          greeting = spokenName ? `${spokenName}, hadir.` : 'Hadir.'
        }
      }

      // Hentikan audio atau ucapan sebelumnya agar tidak bertumpuk saat antrian padat di HP/Tablet/Desktop
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause()
          activeAudioRef.current.currentTime = 0
        } catch {}
        activeAudioRef.current = null
      }

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      // 1. Prioritas Utama: Unduh & Putar Suara Wanita Indonesia Asli dengan Artikulasi Cepat & Gesit (1.25x)
      const ttsUrl = `/api-backend/face-attendance/tts?text=${encodeURIComponent(greeting)}`
      const audio = new Audio()
      audio.crossOrigin = 'anonymous'
      audio.src = ttsUrl
      audio.playbackRate = 1.25 // Intonasi 1.25x: cepat, artikulatif, dan efisien untuk antrian ratusan siswa
      activeAudioRef.current = audio

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // 2. Fallback: Browser Web Speech API dengan Filter Ketat Khusus Suara Wanita & Rate Cepat (1.25x)
          if (!window.speechSynthesis) return
          const utter = new SpeechSynthesisUtterance(greeting)
          utter.lang = 'id-ID'
          utter.rate = 1.25 // Rate 1.25x responsif dan tegas

          const voices = window.speechSynthesis.getVoices()
          const isMale = (vName: string) => {
            const lower = vName.toLowerCase()
            return lower.includes('andika') || lower.includes('david') || lower.includes('ardi') || 
                   lower.includes('male') || lower.includes('guy') || lower.includes('man') || 
                   lower.includes('stefan') || lower.includes('george') || lower.includes('richard')
          }
          const isExplicitFemale = (vName: string) => {
            const lower = vName.toLowerCase()
            return lower.includes('gadis') || lower.includes('siti') || lower.includes('damayanti') || 
                   lower.includes('female') || lower.includes('woman') || lower.includes('zira') || 
                   lower.includes('natural') || lower.includes('bahasa indonesia')
          }

          // Cari suara wanita bahasa Indonesia terlebih dahulu
          let selectedVoice = voices.find(v => (v.lang.startsWith('id') || v.lang.includes('ID')) && !isMale(v.name) && isExplicitFemale(v.name))
          
          if (!selectedVoice) {
            selectedVoice = voices.find(v => (v.lang.startsWith('id') || v.lang.includes('ID')) && !isMale(v.name))
          }

          if (!selectedVoice) {
            selectedVoice = voices.find(v => isExplicitFemale(v.name) && !isMale(v.name))
          }

          if (selectedVoice) {
            utter.voice = selectedVoice
            utter.pitch = 1.20 // Pitch vokal wanita natural
          } else {
            // Jika OS hanya memiliki suara default pria/Andika, ubah formant pitch menjadi 1.38 agar bernada wanita
            utter.pitch = 1.38
          }

          window.speechSynthesis.speak(utter)
        })
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
        speakVoiceGreeting(candidate.name, data?.attendance?.scanType || 'HADIR', 'SUCCESS', undefined, candidate.role)
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

  // Fungsi Eksekusi Capture & Verifikasi Presensi Wajah (Mendukung Browser Webcam & Server MJPEG Stream)
  const executeFaceCapture = async () => {
    if (isCapturing) return

    const video = localVideoRef.current
    const streamImg = streamImgRef.current

    let base64 = ''

    if (isBrowserMode) {
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        toast.error('Kamera webcam belum siap. Pastikan preview webcam aktif.')
        return
      }
      try {
        const offscreen = document.createElement('canvas')
        const scale = Math.min(1.0, 800 / video.videoWidth)
        offscreen.width = Math.round(video.videoWidth * scale)
        offscreen.height = Math.round(video.videoHeight * scale)
        const ctx = offscreen.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Context canvas tidak tersedia')
        ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height)
        base64 = offscreen.toDataURL('image/jpeg', 0.90)
      } catch (err) {
        toast.error('Gagal mengambil frame dari webcam browser.')
        return
      }
    } else {
      // Non-Browser Mode (RTSP / USB Server Stream): Ambil snapshot dari tag img atau backend
      if (!streamImg || !streamImg.naturalWidth) {
        toast.error('Sinyal stream kamera belum siap atau offline.')
        return
      }
      try {
        const offscreen = document.createElement('canvas')
        const scale = Math.min(1.0, 800 / streamImg.naturalWidth)
        offscreen.width = Math.round(streamImg.naturalWidth * scale)
        offscreen.height = Math.round(streamImg.naturalHeight * scale)
        const ctx = offscreen.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Context canvas tidak tersedia')
        ctx.drawImage(streamImg, 0, 0, offscreen.width, offscreen.height)
        base64 = offscreen.toDataURL('image/jpeg', 0.90)
      } catch (err) {
        toast.error('Gagal mengambil snapshot dari stream kamera.')
        return
      }
    }

    if (!base64) return

    setIsCapturing(true)
    setCaptureFlash(true)
    playBiometricAudio('shutter')
    setTimeout(() => setCaptureFlash(false), 180)

    if (autoClearTimeoutRef.current) {
      clearTimeout(autoClearTimeoutRef.current)
      autoClearTimeoutRef.current = null
    }

    try {
      setCapturedSnapshotUrl(base64)

      const res = await authenticatedFetch('/api-backend/face-attendance/scan-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, recordAttendance: true }),
      })

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`)
      }

      const data = await res.json()
      const rawFaces = data.faces || []
      const containerW = isBrowserMode ? (video?.videoWidth || 640) : (streamImg?.naturalWidth || 640)
      const invScale = 1.0 / Math.min(1.0, 640 / containerW)
      const scaledFaces = rawFaces.map((f: any) => ({
        ...f,
        box: [
          Math.round(f.box[0] * invScale),
          Math.round(f.box[1] * invScale),
          Math.round(f.box[2] * invScale),
          Math.round(f.box[3] * invScale),
        ],
      }))

      drawYoloBoundingBoxes(scaledFaces, containerW, isBrowserMode ? (video?.videoHeight || 480) : (streamImg?.naturalHeight || 480))

      if (rawFaces.length > 0) {
        const minThresh = currentConfig?.threshold || 0.70
        
        // Prioritaskan wajah yang berada paling dekat dengan area tengah frame kamera
        const frameCx = containerW / 2.0
        const frameCy = (isBrowserMode ? (video?.videoHeight || 480) : (streamImg?.naturalHeight || 480)) / 2.0
        const sortedFaces = [...rawFaces].sort((a: any, b: any) => {
          const aDist = Math.hypot((a.box[0] + a.box[2]/2.0) - frameCx, (a.box[1] + a.box[3]/2.0) - frameCy)
          const bDist = Math.hypot((b.box[0] + b.box[2]/2.0) - frameCx, (b.box[1] + b.box[3]/2.0) - frameCy)
          return aDist - bDist
        })

        const registeredFace = sortedFaces.find((f: any) => f.is_registered && (f.confidence || 0) >= minThresh)
        if (registeredFace) {
          // Kasus Siswa Kembar / Wajah Mirip yang memerlukan verifikasi cepat
          if (registeredFace.is_twin_ambiguous && registeredFace.twin_candidates && registeredFace.twin_candidates.length > 1) {
            playBiometricAudio('warning')
            speakVoiceGreeting(registeredFace.name, undefined, 'TWIN_AMBIGUOUS')
            setCaptureResult({
              type: 'TWIN_AMBIGUOUS',
              name: registeredFace.name,
              role: registeredFace.role,
              identifier: registeredFace.identifier,
              confidence: Math.round(registeredFace.confidence * 100),
              message: 'Deteksi Wajah Mirip',
              attendanceMsg: 'Terdeteksi kemiripan pada wajah. Silakan pilih siapa yang sesuai:',
              twinCandidates: registeredFace.twin_candidates,
            })
            toast.info('Terdeteksi kemiripan pada wajah. Silakan pilih siapa yang sesuai.')
          } else if (registeredFace.meets_attendance_threshold === false || Math.round(registeredFace.confidence * 100) < 91) {
            // Wajah terdeteksi tapi confidence BELUM mencapai 91% — presensi TIDAK direkam, berikan voice feedback instruktif
            playBiometricAudio('warning')
            speakVoiceGreeting(registeredFace.name, undefined, 'LOW_CONFIDENCE', Math.round(registeredFace.confidence * 100))
            setCaptureResult({
              type: 'UNKNOWN',
              name: registeredFace.name,
              role: registeredFace.role,
              identifier: registeredFace.identifier,
              confidence: Math.round(registeredFace.confidence * 100),
              message: `Akurasi Belum Cukup (${Math.round(registeredFace.confidence * 100)}%)`,
              attendanceMsg: `Wajah ${registeredFace.name} terdeteksi dengan akurasi ${Math.round(registeredFace.confidence * 100)}%, minimum 91% diperlukan. Posisikan wajah lebih dekat ke kamera dengan pencahayaan yang cukup, lalu sentuh kembali.`,
            })
            toast.warning(`Akurasi ${Math.round(registeredFace.confidence * 100)}% belum cukup. Minimum 91% diperlukan untuk presensi.`)
          } else {
            playBiometricAudio('success')
            const att = registeredFace.attendance
            const attMsg = att?.message || `Presensi berhasil diverifikasi (${Math.round(registeredFace.confidence * 100)}%)`
            speakVoiceGreeting(registeredFace.name, att?.scanType || 'HADIR', 'SUCCESS', undefined, registeredFace.role)
            
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
          speakVoiceGreeting(undefined, undefined, 'UNREGISTERED')
          setCaptureResult({
            type: 'UNKNOWN',
            message: 'Wajah Belum Terdaftar',
            attendanceMsg: 'Wajah terdeteksi namun belum cocok dengan database pengguna SIMASMUH.',
          })
          toast.warning('Wajah tidak dikenali atau belum terdaftar di dataset profil.')
        }
      } else {
        playBiometricAudio('warning')
        speakVoiceGreeting(undefined, undefined, 'NO_FACE')
        setCaptureResult({
          type: 'NO_FACE',
          message: 'Wajah Tidak Terdeteksi',
          attendanceMsg: 'Pastikan wajah menghadap langsung ke kamera dengan pencahayaan yang cukup.',
        })
        toast.info('Wajah tidak terdeteksi. Posisikan wajah di dalam bingkai.')
      }
    } catch (err: any) {
      playBiometricAudio('warning')
      speakVoiceGreeting(undefined, undefined, 'ERROR')
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
      }, 1250)
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

  // Persistent offscreen canvas ref to prevent garbage collection hiccups and lag
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Continuous Face Preview Scanning: Mendeteksi & menampilkan bounding box nama secara terus-menerus tanpa jeda
  // Data presensi HANYA diinput/direkam ke database setelah pengguna menekan tombol sentuh scan wajah
  useEffect(() => {
    if (!isBrowserCamStreaming || activeTab !== 'monitor') return
    let isProcessing = false
    let frameCount = 0
    let lastTime = Date.now()

    // Jika mode 'continuousScanNoDelay' aktif atau default, gunakan frekuensi cepat 120ms (zero-delay streaming feel)
    const scanDelay = currentConfig?.continuousScanNoDelay === false
      ? (currentConfig?.scanIntervalMs || 350)
      : 120

    const interval = setInterval(async () => {
      if (isProcessing || isCapturing || !localVideoRef.current || !overlayCanvasRef.current) return
      const video = localVideoRef.current
      if (video.readyState < 2 || video.videoWidth === 0) return

      isProcessing = true
      try {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas')
        }
        const offscreen = offscreenCanvasRef.current
        const scale = Math.min(1.0, 480 / video.videoWidth)
        const targetW = Math.round(video.videoWidth * scale)
        const targetH = Math.round(video.videoHeight * scale)
        if (offscreen.width !== targetW || offscreen.height !== targetH) {
          offscreen.width = targetW
          offscreen.height = targetH
        }
        const ctx = offscreen.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetW, targetH)
          const base64 = offscreen.toDataURL('image/jpeg', 0.65)
          // Mode scanning preview HUD terus-menerus tanpa jeda: recordAttendance = false (TIDAK merekam presensi otomatis)
          const res = await authenticatedFetch('/api-backend/face-attendance/scan-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, recordAttendance: false }),
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
    }, scanDelay)

    return () => clearInterval(interval)
  }, [isBrowserCamStreaming, activeTab, isCapturing, currentConfig?.continuousScanNoDelay, currentConfig?.scanIntervalMs])

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
      setIsStreamLoading(true)
      setBrowserCamError(null)
      const newKey = Date.now()
      setStreamKey(newKey)
      
      // Auto restart browser webcam if switching to or staying in BROWSER_WEBCAM
      if (savedData?.streamSourceType === 'BROWSER_WEBCAM') {
        stopBrowserWebcam()
        setTimeout(() => {
          startBrowserWebcam(selectedDeviceId)
        }, 300)
      }

      queryClient.invalidateQueries({ queryKey: ['face-attendance-service-status'] })
      setTimeout(() => setSaveSuccess(false), 3000)
      toast.success('Pengaturan presensi camera berhasil disimpan & dimuat ulang!')
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
          // Tahap 1: Verifikasi role via backend API langsung
          const verifyRes = await fetch('/api-backend/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          if (!verifyRes.ok) {
            Swal.showValidationMessage('Autentikasi gagal. Username atau kata sandi salah.')
            return false
          }
          const verifyData = await verifyRes.json()
          if (!verifyData?.user || !['SUPERADMIN', 'ADMIN_IT'].includes(verifyData.user.role)) {
            Swal.showValidationMessage('Akun ini bukan Superadmin atau Admin IT. Akses ditolak.')
            return false
          }

          // Tahap 2: Login ke NextAuth agar session token tersedia untuk authenticatedFetch
          const signInRes = await signIn('credentials', {
            redirect: false,
            email: username,
            password: password,
          })
          if (signInRes?.error) {
            Swal.showValidationMessage('Gagal membuat sesi autentikasi. Silakan coba lagi.')
            return false
          }

          return verifyData
        } catch (err: any) {
          Swal.showValidationMessage('Terjadi kesalahan koneksi saat memverifikasi akun.')
          return false
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setLocalSuperadminAuthed(true)
        Swal.fire({
          icon: 'success',
          title: 'Otoritas Diterima',
          text: `Berhasil terautentikasi sebagai ${result.value?.user?.name || 'Superadmin'}!`,
          timer: 1500,
          showConfirmButton: false,
        })
        if (onSuccessAction) {
          // Tunggu sesi NextAuth ter-propagasi sebelum menjalankan aksi
          setTimeout(() => onSuccessAction(), 800)
        }
      }
    })
  }

  const promptLogin = () => {
    promptSuperadminAuth()
  }

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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          Memuat Sistem FaceNet AI SIMASMUH...
        </p>
      </div>
    )
  }

  // STATUS KHUSUS: Akses diblokir untuk publik dan akun selain Superadmin / Admin IT
  if (!isAuthenticated || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden font-sans select-none">
        {/* Background Atmosphere */}
        <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <NextImage
            src="/muhipo-log.jpg"
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            className="object-cover object-center w-full h-full scale-105"
          />
        </div>
        <div className="fixed inset-0 -z-20 bg-slate-950/90 backdrop-blur-md" />

        <div className="max-w-md w-full p-6 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="px-3 py-1 border-rose-500/40 text-rose-400 bg-rose-500/10 text-xs font-bold uppercase tracking-wider">
              Akses Dibatasi
            </Badge>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">
              Tidak Dapat Menggunakan Fitur Ini Sekarang
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Halaman dan mesin pemindai FaceNet AI hanya dikhususkan untuk perangkat operasional dengan hak akses Superadmin dan Admin IT.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/login"
              className="w-full sm:w-auto flex-1 min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>Silakan Login Sebagai Admin</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center transition-all"
            >
              Beranda
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen lg:h-screen lg:max-h-screen flex flex-col relative font-sans select-none overflow-x-hidden ${
      isOutdoorMode 
        ? 'bg-black text-white' 
        : 'bg-slate-950 text-slate-100 lg:overflow-hidden'
    }`}>
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        <NextImage
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className={`object-cover object-center w-full h-full scale-105 transition-opacity duration-300 ${
            isOutdoorMode ? 'opacity-5' : 'opacity-20'
          }`}
        />
      </div>
      <div className={`fixed inset-0 -z-20 transition-colors duration-300 ${
        isOutdoorMode ? 'bg-black/98' : 'bg-slate-950/95 backdrop-blur-[6px]'
      }`} />

      {/* TOPBAR / HEADER KOMPAK & OUTDOOR COMPATIBLE */}
      <header className={`shrink-0 px-3 sm:px-4 py-2 border-b backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-30 transition-all ${
        isOutdoorMode 
          ? 'bg-black border-b-2 border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.15)]' 
          : 'bg-slate-900/90 border-slate-800 shadow-md'
      }`}>
        {/* Kiri: Identitas Sekolah & Link Beranda */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link 
            href="/"
            title="Kembali ke Beranda Utama"
            className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 transition-all hover:bg-white/20 border border-white/10 shadow-xs cursor-pointer touch-manipulation"
          >
            <NextImage 
              src="/pic_logo.png" 
              alt="Logo SMA Muhammadiyah 1 Ponorogo" 
              width={34} 
              height={34} 
              className="w-8 h-8 object-contain drop-shadow-sm" 
              priority
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate">
                PRESENSI BIOMETRIK AI
              </h1>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-black border ${
                isOutdoorMode 
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                <Sparkles className="w-3 h-3" />
                512-D BLAS
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold truncate">
              SMA MUHAMMADIYAH 1 PONOROGO
            </p>
          </div>
        </div>

        {/* Tengah: 4 Tab Navigasi Terpadu (Touch-Target >= 44px) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/95 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 text-xs font-black rounded-lg transition-all cursor-pointer touch-manipulation ${
              activeTab === 'monitor' 
                ? isOutdoorMode ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span className="truncate">Live Monitor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
              activeTab === 'config' 
                ? isOutdoorMode ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="truncate">Konfigurasi</span>
            {!isSuperAdmin && (
              <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dataset')}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
              activeTab === 'dataset' 
                ? isOutdoorMode ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Dataset ({datasetData?.usersWithPhoto || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 min-h-[38px] px-3 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
              activeTab === 'logs' 
                ? isOutdoorMode ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span className="truncate">Riwayat Log</span>
            {logsData && logsData.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30 text-emerald-300 font-mono font-bold">
                {logsData.length}
              </span>
            )}
          </button>
        </div>

        {/* Kanan: Superadmin AI Switcher, Outdoor Toggle, Jam Digital, & Status AI */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tombol Switch AI Microservice Khusus Akses Superadmin */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-700 shadow-md">
              <span className={`w-2 h-2 rounded-full shrink-0 ml-1.5 ${
                serviceStatus?.isOnline && serviceStatus?.is_running 
                  ? 'bg-emerald-400' 
                  : serviceStatus?.isOnline 
                    ? 'bg-amber-400' 
                    : 'bg-rose-500'
              }`} />
              <button
                type="button"
                onClick={() => {
                  if (serviceStatus?.is_running) {
                    stopServiceWorker()
                  } else {
                    startServiceWorker()
                  }
                }}
                disabled={isStartingWorker || isStoppingWorker}
                className={`flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] rounded-lg font-black text-xs transition-all cursor-pointer touch-manipulation ${
                  serviceStatus?.is_running 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={serviceStatus?.is_running ? 'Klik untuk Mematikan AI (Standby)' : 'Klik untuk Menyalakan AI'}
              >
                <Power className={`w-3.5 h-3.5 ${serviceStatus?.is_running ? 'text-emerald-200' : 'text-slate-400'}`} />
                <span>
                  {isStartingWorker ? 'Menyalakan...' : isStoppingWorker ? 'Mematikan...' : serviceStatus?.is_running ? 'AI AKTIF' : 'AI STANDBY'}
                </span>
              </button>
            </div>
          )}

          {/* Outdoor Sun Mode Toggle (Fitur Khusus Layar Sentuh Luar Ruangan) */}
          <button
            type="button"
            onClick={() => {
              const next = !isOutdoorMode
              setIsOutdoorMode(next)
              toast.info(next ? 'Mode Outdoor Anti-Glare Aktif (Kontras Maksimal)' : 'Mode Normal Aktif')
            }}
            className={`flex items-center gap-1.5 px-3 min-h-[38px] rounded-xl font-black text-xs transition-all shadow-md touch-manipulation cursor-pointer border ${
              isOutdoorMode 
                ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30' 
                : 'bg-slate-900 text-amber-300 hover:bg-slate-800 border-slate-700'
            }`}
            title="Mode Luar Ruangan: Kontras tinggi maksimal untuk layar sentuh di bawah terik matahari"
          >
            {isOutdoorMode ? <SunMedium className="w-4 h-4 text-slate-950" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>{isOutdoorMode ? 'OUTDOOR ☀️' : 'Outdoor Mode'}</span>
          </button>

          {/* Badge Statistik Cepat */}
          <div className="hidden xl:flex items-center gap-1.5">
            <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-600 text-[11px] font-black text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Masuk: {logStats.masuk}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-600 text-[11px] font-black text-blue-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Pulang: {logStats.pulang}</span>
            </div>
          </div>

          {/* Fullscreen Kiosk Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Layar Penuh Kiosk Presensi"
            className={`min-h-[38px] px-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
              isOutdoorMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-slate-200" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (Responsive untuk Mobile, Tablet & Desktop) */}
      <main className="flex-1 min-h-0 w-full p-2 sm:p-3 flex flex-col gap-2 overflow-y-auto lg:overflow-hidden">
        {/* TAB 1: LIVE MONITOR & SCANNER LOG */}
        {activeTab === 'monitor' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:overflow-hidden">
            {/* KIRI: VIDEO STREAM 16:9 + ACTION CAPTURE PANEL (8 COLS) */}
            <div className={`lg:col-span-8 flex flex-col min-h-[420px] sm:min-h-[480px] lg:h-full lg:overflow-hidden rounded-2xl shadow-xl transition-all ${
              isOutdoorMode 
                ? 'bg-black border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]' 
                : 'bg-slate-950/95 border border-slate-800'
            }`}>
              {/* Header Stream Bar (Compact) */}
              <div className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                isOutdoorMode ? 'bg-black border-emerald-500/40 text-white' : 'bg-slate-900/90 border-slate-800 text-slate-100'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    serviceStatus?.is_running || isBrowserCamStreaming 
                      ? 'bg-emerald-500 shadow-xs' 
                      : 'bg-slate-500'
                  }`} />
                  <span className="text-xs sm:text-sm font-black truncate">
                    {currentConfig?.cameraName || 'Kamera Presensi'}
                  </span>
                  <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-mono font-bold shrink-0 ${
                    isOutdoorMode ? 'border-emerald-400 text-emerald-300 bg-emerald-950/60' : 'border-slate-700 text-indigo-300'
                  }`}>
                    {currentConfig?.streamSourceType || 'RTSP'}
                  </Badge>
                  <span className="text-[10px] text-slate-300 font-semibold truncate hidden sm:inline">
                    {currentConfig?.location || 'Area Presensi'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Multi-Camera Channel Switcher Tabs */}
                  {Array.isArray(currentConfig?.cameras) && currentConfig.cameras.length > 1 && (
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                      {currentConfig.cameras.map((cam, cIdx) => (
                        <button
                          key={cam.id || cIdx}
                          type="button"
                          onClick={() => {
                            setActiveCamId(cam.id)
                            setStreamKey(Date.now())
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            activeCamId === cam.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cam.name.replace(/Kamera\s*/i, 'Cam ')}
                        </button>
                      ))}
                    </div>
                  )}

                  {isBrowserMode && videoDevices.length > 1 && (
                    <select
                      aria-label="Pilih Perangkat Kamera"
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value)
                        startBrowserWebcam(e.target.value)
                      }}
                      className="h-7 text-[11px] font-bold bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2 max-w-[130px] truncate"
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
                    className="text-slate-300 hover:text-white hover:bg-slate-800 h-7 w-7 p-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Video Box Canvas (Expands to fill available viewport height) */}
              <div 
                ref={videoContainerRef}
                onClick={() => {
                  if (isBrowserMode && isBrowserCamStreaming && !isCapturing && !captureResult) {
                    executeFaceCapture()
                  }
                }}
                className="flex-1 min-h-[300px] sm:min-h-0 relative w-full bg-black flex items-center justify-center overflow-hidden group select-none cursor-pointer touch-manipulation"
                title="Sentuh Layar untuk Ambil Foto & Presensi"
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
                        {/* Face Oval Framing Target with Outdoor High Contrast */}
                        <div className={`relative w-44 h-56 sm:w-52 sm:h-64 rounded-[50%/45%] border-3 border-dashed flex items-center justify-center transition-all ${
                          isOutdoorMode 
                            ? 'border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.5)]' 
                            : 'border-emerald-400/70 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                        }`}>
                          <div className="absolute -top-3 -left-3 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl" />
                          <div className="absolute -top-3 -right-3 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl" />
                          <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl" />
                          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-xl" />
                          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                        </div>
                        
                        {/* High-Visibility Touch Cue Pill */}
                        <div className={`mt-3.5 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs sm:text-sm font-black flex items-center gap-2 shadow-2xl ${
                          isOutdoorMode 
                            ? 'bg-black/90 border-emerald-400 text-emerald-300' 
                            : 'bg-black/85 border-emerald-500/50 text-emerald-300'
                        }`}>
                          <Aperture className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                          <span>Posisikan Wajah & Sentuh Layar / Tombol Scan</span>
                        </div>
                      </div>
                    )}

                    {/* Laser Scanner Animation saat Memproses Frame */}
                    {isCapturing && (
                      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
                        <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-bounce top-1/3" />
                        
                        <div className="px-5 py-3 rounded-2xl bg-slate-950/95 border-2 border-cyan-400 shadow-2xl text-center space-y-1">
                          <div className="flex items-center justify-center gap-2.5 text-cyan-300">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm sm:text-base font-black tracking-wide">Menganalisis Biometrik FaceNet...</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-mono font-bold">Pencocokan Cepat BLAS Matrix Vector</p>
                        </div>
                      </div>
                    )}

                    {/* Floating Result Feedback HUD Card (High Outdoor Contrast) */}
                    {captureResult && (
                      <div className="absolute inset-x-2 sm:inset-x-4 bottom-3 z-30 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
                        {captureResult.type === 'TWIN_AMBIGUOUS' ? (
                          <div className="p-3.5 rounded-2xl bg-slate-950/98 border-2 border-amber-400 shadow-2xl backdrop-blur-2xl text-white space-y-2.5">
                            <div className="flex items-center justify-between gap-2 border-b border-amber-400/40 pb-2">
                              <div className="flex items-center gap-2 text-amber-300">
                                <AlertTriangle className="w-5 h-5 animate-bounce shrink-0" />
                                <div>
                                  <h3 className="text-xs sm:text-sm font-black text-amber-300">Deteksi Wajah Mirip</h3>
                                  <p className="text-[11px] text-slate-200 font-medium">Silakan pilih profil yang sesuai:</p>
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
                                className="min-h-[36px] text-xs text-slate-300 hover:text-white"
                              >
                                Tutup
                              </Button>
                            </div>

                            {/* Twin candidate list */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {captureResult.twinCandidates?.map((cand, cIdx) => (
                                <button
                                  key={cand.userId || cIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConfirmTwinAttendance(cand)
                                  }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 hover:bg-emerald-950 border-2 border-slate-700 hover:border-emerald-400 text-left transition-all cursor-pointer touch-manipulation min-h-[58px]"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                                    {cand.avatarUrl ? (
                                      <img src={cand.avatarUrl} alt={cand.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="font-black text-slate-200 text-sm">{cand.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-black text-white truncate">{cand.name}</p>
                                    <p className="text-[10px] text-slate-300 font-mono font-semibold">{cand.role} • {cand.identifier}</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                                      <CheckCircle className="w-3 3" /> Ketuk Presensi
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-2xl border-2 shadow-2xl transition-all duration-200 ${
                            captureResult.type === 'SUCCESS' 
                              ? 'bg-slate-950/98 border-emerald-400 shadow-emerald-950/80' 
                              : captureResult.type === 'UNKNOWN' 
                                ? 'bg-slate-950/98 border-amber-400 shadow-amber-950/80' 
                                : 'bg-slate-950/98 border-rose-400 shadow-rose-950/80'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-lg ${
                                  captureResult.type === 'SUCCESS'
                                    ? 'bg-emerald-500/25 text-emerald-300 border-2 border-emerald-400'
                                    : captureResult.type === 'UNKNOWN'
                                      ? 'bg-amber-500/25 text-amber-300 border-2 border-amber-400'
                                      : 'bg-rose-500/25 text-rose-300 border-2 border-rose-400'
                                }`}>
                                  {captureResult.type === 'SUCCESS' ? (
                                    <CheckCircle className="w-7 h-7" />
                                  ) : captureResult.type === 'UNKNOWN' ? (
                                    <AlertTriangle className="w-7 h-7" />
                                  ) : (
                                    <AlertCircle className="w-7 h-7" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  {captureResult.type === 'SUCCESS' ? (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm sm:text-base md:text-lg font-black text-white truncate">{captureResult.name}</h3>
                                        <Badge className="bg-emerald-400 text-slate-950 border-emerald-300 text-xs py-0.5 px-2 font-mono font-black">
                                          {captureResult.confidence}% Akurat
                                        </Badge>
                                        <Badge variant="outline" className="text-xs py-0.5 px-2 border-slate-700 text-slate-200 font-bold">
                                          {captureResult.role} {captureResult.identifier ? `• ${captureResult.identifier}` : ''}
                                        </Badge>
                                      </div>
                                      <p className="text-xs sm:text-sm text-emerald-300 font-black mt-0.5 truncate">
                                        {captureResult.attendanceMsg}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <h3 className={`text-sm sm:text-base font-black ${
                                        captureResult.type === 'UNKNOWN' ? 'text-amber-300' : 'text-rose-300'
                                      }`}>
                                        {captureResult.message}
                                      </h3>
                                      <p className="text-xs text-slate-200 mt-0.5 line-clamp-1 font-medium">
                                        {captureResult.attendanceMsg}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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
                                  className="min-h-[42px] px-3 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl"
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
                                  className="min-h-[42px] px-4 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-black gap-1.5 shadow-lg rounded-xl cursor-pointer"
                                >
                                  <Camera className="w-4 h-4" />
                                  <span>Scan Lagi</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {browserCamError && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2.5 z-30 pointer-events-auto">
                        <Camera className="w-10 h-10 text-rose-400" />
                        <p className="text-sm font-bold text-white">Gagal Mengakses Webcam Browser</p>
                        <p className="text-xs text-slate-300 max-w-sm">{browserCamError}</p>
                        <Button size="sm" onClick={() => startBrowserWebcam()} className="bg-indigo-600 text-white text-xs min-h-[38px] px-4 rounded-xl">
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Coba Lagi
                        </Button>
                      </div>
                    )}
                  </div>
                ) : !streamError && serviceStatus?.is_running ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {isStreamLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-slate-300 font-bold">Menghubungkan Sinyal Kamera...</span>
                        </div>
                      </div>
                    )}
                    <img
                      ref={streamImgRef}
                      key={`${streamKey}-${activeCamId}`}
                      src={`/api/face-stream?cam_id=${encodeURIComponent(activeCamId)}&t=${streamKey}`}
                      alt="Live Capture FaceNet Camera Stream"
                      className="w-full h-full object-contain"
                      crossOrigin="anonymous"
                      onLoad={handleStreamImgLoad}
                      onError={handleStreamImgError}
                    />
                  </div>
                ) : (
                  <div className="text-center p-4 space-y-2.5 max-w-md select-none z-10 pointer-events-auto">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950/90 border border-indigo-500/50 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-slate-200">
                        {serviceStatus?.isOnline 
                          ? (serviceStatus?.is_running ? 'Menghubungkan Sinyal Kamera...' : 'AI FaceNet Standby') 
                          : 'Microservice AI FaceNet Standby / Offline'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {serviceStatus?.is_running 
                          ? 'Menunggu sinyal frame aktif dari kamera...'
                          : 'Nyalakan AI atau pilih Webcam Browser untuk memulai streaming deteksi.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
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
                          className="min-h-[38px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 rounded-xl"
                        >
                          <Power className="w-3.5 h-3.5 mr-1" /> Nyalakan AI
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReconnectStream}
                        className="min-h-[38px] text-xs border-slate-700 text-slate-300 hover:text-white bg-slate-800/80 px-3 rounded-xl"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Hubungkan Ulang
                      </Button>
                    </div>
                  </div>
                )}

                {/* HUD Badges */}
                <div className="absolute top-2.5 left-2.5 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/40 z-20 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-bold">{isBrowserMode ? `WEBCAM (${browserFps} FPS)` : currentConfig?.streamSourceType || 'DIRECT STREAM'}</span>
                </div>

                <div className="absolute top-2.5 right-2.5 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-xs text-[10px] font-mono text-slate-200 border border-white/20 z-20 shadow-md">
                  <span className="text-emerald-300 font-black flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    PREVIEW DETEKSI AKTIF
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-xs text-[10px] font-mono text-slate-200 border border-white/20 z-20 shadow-md">
                  <span>Akurasi: {Math.round((currentConfig?.threshold || 0.70) * 100)}%</span>
                  <span>•</span>
                  <span>Cooldown: {currentConfig?.cooldownMinutes || 10}m</span>
                </div>
              </div>

              {/* ACTION BUTTON BAR (Touch-Target Ergonomis Tablets >= 54px) */}
              <div className={`p-2.5 sm:p-3 border-t flex items-center gap-2.5 shrink-0 ${
                isOutdoorMode ? 'bg-black border-emerald-500/30' : 'bg-slate-900/95 border-slate-800'
              }`}>
                <Button
                  onClick={() => executeFaceCapture()}
                  disabled={isCapturing || (isBrowserMode ? !isBrowserCamStreaming : (!serviceStatus?.is_running || streamError))}
                  title="Sentuh untuk Input Presensi Wajah (Spasi / Enter)"
                  className="flex-1 min-h-[54px] sm:min-h-[58px] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl shadow-xl shadow-emerald-950/70 flex items-center justify-center border-2 border-emerald-400/50 cursor-pointer transition-all active:scale-[0.97] touch-manipulation"
                >
                  {isCapturing ? (
                    <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-white" />
                  ) : (
                    <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  )}
                </Button>

                {/* Mode Manual/Auto switcher (Touch Target >= 44px) */}
                <div className="inline-flex p-1 bg-slate-950 rounded-2xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScanMode('MANUAL')}
                    className={`min-h-[44px] px-3 text-xs font-black rounded-xl transition-all cursor-pointer touch-manipulation ${
                      scanMode === 'MANUAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mode Manual: Scan saat tombol ditekan (Aman & Hemat Server)"
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('AUTO')}
                    className={`min-h-[44px] px-3 text-xs font-black rounded-xl transition-all cursor-pointer touch-manipulation ${
                      scanMode === 'AUTO' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Mode Auto: Scan berkala otomatis di latar belakang"
                  >
                    Auto
                  </button>
                </div>

                {/* Sound toggle button (Touch Target >= 44px) */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`min-h-[48px] w-12 rounded-2xl border flex items-center justify-center cursor-pointer transition-all touch-manipulation shrink-0 ${
                    soundEnabled 
                      ? 'text-emerald-300 bg-emerald-950/60 border-emerald-600/60 shadow-md' 
                      : 'text-slate-500 bg-slate-950 border-slate-800'
                  }`}
                  title={soundEnabled ? 'Suara & Voice Greeting Aktif' : 'Suara Senyap'}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* KANAN: PANEL JAM & TANGGAL + REALTIME SCANNER LOGS LIST (4 COLS) */}
            <div className="lg:col-span-4 flex flex-col min-h-[380px] lg:h-full gap-2 lg:overflow-hidden">
              {/* KARTU JAM & TANGGAL DIGITAL (ATAS LOG PRESENSI) */}
              <div className={`p-3 rounded-2xl border shadow-lg flex items-center justify-between gap-3 shrink-0 transition-all ${
                isOutdoorMode 
                  ? 'bg-black border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white' 
                  : 'bg-slate-900/95 border-slate-800 shadow-md text-slate-100'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isOutdoorMode 
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300' 
                      : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-400'
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      Waktu Presensi
                    </p>
                    <p className="text-xs font-black text-slate-200 truncate">
                      {currentDateStr || 'Memuat Tanggal...'}
                    </p>
                  </div>
                </div>

                <div className={`px-3 py-1 rounded-xl border text-right font-mono shrink-0 ${
                  isOutdoorMode 
                    ? 'bg-black border-emerald-400' 
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  <div className="text-base sm:text-lg font-black text-emerald-400 tracking-tight leading-tight">
                    {currentClock || '--:--:--'}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 leading-none">
                    WIB (Realtime)
                  </div>
                </div>
              </div>

              {/* LOG LIST CONTAINER (PERKECIL AREA LOG) */}
              <div className={`flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl shadow-xl transition-all ${
                isOutdoorMode 
                  ? 'bg-black border-2 border-slate-700' 
                  : 'bg-slate-950/95 border border-slate-800'
              }`}>
                {/* Log Header */}
                <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                  isOutdoorMode ? 'bg-black border-slate-800' : 'bg-slate-900/90 border-slate-800'
                }`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="text-xs sm:text-sm font-black text-white">Scanner Log Realtime</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                    Live Sync
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLogFilterMode('TODAY')}
                      className={`min-h-[32px] px-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                        logFilterMode === 'TODAY' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogFilterMode('ALL')}
                      className={`min-h-[32px] px-2.5 text-[11px] font-black rounded-lg transition-all cursor-pointer ${
                        logFilterMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => refetchLogs()} title="Segarkan Log" className="h-8 w-8 p-0 text-slate-300 hover:text-white rounded-lg">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  {isSuperAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleConfirmClearLogs}
                      disabled={isClearing}
                      title="Reset Seluruh Log Hari Ini"
                      className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => promptSuperadminAuth(() => handleConfirmClearLogs())}
                      title="Otoritas Superadmin"
                      className="h-8 w-8 p-0 text-slate-500 hover:text-amber-400 rounded-lg"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable Live Scan List */}
              <div className="p-2.5 sm:p-3 flex-1 min-h-0 overflow-y-auto space-y-2.5 custom-scrollbar">
                {displayedLogs && displayedLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 border border-slate-800">
                      <Camera className="w-6 h-6 stroke-1" />
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-200">Belum Ada Presensi Hari Ini</p>
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-medium">
                      Arahkan wajah ke depan kamera presensi. Hasil identifikasi dan foto snapshot kamera akan otomatis muncul di sini.
                    </p>
                  </div>
                ) : (
                  displayedLogs?.map((log, index) => (
                    <div 
                      key={log.id} 
                      className={`p-3 rounded-2xl transition-all border ${
                        index === 0 
                          ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-400/30' 
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Header: User identity & Scan status */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-black text-white truncate">{log.userName}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              log.userRole?.includes('SISWA') ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                              log.userRole?.includes('GURU') ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                              'bg-amber-950 text-amber-300 border border-amber-700'
                            }`}>
                              {log.userRole}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-300 font-semibold mt-0.5 truncate">
                            ID: {log.identifier}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black py-0.5 px-2.5 rounded-full ${
                              log.scanType === 'MASUK' 
                                ? 'bg-emerald-400 text-slate-950 border border-emerald-300' 
                                : log.scanType === 'PULANG' 
                                  ? 'bg-blue-400 text-slate-950 border border-blue-300' 
                                  : 'bg-slate-800 text-slate-300'
                            }`}>
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              {log.scanType}
                            </span>
                            <p className="text-[11px] font-mono font-bold text-slate-300 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                              <span className="text-[10px] font-semibold text-slate-400">{log.dateFormatted || log.date}</span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {log.timestamp}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Visual Comparison Box */}
                      <div className="py-2 grid grid-cols-2 gap-2.5 items-center">
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-700 overflow-hidden shrink-0 border border-slate-600 flex items-center justify-center">
                            {log.avatarUrl ? (
                              <img src={log.avatarUrl} alt={log.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-slate-300 text-xs">{log.userName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Database</span>
                            <p className="text-xs font-bold text-slate-200 truncate">Foto Profil</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-700/80 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0 border-2 border-emerald-400 flex items-center justify-center">
                            {log.snapshotUrl ? (
                              <img src={log.snapshotUrl} alt="Snapshot Kamera" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-5 h-5 text-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Realtime</span>
                            <p className="text-xs font-bold text-emerald-200 truncate">Snapshot AI</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Matching Confidence Bar */}
                      <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-medium flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Kemiripan Biometrik:
                          </span>
                          <span className="font-black text-emerald-400 font-mono">
                            {Math.round(log.confidence * 100)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-full transition-all"
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

                {/* Multi-Camera Channel Configuration (Kamera 1 & Kamera 2) */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      Konfigurasi Multi-Kamera (2 Perangkat Scanning / IP Camera)
                    </Label>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                      Dual Stream Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {(currentConfig?.cameras || [
                      { id: 'cam-1', name: 'Kamera 1 (Gerbang Depan)', streamSourceType: 'RTSP', streamUrl: 'rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101', location: 'Gerbang Depan', isActive: true },
                      { id: 'cam-2', name: 'Kamera 2 (Gerbang Belakang / Gedung B)', streamSourceType: 'RTSP', streamUrl: 'rtsp://admin:password@192.168.1.65:554/Streaming/Channels/101', location: 'Gerbang Belakang', isActive: true },
                    ]).map((cam, idx) => (
                      <div key={cam.id || idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                            <Video className="w-3 h-3 text-indigo-400" />
                            {cam.name || `Kamera ${idx + 1}`}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            ID: {cam.id}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-slate-300">Nama Titik & Lokasi</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input
                              type="text"
                              value={cam.name}
                              placeholder="Nama Kamera"
                              disabled={!isAuthenticated || !canConfigure}
                              onChange={(e) => {
                                const newCams = [...(currentConfig?.cameras || [])]
                                if (!newCams[idx]) newCams[idx] = { ...cam }
                                newCams[idx].name = e.target.value
                                setFormConfig((prev) => prev ? { ...prev, cameras: newCams } : null)
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-[11px] h-7"
                            />
                            <Input
                              type="text"
                              value={cam.location}
                              placeholder="Lokasi / Gerbang"
                              disabled={!isAuthenticated || !canConfigure}
                              onChange={(e) => {
                                const newCams = [...(currentConfig?.cameras || [])]
                                if (!newCams[idx]) newCams[idx] = { ...cam }
                                newCams[idx].location = e.target.value
                                setFormConfig((prev) => prev ? { ...prev, cameras: newCams } : null)
                              }}
                              className="bg-slate-900 border-slate-700 text-white text-[11px] h-7"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium text-slate-300">Target URL RTSP / Port Stream</Label>
                          <Input
                            type={showStreamUrl ? 'text' : 'password'}
                            value={cam.streamUrl}
                            placeholder="rtsp://user:pass@192.168.1.xxx:554/ch1 atau 0/1"
                            disabled={!isAuthenticated || !canConfigure}
                            onChange={(e) => {
                              const newCams = [...(currentConfig?.cameras || [])]
                              if (!newCams[idx]) newCams[idx] = { ...cam }
                              newCams[idx].streamUrl = e.target.value
                              setFormConfig((prev) => prev ? { ...prev, cameras: newCams } : null)
                            }}
                            className="font-mono text-[11px] bg-slate-900 border-slate-700 text-white h-7"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Nama Titik Kamera Utama & Lokasi */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="cameraName" className="text-[11px] font-medium text-slate-200">Nama Profil Kamera Utama</Label>
                    <Input
                      id="cameraName"
                      placeholder="Kamera Presensi Utama"
                      value={currentConfig?.cameraName || ''}
                      disabled={!isAuthenticated || !canConfigure}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, cameraName: e.target.value } : null)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-[11px] font-medium text-slate-200">Lokasi / Area Utama</Label>
                    <Input
                      id="location"
                      placeholder="Lobi / Area Presensi"
                      value={currentConfig?.location || ''}
                      disabled={!isAuthenticated || !canConfigure}
                      onChange={(e) => setFormConfig((prev) => prev ? { ...prev, location: e.target.value } : null)}
                      className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                    />
                  </div>
                </div>

                {/* 4. Threshold Range Slider */}
                <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex justify-between items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] font-semibold text-slate-200">
                        Batas Sensitivitas Presensi (Threshold)
                      </Label>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsSensitivityLocked(prev => !prev)}
                        className={`h-5 px-1.5 text-[9px] font-semibold rounded flex items-center gap-1 border ${isSensitivityLocked ? 'border-amber-500/40 text-amber-300 bg-amber-950/30' : 'border-indigo-500/40 text-indigo-300 bg-indigo-950/40'}`}
                      >
                        {isSensitivityLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {isSensitivityLocked ? 'Kunci Aktif' : 'Buka Kunci'}
                      </Button>
                      <Badge variant="outline" className="text-[10px] font-bold text-indigo-400 border-indigo-800 bg-indigo-950/50 px-2 py-0.2">
                        {Math.round((currentConfig?.threshold || 0.70) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={95}
                    step={1}
                    disabled={!isSuperAdmin || isSensitivityLocked}
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
                      <Label className="text-xs font-medium text-slate-200 flex items-center gap-1">
                        <Scan className="w-3.5 h-3.5 text-emerald-400" />
                        Scanning Terus Menerus Tanpa Jeda
                      </Label>
                      <p className="text-[10px] text-slate-400">Deteksi wajah real-time instan tanpa delay (120ms)</p>
                    </div>
                    <Switch
                      disabled={!isAuthenticated || !canConfigure}
                      checked={currentConfig?.continuousScanNoDelay ?? true}
                      onCheckedChange={(checked) => setFormConfig((prev) => prev ? { ...prev, continuousScanNoDelay: checked } : null)}
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
