'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { Eye, ShieldAlert, LogOut, Loader2, ArrowLeftRight, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useQuery } from '@tanstack/react-query'
import { getOverrideSession, setOverrideSession, clearOverrideSession, OverrideSessionData } from '@/lib/override-session'
import Swal from 'sweetalert2'

export function OverrideSessionBanner() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [overrideData, setOverrideData] = React.useState<OverrideSessionData | null>(null)

  React.useEffect(() => {
    setOverrideData(getOverrideSession())
    const handleOverrideChanged = () => {
      setOverrideData(getOverrideSession())
    }
    window.addEventListener('simasmuh-override-changed', handleOverrideChanged)
    return () => {
      window.removeEventListener('simasmuh-override-changed', handleOverrideChanged)
    }
  }, [])

  const adminUser = session?.user as any
  const isOverride = Boolean(overrideData?.user && overrideData?.access_token)
  const targetUser = overrideData?.user
  const targetUserId = targetUser?.id
  const mode = overrideData?.mode || (overrideData?.isReadOnly ? 'spectator' : 'override')
  const isReadOnly = overrideData?.isReadOnly === true || mode === 'spectator'
  const targetName = targetUser?.name || 'Pengguna'

  // Polling data profil akun untuk mendeteksi jika admin lain sedang mengakses akun ini (jika user reguler)
  const userId = adminUser?.id
  const { data: profileData } = useQuery<any>({
    queryKey: ['profile-override-check', userId],
    queryFn: async () => {
      if (!userId || isOverride) return null
      const res = await authenticatedFetch(`/api-backend/users/${userId}/profile`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!userId && !isOverride,
    refetchInterval: 5000,
  })

  // Skenario 1: Admin sedang meng-override atau menjadi spectator akun
  if (isOverride && targetUserId) {
    const handleSwitchMode = async (newMode: 'override' | 'spectator') => {
      if (newMode === mode) return
      setIsProcessing(true)
      try {
        const res = await authenticatedFetch(`/api-backend/users/${targetUserId}/override-token`, {
          method: 'POST',
          body: JSON.stringify({ mode: newMode }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.message || 'Gagal mengubah mode akses.')
        }

        const newOverrideData = await res.json()
        setOverrideSession(newOverrideData)
        window.location.reload()
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
        // Beri tahu backend agar menonaktifkan status override pengguna target di basis data
        await authenticatedFetch(`/api-backend/users/${targetUserId}/override-exit`, {
          method: 'POST',
        }).catch(() => {})

        // Hapus cookie sesi override. Sesi admin utama di NextAuth tidak pernah berubah!
        clearOverrideSession()

        // Kembalikan ke halaman master data override pengguna
        window.location.href = '/master-data/override-pengguna'
      } catch (e: any) {
        clearOverrideSession()
        window.location.href = '/master-data/override-pengguna'
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
              Admin sedang mengakses akun pengguna {isReadOnly ? '(Hanya Lihat).' : '(Akses Penuh).'}
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

          {/* Tombol Keluar Mode Override / Spectator */}
          <Button
            size="sm"
            variant={isReadOnly ? 'outline' : 'destructive'}
            onClick={handleExitOverride}
            disabled={isProcessing}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg shadow-2xs gap-1"
            title={isReadOnly ? 'Keluar dari Mode Spectator' : 'Keluar dari Mode Override'}
          >
            <LogOut className="w-3 h-3" />
            <span>Keluar Mode</span>
          </Button>
        </div>
      </div>
    )
  }

  // Skenario 2: Pengguna reguler sedang login dan akunnya sedang diakses oleh admin
  const userRoles = [
    adminUser?.role,
    adminUser?.subRole,
    adminUser?.subRole2,
    adminUser?.subRole3,
    adminUser?.subRole4,
    adminUser?.subRole5,
  ].filter(Boolean)

  const isAdminRole =
    adminUser?.username === 'supermuhipo' ||
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
