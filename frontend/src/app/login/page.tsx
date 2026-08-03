'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ClipboardCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | false>(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Memulai login...')
    setError('')

    try {
      setLoading('Menghubungi server otentikasi...')
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      })

      setLoading('Mengevaluasi hasil login...')
      if (result?.error) {
        setError('Ada yang salah! - Coba Lagi 😊✌️')
      } else if (result?.ok) {
        setLoading('Mengalihkan ke dashboard...')
        window.location.href = '/dashboard'
        return; // Don't stop loading until redirect happens
      } else {
        setError('Gagal masuk. Silakan coba lagi.')
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi terputus. Gagal menghubungi server.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-16 relative overflow-hidden">
      {/* Navbar Atas Halaman Login */}
      <nav className="fixed top-0 left-0 right-0 h-14 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2 group">
          <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={90} height={36} className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          <span className="font-extrabold text-sm sm:text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hidden xs:block">
            SIMASMUH
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link 
            href="/presensi-pegawai"
            className="h-9 px-3 text-xs font-bold border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Presensi Guru & Karyawan</span>
            <span className="sm:hidden">Presensi</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Background Image & Responsive Overlay */}
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

      {/* Glassmorphism & Gradient Overlay for optimal readability & vivid background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-blue-950/50 dark:from-slate-950/75 dark:via-slate-950/70 dark:to-slate-900/80 backdrop-blur-[2px] -z-20" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px] -z-10" />

      <Card className="w-full max-w-md shadow-2xl z-10 border-white/50 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-300 hover:shadow-blue-500/10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
        <CardHeader className="space-y-2 text-center pb-4 pt-6 sm:pb-6 sm:pt-8">
          <div className="flex justify-center mb-1 sm:mb-3">
            <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={300} height={120} priority className="object-contain h-16 sm:h-20 md:h-[90px] w-auto drop-shadow-md hover:scale-105 transition-transform duration-300" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            SIMASMUH
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300 font-semibold text-xs sm:text-sm">
            Portal Manajemen Informasi SMA MUHIPO
          </CardDescription>
        </CardHeader>

        <CardContent className="px-5 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-950/70 rounded-xl border border-red-200 dark:border-red-900 shadow-xs">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">Username / NIP / NIS / Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="Masukkan NIS / NIP / Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 sm:h-12 rounded-xl text-sm sm:text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 sm:h-12 rounded-xl text-sm sm:text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 shadow-inner"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-5 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] touch-target"
              disabled={!!loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loading}</span>
                </div>
              ) : (
                'Masuk ke Akun'
              )}
            </Button>
            <div className="pt-1">
              <Link 
                href="/" 
                className="w-full flex items-center justify-center py-2.5 sm:py-3 px-4 border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-xs touch-target text-center"
              >
                🏠 Kembali ke Beranda
              </Link>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center border-t border-slate-200 dark:border-slate-800 py-4 sm:py-5 gap-1 bg-slate-100 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Copyright &copy; 2026 - Muhipo Dev
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
