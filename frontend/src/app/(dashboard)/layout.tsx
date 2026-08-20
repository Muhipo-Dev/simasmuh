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
          actions={
            <>
              {/* Tahun Ajaran Badge */}
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-[10px] sm:text-xs shadow-2xs shrink-0">
                <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>TA: {systemSettings?.academicYear || '2026/2027'}</span>
                {systemSettings?.semester && (
                  <span className="hidden md:inline text-[11px] opacity-85 font-medium">({systemSettings.semester})</span>
                )}
              </div>

              <div className="hidden lg:block border-r border-slate-200 dark:border-slate-700 pr-4">
                <ThemeToggle />
              </div>
              <div className="lg:hidden">
                <ThemeToggle size="sm" />
              </div>
              
              {/* Profile Card & Logout */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/pengaturan/profil" className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 sm:p-1.5 sm:pr-3 rounded-full transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 relative rounded-full overflow-hidden bg-[#2B50A1]/10 dark:bg-blue-900/30 flex items-center justify-center text-[#2B50A1] dark:text-blue-400 font-bold text-xs sm:text-sm border-2 border-white dark:border-slate-800 shadow-sm">
                    {profileData?.avatarUrl ? (
                      <NextImage src={profileData.avatarUrl} alt="Avatar" fill className="object-cover" />
                    ) : (
                      <span>{(profileData?.name || session.user?.name || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight max-w-[140px] truncate">{profileData?.name || session.user?.name}</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{displayRole}</p>
                  </div>
                </Link>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 text-slate-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 rounded-full transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
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
                  <LogOut className="w-4 h-4" />
                </Button>

                {!hideSidebar && (
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl bg-[#2B50A1] hover:bg-[#1f3c7a] text-white transition-colors active:scale-95 shadow-sm"
                    aria-label="Buka Menu"
                  >
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                )}
              </div>
            </>
          }
        />

        <div className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-28 lg:pb-10 transition-all duration-200">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
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

        {/* Footer Induk Bersatu */}
        <AppFooter className="hidden lg:flex" />
      </main>
    </div>
  )
}

