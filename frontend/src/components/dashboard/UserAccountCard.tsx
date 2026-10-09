'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { User, Laptop, CalendarCheck, UserCog, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

interface UserAccountCardProps {
  role?: string
  subRole?: string
  studentClass?: any
  activeStudent?: any
  profileAvatarUrl?: string
  statusLabel?: string
  statusColor?: string
}

export function UserAccountCard({
  role = 'PENGGUNA',
  subRole,
  studentClass,
  activeStudent,
  profileAvatarUrl,
  statusLabel,
  statusColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300'
}: UserAccountCardProps) {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const authenticatedQuery = useAuthenticatedQuery()

  // Real-time fetch live profile avatar bila avatarUrl berubah di halaman profile
  const { data: liveProfile } = useQuery<{ name?: string; avatarUrl?: string; isActive?: boolean }>({
    queryKey: ['profile', userId],
    queryFn: () => userId ? authenticatedQuery(`/api-backend/users/${userId}/profile`) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
  })

  const userName = liveProfile?.name || user?.name || 'Pengguna SIMASMUH'
  const activeAvatar = profileAvatarUrl || liveProfile?.avatarUrl || user?.avatarUrl
  
  // Tampilkan NIS untuk Siswa, atau fallback ke username / email
  const studentNis = activeStudent?.nis || activeStudent?.nisn || user?.nis || user?.username
  const userIdentifier = role === 'SISWA' 
    ? (studentNis ? `NIS: ${studentNis}` : (user?.email || user?.username || '-'))
    : (user?.email || user?.username || '-')
  const isGodUser = role === 'GOD' || role === 'GOD_USER' || user?.username === 'supermuhipo'
  const userRole = isGodUser ? 'GOD ACCESS' : (subRole ? `${role} • ${subRole}` : role)
  const isAccountActive = liveProfile?.isActive !== undefined ? liveProfile.isActive !== false : user?.isActive !== false

  const effectiveStatus = isAccountActive ? 'Aktif' : 'Nonaktif'

  // Resolusi adaptif URL CBT Ujian (Port 3010)
  const getCbtUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'localhost'
      const protocol = window.location.protocol || 'http:'
      return `${protocol}//${hostname}:3010`
    }
    return 'http://localhost:3010'
  }

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 flex flex-col gap-3.5 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      {/* Top Header Card: Title + Status Indicator */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Identitas Akun
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
          <span className={`w-1.5 h-1.5 rounded-full ${isAccountActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{effectiveStatus}</span>
        </div>
      </div>

      {/* Profile Row: Avatar & Metadata */}
      <div className="flex items-center gap-3.5">
        <Link 
          href="/pengaturan/profil" 
          title="Klik untuk ubah foto profil"
          className="group relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-900 text-white font-extrabold text-lg flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-500 transition-all cursor-pointer"
        >
          {activeAvatar ? (
            <img src={activeAvatar} alt={userName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="group-hover:scale-105 transition-transform">{userName.charAt(0).toUpperCase()}</span>
          )}
          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </Link>

        <div className="space-y-1 min-w-0 flex-1">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate" title={userName}>
            {userName}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {userIdentifier}
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-block px-2 py-0.5 rounded-md text-[9.5px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 truncate max-w-full">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* App Shortcuts Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <a
          href={getCbtUrl()}
          target="_blank"
          rel="noreferrer"
          title="CBT Ujian Online (Port 3010)"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 transition-all group text-center shadow-2xs active:scale-95 min-h-[36px]"
        >
          <Laptop className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-[11.5px] font-bold truncate">CBT Ujian</span>
        </a>

        <Link
          href={role === 'SISWA' || role === 'WALI_MURID' ? '/presensi/kehadiran-siswa' : '/presensi/kehadiran-pegawai'}
          title="Presensi & Absensi"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 transition-all group text-center shadow-2xs active:scale-95 min-h-[36px]"
        >
          <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-[11.5px] font-bold truncate">Presensi</span>
        </Link>
      </div>

      {/* Action Buttons: Edit Profile & Keamanan */}
      <div className="grid grid-cols-1 gap-1.5 pt-0.5">
        <Link href="/pengaturan/profil" className="w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full font-bold text-xs h-9 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-slate-800 dark:hover:text-white transition-all gap-1.5 shadow-2xs active:scale-95"
          >
            <UserCog className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Pengaturan Akun & Profil
          </Button>
        </Link>
      </div>
    </div>
  )
}

