'use client'

import React from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Eye, ShieldAlert, LogOut, Loader2, ArrowLeftRight, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useQuery } from '@tanstack/react-query'
import Swal from 'sweetalert2'

export function OverrideSessionBanner() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const [isProcessing, setIsProcessing] = React.useState(false)

  const user = session?.user as any
  const userId = user?.id
  // Hanya mode override jika target user BUKAN admin yang sama
  const isOverride =
    user?.isOverrideSession === true &&
    Boolean(user?.overrideByAdminId) &&
    user?.id !== user?.overrideByAdminId
  const mode = user?.overrideMode || (user?.isReadOnly ? 'spectator' : 'override')
  const isReadOnly = user?.isReadOnly === true || mode === 'spectator'
  const adminName = user?.overrideByAdminName || 'Administrator'
  const targetName = user?.name || 'Pengguna'

  // Periksa sesi admin asli di sessionStorage
  const [hasOriginalAdmin, setHasOriginalAdmin] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const orig = sessionStorage.getItem('simasmuh_original_admin_session')
      setHasOriginalAdmin(!!orig)
    }
  }, [session])

  // Polling data profil akun untuk mendeteksi jika admin lain sedang mengakses akun ini
  const { data: profileData } = useQuery<any>({
    queryKey: ['profile-override-check', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId,
    refetchInterval: 5000,
  })

  // Skenario 1: Admin sedang meng-override atau menjadi spectator akun
  if (isOverride) {
    const handleSwitchMode = async (newMode: 'override' | 'spectator') => {
      if (newMode === mode) return
      setIsProcessing(true)
      try {
        // Ambil token admin asli dari sessionStorage jika ada
        const originalAdminDataStr = sessionStorage.getItem('simasmuh_original_admin_session')
        const adminToken = originalAdminDataStr ? JSON.parse(originalAdminDataStr)?.access_token : null

        const res = await authenticatedFetch(`/api-backend/users/${userId}/override-token`, {
          method: 'POST',
          headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
          body: JSON.stringify({ mode: newMode }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.message || 'Gagal mengubah mode akses.')
        }

        const overrideData = await res.json()

        const signInRes = await signIn('credentials', {
          action: 'override_login',
          overrideData: JSON.stringify(overrideData),
          redirect: false,
        })

        if (signInRes?.ok) {
          window.location.reload()
        } else {
          throw new Error('Gagal memperbarui sesi browser.')
        }
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Ganti Mode',
          text: err.message || 'Terjadi kesalahan sistem.',
          confirmButtonColor: '#4f46e5',
        })
        setIsProcessing(false)
      }
    }

    const handleExitOverride = async () => {
      setIsProcessing(true)
      try {
        // Beri tahu backend agar menonaktifkan status override pengguna target seketika
        await authenticatedFetch(`/api-backend/users/${userId}/override-exit`, {
          method: 'POST',
        }).catch(() => {})

        const originalAdminDataStr = sessionStorage.getItem('simasmuh_original_admin_session')
        if (originalAdminDataStr) {
          const adminAuthData = JSON.parse(originalAdminDataStr)
          const res = await signIn('credentials', {
            action: 'restore_admin_login',
            overrideData: JSON.stringify(adminAuthData),
            redirect: false,
          })

          if (res?.ok) {
            sessionStorage.removeItem('simasmuh_original_admin_session')
            window.location.href = '/master-data/override-pengguna'
            return
          }
        }

        sessionStorage.removeItem('simasmuh_original_admin_session')
        window.location.href = '/login'
      } catch (e: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Keluar Mode',
          text: e.message || 'Gagal mengembalikan sesi admin.',
        })
        setIsProcessing(false)
      }
    }

    return (
      <div
        className={`w-full rounded-xl border p-2.5 sm:px-3.5 sm:py-2 transition-all shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
          isReadOnly
            ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30 text-rose-900 dark:text-rose-200'
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-medium w-full sm:w-auto">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              isReadOnly
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isReadOnly ? <Eye className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  isReadOnly
                    ? 'bg-amber-500 text-white dark:bg-amber-600'
                    : 'bg-rose-600 text-white dark:bg-rose-700'
                }`}
              >
                {isReadOnly ? 'Mode Spectator' : 'Mode Override'}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {targetName}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isReadOnly ? 'Hanya lihat (Read Only).' : 'Akses penuh (Full Access).'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
          {/* Tombol Switch Mode */}
          <Button
            size="sm"
            variant="outline"
            disabled={isProcessing}
            onClick={() => handleSwitchMode(isReadOnly ? 'override' : 'spectator')}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg bg-white/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 gap-1 shadow-2xs"
            title={isReadOnly ? 'Beralih ke Mode Override' : 'Beralih ke Mode Spectator'}
          >
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            )}
            <span>{isReadOnly ? 'Ke Override' : 'Ke Spectator'}</span>
          </Button>

          {/* Tombol Keluar Mode */}
          <Button
            size="sm"
            variant={isReadOnly ? 'outline' : 'destructive'}
            onClick={handleExitOverride}
            disabled={isProcessing}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg shadow-2xs gap-1"
          >
            <LogOut className="w-3 h-3" />
            <span>{hasOriginalAdmin ? 'Kembali' : 'Keluar'}</span>
          </Button>
        </div>
      </div>
    )
  }

  // Skenario 2: Pengguna reguler sedang login dan akunnya sedang diakses oleh admin
  const userRoles = [
    user?.role,
    user?.subRole,
    user?.subRole2,
    user?.subRole3,
    user?.subRole4,
    user?.subRole5,
  ].filter(Boolean)

  const isAdminRole =
    user?.username === 'supermuhipo' ||
    userRoles.includes('SUPERADMIN') ||
    userRoles.includes('ADMIN_IT') ||
    userRoles.includes('ADMIN_TU') ||
    userRoles.includes('BAU') ||
    userRoles.includes('TATA_USAHA')

  // Jika akun ini adalah admin atau tidak ada akses override aktif, jangan tampilkan banner
  const activeAdminAccess = !isAdminRole ? profileData?.activeOverrideByAdmin : null
  if (activeAdminAccess) {
    const isSpectatorAccess = activeAdminAccess.mode === 'spectator'
    return (
      <div className="w-full rounded-xl border p-2.5 sm:px-3.5 sm:py-2 transition-all shadow-xs bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500/30 text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-medium">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Admin <strong>{activeAdminAccess.adminName}</strong> sedang mengakses akun anda ({isSpectatorAccess ? 'Mode Spectator' : 'Mode Override'}).
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
