'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { 
  ClipboardCheck, Lock, User, ArrowRight, Home, Info, 
  ChevronDown, ChevronUp, ShieldCheck, GraduationCap, Phone,
  HelpCircle, MessageSquare, Sparkles, KeyRound, Globe, Layers,
  Mail, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, X, ArrowLeft
} from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

import Swal from 'sweetalert2'
import { useSession, signOut } from 'next-auth/react'
import { AppNavbar, AppFooter } from '@/components/layout'

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | false>(false)
  const [error, setError] = useState('')
  const [showGuideMobile, setShowGuideMobile] = useState(false)
  const [helpdeskPhone, setHelpdeskPhone] = useState('088293733330')
  const [helpdeskEmail, setHelpdeskEmail] = useState('raza@muhipo.sch.id')
  const [backgroundMaster, setBackgroundMaster] = useState('/muhipo-log.jpg')
  const [logoMaster, setLogoMaster] = useState<string | null>(null)
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  // State Modal Reset Password via OTP
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotAccount, setForgotAccount] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [forgotShowPassword, setForgotShowPassword] = useState(false)
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false)
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('')
  const [forgotCooldown, setForgotCooldown] = useState(0)

  // Timer cooldown OTP resend
  useEffect(() => {
    if (forgotCooldown > 0) {
      const timer = setTimeout(() => setForgotCooldown(forgotCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [forgotCooldown])

  const [publicDomainUrl, setPublicDomainUrl] = useState<string | null>(null)

  // Ambil nomor Helpdesk & Wallpaper Master dari Pengaturan Superadmin
  useEffect(() => {
    // Muat instan dari cache lokal jika tersedia untuk eliminasi flicker
    try {
      const cachedBg = localStorage.getItem('simasmuh_bg_master')
      if (cachedBg) setBackgroundMaster(cachedBg)
      const cachedLogo = localStorage.getItem('simasmuh_logo_master')
      if (cachedLogo) setLogoMaster(cachedLogo)
      const cachedPhone = localStorage.getItem('simasmuh_helpdesk_phone')
      if (cachedPhone) setHelpdeskPhone(cachedPhone)
      const cachedEmail = localStorage.getItem('simasmuh_helpdesk_email')
      if (cachedEmail) setHelpdeskEmail(cachedEmail)
      const cachedDomain = localStorage.getItem('simasmuh_public_domain')
      if (cachedDomain) setPublicDomainUrl(cachedDomain)
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
          if (data?.helpdeskPhone) {
            setHelpdeskPhone(data.helpdeskPhone)
            try { localStorage.setItem('simasmuh_helpdesk_phone', data.helpdeskPhone) } catch {}
          }
          if (data?.email) {
            setHelpdeskEmail(data.email)
            try { localStorage.setItem('simasmuh_helpdesk_email', data.email) } catch {}
          }
          if (data?.backgroundUrl) {
            setBackgroundMaster(data.backgroundUrl)
            try { localStorage.setItem('simasmuh_bg_master', data.backgroundUrl) } catch {}
          }
          if (data?.logoUrl) {
            setLogoMaster(data.logoUrl)
            try { localStorage.setItem('simasmuh_logo_master', data.logoUrl) } catch {}
          }
          if (data?.publicDomainUrl) {
            const cleanDomain = String(data.publicDomainUrl).trim().replace(/\/+$/, '')
            setPublicDomainUrl(cleanDomain)
            try { localStorage.setItem('simasmuh_public_domain', cleanDomain) } catch {}
          }
          if (typeof data?.maintenanceMode === 'boolean') {
            setIsMaintenanceActive(data.maintenanceMode)
          }
          if (data?.maintenanceMessage) {
            setMaintenanceMessage(data.maintenanceMessage)
          }
        }
      } catch (err) {
        console.error('Gagal memuat setting publik:', err)
      }
    }
    loadPublicSettings()
  }, [])

  // Dapatkan callbackUrl tujuan dinamis (misal setelah redirect dari halaman terproteksi)
  const getSafeCallbackUrl = () => {
    if (typeof window === 'undefined') return '/dashboard'
    const params = new URLSearchParams(window.location.search)
    const rawCallback = params.get('callbackUrl')
    if (rawCallback) {
      if (rawCallback.startsWith('/') && !rawCallback.startsWith('//') && !rawCallback.startsWith('/login')) {
        return rawCallback
      }
      try {
        const parsed = new URL(rawCallback)
        if (parsed.pathname && !parsed.pathname.startsWith('/login')) {
          return `${parsed.pathname}${parsed.search}`
        }
      } catch {}
    }
    return '/dashboard'
  }

  // Cek parameter URL untuk sesi kedaluwarsa, maintenance mode, atau error sign-in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear()
      } catch {}
      const url = new URL(window.location.href)
      if (url.searchParams.get('expired') === '1') {
        setError('Sesi perangkat Anda telah diakhiri atau kedaluwarsa. Silakan masuk kembali.')
        signOut({ redirect: false })
        url.searchParams.delete('expired')
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
        window.history.replaceState({}, document.title, `${url.pathname}${cleanQuery}`)
      } else if (url.searchParams.get('error')) {
        const errParam = url.searchParams.get('error')
        const emailParam = url.searchParams.get('email')
        const msgParam = url.searchParams.get('msg')

        if (errParam === 'MaintenanceMode') {
          const detailMsg = msgParam || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.'
          setError(detailMsg)
          Swal.fire({
            title: 'Pemeliharaan Sistem',
            text: detailMsg,
            icon: 'info',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#2563eb',
            customClass: {
              popup: 'rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900',
              title: 'text-slate-900 dark:text-white font-extrabold text-base sm:text-lg',
              htmlContainer: 'text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed',
            }
          })
        } else if (errParam === 'CredentialsSignin') {
          setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali.')
        } else if (errParam === 'GoogleUnregistered') {
          setError(
            emailParam
              ? `Email Google (${emailParam}) belum terdaftar di SIMASMUH. Hubungi admin untuk mendaftarkan email akun Anda.`
              : 'Akun Google Anda belum terdaftar di SIMASMUH. Hubungi admin untuk integrasi email.'
          )
        } else if (errParam === 'OAuthCallback' || errParam === 'OAuthSignin' || errParam === 'OAuthAccountNotLinked') {
          setError('Gagal masuk melalui Google OAuth. Silakan coba lagi atau gunakan login manual.')
        } else {
          setError('Gagal masuk ke sistem. Silakan coba lagi.')
        }
        url.searchParams.delete('error')
        url.searchParams.delete('email')
        url.searchParams.delete('msg')
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
        window.history.replaceState({}, document.title, `${url.pathname}${cleanQuery}`)
      }
    }
  }, [])

  // Handler Tombol Masuk dengan Google secara adaptif mengikuti origin pengguna saat ini
  const handleGoogleSignIn = () => {
    setLoading('Menghubungkan ke Google...')
    const safeCallback = getSafeCallbackUrl()
    signIn('google', { callbackUrl: safeCallback })
  }

  // Jika sudah dalam keadaan login aktif yang valid (bukan setelah expired), arahkan langsung ke callbackUrl atau /dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user && (session as any)?.error !== 'SessionExpired') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('expired') !== '1') {
          router.replace(getSafeCallbackUrl())
        }
      }
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Memvalidasi...')
    setError('')

    try {
      // Pre-check autentikasi langsung ke endpoint auth backend jika sedang maintenance
      const checkRes = await fetch(getPublicApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        })
      })

      if (!checkRes.ok) {
        const errJson = await checkRes.json().catch(() => ({}))
        const errorMsg = errJson?.message || ''
        if (typeof errorMsg === 'string' && errorMsg.startsWith('MAINTENANCE:')) {
          const detailMsg = errorMsg.replace('MAINTENANCE:', '').trim() || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.'
          setError(detailMsg)
          setLoading(false)
          Swal.fire({
            title: 'Pemeliharaan Sistem',
            text: detailMsg,
            icon: 'warning',
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#2563eb',
            customClass: {
              popup: 'rounded-2xl shadow-2xl border border-amber-200/80 dark:border-amber-900/40 dark:bg-slate-900',
              title: 'text-slate-900 dark:text-white font-black text-lg',
              htmlContainer: 'text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed',
            }
          })
          return
        }
      }

      const targetUrl = getSafeCallbackUrl()
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.ok) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.clear()
          } catch {}
        }
        setLoading('Mengalihkan...')
        // Gunakan window.location.assign untuk transisi halaman penuh yang memuat state session teranyar secara instan
        window.location.assign(targetUrl)
        return
      }

      if (result?.error) {
        setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali.')
      } else {
        setError('Gagal masuk ke sistem. Silakan periksa kembali akun Anda.')
      }
      setLoading(false)
    } catch (err: any) {
      console.error('Login error:', err)
      // Jika terjadi kesalahan saat navigasi/eksekusi namun sebenarnya berhasil terautentikasi
      if (typeof window !== 'undefined') {
        window.location.assign(getSafeCallbackUrl())
        return
      }
      setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali.')
      setLoading(false)
    }
  }

  // Handler Minta OTP Reset Password
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotAccount.trim()) {
      setForgotError('Masukkan username, NIS, atau email akun Anda.')
      return
    }

    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/request-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({ emailOrUsername: forgotAccount.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim kode OTP.')
      }

      setForgotMaskedEmail(data.maskedEmail || 'email terdaftar Anda')
      setForgotStep(2)
      setForgotCooldown(30)
      setForgotSuccessMessage(`Kode OTP 6-digit berhasil dikirimkan ke email ${data.maskedEmail}.`)
    } catch (err: any) {
      setForgotError(err.message || 'Terjadi kesalahan saat meminta kode OTP.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Handler Reset Password dengan OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')

    const cleanOtp = forgotOtp.trim().replace(/\s+/g, '')
    if (!cleanOtp || cleanOtp.length < 4) {
      setForgotError('Masukkan 6 digit kode OTP yang dikirimkan ke email Anda.')
      return
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('Kata sandi baru minimal harus 6 karakter.')
      return
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.')
      return
    }

    setForgotLoading(true)
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({
          emailOrUsername: forgotAccount.trim(),
          otpCode: cleanOtp,
          newPassword: forgotNewPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mereset kata sandi.')
      }

      setForgotStep(3)
      setForgotSuccessMessage(data.message || 'Kata sandi berhasil diperbarui!')
    } catch (err: any) {
      setForgotError(err.message || 'Gagal mereset kata sandi.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Handler Kirim Ulang OTP
  const handleResendOtp = async () => {
    if (forgotCooldown > 0 || forgotLoading) return
    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/request-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({ emailOrUsername: forgotAccount.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim ulang kode OTP.')
      }

      setForgotCooldown(60)
      setForgotSuccessMessage(`Kode OTP baru telah dikirimkan ke email ${data.maskedEmail}.`)
    } catch (err: any) {
      setForgotError(err.message || 'Gagal mengirim ulang kode OTP.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Wallpaper Master with Smooth Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        {backgroundMaster && (backgroundMaster.startsWith('http') || backgroundMaster.startsWith('data:')) ? (
          <img
            src={backgroundMaster}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <NextImage
            src={backgroundMaster || "/muhipo-log.jpg"}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>
      <div className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-[2px] -z-20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] -z-10 pointer-events-none" />

      {/* Navbar Atas Terpadu: Kiri Logo, Kanan Presensi View & Theme Switcher */}
      <AppNavbar
        isDarkWallpaper
        logoUrl={logoMaster}
        actions={
          <>
            <Link
              href="/presensi-view"
              className="h-9 px-3.5 text-xs font-bold border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-850 rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Presensi</span>
            </Link>
            <ThemeToggle />
          </>
        }
      />

      {/* Konten Utama: Desktop Grid 2 Kolom Sejajar & Simetris, Rata Tengah dengan Efek Glassmorphic Modern */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-5 lg:p-6 pt-4 sm:pt-6 pb-8 sm:pb-10 z-10 w-full max-w-5xl mx-auto my-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          
          {/* Kolom Kiri: Card Login Form (Compact & Touchscreen Friendly) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl overflow-hidden p-5 sm:p-6 space-y-4 text-slate-900 dark:text-white relative group">
              
              <div className="my-auto space-y-4">
                {/* Header Card dengan Icon Berwarna Khas */}
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-400/30 shadow-xs mb-0.5">
                    <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Masuk Akun
                  </h1>
                  <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>SIMASMUH SMA Muhipo</span>
                    {isMaintenanceActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pemeliharaan Sistem
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">Online</span>
                    )}
                  </div>
                </div>

                {/* Maintenance Notice Box if Active */}
                {isMaintenanceActive && (
                  <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900 dark:text-amber-100">Pemeliharaan Sistem Aktif</div>
                      <div className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        {maintenanceMessage || 'Layanan SIMASMUH sedang dalam pemeliharaan berkala untuk optimalisasi sistem. Akses sementara dibatasi untuk Administrator.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert Error */}
                {error && !isMaintenanceActive && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form Login */}
                <form onSubmit={handleSubmit} className="space-y-3.5 pt-0.5">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>Username / NIS / Email</span>
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Masukkan username atau NIS"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-200 dark:border-cyan-400/30">
                          <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span>Kata Sandi</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotAccount(email)
                          setForgotError('')
                          setForgotSuccessMessage('')
                          setForgotStep(1)
                          setIsForgotModalOpen(true)
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all py-1"
                      >
                        Lupa sandi?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Masukkan kata sandi"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="h-11 px-3.5 pr-11 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label={showLoginPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                        title={showLoginPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.98] mt-2 touch-manipulation"
                  >
                    {loading === 'Memvalidasi...' || loading === 'Mengalihkan...' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{loading}</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Masuk Sekarang
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Pemisah atau Google OAuth */}
                <div className="relative my-3.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 font-medium">
                      Atau Autentikasi Terintegrasi
                    </span>
                  </div>
                </div>

                {/* Tombol Masuk dengan Google */}
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!!loading}
                    onClick={handleGoogleSignIn}
                    className="w-full h-11 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900/90 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2.5 touch-manipulation"
                  >
                    {loading === 'Menghubungkan ke Google...' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin" />
                        <span className="text-xs">Menghubungkan ke Google...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Masuk dengan Google</span>
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                    Khusus akun pengguna yang telah menautkan email Google pada menu Profil.
                  </p>
                </div>

                {/* Accordion Petunjuk Kredensial Pengguna Khusus Mobile */}
                <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowGuideMobile(!showGuideMobile)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors py-1.5 px-1 rounded-lg touch-manipulation min-h-[40px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                        <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Petunjuk Kredensial Pengguna
                    </span>
                    {showGuideMobile ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>

                  {showGuideMobile && (
                    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">Siswa:</span> Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS</span> sebagai username dan sandi.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <span className="font-bold text-purple-700 dark:text-purple-300">Wali Murid:</span> Username: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">No. WA</span> & Sandi: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS Siswa</span>.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="font-bold text-blue-700 dark:text-blue-300">Guru / Pegawai:</span> Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">Username</span> terdaftar.
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Butuh bantuan?</span>
                        <a
                          href={`https://wa.me/${helpdeskPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Helpdesk WA: {helpdeskPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Beranda */}
              <div className="pt-2">
                <Link
                  href="/"
                  className="w-full flex items-center justify-center py-2.5 px-4 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-xl transition-all gap-2 shadow-2xs active:scale-[0.98] min-h-[40px] touch-manipulation"
                >
                  <Home className="w-4 h-4 text-slate-500" />
                  Kembali ke Beranda
                </Link>
              </div>

            </div>
          </div>

          {/* Kolom Kanan: Petunjuk Kredensial Pengguna & Helpdesk (Desktop Sejajar & Compact) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white shadow-xl space-y-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Panduan Akses SIMASMUH</span>
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Petunjuk Kredensial Pengguna
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Format akun resmi sesuai dengan peran Anda di sekolah.
                </p>
              </div>

              {/* Card List Petunjuk Kredensial */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/30 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-emerald-700 dark:text-emerald-300">Siswa</div>
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS</span> sebagai username dan kata sandi.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-purple-300 dark:hover:border-purple-500/40">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-400/30 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-purple-700 dark:text-purple-300">Wali Murid / Orang Tua</div>
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Username: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">No. HP / Telepon</span> & Kata Sandi: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS Siswa</span>.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-blue-300 dark:hover:border-blue-500/40">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-blue-700 dark:text-blue-300">Guru / Tenaga Kependidikan</div>
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">Username</span> dan kata sandi yang terdaftar.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kotak Bantuan Admin & Helpdesk */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Kendala Akses atau Lupa Kata Sandi?</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Hubungi <span className="font-bold text-slate-900 dark:text-white">Layanan Bantuan SIMASMUH</span> di <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{helpdeskEmail}</span> atau telepon <span className="font-mono font-bold text-slate-900 dark:text-white">{helpdeskPhone}</span> jika akun Anda bermasalah.
              </p>
              <div className="pt-0.5 flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${helpdeskEmail}?subject=Bantuan%20Akses%20SIMASMUH`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs touch-manipulation min-h-[38px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Kirim Email Bantuan</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setForgotAccount(email)
                    setForgotError('')
                    setForgotSuccessMessage('')
                    setForgotStep(1)
                    setIsForgotModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs touch-manipulation min-h-[38px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Reset Sandi via OTP</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal / Dialog Reset Password via Single-Use Email OTP */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden p-6 sm:p-7 space-y-5 text-slate-900 dark:text-white relative animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Reset Kata Sandi via Email OTP
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kode OTP sekali pakai dikirimkan ke Email terdaftar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Modal */}
            <div className="flex items-center justify-center gap-2">
              <div className={`h-1.5 rounded-full transition-all ${forgotStep >= 1 ? 'w-8 bg-blue-600' : 'w-4 bg-slate-200 dark:bg-slate-800'}`} />
              <div className={`h-1.5 rounded-full transition-all ${forgotStep >= 2 ? 'w-8 bg-blue-600' : 'w-4 bg-slate-200 dark:bg-slate-800'}`} />
              <div className={`h-1.5 rounded-full transition-all ${forgotStep === 3 ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-200 dark:bg-slate-800'}`} />
            </div>

            {/* Alert Error */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Alert Success */}
            {forgotSuccessMessage && !forgotError && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forgotSuccessMessage}</span>
              </div>
            )}

            {/* Step 1: Input Akun */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgotAccount" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Username / NIS / Email Akun</span>
                  </Label>
                  <Input
                    id="forgotAccount"
                    type="text"
                    placeholder="Masukkan username akun atau NIS"
                    value={forgotAccount}
                    onChange={(e) => setForgotAccount(e.target.value)}
                    required
                    autoFocus
                    className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sistem akan mengirimkan 6 digit kode OTP ke alamat email resmi yang terdaftar pada akun Anda.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="h-11 px-4 rounded-xl font-bold text-xs border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
                  >
                    {forgotLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengirim Kode OTP...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" />
                        Kirim Kode OTP
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 2: Masukkan OTP & Kata Sandi Baru */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Kode OTP terkirim ke <span className="font-bold text-slate-900 dark:text-white">{forgotMaskedEmail}</span> (Sekali Pakai).
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="forgotOtp" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Kode OTP 6-Digit</span>
                    </Label>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={forgotCooldown > 0 || forgotLoading}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 transition-colors"
                    >
                      {forgotCooldown > 0 ? `Kirim ulang (${forgotCooldown}s)` : 'Kirim Ulang OTP'}
                    </button>
                  </div>
                  <Input
                    id="forgotOtp"
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 849201"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    autoFocus
                    className="h-12 px-3.5 rounded-xl text-center font-mono font-bold text-xl tracking-[6px] transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="forgotNewPassword" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Kata Sandi Baru</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="forgotNewPassword"
                      type={forgotShowPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      className="h-11 px-3.5 pr-10 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setForgotShowPassword(!forgotShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {forgotShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="forgotConfirmPassword" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Konfirmasi Kata Sandi Baru</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="forgotConfirmPassword"
                      type={forgotShowConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi kata sandi baru"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      required
                      className="h-11 px-3.5 pr-10 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
                      aria-label={forgotShowConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      title={forgotShowConfirmPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    >
                      {forgotShowConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForgotStep(1)
                      setForgotError('')
                    }}
                    className="h-11 px-4 rounded-xl font-bold text-xs border-slate-300 dark:border-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
                  >
                    {forgotLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Simpan Sandi Baru
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Sukses */}
            {forgotStep === 3 && (
              <div className="space-y-5 text-center py-3 animate-in zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Kata Sandi Berhasil Diperbarui!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Silakan masuk kembali dengan kata sandi baru Anda.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setIsForgotModalOpen(false)
                    setEmail(forgotAccount)
                    setPassword('')
                  }}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
                >
                  Masuk dengan Sandi Baru
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Footer Induk dengan Kontras Jelas */}
      <AppFooter isDarkWallpaper />
    </div>
  )
}


