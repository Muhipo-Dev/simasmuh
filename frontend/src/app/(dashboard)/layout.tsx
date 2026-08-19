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
import { superAdminOnlyPaths, getRoleLinks } from '@/lib/nav-links'

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
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
  })

  const { data: systemSettings } = useQuery<{ academicYear?: string; semester?: string }>({
    queryKey: ['system-settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings'),
    staleTime: 1000 * 30, // 30 detik agar selalu sinkron dengan pengaturan superadmin
    refetchOnWindowFocus: true,
  })

  const isSuperAdminOnly = superAdminOnlyPaths.some(path => pathname.startsWith(path))
  const isAccountManagement = pathname.startsWith('/master-data/pengguna')
  const isFinancePage = pathname.startsWith('/keuangan/') && !pathname.startsWith('/keuangan/laporan')
  const isAnnouncementsOnly = pathname.startsWith('/informasi/pengumuman')
  const isBannerManagerOnly = pathname.startsWith('/informasi/banner')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (session) {
      const u = session.user as any
      const roles = [u?.role, u?.subRole, u?.subRole2, u?.subRole3].filter(Boolean)
      const hasSuperAdmin = roles.includes('ADMIN_IT') || roles.includes('SUPERADMIN')
      const hasBauAccess = hasSuperAdmin || roles.includes('ADMIN_TU') || roles.includes('BAU') || roles.includes('TATA_USAHA')
      const hasFinanceAccess = hasSuperAdmin || roles.includes('KEUANGAN')
      const hasAdminWeb = hasSuperAdmin || roles.includes('ADMIN_WEB')

      if (isAccountManagement && !hasSuperAdmin) router.push('/dashboard')
      else if (isFinancePage && !hasFinanceAccess) router.push('/dashboard')
      else if (isSuperAdminOnly && !hasBauAccess) router.push('/dashboard')
      else if ((isAnnouncementsOnly || isBannerManagerOnly) && !hasAdminWeb) router.push('/dashboard')
    }
  }, [session, isSuperAdminOnly, isAccountManagement, isFinancePage, isAnnouncementsOnly, isBannerManagerOnly, router])

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
  
  const displayRole = [role, subRole, subRole2, subRole3].filter(Boolean).join(' | ')
  
  const currentLinks = getRoleLinks(role, subRole, subRole2, subRole3)
  const bottomNavLinks = currentLinks.slice(0, 4)

  const isDashboardPage = pathname === '/dashboard'
  
  const hideSidebar = isDashboardPage

  return (
    <div className="min-h-dvh flex relative transition-colors duration-200 overflow-x-hidden">
      {/* Background Image & Overlay for all dashboard pages */}
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
      <div className="fixed inset-0 bg-slate-100/85 dark:bg-slate-950/90 backdrop-blur-[2px] -z-20 pointer-events-none" />

      {isMobileMenuOpen && !hideSidebar && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {!hideSidebar && (
        <aside className={`w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-5 bg-gradient-to-r from-blue-700 to-indigo-600 shrink-0">
            <div className="flex items-center gap-2.5">
              <NextImage src="/pic_logo.png" alt="Logo" width={34} height={34} className="object-contain rounded-md bg-white/10 p-0.5" />
              <span className="text-white font-extrabold text-2xl tracking-widest">SIMASMUH</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
            {currentLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))
              return (
                <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 text-sm font-semibold ${isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}>
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{link.name}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>
      )}

      <main className={`flex-1 flex flex-col min-h-dvh w-full overflow-x-hidden ${hideSidebar ? '' : 'lg:ml-72'}`}>
        <header className="h-16 lg:h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 lg:px-12 sticky top-0 z-40 shadow-xs transition-colors duration-300">
          {/* KIRI: Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {hideSidebar ? (
              <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={150} height={50} className="object-contain h-8 sm:h-10 lg:h-12 w-auto" />
            ) : (
              <div className="flex items-center">
                <NextImage src="/pic_logo.png" alt="Logo SIMASMUH" width={120} height={36} className="object-contain h-7 sm:h-8 lg:h-10 w-auto" />
              </div>
            )}
          </div>
          
          {/* KANAN: Tahun Ajaran Badge, Theme Toggle, Profile, Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-6">
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10px] sm:text-xs shadow-2xs shrink-0">
              <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>TA: {systemSettings?.academicYear || '2026/2027'}</span>
              {systemSettings?.semester && (
                <span className="hidden md:inline text-[11px] opacity-85 font-medium">({systemSettings.semester})</span>
              )}
            </div>

            <div className="hidden lg:block border-r border-slate-200 dark:border-slate-700 pr-6">
              <ThemeToggle />
            </div>
            <div className="lg:hidden">
              <ThemeToggle size="sm" />
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/pengaturan/profil" className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                <div className="w-9 h-9 lg:w-10 lg:h-10 relative rounded-full overflow-hidden bg-[#2B50A1]/10 dark:bg-blue-900/30 flex items-center justify-center text-[#2B50A1] dark:text-blue-400 font-bold text-sm border-2 border-white dark:border-slate-800 shadow-sm">
                  {profileData?.avatarUrl ? (
                    <NextImage src={profileData.avatarUrl} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <span>{(profileData?.name || session.user?.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight max-w-[150px] truncate">{profileData?.name || session.user?.name}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{displayRole}</p>
                </div>
              </Link>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-slate-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 rounded-full transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                onClick={async () => { await signOut({ redirect: false }); window.location.href = '/login' }}
                title="Keluar"
              >
                <LogOut className="w-4.5 h-4.5" />
              </Button>

              {!hideSidebar && (
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-[#2B50A1] hover:bg-[#1f3c7a] text-white transition-colors active:scale-95 ml-1 shadow-sm"
                  aria-label="Buka Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-28 lg:pb-10 transition-all duration-200">
          {children}
        </div>

        <nav className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-end justify-around h-16 px-1 relative pb-1">
            {(() => {
              const dashLink = currentLinks.find(l => l.href === '/dashboard') || { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }
              const qrLink = currentLinks.find(l => l.href === '/presensi/scan-qr') || { name: 'Scan QR', href: '/presensi/scan-qr', icon: QrCode }
              
              const otherLinks = currentLinks.filter(l => l.href !== '/dashboard' && l.href !== '/presensi/scan-qr')
              const leftLink = otherLinks[0]
              const rightLink = otherLinks[1]

              const renderNavButton = (link: any, isCenter: boolean = false) => {
                if (!link) return <div className="flex-1" key={Math.random()} />
                const Icon = link.icon
                const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))
                
                if (isCenter) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="relative -top-5 flex flex-col items-center justify-center gap-1 z-50 flex-1 px-1 min-w-0"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-[4px] border-slate-50 dark:border-slate-950 transition-transform active:scale-95 ${isActive ? 'bg-blue-700 dark:bg-blue-600' : 'bg-blue-600 dark:bg-blue-500'}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {link.name}
                      </span>
                    </Link>
                  )
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-col items-center justify-center gap-0.5 flex-1 px-1 min-w-0 transition-colors active:scale-95 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className={`relative flex items-center justify-center w-10 h-8 rounded-full mb-0.5 transition-all duration-300 ${isActive ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-transparent'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'}`} />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide truncate w-full text-center">
                      {link.name}
                    </span>
                  </Link>
                )
              }

              return (
                <>
                  {renderNavButton(dashLink)}
                  {renderNavButton(leftLink)}
                  {qrLink ? renderNavButton(qrLink, true) : <div className="flex-1" />}
                  {renderNavButton(rightLink)}
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center gap-0.5 flex-1 px-1 min-w-0 transition-colors active:scale-95 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <div className="relative flex items-center justify-center w-10 h-8 rounded-full mb-0.5 transition-all duration-300 bg-transparent">
                      <Menu className="w-5 h-5 scale-100" />
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide truncate w-full text-center">
                      Lainnya
                    </span>
                  </button>
                </>
              )
            })()}
          </div>
          <div className="h-safe-bottom bg-white/95 dark:bg-slate-900/95" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </nav>

        <footer className="hidden lg:flex items-center justify-center py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-400 gap-2 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Copyright &copy; 2026 - Muhipo Dev
        </footer>
      </main>
    </div>
  )
}
