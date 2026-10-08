'use client'

import React, { useState, useId } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Link from 'next/link'
import { 
  Mail, AlertTriangle, ArrowRight, CheckCircle2, X, 
  ShieldCheck, Loader2, Sparkles, User, Key, BellRing
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Swal from 'sweetalert2'

export function EmailRecommendationBanner() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const role = user?.role || ''
  const subRole = user?.subRole || ''
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDismissed, setIsDismissed] = useState(false)

  // Sinkronisasi status dismiss berdasarkan sesi login aktif pengguna
  React.useEffect(() => {
    if (typeof window !== 'undefined' && userId) {
      const dismissed = sessionStorage.getItem(`simasmuh_email_dismissed_${userId}`) === 'true'
      setIsDismissed(dismissed)
    } else {
      setIsDismissed(false)
    }
  }, [userId])

  // Ambil profil terkini dari database
  const { data: profile } = useQuery<any>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
  })

  // Jika belum login, masih loading, atau user sudah memiliki email valid -> jangan tampilkan banner
  const hasEmail = Boolean(profile?.email && profile.email.trim().length > 0)
  if (!userId || hasEmail || isDismissed) {
    return null
  }

  const roleLabelMap: Record<string, string> = {
    SISWA: 'Siswa',
    GURU: 'Guru',
    PEGAWAI: 'Pegawai / Staf',
    WALI_MURID: 'Wali Murid (Orang Tua)',
    KEPALA_SEKOLAH: 'Kepala Sekolah',
    ADMIN_TU: 'Tata Usaha',
    BAU: 'Tata Usaha (BAU)',
    TATA_USAHA: 'Tata Usaha',
    ADMIN_IT: 'Admin IT',
    SUPERADMIN: 'Superadmin',
    BENDAHARA: 'Bendahara Keuangan',
    KEUANGAN: 'Staf Keuangan',
    GOD: 'GOD ACCESS',
    GOD_USER: 'GOD ACCESS',
  }

  const userRoleLabel = roleLabelMap[role] || (subRole ? roleLabelMap[subRole] || subRole : role || 'Pengguna')
  const identityNumber = profile?.student?.nis || profile?.nipNbm || profile?.username || '-'

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined' && userId) {
      sessionStorage.setItem(`simasmuh_email_dismissed_${userId}`, 'true')
    }
  }

  const handleOpenModal = () => {
    setEmailInput('')
    setErrorMessage('')
    setIsModalOpen(true)
  }

  const handleSaveEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage('')

    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed) {
      setErrorMessage('Harap masukkan alamat email aktif Anda.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Format alamat email tidak valid (contoh: nama.anda@gmail.com).')
      return
    }

    setIsSaving(true)
    try {
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Gagal menyimpan alamat email.')
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })

      setIsModalOpen(false)
      Swal.fire({
        icon: 'success',
        title: 'Alamat Email Berhasil Ditautkan',
        text: `Alamat email "${trimmed}" berhasil disimpan. Notifikasi resmi di luar aplikasi (presensi, disposisi, pengumuman, dan keuangan) akan diteruskan ke kontak Anda.`,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Selesai',
      })
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan email.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div 
        role="alert"
        aria-live="polite"
        className="relative overflow-hidden rounded-2xl border border-amber-300/90 dark:border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/70 dark:via-orange-950/50 dark:to-slate-900/90 shadow-xs backdrop-blur-xl p-3.5 sm:p-4 mb-3 sm:mb-4 transition-all duration-300"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-3.5 relative z-10">
          {/* Sisi Kiri: Ikon & Deskripsi */}
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 border border-amber-400/50 dark:border-amber-400/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 shadow-xs mt-0.5">
              <Mail className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-400/40 dark:border-amber-400/30 text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wide shrink-0">
                  <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  Rekomendasi Notifikasi Sistem
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80 truncate">
                  Peran: {userRoleLabel}
                </span>
              </div>

              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Lengkapi Email &amp; Aktifkan Login 1-Klik Google OAuth
              </h2>

              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                Akun Anda belum memiliki data email terdaftar. Hubungkan akun Google (Gmail) aktif Anda agar dapat <strong>masuk dengan 1-klik melalui Google OAuth</strong> serta menerima notifikasi resmi harian (presensi/kehadiran, lembar disposisi persuratan, pengumuman sekolah, serta tagihan keuangan).
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Aksi & Dismiss */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0 justify-end">
            <Button
              type="button"
              onClick={handleOpenModal}
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 touch-manipulation shrink-0"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Hubungkan Google OAuth</span>
            </Button>

            <Link
              href="/pengaturan/profil"
              className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-white/70 dark:bg-slate-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-all touch-manipulation inline-flex items-center gap-1 shrink-0"
            >
              <span>Profil</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleDismiss}
              title="Ingatkan nanti"
              aria-label="Tutup sementara rekomendasi email"
              className="h-8 w-8 sm:h-8.5 sm:w-8.5 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-amber-200/50 dark:hover:bg-amber-950/60 transition-colors shrink-0 touch-manipulation"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog Cepat Pengisian Email */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
              <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 dark:bg-blue-500/30 border border-blue-400/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Hubungkan Google OAuth &amp; Email
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Untuk autentikasi terpadu Google OAuth dan penerimaan notifikasi resmi SIMASMUH
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Kartu Profil Ringkas */}
          <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Nama Pengguna:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                {profile?.name || user?.name || '-'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Peran / Identitas:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {userRoleLabel} ({identityNumber})
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveEmail} className="mt-4 space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="input-email-notif" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Alamat Email Google (Gmail)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="input-email-notif"
                  type="email"
                  autoFocus
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="contoh: nama.anda@gmail.com"
                  className="h-10 text-xs sm:text-sm border-slate-300 dark:border-slate-700 rounded-xl flex-1"
                  disabled={isSaving}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Gunakan alamat email Gmail aktif Anda agar dapat masuk secara instan via tombol <em>Masuk dengan Google</em> di halaman login.
              </p>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <span>
                Notifikasi resmi sistem dikirim langsung melalui server SMTP resmi SIMASMUH dan dilindungi protokol keamanan Row Level Security.
              </span>
            </div>

            <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="h-9.5 px-3.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Batal
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className="h-9.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hubungkan &amp; Simpan</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
