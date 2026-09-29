'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Lock, User, ArrowRight, Home, ShieldCheck, Mail, KeyRound,
  CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, ArrowLeft,
  HelpCircle, MessageSquare
} from 'lucide-react'
import { getPublicApiUrl } from '@/lib/api-config'
import { AppNavbar, AppFooter } from '@/components/layout'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [account, setAccount] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [helpdeskPhone, setHelpdeskPhone] = useState('088293733330')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Load helpdesk phone if cached
  useEffect(() => {
    try {
      const cachedPhone = localStorage.getItem('simasmuh_helpdesk_phone')
      if (cachedPhone) setHelpdeskPhone(cachedPhone)
    } catch {}
  }, [])

  // Cooldown timer for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account.trim()) {
      setError('Masukkan username, NIS, atau email akun Anda.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/request-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({ emailOrUsername: account.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim kode OTP.')
      }

      setMaskedEmail(data.maskedEmail || 'email terdaftar Anda')
      setStep(2)
      setResendCooldown(30)
      setSuccessMessage(`Kode OTP 6-digit berhasil dikirimkan ke email ${data.maskedEmail}.`)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat meminta kode OTP.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanOtp = otpCode.trim().replace(/\s+/g, '')
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Masukkan 6 digit kode OTP yang dikirimkan ke email Anda.')
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({
          emailOrUsername: account.trim(),
          otpCode: cleanOtp,
          newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mereset kata sandi.')
      }

      setStep(3)
      setSuccessMessage(data.message || 'Kata sandi berhasil diperbarui!')
    } catch (err: any) {
      setError(err.message || 'Gagal mereset kata sandi.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(getPublicApiUrl('/auth/forgot-password/request-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026',
        },
        body: JSON.stringify({ emailOrUsername: account.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim ulang kode OTP.')
      }

      setResendCooldown(60)
      setSuccessMessage(`Kode OTP baru telah dikirimkan ke email ${data.maskedEmail}.`)
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang kode OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/80 z-0 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar Minimalis */}
      <AppNavbar isDarkWallpaper />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-8 sm:pt-12 pb-12 sm:pb-16 z-10 w-full max-w-xl mx-auto my-auto">
        <div className="w-full rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white relative">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-400/30 shadow-xs mb-1">
              <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Reset Kata Sandi
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              {step === 1 && 'Verifikasi akun untuk menerima kode OTP sekali pakai via Email resmi.'}
              {step === 2 && 'Masukkan 6 digit kode OTP dan buat kata sandi baru Anda.'}
              {step === 3 && 'Kata sandi akun Anda telah berhasil diperbarui.'}
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 py-1">
            <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'w-8 bg-blue-600' : 'w-4 bg-slate-300 dark:bg-slate-700'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'w-8 bg-blue-600' : 'w-4 bg-slate-300 dark:bg-slate-700'}`} />
            <div className={`h-1.5 rounded-full transition-all ${step === 3 ? 'w-8 bg-emerald-500' : 'w-4 bg-slate-300 dark:bg-slate-700'}`} />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Info Alert */}
          {successMessage && !error && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Minta Kode OTP */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="account" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Username / NIS / Email Akun</span>
                </Label>
                <Input
                  id="account"
                  type="text"
                  placeholder="Masukkan username, NIS siswa, atau email"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  autoFocus
                  className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Kode OTP 6-digit sekali pakai akan dikirimkan otomatis ke alamat email yang terdaftar pada akun tersebut.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim Kode OTP...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    Kirim Kode OTP ke Email
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: Masukkan OTP & Kata Sandi Baru */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Kode OTP telah dikirim ke <span className="font-bold text-slate-900 dark:text-white">{maskedEmail}</span>. Kode ini bersifat <span className="font-bold text-blue-600 dark:text-blue-400">sekali pakai</span>.
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="otpCode" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-400/30">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Kode OTP 6-Digit</span>
                  </Label>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 transition-colors"
                  >
                    {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : 'Kirim Ulang OTP'}
                  </button>
                </div>
                <Input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="Contoh: 849201"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  autoFocus
                  className="h-12 px-3.5 rounded-xl text-center font-mono font-bold text-xl tracking-[6px] transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-cyan-50 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-200 dark:border-cyan-400/30">
                    <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span>Kata Sandi Baru</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11 px-3.5 pr-10 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-400/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>Konfirmasi Kata Sandi Baru</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 px-3.5 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setError('')
                  }}
                  className="h-11 px-4 rounded-xl font-bold text-xs border-slate-300 dark:border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Kembali
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Sandi...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Simpan Kata Sandi Baru
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Sukses */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Kata Sandi Berhasil Diperbarui!
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Akun Anda sekarang telah dilindungi dengan kata sandi baru. Silakan masuk kembali ke SIMASMUH.
                </p>
              </div>
              <Button
                onClick={() => router.push('/login')}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
              >
                Masuk ke SIMASMUH Sekarang
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Footer Links & Helpdesk */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <Link
                href="/login"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Halaman Login
              </Link>
              <Link
                href="/"
                className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <Home className="w-3.5 h-3.5" />
                Beranda
              </Link>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span>Kendala email tidak aktif?</span>
              </div>
              <a
                href={`https://wa.me/${helpdeskPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20Admin%20SIMASMUH,%20saya%20membutuhkan%20bantuan%20reset%20password%20akun.`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Hubungi Helpdesk
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <AppFooter isDarkWallpaper />
    </div>
  )
}
