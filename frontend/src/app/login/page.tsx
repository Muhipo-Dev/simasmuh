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
  ClipboardCheck, CalendarDays, Lock, User, Sparkles, 
  ArrowRight, ShieldCheck, Home, Info, Phone, GraduationCap,
  HelpCircle, CheckCircle2
} from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | false>(false)
  const [error, setError] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [semester, setSemester] = useState('')

  useEffect(() => {
    fetch(getPublicApiUrl('/settings/public'), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.academicYear) setAcademicYear(data.academicYear)
        if (data?.semester) setSemester(data.semester)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Memvalidasi akun...')
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      if (result?.error) {
        setError('Username atau kata sandi tidak sesuai. Silakan periksa kembali.')
      } else if (result?.ok) {
        setLoading('Mengalihkan ke dashboard...')
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
      {/* Background Wallpaper with Dark/Light Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden">
        <NextImage
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105 transition-transform duration-1000 ease-out"
        />
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-blue-950/80 dark:from-slate-950/95 dark:via-slate-950/90 dark:to-slate-900/95 backdrop-blur-[3px] -z-20" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] sm:bg-[size:32px_32px] -z-10" />

      {/* Navbar Atas Minimalis & Responsif */}
      <header className="w-full z-30 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="p-1.5 rounded-xl bg-white/20 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <NextImage
              src="/pic_logo.png"
              alt="Logo SIMASMUH"
              width={36}
              height={36}
              className="h-6 sm:h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col text-white">
            <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
              SIMASMUH
            </span>
            <span className="text-[10px] text-blue-200/80 font-medium hidden sm:inline leading-none">
              SMA Muhammadiyah 1 Ponorogo
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {academicYear && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 dark:bg-slate-900/60 border border-white/20 text-white font-semibold text-xs backdrop-blur-md shadow-xs">
              <CalendarDays className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>TA: {academicYear}</span>
              {semester && <span className="text-blue-200 text-[11px]">({semester})</span>}
            </div>
          )}
          <Link
            href="/presensi-view"
            className="h-9 px-2.5 sm:px-3 text-xs font-bold border border-white/20 text-white bg-white/10 hover:bg-white/20 dark:bg-slate-900/60 dark:hover:bg-slate-800 rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="hidden sm:inline">Presensi Guru & Karyawan</span>
            <span className="sm:hidden">Presensi</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Konten Utama: Card Island Terpadu (Responsif Mobile, Tablet, Desktop) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 z-10 w-full max-w-5xl mx-auto my-auto">
        
        {/* Header Branding Ringkas di Atas Island */}
        <div className="text-center space-y-1.5 mb-4 sm:mb-6 lg:mb-8">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/15 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-sm mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Portal Sistem Informasi Manajemen Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
            Masuk ke Portal SIMASMUH
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm max-w-md mx-auto drop-shadow-sm font-medium px-3 leading-relaxed">
            Silakan lengkapi autentikasi akun Anda sesuai panduan kredensial yang tersedia.
          </p>
        </div>

        {/* Island Card Terpadu */}
        <div className="w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl overflow-hidden">
          <div className="w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            
            {/* ========================================================= */}
            {/* SISI KIRI: Area Autentikasi (Placeholder & Tombol Login)  */}
            {/* ========================================================= */}
            <div className="md:col-span-6 p-5 sm:p-7 md:p-8 lg:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Autentikasi Akun
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                    Gunakan username, NIS, atau No. WhatsApp terdaftar.
                  </p>
                </div>

                {/* Alert Error */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in-50">
                    <div className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  {/* Input Username */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      Username / NIS / No. WhatsApp
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Masukkan username, NIS, atau no. WA"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 px-3.5 sm:px-4 rounded-xl text-base sm:text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-600 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-inner"
                    />
                  </div>

                  {/* Input Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      Password / Kata Sandi
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Masukkan password atau NIS"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 px-3.5 sm:px-4 rounded-xl text-base sm:text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-600 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-inner"
                    />
                  </div>

                  {/* Tombol Login */}
                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.99] touch-target mt-3"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{loading}</span>
                      </div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Masuk ke Akun
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>

              {/* Tombol Beranda */}
              <div className="pt-4 sm:pt-5 mt-5 sm:mt-6 border-t border-slate-100 dark:border-slate-800/80">
                <Link
                  href="/"
                  className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 border border-slate-200 dark:border-slate-800 font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all gap-2"
                >
                  <Home className="w-4 h-4 text-slate-400" />
                  Kembali ke Beranda
                </Link>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SISI KANAN: Informasi Panduan Akses (Satu Island Berdampingan) */}
            {/* ========================================================= */}
            <div className="md:col-span-6 p-5 sm:p-7 md:p-8 lg:p-10 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col justify-between space-y-4 sm:space-y-6">
              <div className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Panduan Kredensial Pengguna
                  </h3>
                </div>

                {/* 1. Guru & Pegawai */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-xs sm:text-sm space-y-1 flex-1 min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      Guru & Karyawan / Pegawai
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed break-words">
                      Username: <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">Username Akun</strong> &bull; Password: <strong>Kata Sandi Terdaftar</strong>
                    </p>
                  </div>
                </div>

                {/* 2. Siswa */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-xs sm:text-sm space-y-1 flex-1 min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      Siswa (Peserta Didik)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed break-words">
                      Username: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">NIS Siswa</strong> &bull; Password: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">NIS Siswa</strong>
                    </p>
                  </div>
                </div>

                {/* 3. Wali Murid */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-xs sm:text-sm space-y-1 flex-1 min-w-0">
                    <span className="font-extrabold text-slate-900 dark:text-white block">
                      Wali Murid (Orang Tua)
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed break-words">
                      Username: <strong className="text-purple-600 dark:text-purple-400 font-mono font-bold">Nomor WhatsApp</strong> &bull; Password: <strong className="text-purple-600 dark:text-purple-400 font-mono font-bold">NIS Siswa Anak</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5 leading-normal">
                      *Jika memiliki lebih dari 1 anak, gunakan NIS anak yang terdaftar pertama.
                    </p>
                  </div>
                </div>
              </div>

              {/* Catatan Keamanan */}
              <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="leading-tight">Hubungi Admin TU / Helpdesk Sekolah jika mengalami kendala akses.</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer Minimalis */}
      <footer className="w-full py-2.5 sm:py-3 text-center text-[10px] sm:text-[11px] text-white/70 font-medium z-10">
        Copyright &copy; 2026 Muhipo Dev &bull; SMA Muhammadiyah 1 Ponorogo
      </footer>
    </div>
  )
}
