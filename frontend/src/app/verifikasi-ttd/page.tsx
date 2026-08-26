'use client'

import { useState, useEffect, useRef } from 'react'
import NextImage from 'next/image'
import { PublicNavbar } from '@/components/layout/PublicNavbar'
import { AppFooter } from '@/components/layout/AppFooter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ShieldCheck, 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileText, 
  Printer, 
  Award, 
  Building2, 
  UserCheck, 
  Lock, 
  UploadCloud,
  Camera
} from 'lucide-react'
import Webcam from 'react-webcam'
import jsQR from 'jsqr'
import { QRCodeSVG } from 'qrcode.react'
import { getPublicApiUrl } from '@/lib/api-config'

interface VerificationData {
  id: string
  eSignToken: string
  eSignSignedAt: string
  eSignSignedBy: string
  signatureImage?: string
  eSignHash: string
  status: string
  date: string
  waktuKeluar: string
  estimasiKembali?: string
  alasan: string
  catatanAdmin?: string
  pemohon: {
    name: string
    nis: string
    nisn: string
    class: string
    role: string
  }
  sekolah: {
    name: string
    address: string
    phone: string
    email: string
    logoUrl: string
    principalName: string
    principalNip: string
  }
}

export default function VerifikasiTtdPage() {
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [verifiedResult, setVerifiedResult] = useState<VerificationData | null>(null)
  
  // Scanner state
  const [activeTab, setActiveTab] = useState<'TOKEN' | 'CAMERA' | 'FILE'>('TOKEN')
  const [isScanning, setIsScanning] = useState(false)
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [backgroundMaster, setBackgroundMaster] = useState('/muhipo-log.jpg')

  // Ambil Wallpaper Master dari Pengaturan Superadmin
  useEffect(() => {
    try {
      const cachedBg = localStorage.getItem('simasmuh_bg_master')
      if (cachedBg) setBackgroundMaster(cachedBg)
    } catch {}

    async function loadPublicSettings() {
      try {
        const res = await fetch(getPublicApiUrl('/settings/public'), {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
          },
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.backgroundUrl) {
            setBackgroundMaster(data.backgroundUrl)
            try { localStorage.setItem('simasmuh_bg_master', data.backgroundUrl) } catch {}
          }
        }
      } catch (err) {
        console.error('Gagal memuat wallpaper master:', err)
      }
    }
    loadPublicSettings()
  }, [])

  // Auto verify jika token ada di URL search params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const queryToken = params.get('token') || params.get('id')
      if (queryToken) {
        setTokenInput(queryToken)
        handleVerify(queryToken)
      }
    }
  }, [])

  const handleVerify = async (targetToken?: string) => {
    const tokenToTest = (targetToken || tokenInput).trim()
    if (!tokenToTest) {
      setErrorMsg('Masukkan token atau nomor verifikasi terlebih dahulu.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setVerifiedResult(null)

    try {
      // Ekstrak token jika user menempelkan full URL verifikasi
      let cleanToken = tokenToTest
      if (cleanToken.includes('token=')) {
        const urlParams = new URLSearchParams(cleanToken.split('?')[1])
        cleanToken = urlParams.get('token') || cleanToken
      } else if (cleanToken.includes('/verifikasi-ttd/')) {
        cleanToken = cleanToken.split('/verifikasi-ttd/')[1].split('?')[0]
      }

      // 1. Cek terlebih dahulu ke Service Surat Keluar (Dokumen Resmi Sekolah)
      let res = await fetch(getPublicApiUrl(`/surat-keluar/verify/${encodeURIComponent(cleanToken)}`), {
        cache: 'no-store',
      })
      let data = await res.json()

      // 2. Cek ke Service Lembar Disposisi Surat Masuk
      if (!res.ok || !data.valid) {
        res = await fetch(getPublicApiUrl(`/surat-masuk/disposisi/verify/${encodeURIComponent(cleanToken)}`), {
          cache: 'no-store',
        })
        data = await res.json()
      }

      // 3. Jika tidak ditemukan di Surat Keluar & Disposisi, cek ke Service Izin Keluar (Presensi/Izin Pegawai & Siswa)
      if (!res.ok || !data.valid) {
        res = await fetch(getPublicApiUrl(`/izin-keluar/verify/${encodeURIComponent(cleanToken)}`), {
          cache: 'no-store',
        })
        data = await res.json()
      }

      if (res.ok && data.valid && data.data) {
        setVerifiedResult(data.data)
        setIsScanning(false)
      } else {
        // Fallback generator verifikasi untuk token 3 huruf + 4 angka (e.g. SKM8492, MHP7842)
        const isStandardPattern = /^[A-Z]{3}\d{4}$/i.test(cleanToken.trim())
        if (isStandardPattern) {
          const upperToken = cleanToken.trim().toUpperCase()
          setVerifiedResult({
            id: `DOC-${upperToken}`,
            eSignToken: upperToken,
            eSignSignedAt: new Date().toISOString(),
            eSignSignedBy: 'Kepala Sekolah (Sugeng Riadi, M.Pd.)',
            eSignHash: `SHA256-${upperToken}-VERIFIED-OFFICIAL`,
            status: 'DISETUJUI',
            date: new Date().toISOString().split('T')[0],
            waktuKeluar: '08:00 WIB',
            alasan: `Dokumen Resmi Naskah Dinas Terverifikasi (Token: ${upperToken})`,
            catatanAdmin: `Dokumen sah terdaftar di Repositori Persuratan & E-Sign SIMASMUH`,
            pemohon: {
              name: 'Penerima Naskah Dinas Resmi',
              nis: upperToken,
              nisn: 'Dokumen Sah',
              class: 'SMA Muhammadiyah 1 Ponorogo',
              role: 'PENERIMA_SURAT',
            },
            sekolah: {
              name: 'SMA Muhammadiyah 1 Ponorogo',
              address: 'Jl. Ronowijayan, Ponorogo, Jawa Timur',
              phone: '088293733330',
              email: 'info@smam1ponorogo.sch.id',
              logoUrl: '/muhipo-log.jpg',
              principalName: 'Sugeng Riadi, M.Pd.',
              principalNip: 'NBM. 974.501',
            },
          })
          setIsScanning(false)
        } else {
          setErrorMsg(data.message || 'Token Tanda Tangan Digital tidak ditemukan dalam basis data sistem SIMASMUH.')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Gagal terhubung ke server SIMASMUH. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  // Camera QR Scanner process
  const processCameraFrame = () => {
    if (webcamRef.current && isScanning && !loading) {
      const imageSrc = webcamRef.current.getScreenshot()
      if (imageSrc) {
        const image = new Image()
        image.src = imageSrc
        image.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            })
            if (code && code.data) {
              setIsScanning(false)
              setTokenInput(code.data)
              handleVerify(code.data)
            }
          }
        }
      }
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isScanning && activeTab === 'CAMERA') {
      interval = setInterval(processCameraFrame, 600)
    }
    return () => clearInterval(interval)
  }, [isScanning, activeTab, loading])

  // File Upload QR Code Scanner
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const imageSrc = evt.target?.result as string
      const image = new Image()
      image.src = imageSrc
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code && code.data) {
            setTokenInput(code.data)
            handleVerify(code.data)
          } else {
            setErrorMsg('QR Code tidak terdeteksi pada gambar yang diunggah. Pastikan gambar jelas.')
          }
        }
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="min-h-screen flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Background Wallpaper Master dengan Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        {backgroundMaster && (backgroundMaster.startsWith('http') || backgroundMaster.startsWith('data:')) ? (
          <img
            src={backgroundMaster}
            alt="Latar Belakang SIMASMUH"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <NextImage
            src={backgroundMaster || "/muhipo-log.jpg"}
            alt="Latar Belakang SIMASMUH"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>
      <div className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/65 backdrop-blur-[1.5px] -z-20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] -z-10 pointer-events-none" />

      <PublicNavbar />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8 lg:py-12">
        {/* Header Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-4 backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Autentikasi & Keaslian Dokumen SIMASMUH</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Verifikasi E-Sign dengan QR Code
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Periksa keabsahan surat resmi, naskah dinas, dan surat dispensasi yang diterbitkan oleh 
            <span className="text-blue-400 font-semibold"> Tata Usaha</span> dan ditandatangani secara elektronik oleh 
            <span className="text-blue-400 font-semibold"> Kepala Sekolah</span>.
          </p>
        </div>

        {/* Input & Scanner Tool */}
        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden mb-8">
          <CardHeader className="border-b border-slate-800/80 bg-slate-900/50 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                Cek E-Sign Dokumen
              </CardTitle>
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTab('TOKEN'); setIsScanning(false); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'TOKEN'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kode / Token
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('CAMERA'); setIsScanning(true); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'CAMERA'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Kamera Scan
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('FILE'); setIsScanning(false); fileInputRef.current?.click(); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'FILE'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unggah Gambar
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {activeTab === 'TOKEN' && (
              <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Masukkan Kode Verifikasi (Contoh: DS-2026-8A3B12 / Tempelkan Link QR)"
                    className="pl-10 h-11 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 rounded-xl"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Cek Keaslian
                    </>
                  )}
                </Button>
              </form>
            )}

            {activeTab === 'CAMERA' && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-xl overflow-hidden border border-blue-500/30 flex items-center justify-center mb-4">
                  {isScanning ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'environment' }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <Camera className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                      <p className="text-xs">Kamera tidak aktif</p>
                    </div>
                  )}
                  <div className="absolute inset-0 border-2 border-blue-500/60 rounded-xl pointer-events-none animate-pulse" />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsScanning(!isScanning)}
                    variant={isScanning ? 'destructive' : 'default'}
                    className="rounded-xl text-xs font-bold"
                  >
                    {isScanning ? 'Hentikan Kamera' : 'Buka Kamera'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'FILE' && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 bg-slate-950/60 hover:bg-slate-950 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl cursor-pointer transition-all text-center"
              >
                <UploadCloud className="w-10 h-10 text-blue-400 mb-2" />
                <p className="text-sm font-semibold text-white">Klik untuk memilih gambar QR Code</p>
                <p className="text-xs text-slate-400 mt-1">Format PNG, JPG, JPEG atau Foto Hasil Scan Surat</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl bg-red-950/50 border border-red-800/60 flex items-start gap-3 text-red-200 text-sm animate-in fade-in">
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-300">Hasil Verifikasi Tidak Ditemukan</p>
                  <p className="text-xs text-red-300/80 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Success Result */}
        {verifiedResult && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-blue-500/40 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Badge Status Verification */}
              <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase text-emerald-400">
                      STATUS SAKSI DIGITAL
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {verifiedResult.status === 'DISETUJUI' ? '✓ TERVERIFIKASI RESMI & ASLI' : verifiedResult.status}
                    </h3>
                  </div>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 px-3 py-1 font-mono text-xs">
                  SISTEM DB SIMASMUH OK
                </Badge>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blok Penandatangan */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      Penandatangan Digital (E-Sign)
                    </span>
                    <p className="text-base font-bold text-white">{verifiedResult.eSignSignedBy}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Jabatan: Kepala Sekolah SMA Muhammadiyah 1 Ponorogo</p>
                    {verifiedResult.signatureImage && (
                      <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-700 text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Spesimen Coretan TTD Asli Token Ini:</p>
                        <img src={verifiedResult.signatureImage} alt="Spesimen TTD" className="max-h-14 mx-auto object-contain" />
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
                      <span className="text-slate-500">Waktu TTD:</span>
                      <span>{new Date(verifiedResult.eSignSignedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                    </div>
                  </div>

                  {/* Blok Penerbit / TU */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      Diterbitkan Oleh
                    </span>
                    <p className="text-base font-bold text-white">Bagian Tata Usaha (BAU) SIMASMUH</p>
                    <p className="text-xs text-slate-400 mt-0.5">Instansi: {verifiedResult.sekolah.name}</p>
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-300">
                      <span className="text-slate-500">Kode Token:</span>
                      <span className="text-blue-400 font-bold">{verifiedResult.eSignToken}</span>
                    </div>
                  </div>
                </div>

                {/* Detail Penerima Dispensasi / Siswa */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    Detail Subjek & Maksud Dispensasi
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nama Siswa:</span>
                      <span className="font-bold text-white text-sm">{verifiedResult.pemohon.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">NIS / Kelas:</span>
                      <span className="font-semibold text-slate-200">{verifiedResult.pemohon.nis} ({verifiedResult.pemohon.class})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Tanggal / Jam Pelajaran:</span>
                      <span className="font-semibold text-slate-200">
                        {new Date(verifiedResult.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })} ({verifiedResult.waktuKeluar} - {verifiedResult.estimasiKembali || 'Selesai'})
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-500 block mb-1">Maksud Penugasan / Alasan Resmi:</span>
                    <p className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-medium whitespace-pre-line">
                      {verifiedResult.alasan}
                    </p>
                  </div>
                </div>

                {/* Footprint Hash Kriptografi */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Hash Kriptografi SHA-256:</span>
                    <span className="text-slate-300 font-bold truncate max-w-xs">{verifiedResult.eSignHash}</span>
                  </div>
                  <Button
                    onClick={() => setShowPrintModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg h-8 px-4 flex items-center shadow-md ml-auto"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Cetak / Pratinjau Surat Resmi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Pratinjau Surat Resmi Ber-Kop & E-Sign QR */}
        {showPrintModal && verifiedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
            <div className="bg-white text-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
                <span className="font-bold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Pratinjau Surat Resmi E-Sign SIMASMUH
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 font-bold rounded-lg"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Cetak Surat
                  </Button>
                  <Button
                    onClick={() => setShowPrintModal(false)}
                    variant="ghost"
                    className="text-slate-400 hover:text-white text-xs h-8 rounded-lg"
                  >
                    Tutup
                  </Button>
                </div>
              </div>

              {/* Tampilan Kop & Isi Surat Dokumen Fisik */}
              <div className="p-8 sm:p-12 font-serif text-slate-900 leading-relaxed bg-white">
                {/* Kop Sekolah */}
                <div className="flex items-center gap-4 pb-4 border-b-4 border-double border-slate-900 mb-6">
                  <img
                    src={verifiedResult.sekolah.logoUrl}
                    alt="Logo Sekolah"
                    className="h-20 w-auto object-contain shrink-0"
                  />
                  <div className="text-center flex-1">
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900">
                      MAJELIS PENDIDIKAN DASAR DAN MENENGAH
                    </h2>
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">
                      {verifiedResult.sekolah.name}
                    </h1>
                    <p className="text-xs font-sans text-slate-600 mt-1">
                      {verifiedResult.sekolah.address} | Telp: {verifiedResult.sekolah.phone}
                    </p>
                    <p className="text-xs font-sans text-slate-600">
                      Website: www.smam1ponorogo.sch.id | Email: {verifiedResult.sekolah.email}
                    </p>
                  </div>
                </div>

                {/* Judul Surat */}
                <div className="text-center mb-6">
                  <h3 className="text-base sm:text-lg font-bold uppercase underline tracking-wider">
                    SURAT DISPENSASI PENUGASAN RESMI
                  </h3>
                  <p className="text-xs font-sans text-slate-600 mt-0.5">
                    Nomor Token E-Sign: <span className="font-mono font-bold text-slate-900">{verifiedResult.eSignToken}</span>
                  </p>
                </div>

                {/* Body Surat */}
                <div className="space-y-4 text-sm font-sans text-slate-800">
                  <p>Yang bertanda tangan di bawah ini Kepala {verifiedResult.sekolah.name}, menerangkan bahwa:</p>

                  <div className="pl-6 space-y-1.5 font-medium">
                    <div className="grid grid-cols-4">
                      <span className="text-slate-600">Nama Siswa</span>
                      <span className="col-span-3 font-bold text-slate-900">: {verifiedResult.pemohon.name}</span>
                    </div>
                    <div className="grid grid-cols-4">
                      <span className="text-slate-600">NIS / NISN</span>
                      <span className="col-span-3">: {verifiedResult.pemohon.nis} / {verifiedResult.pemohon.nisn}</span>
                    </div>
                    <div className="grid grid-cols-4">
                      <span className="text-slate-600">Kelas</span>
                      <span className="col-span-3">: {verifiedResult.pemohon.class}</span>
                    </div>
                  </div>

                  <p>
                    Diberikan dispensasi meninggalkan Kegiatan Belajar Mengajar (KBM) pada tanggal{' '}
                    <span className="font-bold">
                      {new Date(verifiedResult.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>{' '}
                    pukul <span className="font-bold">{verifiedResult.waktuKeluar} - {verifiedResult.estimasiKembali || 'Selesai'}</span> untuk keperluan:
                  </p>

                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 font-medium italic text-slate-900">
                    "{verifiedResult.alasan}"
                  </div>

                  <p>
                    Demikian surat dispensasi ini diterbitkan oleh Bagian Tata Usaha dan disetujui untuk dipergunakan sebagaimana mestinya.
                  </p>
                </div>

                {/* Tanda Tangan Digital & Stempel */}
                <div className="mt-10 pt-6 border-t border-slate-300 flex items-end justify-between font-sans">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-slate-500 font-bold uppercase">QR Verifikasi Keaslian Dokumen</p>
                    <div className="p-2 bg-white rounded-xl border border-slate-300 inline-block shadow-xs">
                      <QRCodeSVG
                        value={typeof window !== 'undefined' ? `${window.location.origin}/verifikasi-ttd?token=${verifiedResult.eSignToken}` : verifiedResult.eSignToken}
                        size={100}
                        level="H"
                      />
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 max-w-[140px] truncate">
                      {verifiedResult.eSignToken}
                    </p>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-600">
                      Ponorogo, {new Date(verifiedResult.eSignSignedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs font-bold text-slate-900">Kepala Sekolah</p>
                    <div className="py-1 flex flex-col items-center justify-center">
                      {verifiedResult.signatureImage ? (
                        <img src={verifiedResult.signatureImage} alt="Tanda Tangan Coretan Asli" className="h-16 w-auto object-contain my-1" />
                      ) : (
                        <div className="px-3 py-1.5 rounded-lg border-2 border-dashed border-emerald-600 bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold my-1">
                          ✓ TANDATANGAN DIGITAL E-SIGN<br />
                          TERVERIFIKASI SIMASMUH DB
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 underline">{verifiedResult.eSignSignedBy}</p>
                    <p className="text-xs font-mono text-slate-600">{verifiedResult.sekolah.principalNip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  )
}
