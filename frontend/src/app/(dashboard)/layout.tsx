'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import NextImage from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LogOut, Menu, X, MoreHorizontal, LayoutDashboard, QrCode, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { AppNavbar, AppFooter, AppSidebar } from '@/components/layout'
import { isPathAllowedForRoles, getRoleLinks } from '@/lib/nav-links'
import { EmailRecommendationBanner } from '@/components/dashboard/EmailRecommendationBanner'
import { NavbarPrayerWidget } from '@/components/dashboard/NavbarPrayerWidget'
import Swal from 'sweetalert2'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const authenticatedQuery = useAuthenticatedQuery()

  const userId = (session?.user as { id?: string })?.id
  const { data: profileData } = useQuery<{ name?: string; avatarUrl?: string }>({
    queryKey: ['profile', userId],
    queryFn: () => userId ? authenticatedQuery(`/api-backend/users/${userId}/profile`) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 1000 * 5,
    refetchOnWindowFocus: true,
    retry: false,
  })

  const { data: systemSettings } = useQuery<{ academicYear?: string; semester?: string; logoUrl?: string | null; backgroundUrl?: string | null }>({
    queryKey: ['system-settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings'),
    staleTime: 1000 * 30, // 30 detik agar selalu sinkron dengan pengaturan superadmin
    refetchOnWindowFocus: true,
  })

  // Heartbeat otomatis setiap 30 detik untuk memastikan status sesi pengguna sinkron realtime online
  useQuery({
    queryKey: ['user-session-heartbeat', userId],
    queryFn: () => userId ? authenticatedQuery(`/api-backend/users/${userId}/profile`) : Promise.resolve(null),
    enabled: !!userId && status === 'authenticated',
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: false,
  })

  useEffect(() => {
    if (status === 'unauthenticated' || (session as any)?.error === 'SessionExpired') {
      if ((session as any)?.error === 'SessionExpired') {
        router.push('/login?expired=1')
      } else {
        router.push('/login')
      }
    }
  }, [status, session, pathname, router])

  useEffect(() => {
    if (session && pathname) {
      const u = session.user as any
      const isAccountActive = u?.isActive !== false
      const roles = [u?.role, u?.subRole, u?.subRole2, u?.subRole3, u?.subRole4, u?.subRole5, u?.username, u?.name].filter(Boolean) as string[]

      // Siswa alumni / lulus / keluar tetap memiliki hak akses penuh ke riwayat pribadi
      const isSiswa = u?.role === 'SISWA'
      const allowedSiswaArchivePaths = [
        '/dashboard',
        '/pengaturan/profil',
        '/keuangan/laporan',
        '/presensi/kehadiran-siswa',
        '/siswa/buku-induk',
        '/akademik/e-rapor',
        '/informasi/prestasi',
        '/akademik/etika-tatib',
        '/pengaturan/notifikasi-pengguna',
      ]
      const isSiswaArchiveAllowed = isSiswa && allowedSiswaArchivePaths.some(p => pathname === p || pathname.startsWith(`${p}/`))

      // Jika akun dinonaktifkan / purna tugas (kecuali siswa alumni di rute arsip pribadi)
      if (!isAccountActive && !isSiswaArchiveAllowed && pathname !== '/dashboard' && pathname !== '/pengaturan/profil') {
        Swal.fire({
          icon: 'warning',
          title: 'Status Akun Nonaktif',
          text: 'Akun Anda saat ini berstatus nonaktif. Anda hanya dapat melihat informasi riwayat di Dashboard dan halaman arsip pribadi.',
          confirmButtonColor: '#4f46e5',
        })
        router.replace('/dashboard')
        return
      }

      // Cek ketat otorisasi rute
      const allowed = isPathAllowedForRoles(pathname, roles)
      if (!allowed && !isSiswaArchiveAllowed) {
        Swal.fire({
          icon: 'error',
          title: 'Akses Ditolak',
          text: 'Anda tidak memiliki hak akses ke fitur ini. Sistem telah mengamankan rute Anda.',
          timer: 3000,
          showConfirmButton: false,
        })
        router.replace('/dashboard')
      }
    }
  }, [session, pathname, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  const userObj = session.user as any
  const role = userObj?.role || 'GURU'
  const subRole = userObj?.subRole
  const subRole2 = userObj?.subRole2
  const subRole3 = userObj?.subRole3
  const subRole4 = userObj?.subRole4
  const subRole5 = userObj?.subRole5
  const username = userObj?.username
  const isAccountActive = userObj?.isActive !== false
  
  const displayRole = role
  
  const currentLinks = getRoleLinks(role, subRole, subRole2, subRole3, subRole4, subRole5, username, isAccountActive)
  const isDashboardPage = pathname === '/dashboard'
  const hideSidebar = isDashboardPage

  return (
    <div className="min-h-dvh flex relative transition-colors duration-200 overflow-x-hidden print:min-h-0 print:bg-white print:text-black print:overflow-visible">
      {/* Background Image & Overlay for all dashboard pages */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none print:hidden">
        {systemSettings?.backgroundUrl && (systemSettings.backgroundUrl.startsWith('http') || systemSettings.backgroundUrl.startsWith('data:')) ? (
          <img
            src={systemSettings.backgroundUrl}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <NextImage
            src={systemSettings?.backgroundUrl || "/muhipo-log.jpg"}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>
      <div className="fixed inset-0 bg-slate-100/60 dark:bg-slate-950/70 backdrop-blur-md sm:backdrop-blur-sm -z-20 pointer-events-none print:hidden" />

      {/* Kerangka Sidebar Induk Terpadu */}
      {!hideSidebar && (
        <div className="print:hidden">
          <AppSidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            links={currentLinks}
          />
        </div>
      )}

      <main className={`flex-1 flex flex-col min-h-dvh w-full min-w-0 overflow-x-hidden print:min-h-0 print:m-0 print:p-0 print:w-full print:bg-white print:text-black print:static print:overflow-visible transition-all duration-200 ${hideSidebar ? '' : 'lg:ml-70 xl:ml-74 2xl:ml-76 lg:pr-4 xl:pr-5 2xl:pr-6 print:lg:ml-0 print:lg:pr-0'}`}>
        {/* Navbar Induk Terpadu (Kiri Logo, Kanan Info TA, Theme, Profil, Logout) */}
        <div className="print:hidden">
          <AppNavbar
            logoUrl={systemSettings?.logoUrl}
            actions={
              <div className="flex items-center gap-1 sm:gap-2 lg:gap-2.5 shrink-0">
                {/* Jadwal Sholat Terdekat (Sembunyi adaptif jika zoom tinggi / layar sempit) */}
                <div className="hidden xl:flex items-center shrink-0">
                  <NavbarPrayerWidget />
                </div>

                {/* Tahun Ajaran Badge (Otomatis menyesuaikan saat zoom tinggi / viewport sempit) */}
                <div className="hidden lg:flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 font-bold text-[10px] sm:text-xs shadow-2xs shrink-0 backdrop-blur-md">
                  <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>TA: {systemSettings?.academicYear || '2026/2027'}</span>
                  {systemSettings?.semester && (
                    <span className="hidden 2xl:inline text-[11px] opacity-90 font-medium">({systemSettings.semester})</span>
                  )}
                </div>

                <div className="hidden sm:block border-r border-slate-200/80 dark:border-white/15 pr-1.5 sm:pr-2">
                  <ThemeToggle />
                </div>
                <div className="sm:hidden">
                  <ThemeToggle size="sm" />
                </div>
                
                {/* Profile Card & Logout */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Link href="/pengaturan/profil" className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-white/10 p-0.5 sm:p-1 sm:pr-2 rounded-lg transition-colors border border-slate-200/80 dark:border-white/10 shrink-0 max-w-[180px] sm:max-w-[220px]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 relative rounded-md overflow-hidden bg-blue-600/10 dark:bg-blue-600/30 flex items-center justify-center text-blue-600 dark:text-blue-300 font-black text-xs sm:text-sm border border-blue-200/60 dark:border-white/20 shadow-xs shrink-0">
                      {profileData?.avatarUrl ? (
                        <NextImage src={profileData.avatarUrl} alt="Avatar" fill className="object-cover" />
                      ) : (
                        <span>{(profileData?.name || session.user?.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="hidden md:block text-left min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight max-w-[100px] lg:max-w-[130px] xl:max-w-[150px] truncate">{profileData?.name || session.user?.name}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px] lg:max-w-[130px] xl:max-w-[150px]">{displayRole}</p>
                    </div>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7.5 w-7.5 sm:h-8 sm:w-8 text-slate-600 dark:text-slate-300 hover:text-white hover:bg-red-600 rounded-lg transition-colors shadow-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shrink-0"
                    onClick={async () => {
                      if (userId) {
                        try {
                          await fetch('/api-backend/auth/logout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId }),
                          })
                        } catch {}
                      }
                      if (typeof window !== 'undefined') {
                        try {
                          sessionStorage.clear()
                        } catch {}
                      }
                      await signOut({ redirect: false })
                      window.location.href = '/login'
                    }}
                    title="Keluar"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>

                  {!hideSidebar && (
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="lg:hidden h-7.5 w-7.5 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 text-white transition-colors active:scale-95 shadow-sm backdrop-blur-md shrink-0"
                      aria-label="Buka Menu"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            }
          />
        </div>

        <div className={`flex-1 w-full px-6 sm:px-7 md:px-8 lg:px-10 xl:px-12 2xl:px-14 pt-4 sm:pt-4 md:pt-5 pb-20 sm:pb-24 lg:pb-12 transition-all duration-200 pl-safe pr-safe print:p-0 print:m-0 print:max-w-none print:w-full print:pb-0`}>
          <div className="w-full max-w-7xl 2xl:max-w-[1480px] mx-auto space-y-3.5 sm:space-y-4">
            <div className="w-full print:hidden">
              <EmailRecommendationBanner />
            </div>
            <div className="w-full">
              {children}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar - Otomatis tersembunyi jika sedang di halaman Dashboard */}
        {!isDashboardPage && (
          <nav className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 text-slate-800 dark:text-white safe-area-inset-bottom shadow-2xl print:hidden">
            <div className="flex items-end justify-around h-16 px-1 relative pb-1">
              {(() => {
                const dashLink = currentLinks.find(l => l.href === '/dashboard') || { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }

                // Filter link selain dashboard dan menu scanner QR
                const availableLinks = currentLinks.filter(l => l.href !== '/dashboard' && l.href !== '/presensi/scan-qr')

                // Prioritaskan link modul fitur spesifik role (group selain 'Layanan Mandiri' dan bukan menu umum presensi/disposisi jika ada fitur inti)
                const coreRoleFeatures = availableLinks.filter(l => {
                  const isPersonal = l.group === 'Layanan Mandiri'
                  const isGeneralTop = ['/presensi/kehadiran-pegawai', '/presensi/kehadiran-siswa', '/fitur/disposisi'].includes(l.href)
                  return !isPersonal && !isGeneralTop
                })

                const secondaryFeatures = availableLinks.filter(l => !coreRoleFeatures.includes(l))
                const prioritizedLinks = [...coreRoleFeatures, ...secondaryFeatures]

                const left1 = prioritizedLinks[0] || availableLinks[0]
                const left2 = prioritizedLinks[1] || availableLinks[1]
                const right1 = prioritizedLinks[2] || availableLinks[2]
                const right2 = prioritizedLinks[3] || availableLinks[3]

                const renderNavButton = (link: any, isCenter: boolean = false) => {
                  if (!link) return <div className="flex-1" key={Math.random()} />
                  const Icon = link.icon
                  const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))
                  
                  if (isCenter) {
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="relative -top-5 flex flex-col items-center justify-center gap-1 z-50 flex-1 px-1 min-w-0 group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl border-[4px] border-white dark:border-slate-950 transition-all duration-300 active:scale-95 ${isActive ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/40' : 'bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-indigo-900/50'}`}>
                          <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <span className={`text-[10px] font-extrabold tracking-wide ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {link.name}
                        </span>
                      </Link>
                    )
                  }

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex flex-col items-center justify-center gap-0.5 flex-1 px-1 min-w-0 transition-colors active:scale-95 ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className={`relative flex items-center justify-center w-10 h-8 rounded-full mb-0.5 transition-all duration-300 ${isActive ? 'bg-blue-100 dark:bg-blue-600/30 border border-blue-300 dark:border-blue-400/30' : 'bg-transparent'}`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-blue-600 dark:text-blue-300' : 'scale-100 text-slate-500 dark:text-slate-400'}`} />
                      </div>
                      <span className="text-[10px] font-semibold tracking-wide truncate w-full text-center">
                        {link.name}
                      </span>
                    </Link>
                  )
                }

                return (
                  <>
                    {renderNavButton(left1)}
                    {renderNavButton(left2)}
                    {renderNavButton(dashLink, true)}
                    {renderNavButton(right1)}
                    {prioritizedLinks.length > 4 ? (
                      <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 flex-1 px-1 min-w-0 transition-colors active:scale-95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        <div className="relative flex items-center justify-center w-10 h-8 rounded-full mb-0.5 transition-all duration-300 bg-transparent">
                          <Menu className="w-5 h-5 scale-100 text-slate-500 dark:text-slate-400" />
                        </div>
                        <span className="text-[10px] font-semibold tracking-wide truncate w-full text-center">
                          Lainnya
                        </span>
                      </button>
                    ) : (
                      renderNavButton(right2)
                    )}
                  </>
                )
              })()}
            </div>
            <div className="h-safe-bottom bg-white dark:bg-slate-950" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </nav>
        )}
        {/* Footer Induk Bersatu (Tampil di Desktop & Pengguna Ponsel Android/iOS) */}
        <div className="print:hidden">
          <AppFooter className={!isDashboardPage ? "mb-16 lg:mb-0" : ""} />
        </div>
      </main>
    </div>
  )
}

