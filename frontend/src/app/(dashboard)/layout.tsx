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
      const roles = [u?.role, u?.subRole, u?.subRole2, u?.subRole3, u?.subRole4, u?.subRole5].filter(Boolean) as string[]

      // Jika akun dinonaktifkan / purna tugas, batasi hanya boleh melihat /dashboard
      if (!isAccountActive && pathname !== '/dashboard' && pathname !== '/pengaturan/profil') {
        Swal.fire({
          icon: 'warning',
          title: 'Status Akun Nonaktif / Purna',
          text: 'Akun Anda saat ini berstatus nonaktif atau telah purna tugas. Anda hanya dapat melihat informasi dan widget di Dashboard.',
          confirmButtonColor: '#4f46e5',
        })
        router.replace('/dashboard')
        return
      }

      // Cek ketat otorisasi rute
      const allowed = isPathAllowedForRoles(pathname, roles)
      if (!allowed) {
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

  const role = (session.user as { role?: string })?.role || 'GURU'
  const subRole = (session.user as { subRole?: string })?.subRole
  const subRole2 = (session.user as { subRole2?: string })?.subRole2
  const subRole3 = (session.user as { subRole3?: string })?.subRole3
  const subRole4 = (session.user as { subRole4?: string })?.subRole4
  const subRole5 = (session.user as { subRole5?: string })?.subRole5
  
  const displayRole = role
  
  const currentLinks = getRoleLinks(role, subRole, subRole2, subRole3, subRole4, subRole5)
  const isDashboardPage = pathname === '/dashboard'
  const hideSidebar = isDashboardPage

  return (
    <div className="min-h-dvh flex relative transition-colors duration-200 overflow-x-hidden">
      {/* Background Image & Overlay for all dashboard pages */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
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
      <div className="fixed inset-0 bg-slate-100/75 dark:bg-slate-950/80 backdrop-blur-[1px] -z-20 pointer-events-none" />

      {/* Kerangka Sidebar Induk Terpadu */}
      {!hideSidebar && (
        <AppSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          links={currentLinks}
        />
      )}

      <main className={`flex-1 flex flex-col min-h-dvh w-full overflow-x-hidden ${hideSidebar ? '' : 'lg:ml-72'}`}>
        {/* Navbar Induk Terpadu (Kiri Logo, Kanan Info TA, Theme, Profil, Logout) */}
        <AppNavbar
          logoUrl={systemSettings?.logoUrl}
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
              {/* Tahun Ajaran Badge (Sembunyi di mobile kecil agar tidak tabrakan) */}
              <div className="hidden md:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 font-bold text-[10px] sm:text-xs shadow-2xs shrink-0 backdrop-blur-md">
                <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>TA: {systemSettings?.academicYear || '2026/2027'}</span>
                {systemSettings?.semester && (
                  <span className="hidden xl:inline text-[11px] opacity-90 font-medium">({systemSettings.semester})</span>
                )}
              </div>

              <div className="hidden sm:block border-r border-slate-200/80 dark:border-white/15 pr-2.5 lg:pr-3">
                <ThemeToggle />
              </div>
              <div className="sm:hidden">
                <ThemeToggle size="sm" />
              </div>
              
              {/* Profile Card & Logout */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link href="/pengaturan/profil" className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 p-1 sm:p-1.5 sm:pr-2.5 rounded-full transition-colors border border-slate-200/80 dark:border-white/10 shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 relative rounded-full overflow-hidden bg-blue-600/10 dark:bg-blue-600/30 flex items-center justify-center text-blue-600 dark:text-blue-300 font-black text-xs sm:text-sm border border-blue-200/60 dark:border-white/20 shadow-xs">
                    {profileData?.avatarUrl ? (
                      <NextImage src={profileData.avatarUrl} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <span>{(profileData?.name || session.user?.name || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight max-w-[120px] lg:max-w-[150px] truncate">{profileData?.name || session.user?.name}</p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px] lg:max-w-[150px]">{displayRole}</p>
                  </div>
                </Link>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 text-slate-600 dark:text-slate-300 hover:text-white hover:bg-red-600 rounded-full transition-colors shadow-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shrink-0"
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
                    await signOut({ redirect: false })
                    window.location.href = '/login'
                  }}
                  title="Keluar"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>

                {!hideSidebar && (
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 text-white transition-colors active:scale-95 shadow-sm backdrop-blur-md shrink-0"
                    aria-label="Buka Menu"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          }
        />

        <div className="flex-1 p-2.5 sm:p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto w-full pb-20 sm:pb-24 lg:pb-10 transition-all duration-200">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar - Otomatis tersembunyi jika sedang di halaman Dashboard */}
        {!isDashboardPage && (
          <nav className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 text-slate-800 dark:text-white safe-area-inset-bottom shadow-2xl">
            <div className="flex items-end justify-around h-16 px-1 relative pb-1">
              {(() => {
                const dashLink = currentLinks.find(l => l.href === '/dashboard') || { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
                const otherLinks = currentLinks.filter(l => l.href !== '/dashboard' && l.href !== '/presensi/scan-qr')
                const left1 = otherLinks[0]
                const left2 = otherLinks[1]
                const right1 = otherLinks[2]

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
                  </>
                )
              })()}
            </div>
            <div className="h-safe-bottom bg-white dark:bg-slate-950" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </nav>
        )}    {/* Footer Induk Bersatu */}
        <AppFooter className="hidden lg:flex" />
      </main>
    </div>
  )
}

