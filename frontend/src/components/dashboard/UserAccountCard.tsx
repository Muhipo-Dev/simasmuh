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
  const { data: liveProfile } = useQuery<{ name?: string; avatarUrl?: string }>({
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
  const userRole = subRole ? `${role} • ${subRole}` : role

  const effectiveStatus = statusLabel || (
    role === 'SISWA' ? `Siswa (${studentClass?.name || 'Kelas'})` :
    role === 'WALI_MURID' ? `Wali Murid (${activeStudent?.name || 'Siswa'})` :
    'Status: Aktif'
  )

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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Top Header Card: Title + Status Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
          <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>My Account</span>
        </div>
        <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 max-w-[150px] truncate ${statusColor}`}>
          {effectiveStatus}
        </Badge>
      </div>

      {/* Center Profile Bingkai & Shortcuts */}
      <div className="flex items-center gap-3">
        {/* Avatar Bingkai terhubung foto profil dan shortcut ubah foto */}
        <Link 
          href="/pengaturan/profil" 
          title="Klik untuk ubah foto profil"
          className="group/avatar relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-white font-black text-lg flex items-center justify-center shadow-xs shrink-0 border-2 border-slate-100 dark:border-slate-800 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
        >
          {activeAvatar ? (
            <img src={activeAvatar} alt={userName} className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform duration-300" />
          ) : (
            <span className="group-hover/avatar:scale-105 transition-transform">{userName.charAt(0).toUpperCase()}</span>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </Link>

        {/* Info Pengguna */}
        <div className="space-y-0.5 min-w-0 flex-1">
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate" title={userName}>
            {userName}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {userIdentifier}
          </p>
          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">
            {userRole}
          </p>
        </div>
      </div>

      {/* Quick App Badges (Pintasan Ekosistem Aplikasi SIMASMUH) */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={getCbtUrl()}
          target="_blank"
          rel="noreferrer"
          title="CBT Ujian Online (Port 3010)"
          className="flex items-center justify-center gap-1.5 p-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors group border border-blue-200/50 dark:border-blue-900/50"
        >
          <Laptop className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 truncate">CBT Ujian</span>
        </a>

        <Link
          href={role === 'SISWA' || role === 'WALI_MURID' ? '/presensi/kehadiran-siswa' : '/presensi/kehadiran-pegawai'}
          title="Presensi & Absensi"
          className="flex items-center justify-center gap-1.5 p-1.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors group border border-emerald-200/50 dark:border-emerald-900/50"
        >
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 truncate">Presensi</span>
        </Link>
      </div>

      {/* Edit Profile Button */}
      <Link href="/pengaturan/profil" className="w-full">
        <Button
          variant="outline"
          size="sm"
          className="w-full font-bold text-xs h-7 sm:h-8 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 transition-all gap-1.5"
        >
          <UserCog className="w-3.5 h-3.5 text-blue-600" />
          Edit Profil
        </Button>
      </Link>
    </div>
  )
}

