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
  HelpCircle, MessageSquare, Sparkles, KeyRound, Globe, Layers
} from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

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
  const [backgroundMaster, setBackgroundMaster] = useState('/muhipo-log.jpg')
  const [logoMaster, setLogoMaster] = useState<string | null>(null)

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
          if (data?.backgroundUrl) {
            setBackgroundMaster(data.backgroundUrl)
            try { localStorage.setItem('simasmuh_bg_master', data.backgroundUrl) } catch {}
          }
          if (data?.logoUrl) {
            setLogoMaster(data.logoUrl)
            try { localStorage.setItem('simasmuh_logo_master', data.logoUrl) } catch {}
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
    if (rawCallback && rawCallback.startsWith('/') && !rawCallback.startsWith('//') && !rawCallback.startsWith('/login')) {
      return rawCallback
    }
    return '/dashboard'
  }

  // Cek parameter URL untuk sesi kedaluwarsa atau error sign-in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('expired') === '1') {
        setError('Sesi perangkat Anda telah diakhiri atau kedaluwarsa. Silakan masuk kembali.')
        signOut({ redirect: false })
        url.searchParams.delete('expired')
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
        window.history.replaceState({}, document.title, `${url.pathname}${cleanQuery}`)
      } else if (url.searchParams.get('error')) {
        const errParam = url.searchParams.get('error')
        if (errParam === 'CredentialsSignin') {
          setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali.')
        } else {
          setError('Gagal masuk ke sistem. Silakan coba lagi.')
        }
        url.searchParams.delete('error')
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
        window.history.replaceState({}, document.title, `${url.pathname}${cleanQuery}`)
      }
    }
  }, [])

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
      const targetUrl = getSafeCallbackUrl()
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.ok) {
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

      {/* Konten Utama: Desktop Grid 2 Kolom Sejajar, Rata Tengah Sedikit Kebawah dengan Efek Glassmorphic & Icon Berwarna */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-8 sm:pt-12 pb-12 sm:pb-16 z-10 w-full max-w-5xl mx-auto my-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Kolom Kiri: Card Login Form (Kontras Tinggi Selaras CBT MUHIPO & Icon Berwarna) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full flex flex-col justify-between rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white relative group">
              
              <div className="my-auto space-y-6">
                {/* Header Card dengan Icon Berwarna Khas */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-400/30 shadow-xs mb-1">
                    <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Masuk Akun
                  </h1>
                  <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Sistem Informasi Manajemen SMA Muhipo</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">Online</span>
                  </div>
                </div>

                {/* Alert Error */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form Login */}
                <form onSubmit={handleSubmit} className="space-y-4.5 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                        <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>Username / NIS / Email</span>
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Masukkan username akun Anda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-200 dark:border-cyan-400/30">
                        <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <span>Password / Kata Sandi</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Masukkan kata sandi"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] mt-2.5"
                  >
                    {loading ? (
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

                {/* Accordion Petunjuk Kredensial Pengguna Khusus Mobile */}
                <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowGuideMobile(!showGuideMobile)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors py-1 px-1 rounded-lg"
                  >
                    <span className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                        <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Petunjuk Kredensial Pengguna
                    </span>
                    {showGuideMobile ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  {showGuideMobile && (
                    <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">Siswa:</span> Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS</span> sebagai username dan kata sandi.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <span className="font-bold text-purple-700 dark:text-purple-300">Wali Murid / Orang Tua:</span> Username: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">No. WhatsApp</span> & Kata Sandi: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS Siswa</span>.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <span className="font-bold text-blue-700 dark:text-blue-300">Guru / Tenaga Kependidikan:</span> Gunakan <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">Username</span> dan kata sandi yang terdaftar.
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                        Mengalami kendala? Hubungi <span className="font-bold text-slate-800 dark:text-slate-200">Layanan Bantuan (Helpdesk)</span> WhatsApp: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{helpdeskPhone}</span>.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Beranda */}
              <div className="pt-4">
                <Link
                  href="/"
                  className="w-full flex items-center justify-center py-2.5 px-4 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-xl transition-all gap-2 shadow-2xs active:scale-[0.99]"
                >
                  <Home className="w-4 h-4 text-slate-500" />
                  Kembali ke Beranda
                </Link>
              </div>

            </div>
          </div>

          {/* Kolom Kanan: Petunjuk Kredensial Pengguna & Helpdesk (Desktop Sejajar & Kontras Tinggi) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Panduan Akses SIMASMUH</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Petunjuk Kredensial Pengguna
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                  Format akun sesuai dengan peran Anda di lingkungan sekolah.
                </p>
              </div>

              {/* Card List Petunjuk Kredensial */}
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-emerald-300 dark:hover:border-emerald-500/40">
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

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-purple-300 dark:hover:border-purple-500/40">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-400/30 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-purple-700 dark:text-purple-300">Wali Murid / Orang Tua</div>
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Username: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">No. WhatsApp</span> & Kata Sandi: <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">NIS Siswa</span>.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 transition-all hover:border-blue-300 dark:hover:border-blue-500/40">
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
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Kendala Akses atau Lupa Kata Sandi?</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Hubungi <span className="font-bold text-slate-900 dark:text-white">Layanan Bantuan (Helpdesk)</span> WhatsApp <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{helpdeskPhone}</span> jika mengalami kendala akun.
              </p>
              <div className="pt-0.5">
                <a
                  href={`https://wa.me/${helpdeskPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20Admin%20SIMASMUH,%20saya%20membutuhkan%20bantuan%20kendala%20login%20akun.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Hubungi Helpdesk WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Induk dengan Kontras Jelas */}
      <AppFooter isDarkWallpaper />
    </div>
  )
}


