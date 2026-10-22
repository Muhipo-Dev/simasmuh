'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Camera,
  Video,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  User,
  SwitchCamera,
  FlipHorizontal,
  Trash2,
} from 'lucide-react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'

export interface FaceRegistrationTargetUser {
  userId: string
  name: string
  role?: string
  identifier?: string
  avatarUrl?: string | null
  className?: string | null
}

interface FaceRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  user: FaceRegistrationTargetUser | null
  onSuccess?: () => void
}

interface PoseStep {
  key: 'front' | 'right' | 'left' | 'up' | 'down' | 'blink' | 'mouth_open'
  number: number
  title: string
  instruction: string
  guideHint: string
  iconIndicator: string
  isLiveness?: boolean
}

const POSE_STEPS: PoseStep[] = [
  {
    key: 'front',
    number: 1,
    title: 'Wajah Depan',
    instruction: 'Tatap lurus ke kamera.',
    guideHint: 'Posisikan wajah tegak di tengah oval.',
    iconIndicator: '◎',
  },
  {
    key: 'right',
    number: 2,
    title: 'Tengok Kanan',
    instruction: 'Palingkan wajah ke kanan.',
    guideHint: 'Arahkan kepala sekitar 30° ke kanan.',
    iconIndicator: '→',
  },
  {
    key: 'left',
    number: 3,
    title: 'Tengok Kiri',
    instruction: 'Palingkan wajah ke kiri.',
    guideHint: 'Arahkan kepala sekitar 30° ke kiri.',
    iconIndicator: '←',
  },
  {
    key: 'up',
    number: 4,
    title: 'Angkat Wajah',
    instruction: 'Angkat dagu ke atas.',
    guideHint: 'Tengadahkan kepala sekitar 20° ke atas.',
    iconIndicator: '↑',
  },
  {
    key: 'down',
    number: 5,
    title: 'Tundukkan Wajah',
    instruction: 'Tundukkan kepala ke bawah.',
    guideHint: 'Arahkan pandangan sekitar 20° ke bawah.',
    iconIndicator: '↓',
  },
  {
    key: 'blink',
    number: 6,
    title: 'Kedipkan Mata (Video)',
    instruction: 'Tekan rekam lalu kedipkan mata 1-2 kali.',
    guideHint: 'Deteksi video keaslian liveness gerakan kelopak mata.',
    iconIndicator: '👁',
    isLiveness: true,
  },
  {
    key: 'mouth_open',
    number: 7,
    title: 'Buka Mulut (Video)',
    instruction: 'Tekan rekam lalu buka dan tutup mulut perlahan.',
    guideHint: 'Deteksi video keaslian liveness gerakan rahang/mulut.',
    iconIndicator: '😁',
    isLiveness: true,
  },
]

