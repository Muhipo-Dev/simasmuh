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
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('simasmuh_email_reminder_dismissed') === 'true'
    }
    return false
  })

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
  }

  const userRoleLabel = roleLabelMap[role] || (subRole ? roleLabelMap[subRole] || subRole : role || 'Pengguna')
  const identityNumber = profile?.student?.nis || profile?.nipNbm || profile?.username || '-'

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('simasmuh_email_reminder_dismissed', 'true')
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

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 relative z-10">
          {/* Sisi Kiri: Ikon & Deskripsi */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 border border-amber-400/50 dark:border-amber-400/30 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 shadow-xs mt-0.5 lg:mt-0">
              <Mail className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-400/40 dark:border-amber-400/30 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide">
                  <BellRing className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Rekomendasi Notifikasi Sistem
                </span>
                <span className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/80">
                  Peran: {userRoleLabel}
                </span>
              </div>

              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Lengkapi Alamat Email untuk Notifikasi Resmi di Luar Aplikasi
              </h2>

              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                Akun Anda belum memiliki data email terdaftar. Lengkapi email aktif Anda agar sistem SIMASMUH dapat mengirimkan notifikasi resmi harian (presensi/kehadiran, lembar disposisi persuratan, pengumuman sekolah, serta tagihan & verifikasi keuangan) secara handal via SMTP Email resmi.
              </p>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Aksi & Dismiss */}
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-1 lg:pt-0 justify-end">
            <Button
              type="button"
              onClick={handleOpenModal}
              className="h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 flex items-center gap-1.5 touch-manipulation flex-1 lg:flex-none justify-center"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Isi Email Sekarang</span>
            </Button>

            <Link
              href="/pengaturan/profil"
              className="h-9 sm:h-9.5 px-3 sm:px-3.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-white/70 dark:bg-slate-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-semibold transition-all touch-manipulation inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Profil</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>

            <button
              type="button"
              onClick={handleDismiss}
              title="Ingatkan nanti"
              aria-label="Tutup sementara rekomendasi email"
              className="h-9 w-9 sm:h-9.5 sm:w-9.5 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-amber-200/50 dark:hover:bg-amber-950/60 transition-colors shrink-0 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog Cepat Pengisian Email */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 border border-amber-400/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tautkan Alamat Email
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Untuk kebutuhan notifikasi resmi di luar aplikasi SIMASMUH
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
                <Mail className="w-3.5 h-3.5 text-amber-600" />
                Alamat Email Aktif
              </Label>
              <Input
                id="input-email-notif"
                type="email"
                autoFocus
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="contoh: nama.anda@gmail.com"
                className="h-10 text-xs sm:text-sm border-slate-300 dark:border-slate-700 rounded-xl"
                disabled={isSaving}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Gunakan email aktif (Gmail, Yahoo, Outlook, dsb) yang dapat Anda akses di smartphone atau komputer.
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
                Notifikasi resmi sistem dikirim langsung melalui server SMTP resmi SIMASMUH guna menjaga kerahasiaan dan integritas data sekolah.
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
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Alamat Email</span>
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
