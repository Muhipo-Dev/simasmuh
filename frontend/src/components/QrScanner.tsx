'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, CheckCircle2, XCircle, Loader2, Camera, LogIn, LogOut } from 'lucide-react'
import Webcam from 'react-webcam'
import jsQR from 'jsqr'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface QrScannerProps {
  /** If true, only allow check-in (for students). If false (default), support check-in/check-out. */
  studentMode?: boolean
}

export function QrScanner({ studentMode = false }: QrScannerProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null)
  const [scanType, setScanType] = useState<'MASUK' | 'PULANG' | null>(null)
  const [message, setMessage] = useState('')
  const [camError, setCamError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isSecureContext, setIsSecureContext] = useState(true)
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const webcamRef = useRef<Webcam>(null)
  const userId = (session?.user as any)?.id

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line
      setIsSecureContext(window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    }
  }, [])

  const authenticatedFetch = useAuthenticatedFetch()

  // Fetch today's attendance to know current state
  useEffect(() => {
    if (!userId) return
    authenticatedFetch(`/api-backend/daily-attendances/today?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setTodayRecord(data))
      .catch(() => {})
  }, [userId, scanResult, authenticatedFetch])

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput')
      setDevices(videoDevices)
      if (videoDevices.length > 0 && !selectedDeviceId) {
        const backCamera = videoDevices.find(d =>
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
        )
        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId)
      }
    },
    [selectedDeviceId]
  )

  useEffect(() => {
    if (isSecureContext && navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(handleDevices)
    }
  }, [handleDevices, isSecureContext])

  const capture = useCallback(() => {
    if (webcamRef.current && isScanning) {
      const imageSrc = webcamRef.current.getScreenshot()
      // eslint-disable-next-line
      if (imageSrc) processImageSrc(imageSrc)
    }
    // eslint-disable-next-line
  }, [isScanning])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isScanning && !scanResult && !isLoading) {
      interval = setInterval(capture, 500)
    }
    return () => clearInterval(interval)
  }, [isScanning, scanResult, isLoading, capture])

  const processImageSrc = (imageSrc: string) => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const MAX_SIZE = 1000
      let width = image.width
      let height = image.height
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) { height = (height / width) * MAX_SIZE; width = MAX_SIZE }
        else { width = (width / height) * MAX_SIZE; height = MAX_SIZE }
      }
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(image, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
        if (code) handleScan(code.data)
      }
    }
  }

  useEffect(() => {
    let interval: any
    if (isScanning) interval = setInterval(capture, 500)
    return () => clearInterval(interval)
  }, [isScanning, capture])

  const handleScan = async (data: string) => {
    if (!data) return
    setIsScanning(false)
    setIsLoading(true)
    setScanResult(null)

    try {
      const res = await authenticatedFetch('/api-backend/daily-attendances/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data, userId })
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.message || 'Gagal melakukan absensi')

      setScanResult('success')
      setScanType(resData.scanType || 'MASUK')
      setMessage(resData.message || 'Berhasil mencatat kehadiran!')
      // Refresh history and today queries
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] })
    } catch (error: any) {
      setScanResult('error')
      setScanType(null)
      setMessage(error.message || 'Terjadi kesalahan saat memproses QR')
    } finally {
      setIsLoading(false)
    }
  }

  // Determine current attendance state
  const hasCheckedIn = !!todayRecord?.checkInTime
  const hasCheckedOut = !!todayRecord?.checkOutTime
  const allDone = hasCheckedIn && (studentMode || hasCheckedOut)

  const scanButtonLabel = !hasCheckedIn
    ? 'Scan Absen Masuk'
    : !studentMode && !hasCheckedOut
    ? 'Scan Absen Pulang'
    : 'Absen Selesai Hari Ini'

  const scanButtonIcon = !hasCheckedIn ? <LogIn className="w-5 h-5 mr-2" /> : <LogOut className="w-5 h-5 mr-2" />

  return (
    <Card className="text-center py-6 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 h-full w-full flex flex-col justify-between">
      <CardHeader>
        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2 border border-blue-100">
          <QrCode className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Presensi via QR Code</CardTitle>
        <CardDescription>
          {!hasCheckedIn
            ? 'Scan QR untuk mencatat kehadiran masuk Anda'
            : !studentMode && !hasCheckedOut
            ? 'Scan QR untuk mencatat kepulangan Anda'
            : 'Kehadiran hari ini sudah lengkap'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 flex flex-col justify-center">

        {/* Status badges today */}
        <div className="flex justify-center gap-3 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${hasCheckedIn ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
            <LogIn className="w-3.5 h-3.5" />
            {hasCheckedIn ? `Masuk: ${todayRecord.checkInTime}` : 'Belum Absen Masuk'}
          </div>
          {!studentMode && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${hasCheckedOut ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <LogOut className="w-3.5 h-3.5" />
              {hasCheckedOut ? `Pulang: ${todayRecord.checkOutTime}` : 'Belum Absen Pulang'}
            </div>
          )}
        </div>

        {/* Camera view */}
        <div className="aspect-square bg-slate-900 rounded-2xl w-full max-w-sm mx-auto flex items-center justify-center overflow-hidden relative shadow-inner">
          {!isScanning && !scanResult && !isLoading && !camError && (
            <span className="text-slate-400">Kamera nonaktif</span>
          )}
          {camError && (
            <div className="absolute inset-0 bg-slate-900 p-4 flex flex-col items-center justify-center text-white text-center">
              <XCircle className="w-12 h-12 mb-3 text-red-500" />
              <span className="text-sm font-medium">{camError}</span>
              <Button size="sm" variant="outline" className="mt-4 text-slate-800" onClick={() => { setCamError(''); setIsScanning(false) }}>Tutup</Button>
            </div>
          )}
          {isScanning && !camError && isSecureContext && (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined, facingMode: selectedDeviceId ? undefined : 'environment' }}
              className="w-full h-full object-cover"
              onUserMedia={() => navigator.mediaDevices.enumerateDevices().then(handleDevices)}
              onUserMediaError={(err: any) => {
                console.error('Camera error:', err)
                setCamError('Gagal mengakses kamera: ' + (err.message || err.name || 'Akses ditolak.'))
              }}
            />
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span>Memproses...</span>
            </div>
          )}
          {scanResult === 'success' && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center text-white ${scanType === 'PULANG' ? 'bg-blue-500' : 'bg-green-500'}`}>
              <CheckCircle2 className="w-16 h-16 mb-4" />
              <span className="font-medium text-lg px-4 text-center">{message}</span>
              <Button size="sm" variant="ghost" className="mt-4 text-white hover:text-white hover:bg-white/20" onClick={() => setScanResult(null)}>Tutup</Button>
            </div>
          )}
          {scanResult === 'error' && (
            <div className="absolute inset-0 bg-red-500 flex flex-col items-center justify-center text-white">
              <XCircle className="w-16 h-16 mb-4" />
              <span className="font-medium text-lg px-4 text-center">{message}</span>
              <Button size="sm" variant="ghost" className="mt-4 text-white hover:text-white hover:bg-white/20" onClick={() => setScanResult(null)}>Coba Lagi</Button>
            </div>
          )}
        </div>

        {/* Camera selector */}
        {devices.length > 1 && isScanning && isSecureContext && (
          <div className="max-w-sm mx-auto w-full pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kamera:</label>
            <select
              className="w-full border border-slate-200 rounded-lg shadow-sm text-sm p-2 bg-white"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.map((device, key) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Kamera ${key + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div className="max-w-sm mx-auto w-full pt-2 space-y-3">
          {allDone ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Presensi hari ini sudah lengkap!
            </div>
          ) : !isScanning ? (
            <Button
              size="lg"
              className={`w-full text-white shadow-sm ${hasCheckedIn && !studentMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
              onClick={() => { setIsScanning(true); setScanResult(null) }}
            >
              {scanButtonIcon}
              {scanButtonLabel}
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="w-full" onClick={() => setIsScanning(false)}>
              Tutup Kamera
            </Button>
          )}

          {!isSecureContext && (
            <div className="p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
              Kamera dinonaktifkan karena koneksi tidak aman (HTTP). Hubungi Administrator.
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
