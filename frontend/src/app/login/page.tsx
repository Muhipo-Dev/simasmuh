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
  ChevronDown, ChevronUp, ShieldCheck, GraduationCap, Phone
} from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

import { useSession } from 'next-auth/react'
import { AppNavbar, AppFooter } from '@/components/layout'

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | false>(false)
  const [error, setError] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  // Jika sudah dalam keadaan login aktif, langsung arahkan ke dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/dashboard')
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
        window.location.href = '/dashboard'
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

      {/* Konten Utama: Login Card Bersih, Modern & Elegan */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 w-full max-w-md mx-auto my-auto">
        <div className="w-full rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden p-6 sm:p-8 space-y-6">
          
          {/* Header Card */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Masuk Akun
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Sistem Informasi Manajemen Terpadu
            </p>
          </div>

          {/* Alert Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Username / NIS / No. WhatsApp
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="Masukkan username akun Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-600 bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Password / Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-600 bg-slate-50/70 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
              />
            </div>

            <Button
              type="submit"
              disabled={!!loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] mt-2"
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

          {/* Accordion Panduan Format Login Ringkas */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 px-1 rounded-lg"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Bantuan Format Akun (Siswa/Guru/Wali)
              </span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showGuide && (
              <div className="mt-3 space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Siswa:</span> Gunakan <span className="font-mono font-bold">NIS</span> sebagai username & password.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Wali Murid:</span> Username <span className="font-mono font-bold">No. WA</span> & password <span className="font-mono font-bold">NIS Anak</span>.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Guru / Staff:</span> Gunakan <span className="font-mono font-bold">Username</span> & password terdaftar.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Beranda */}
          <div className="pt-1">
            <Link
              href="/"
              className="w-full flex items-center justify-center py-2.5 px-3 border border-slate-200 dark:border-slate-800 font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </Link>
          </div>

        </div>
      </main>

      {/* Footer Induk dengan Kontras Jelas */}
      <AppFooter isDarkWallpaper />
    </div>
  )
}