export function FaceRegistrationModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: FaceRegistrationModalProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [recordedSamples, setRecordedSamples] = useState<{
    front?: string
    right?: string
    left?: string
    up?: string
    down?: string
    blink?: string
    mouth_open?: string
  }>({})

  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [flashEffect, setFlashEffect] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false)
  const [videoProgress, setVideoProgress] = useState<number>(0)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Manajemen Kamera (Dukungan penuh smartphone & webcam)
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const currentPose = POSE_STEPS[currentStepIndex] || POSE_STEPS[0]
  const completedCount = Object.keys(recordedSamples).length

  // Inisialisasi Kamera saat modal dibuka dengan fallback multi-constraint ramah smartphone
  const startCamera = useCallback(async (forcedFacingMode?: 'user' | 'environment', targetDeviceId?: string) => {
    setCameraError(null)

    if (typeof window === 'undefined') return

    // Hentikan stream lama jika masih aktif
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      streamRef.current = null
    }

    const currentFacing = forcedFacingMode || facingMode
    const deviceId = targetDeviceId || selectedDeviceId

    // Fallback getter untuk browser mobile atau browser lawas
    const getMedia =
      navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
      (navigator as any).webkitGetUserMedia?.bind(navigator) ||
      (navigator as any).mozGetUserMedia?.bind(navigator) ||
      (navigator as any).msGetUserMedia?.bind(navigator)

    if (!getMedia) {
      setCameraError('Akses kamera memerlukan izin browser dan koneksi aman (HTTPS / Localhost). Pastikan browser diizinkan mengakses kamera.')
      setCameraActive(false)
      return
    }

    let stream: MediaStream | null = null

    // Rangkaian attempts constraints dari yang paling ideal ke fallback generic smartphone
    const attempts: MediaStreamConstraints[] = [
      ...(deviceId
        ? [
            {
              video: {
                deviceId: { exact: deviceId },
                width: { ideal: 640 },
                height: { ideal: 640 },
              },
              audio: false,
            },
          ]
        : []),
      {
        video: {
          facingMode: { ideal: currentFacing },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: currentFacing,
        },
        audio: false,
      },
      {
        video: {
          facingMode: { ideal: 'user' },
        },
        audio: false,
      },
      {
        video: true,
        audio: false,
      },
    ]

    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (stream) break
      } catch {
        // Lanjutkan ke percobaan constraint berikutnya
      }
    }

    if (!stream) {
      setCameraError('Kamera tidak dapat diakses. Mohon izinkan izin akses kamera di pengaturan browser atau aplikasi Anda.')
      setCameraActive(false)
      return
    }

    try {
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        try {
          await videoRef.current.play()
        } catch (playErr) {
          console.warn('Video auto-play delayed', playErr)
        }
      }
      setCameraActive(true)

      // Muat daftar perangkat video jika didukung
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevs = devices.filter((d) => d.kind === 'videoinput')
          setAvailableDevices(videoDevs)
        }
      } catch {}
    } catch (err: any) {
      console.error('Gagal memutar stream kamera:', err)
      setCameraError('Gagal memutar stream kamera di layar. Silakan muat ulang atau coba lagi.')
      setCameraActive(false)
    }
  }, [facingMode, selectedDeviceId])

  const toggleCameraFacing = useCallback(() => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)
    setSelectedDeviceId('')
    startCamera(nextFacing, '')
  }, [facingMode, startCamera])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {}
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  const [isLoadingExisting, setIsLoadingExisting] = useState<boolean>(false)

  // Muat data sampel eksisting pengguna saat modal dibuka untuk mendukung perekaman ulang / revisi
  const loadExistingSamples = useCallback(async (userId: string) => {
    setIsLoadingExisting(true)
    try {
      const res = await authenticatedFetch(`/api-backend/face-attendance/user-samples/${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (data && data.samples && Object.keys(data.samples).length > 0) {
          setRecordedSamples(data.samples)
        }
      }
    } catch (err) {
      console.warn('Gagal memuat sampel face id tersimpan:', err)
    } finally {
      setIsLoadingExisting(false)
    }
  }, [authenticatedFetch])

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0)
      setRecordedSamples({})
      setCountdown(null)
      setIsRecordingVideo(false)
      setVideoProgress(0)
      if (user?.userId) {
        loadExistingSamples(user.userId)
      }
      startCamera()
    } else {
      stopCamera()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }

    return () => {
      stopCamera()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [isOpen, user?.userId, loadExistingSamples, startCamera, stopCamera])

  // Fungsi pengambilan satu frame foto dari webcam canvas
  const captureCurrentPose = useCallback(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement('canvas')
    const targetDim = 320
    canvas.width = targetDim
    canvas.height = targetDim
    const ctx = canvas.getContext('2d')

    if (ctx) {
      const minDim = Math.min(video.videoWidth, video.videoHeight)
      const startX = (video.videoWidth - minDim) / 2
      const startY = (video.videoHeight - minDim) / 2
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.80)

      setFlashEffect(true)
      setTimeout(() => setFlashEffect(false), 220)

      setRecordedSamples((prev) => ({
        ...prev,
        [currentPose.key]: dataUrl,
      }))

      if (currentStepIndex < POSE_STEPS.length - 1) {
        setTimeout(() => {
          setCurrentStepIndex((prev) => prev + 1)
        }, 400)
      }
    }
  }, [currentPose.key, currentStepIndex])

  // Perekaman video gerakan liveness 2 detik (mengambil rangkaian burst frames dan mendeteksi titik gerakan puncak)
  const recordLivenessVideo = useCallback(() => {
    if (!videoRef.current || isRecordingVideo) return
    const video = videoRef.current
    if (video.videoWidth === 0 || video.videoHeight === 0) return

    setIsRecordingVideo(true)
    setVideoProgress(0)

    const targetDim = 320
    const canvas = document.createElement('canvas')
    canvas.width = targetDim
    canvas.height = targetDim
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsRecordingVideo(false)
      return
    }

    const collectedFrames: { dataUrl: string; pixelSum: number; diffScore: number }[] = []
    const totalDurationMs = 2000
    const frameIntervalMs = 100 // 10 fps x 2s = 20 frames
    const startTime = Date.now()
    let prevData: Uint8ClampedArray | null = null

    recordingIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progressPercent = Math.min(100, Math.round((elapsed / totalDurationMs) * 100))
      setVideoProgress(progressPercent)

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const minDim = Math.min(video.videoWidth, video.videoHeight)
        const startX = (video.videoWidth - minDim) / 2
        const startY = (video.videoHeight - minDim) / 2
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim)

        const imgData = ctx.getImageData(0, 0, targetDim, targetDim)
        let diff = 0
        let sum = 0

        // Bandingkan selisih piksel antar frame untuk melacak gerakan mata berkedip atau bukaan mulut
        if (prevData) {
          const step = 8 // sampling cepat performa tinggi
          for (let i = 0; i < imgData.data.length; i += step * 4) {
            diff += Math.abs(imgData.data[i] - prevData[i])
            sum += imgData.data[i]
          }
        }
        prevData = new Uint8ClampedArray(imgData.data)

        const frameUrl = canvas.toDataURL('image/jpeg', 0.80)
        collectedFrames.push({
          dataUrl: frameUrl,
          pixelSum: sum,
          diffScore: diff,
        })
      }

      if (elapsed >= totalDurationMs) {
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        setIsRecordingVideo(false)
        setVideoProgress(100)

        // Pilih frame dengan variasi gerakan paling signifikan (puncak kedipan atau gerakan mulut)
        let selectedFrame = collectedFrames[Math.floor(collectedFrames.length / 2)]?.dataUrl
        if (collectedFrames.length > 2) {
          // Cari frame dengan skor selisih gerakan tertinggi
          let maxDiff = -1
          for (let f = 1; f < collectedFrames.length - 1; f++) {
            if (collectedFrames[f].diffScore > maxDiff) {
              maxDiff = collectedFrames[f].diffScore
              selectedFrame = collectedFrames[f].dataUrl
            }
          }
        }

        if (selectedFrame) {
          setFlashEffect(true)
          setTimeout(() => setFlashEffect(false), 200)

          setRecordedSamples((prev) => ({
            ...prev,
            [currentPose.key]: selectedFrame,
          }))

          if (currentStepIndex < POSE_STEPS.length - 1) {
            setTimeout(() => {
              setCurrentStepIndex((prev) => prev + 1)
            }, 400)
          }
        }
      }
    }, frameIntervalMs)
  }, [currentPose.key, currentStepIndex, isRecordingVideo])

  // Trigger aksi: jika liveness (blink / mouth_open), lakukan perekaman video gerakan; jika pose foto, lakukan capture
  const handleTriggerAction = () => {
    if (currentPose.isLiveness) {
      recordLivenessVideo()
    } else {
      triggerTimedCapture()
    }
  }

  // Hitung mundur perekaman otomatis 2 detik untuk pose foto
  const triggerTimedCapture = () => {
    if (countdown !== null) return
    let counter = 2
    setCountdown(counter)

    countdownIntervalRef.current = setInterval(() => {
      counter--
      if (counter <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
        setCountdown(null)
        captureCurrentPose()
      } else {
        setCountdown(counter)
      }
    }, 800)
  }

  // Ulangi perekaman pose aktif
  const retakeCurrentPose = (
    poseKey: 'front' | 'right' | 'left' | 'up' | 'down' | 'blink' | 'mouth_open'
  ) => {
    setRecordedSamples((prev) => {
      const copy = { ...prev }
      delete copy[poseKey]
      return copy
    })
    const targetIdx = POSE_STEPS.findIndex((s) => s.key === poseKey)
    if (targetIdx !== -1) {
      setCurrentStepIndex(targetIdx)
    }
  }

  // Hapus foto/sampel dari tahap tertentu
  const deletePoseSample = (
    poseKey: 'front' | 'right' | 'left' | 'up' | 'down' | 'blink' | 'mouth_open',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation()
    setRecordedSamples((prev) => {
      const copy = { ...prev }
      delete copy[poseKey]
      return copy
    })
  }

  // Simpan hasil ke backend dan perbarui AI FaceNet
  const handleSaveAndSync = async () => {
    if (!user?.userId) return

    if (!recordedSamples.front) {
      Swal.fire({
        icon: 'warning',
        title: 'Pose Depan Wajib',
        text: 'Minimal pose hadap depan (pose 1) wajib direkam sebelum menyimpan.',
        confirmButtonColor: '#4f46e5',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await authenticatedFetch('/api-backend/face-attendance/register-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          samples: recordedSamples,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan data biometrik wajah')
      }

      await Swal.fire({
        icon: 'success',
        title: 'Perekaman Berhasil!',
        text: `Data biometrik 5 sudut untuk ${user.name} berhasil disimpan dan digabungkan ke FaceNet AI.`,
        confirmButtonColor: '#4f46e5',
        timer: 2500,
      })

      onClose()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Error simpan face id:', err)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat memproses data wajah.',
        confirmButtonColor: '#4f46e5',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[96vw] sm:w-[92vw] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl">
        {/* Header Modal Ringkas */}
        <DialogHeader className="p-3.5 sm:p-4 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    Perekaman Face ID
                  </DialogTitle>
                  {isLoadingExisting ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      Memeriksa data...
                    </span>
                  ) : completedCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {completedCount === 7 ? 'Biometrik Lengkap (Mode Revisi)' : `${completedCount}/7 Pose (Dapat Direvisi)`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Perekaman Baru
                    </span>
                  )}
                </div>
                <DialogDescription className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {user ? (
                    <span className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {user.identifier ? `ID: ${user.identifier}` : user.role || 'Pengguna'}
                      </span>
                      {user.className && <span className="text-slate-500">({user.className})</span>}
                    </span>
                  ) : (
                    'Perekaman sampel biometrik wajah untuk akurasi presensi AI.'
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Konten Utama: 2 Kolom di Desktop, 1 Kolom Ringkas di Mobile */}
        <div className="p-3 sm:p-5 space-y-3.5 sm:space-y-4 max-h-[calc(88dvh-7rem)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-5 items-start">
            
            {/* Sisi Kiri: Viewfinder Kamera & Tombol Shutter Utama */}
            <div className="md:col-span-7 flex flex-col items-center">
              {/* Kotak Viewfinder Kamera Responsif */}
              <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-700/80 shadow-md flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
                  />
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    {cameraError ? (
                      <div className="space-y-2">
                        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                        <p className="text-[11px] leading-tight text-slate-300">{cameraError}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startCamera()}
                          className="mt-1 text-xs h-7 px-3 rounded-lg"
                        >
                          Coba Lagi
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-[11px]">Menghubungkan kamera...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Oval Face Guide Mask Presisi */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-40 sm:w-48 h-52 sm:h-60 rounded-[50%/60%] border-2 transition-all duration-200 ${
                      recordedSamples[currentPose.key]
                        ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'border-indigo-400 border-dashed bg-indigo-500/5'
                    }`}
                  />
                </div>

                {/* Flash Effect on Capture */}
                {flashEffect && (
                  <div className="absolute inset-0 bg-white pointer-events-none animate-out fade-out duration-200 z-30" />
                )}

                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-20 pointer-events-none">
                    <span className="text-5xl font-black text-white">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* Video Recording Liveness Overlay */}
                {isRecordingVideo && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 pointer-events-none p-4 space-y-2.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-semibold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>Merekam Video Gerakan...</span>
                    </div>
                    <div className="w-44 bg-slate-700/80 rounded-full h-2 overflow-hidden border border-slate-600">
                      <div
                        className="bg-amber-400 h-full transition-all duration-100 ease-linear rounded-full"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-200 text-center font-medium">
                      {currentPose.instruction}
                    </span>
                  </div>
                )}

                {/* Badge Indikator Tahap Aktif di Sudut Viewfinder */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900/85 text-[10px] sm:text-[11px] font-semibold text-white border border-white/10 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Tahap {currentPose.number}/7: {currentPose.title}
                  </span>
                  <span className={`w-6 h-6 rounded-md text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs ${
                    currentPose.isLiveness ? 'bg-amber-600' : 'bg-indigo-600'
                  }`}>
                    {currentPose.iconIndicator}
                  </span>
                </div>

                {/* Tombol Balik Kamera (Depan / Belakang) Khusus Smartphone */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/80 text-white hover:bg-slate-800 transition-colors border border-white/10 z-10"
                  title="Ganti kamera depan / belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              {/* Action Bar Kamera: Tombol Shutter Utama, Retake, & Hapus Foto */}
              <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 sm:gap-2 w-full max-w-[280px] sm:max-w-[320px] justify-center">
                <Button
                  type="button"
                  onClick={handleTriggerAction}
                  disabled={!cameraActive || countdown !== null || isRecordingVideo}
                  className={`flex-1 text-white font-semibold text-xs h-9 sm:h-10 rounded-xl shadow-xs gap-1.5 ${
                    currentPose.isLiveness ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {currentPose.isLiveness ? (
                    <>
                      <Video className="w-4 h-4" />
                      <span>{isRecordingVideo ? `Merekam... (${videoProgress}%)` : `Rekam Gerakan (${currentPose.number}/7)`}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>{countdown !== null ? `Merekam (${countdown}s)...` : `Ambil Foto (${currentPose.number}/7)`}</span>
                    </>
                  )}
                </Button>
                {recordedSamples[currentPose.key] && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => retakeCurrentPose(currentPose.key)}
                      disabled={isRecordingVideo}
                      className="h-9 sm:h-10 px-2 sm:px-2.5 text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl gap-1 shrink-0"
                      title="Ulangi perekaman tahap ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Ulang</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => deletePoseSample(currentPose.key, e)}
                      disabled={isRecordingVideo}
                      className="h-9 sm:h-10 px-2 sm:px-2.5 text-xs border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl gap-1 shrink-0"
                      title="Hapus foto tahap ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Hapus</span>
                    </Button>
                  </>
                )}
              </div>

              {/* Opsi Pemilihan Kamera jika ada lebih dari 1 perangkat */}
              {availableDevices.length > 1 && (
                <div className="mt-2 w-full max-w-[280px] sm:max-w-[320px]">
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedDeviceId(id)
                      startCamera(undefined, id)
                    }}
                    className="w-full text-[11px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate outline-none"
                  >
                    <option value="">Kamera Default ({facingMode === 'user' ? 'Depan' : 'Belakang'})</option>
                    {availableDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Kamera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sisi Kanan: 7 Tahap Verifikasi & Petunjuk Aktif */}
            <div className="md:col-span-5 space-y-2 sm:space-y-2.5">
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Daftar Tahap Perekaman
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {completedCount}/7 Selesai
                  </span>
                </div>

                {/* Grid List 7 Tahap Biometrik */}
                <div className="space-y-1">
                  {POSE_STEPS.map((step, idx) => {
                    const isRecorded = Boolean(recordedSamples[step.key])
                    const isCurrent = idx === currentStepIndex

                    return (
                      <div
                        key={step.key}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`p-1.5 px-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors border group ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 text-indigo-950 dark:text-indigo-100 font-semibold'
                            : isRecorded
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isRecorded
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? step.isLiveness ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isRecorded ? <Check className="w-3 h-3" /> : step.number}
                          </div>
                          <span className="truncate text-[11px] block">
                            {step.title}
                          </span>
                        </div>

                        {recordedSamples[step.key] ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="w-6 h-6 rounded overflow-hidden border border-emerald-400 shrink-0">
                              <img
                                src={recordedSamples[step.key]}
                                alt={step.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => deletePoseSample(step.key, e)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title={`Hapus foto tahap ${step.number}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {step.iconIndicator}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Petunjuk Singkat Tahap Aktif */}
              <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                currentPose.isLiveness 
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200' 
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}>
                <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${currentPose.isLiveness ? 'text-amber-600' : 'text-indigo-600'}`} />
                <div>
                  <span className="font-semibold">{currentPose.title}: </span>
                  <span>{currentPose.instruction} </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">({currentPose.guideHint})</span>
                </div>
              </div>

              {/* Informasi Ringkas */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>Perekaman 5 sudut &amp; 2 deteksi liveness memastikan presensi akurat di semua kondisi pencahayaan.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions Responsif */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-slate-600 dark:text-slate-400 h-8 px-3 rounded-lg"
          >
            Batal
          </Button>

          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  Swal.fire({
                    title: 'Rekam Ulang Semua?',
                    text: 'Seluruh sampel wajah saat ini akan direset dari sesi dan Anda dapat merekam ulang dari awal.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#4f46e5',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'Ya, Reset',
                    cancelButtonText: 'Batal',
                  }).then((res) => {
                    if (res.isConfirmed) {
                      setRecordedSamples({})
                      setCurrentStepIndex(0)
                    }
                  })
                }}
                disabled={isSubmitting}
                className="text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 h-8 px-2.5 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Reset Semua</span>
              </Button>
            )}
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              {completedCount === 7 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 7 Tahap Selesai
                </span>
              ) : (
                `${completedCount}/7 Tahap`
              )}
            </span>
            <Button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSubmitting || !recordedSamples.front}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{completedCount > 0 ? 'Simpan Revisi' : 'Simpan Face ID'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
