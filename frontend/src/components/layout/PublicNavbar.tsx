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
          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3.5 border-l border-white/15 pl-6">
            {currentAcademicYear && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 font-bold text-xs shadow-2xs backdrop-blur-md">
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
              className="bg-[#2B50A1] hover:bg-[#1f3c7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login SIMASMUH
            </Link>
          </div>

          {/* Mobile Menu & Theme Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle size="sm" />
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl w-9 h-9 p-0 flex items-center justify-center shadow-xs transition-colors backdrop-blur-md">
                <Menu className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 mt-2 bg-slate-900 border-slate-800 p-2 text-slate-100 shadow-xl rounded-xl"
              >
                {navItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <DropdownMenuItem key={item.href}>
                      <Link
                        href={item.href}
                        className={`w-full cursor-pointer py-2 px-3 text-sm rounded-lg transition-colors ${
                          active
                            ? 'font-bold text-blue-400 bg-blue-950/60 border border-blue-800/50'
                            : 'font-medium text-slate-200 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator className="my-1.5 border-slate-800" />
                <DropdownMenuItem>
                  <Link
                    href="/login"
                    className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-white bg-[#2B50A1] hover:bg-[#1f3c7a] rounded-lg flex items-center justify-center shadow-xs"
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
      {/* Desktop Navigation Links */}
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
              active
                ? 'font-bold text-white bg-blue-600/40 border border-blue-400/50 shadow-xs'
                : 'font-semibold text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </AppNavbar>
  )
}
