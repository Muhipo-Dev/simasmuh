'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'

function OAuthConsentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | false>(false)
  const [error, setError] = useState('')
  
  const googleEmail = searchParams.get('email')

  useEffect(() => {
    if (!googleEmail) {
      router.push('/login')
    }
  }, [googleEmail, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Memulai penautan...')
    setError('')

    try {
      setLoading('Memverifikasi data...')
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        action: 'link',
        googleEmail
      })

      if (result?.error) {
        setError('Kredensial salah atau email Google sudah terpakai.')
      } else if (result?.ok) {
        setLoading('Berhasil ditautkan, mengalihkan ke dashboard...')
        window.location.href = '/dashboard'
        return;
      } else {
        setError('Gagal menautkan akun. Silakan coba lagi.')
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi terputus. Gagal menghubungi server.')
    }

    setLoading(false)
  }

  if (!googleEmail) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Wallpaper with Smooth Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
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
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/90 backdrop-blur-[3px] -z-20 pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 h-14 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <Link href="/" className="flex items-center gap-2 group">
          <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={90} height={36} className="h-7 sm:h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          <span className="font-extrabold text-sm sm:text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 hidden xs:block">
            SIMASMUH
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </nav>

      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-slate-50/50 to-indigo-50/50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950 -z-10"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] -z-10"></div>
      
      <Card className="w-full max-w-md shadow-2xl z-10 border-white/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl dark:border-slate-800/50 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <CardHeader className="space-y-2 text-center pb-5 pt-6 sm:pb-6 sm:pt-8">
          <div className="flex justify-center mb-2 sm:mb-4">
             <div className="bg-white p-3 rounded-full shadow-md inline-block">
                <svg viewBox="0 0 24 24" className="w-12 h-12" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
             </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Tautkan Akun Google
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm px-2">
            Email <strong className="text-slate-800 dark:text-slate-200">{googleEmail}</strong> belum terdaftar. Silakan masukkan data SIAKAD Anda untuk menautkan akun.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-5 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 text-sm font-semibold text-red-600 bg-red-50 dark:bg-red-950/70 rounded-xl border border-red-200 dark:border-red-900 shadow-xs">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-slate-700 dark:text-slate-200">Username / NIP / NIS</Label>
              <Input
                id="email"
                type="text"
                placeholder="Masukkan NIS / NIP" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 bg-white/90 dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold text-slate-700 dark:text-slate-200">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-600 bg-white/90 dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-inner"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] touch-target"
              disabled={!!loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loading}</span>
                </div>
              ) : (
                'Tautkan & Masuk'
              )}
            </Button>

            <div className="pt-1.5">
              <Link href="/login" className="w-full block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-5 sm:py-5.5 h-auto border-slate-300 dark:border-slate-700 font-bold text-sm sm:text-base text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-xs touch-target"
                >
                  ❌ Batal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center border-t border-slate-200/60 dark:border-slate-800/80 py-5 gap-1 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            Copyright &copy; 2026 - Muhipo Dev
          </p>
        </CardFooter>
      </Card>
    </div >
  )
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OAuthConsentContent />
    </Suspense>
  )
}
