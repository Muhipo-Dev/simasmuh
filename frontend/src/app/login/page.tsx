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

  // Ambil nomor Helpdesk & Wallpaper Master dari Pengaturan Superadmin
  useEffect(() => {
    async function loadPublicSettings() {
      try {
        const res = await fetch(getPublicApiUrl('/settings/public'))
        if (res.ok) {
          const data = await res.json()
          if (data?.helpdeskPhone) {
            setHelpdeskPhone(data.helpdeskPhone)
          }
          if (data?.backgroundUrl) {
            setBackgroundMaster(data.backgroundUrl)
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

  // Cek parameter URL untuk sesi yang telah diputus / kedaluwarsa
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('expired') === '1') {
        setError('Sesi perangkat Anda telah diakhiri atau kedaluwarsa. Silakan masuk kembali.')
        // Bersihkan session cookie NextAuth di browser secara tuntas
        signOut({ redirect: false })

        // Bersihkan parameter 'expired' dari bilah URL tanpa refresh halaman
        url.searchParams.delete('expired')
        const cleanQuery = url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''
        window.history.replaceState({}, document.title, `${url.pathname}${cleanQuery}`)
      }
    }
  }, [])

  // Jika sudah dalam keadaan login aktif yang valid (bukan setelah expired), arahkan dinamis ke halaman tujuan / dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user && (session as any)?.error !== 'SessionExpired') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('expired') !== '1') {
          const target = getSafeCallbackUrl()
          router.replace(target)
        }
      }
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Memvalidasi...')
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError('Username atau kata sandi tidak sesuai.')
      } else if (result?.ok) {
        setLoading('Mengalihkan...')
        const targetUrl = getSafeCallbackUrl()
        window.location.href = targetUrl
        return
      } else {
        setError('Gagal masuk. Silakan coba lagi.')
      }
    } catch (err) {
      console.error(err)
      setError('Koneksi terputus. Gagal menghubungi server.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Wallpaper with Smooth Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden">
        {backgroundMaster.startsWith('http') || backgroundMaster.startsWith('data:') ? (
          <img
            src={backgroundMaster}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <NextImage
            src={backgroundMaster}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>
      <div className="fixed inset-0 bg-slate-950/75 dark:bg-slate-950/90 backdrop-blur-md -z-20" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] -z-10" />

      {/* Navbar Atas Terpadu: Kiri Logo, Kanan Presensi View & Theme Switcher */}
      <AppNavbar
        isDarkWallpaper
        actions={
          <>
            <Link
              href="/presensi-view"
              className="h-9 px-3.5 text-xs font-bold border border-white/20 text-white bg-white/10 hover:bg-white/20 hover:text-white rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Presensi</span>
            </Link>
            <ThemeToggle />
          </>
        }
      />

      {/* Konten Utama: Desktop Grid 2 Kolom Sejajar, Rata Tengah Sedikit Kebawah dengan Efek Glassmorphic & Icon Berwarna */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-8 sm:pt-12 pb-12 sm:pb-16 z-10 w-full max-w-5xl mx-auto my-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Kolom Kiri: Card Login Form (Transparan Glassmorphism Selaras & Icon Berwarna Khas) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="w-full h-full flex flex-col justify-between rounded-3xl shadow-2xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-slate-900/50 backdrop-blur-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-white relative group">
              
              {/* Subtle Ambient Glow Effect inside card */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

              <div className="my-auto space-y-6">
                {/* Header Card dengan Icon Berwarna Khas Transparan */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-cyan-500/30 border border-blue-400/40 backdrop-blur-xl shadow-lg shadow-blue-500/20 mb-1">
                    <Lock className="w-6 h-6 text-blue-300 drop-shadow-md" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Masuk Akun
                  </h1>
                  <div className="flex items-center justify-center gap-1.5 text-slate-200/90 text-xs sm:text-sm font-medium">
                    <KeyRound className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                    <span>Single Sign-On (SSO)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">Aktif</span>
                  </div>
                </div>

                {/* Alert Error */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-medium flex items-center gap-2.5 animate-in fade-in backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form Login */}
                <form onSubmit={handleSubmit} className="space-y-4.5 pt-1">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                        <User className="w-3 h-3 text-blue-300" />
                      </div>
                      <span>Username / NIS / No. WhatsApp</span>
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Masukkan username akun Anda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-400 bg-white/10 dark:bg-slate-800/60 border-white/20 dark:border-white/15 text-white placeholder:text-slate-300/60 backdrop-blur-md focus:bg-white/15"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30">
                        <Lock className="w-3 h-3 text-cyan-300" />
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
                      className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-400 bg-white/10 dark:bg-slate-800/60 border-white/20 dark:border-white/15 text-white placeholder:text-slate-300/60 backdrop-blur-md focus:bg-white/15"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm rounded-xl transition-all shadow-xl shadow-blue-900/40 active:scale-[0.99] border border-blue-400/40 backdrop-blur-md mt-2.5"
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
                <div className="lg:hidden border-t border-white/15 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowGuideMobile(!showGuideMobile)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-blue-300 transition-colors py-1 px-1 rounded-lg"
                  >
                    <span className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-400/30">
                        <Info className="w-3 h-3 text-blue-300" />
                      </div>
                      Petunjuk Kredensial Pengguna
                    </span>
                    {showGuideMobile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showGuideMobile && (
                    <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/15 text-[11px] leading-relaxed text-slate-200 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-200">Siswa:</span> Gunakan <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded">NIS</span> sebagai username dan kata sandi.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-purple-300" />
                        </div>
                        <div>
                          <span className="font-bold text-purple-200">Wali Murid / Orang Tua:</span> Username: <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded">No. WhatsApp</span> & Kata Sandi: <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded">NIS Siswa</span>.
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                        </div>
                        <div>
                          <span className="font-bold text-blue-200">Guru / Tenaga Kependidikan:</span> Gunakan <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded">Username</span> dan kata sandi yang terdaftar.
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/15 text-[10px] text-slate-300">
                        Mengalami kendala? Hubungi <span className="font-semibold text-white">Layanan Bantuan (Helpdesk)</span> WhatsApp: <span className="font-mono font-bold text-emerald-300">{helpdeskPhone}</span>.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Beranda */}
              <div className="pt-4">
                <Link
                  href="/"
                  className="w-full flex items-center justify-center py-3 px-4 border border-white/20 font-semibold text-xs text-slate-200 hover:text-white bg-white/5 hover:bg-white/15 rounded-xl backdrop-blur-md transition-all gap-2 shadow-sm active:scale-[0.99]"
                >
                  <Home className="w-4 h-4 text-slate-300" />
                  Kembali ke Beranda
                </Link>
              </div>

            </div>
          </div>

          {/* Kolom Kanan: Petunjuk Kredensial Pengguna & Helpdesk (Desktop Sejajar & Transparan) */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-6 sm:p-8 rounded-3xl bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 text-white shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Panduan Akses SIMASMUH</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Petunjuk Kredensial Pengguna
                </h2>
                <p className="text-slate-200/90 text-xs sm:text-sm mt-0.5">
                  Format akun sesuai dengan peran Anda di lingkungan sekolah.
                </p>
              </div>

              {/* Card List Petunjuk Kredensial */}
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-emerald-200">Siswa</div>
                    <div className="text-slate-200 leading-relaxed">
                      Gunakan <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded text-white">NIS</span> sebagai username dan kata sandi.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-purple-200">Wali Murid / Orang Tua</div>
                    <div className="text-slate-200 leading-relaxed">
                      Username: <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded text-white">No. WhatsApp</span> & Kata Sandi: <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded text-white">NIS Siswa</span>.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/10 dark:bg-slate-800/50 border border-white/15 backdrop-blur-md transition-all hover:bg-white/15">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-blue-300" />
                  </div>
                  <div className="text-xs space-y-0.5 w-full">
                    <div className="font-bold text-blue-200">Guru / Tenaga Kependidikan</div>
                    <div className="text-slate-200 leading-relaxed">
                      Gunakan <span className="font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded text-white">Username</span> dan kata sandi yang terdaftar.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Kotak Bantuan Admin & Helpdesk */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-400/30 backdrop-blur-md space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-200">
                <HelpCircle className="w-4 h-4 text-blue-300" />
                <span>Kendala Akses atau Lupa Kata Sandi?</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-relaxed">
                Hubungi <span className="font-semibold text-white">Layanan Bantuan (Helpdesk)</span> WhatsApp <span className="font-mono font-bold text-emerald-300">{helpdeskPhone}</span> jika mengalami kendala akun.
              </p>
              <div className="pt-0.5">
                <a
                  href={`https://wa.me/${helpdeskPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20Admin%20SIMASMUH,%20saya%20membutuhkan%20bantuan%20kendala%20login%20akun.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm border border-emerald-400/30 backdrop-blur-md"
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


