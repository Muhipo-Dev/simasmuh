'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, Menu, CalendarDays } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { AppNavbar } from './AppNavbar'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface PublicNavbarProps {
  academicYear?: string
  semester?: string
  className?: string
}

const navItems = [
  { label: 'Beranda', href: '/' },
  { label: 'Profil', href: '/profil' },
  { label: 'TenDik', href: '/guru-karyawan' },
  { label: 'Tentang', href: '/tentang' },
  { label: 'Berita', href: '/berita' },
  { label: 'Presensi', href: '/presensi-view' },
]

export function PublicNavbar({
  academicYear: initialAcademicYear,
  semester: initialSemester,
  className = '',
}: PublicNavbarProps) {
  const pathname = usePathname()
  const authFetch = useAuthenticatedFetch()

  // Fetch live system settings for TA badge if not passed as prop
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      try {
        const res = await authFetch('/settings/public')
        if (res.ok) {
          const json = await res.json()
          return json.data || json
        }
      } catch {
        // Fallback gracefully
      }
      return null
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const currentAcademicYear = initialAcademicYear || settings?.academicYear || '2026/2027'
  const currentSemester = initialSemester || settings?.semester

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <AppNavbar
      logoHref="/"
      className={className}
      actions={
        <>
          {/* Desktop Actions (xl+ screen) */}
          <div className="hidden xl:flex items-center gap-2.5 2xl:gap-3.5 border-l border-white/15 pl-4 2xl:pl-6 shrink-0">
            {currentAcademicYear && (
              <div className="flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 font-bold text-xs shadow-2xs backdrop-blur-md shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <span>TA: {currentAcademicYear}</span>
                {currentSemester && (
                  <span className="font-medium text-[11px] text-blue-200/80">
                    ({currentSemester === 'ODD' ? 'Ganjil' : currentSemester === 'EVEN' ? 'Genap' : currentSemester})
                  </span>
                )}
              </div>
            )}
            <ThemeToggle />
            <Link
              href="/login"
              className="bg-[#2B50A1] hover:bg-[#1f3c7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 2xl:px-5 py-2 rounded-full font-bold text-xs 2xl:text-sm flex items-center transition-all shadow-sm hover:shadow-md active:scale-95 shrink-0"
            >
              <LogIn className="w-4 h-4 mr-1.5 2xl:mr-2" />
              <span>Login SIMASMUH</span>
            </Link>
          </div>

          {/* Tablet & Mobile Menu / Theme Toggle (below xl) */}
          <div className="xl:hidden flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentAcademicYear && (
              <div className="hidden sm:flex md:hidden lg:flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 font-bold text-[10px] shadow-2xs backdrop-blur-md shrink-0">
                <CalendarDays className="w-3 h-3 text-blue-300 shrink-0" />
                <span>{currentAcademicYear}</span>
              </div>
            )}
            <ThemeToggle size="sm" />
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl w-9 h-9 p-0 flex items-center justify-center shadow-xs transition-colors backdrop-blur-md shrink-0">
                <Menu className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 mt-2 bg-slate-900/95 backdrop-blur-2xl border-slate-800 p-2.5 text-slate-100 shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                {currentAcademicYear && (
                  <div className="px-3 py-2 mb-1.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between text-xs font-semibold text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Tahun Ajaran
                    </span>
                    <span className="font-bold font-mono text-white">{currentAcademicYear}</span>
                  </div>
                )}
                {navItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={`w-full cursor-pointer py-2 px-3 text-sm rounded-xl transition-colors ${
                          active
                            ? 'font-bold text-blue-400 bg-blue-950/60 border border-blue-800/50'
                            : 'font-medium text-slate-200 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator className="my-1.5 border-white/10" />
                <DropdownMenuItem asChild>
                  <Link
                    href="/login"
                    className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-white bg-[#2B50A1] hover:bg-[#1f3c7a] rounded-xl flex items-center justify-center shadow-sm"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login SIMASMUH
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      }
    >
      {/* Desktop Navigation Links (Only visible on xl+ screens to prevent collision when zooming or on tablets) */}
      <div className="hidden xl:flex items-center gap-1 2xl:gap-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 2xl:px-3.5 py-1.5 rounded-full text-xs 2xl:text-sm transition-all shrink-0 ${
                active
                  ? 'font-bold text-white bg-blue-600/40 border border-blue-400/50 shadow-xs'
                  : 'font-semibold text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </AppNavbar>
  )
}
