'use client'

import React from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface AppNavbarProps {
  /**
   * Title or tagline displayed next to the logo
   */
  subtitle?: string
  /**
   * Hide the subtitle on small screens
   */
  hideSubtitleOnMobile?: boolean
  /**
   * Link for the logo (default: "/")
   */
  logoHref?: string
  /**
   * Custom logo url override
   */
  logoUrl?: string | null
  /**
   * Custom slots on the right side of navbar
   */
  actions?: React.ReactNode
  /**
   * Custom middle slot (e.g. desktop menu links for public pages)
   */
  children?: React.ReactNode
  /**
   * Sticky or static navbar styling
   */
  className?: string
  /**
   * High contrast mode for transparent wallpaper backgrounds
   */
  isDarkWallpaper?: boolean
}

export function AppNavbar({
  subtitle = 'Sistem Informasi Manajemen Sekolah',
  hideSubtitleOnMobile = false,
  logoHref = '/',
  logoUrl: explicitLogoUrl,
  actions,
  children,
  className = '',
  isDarkWallpaper = true,
}: AppNavbarProps) {
  const authFetch = useAuthenticatedFetch()

  // Query dynamic settings for logo synchronization
  const { data: publicSettings } = useQuery({
    queryKey: ['navbar-public-settings'],
    queryFn: async () => {
      try {
        const res = await authFetch('/settings/public')
        if (res.ok) {
          const json = await res.json()
          return json.data || json
        }
      } catch {
        // Fallback
      }
      return null
    },
    staleTime: 5 * 60 * 1000,
  })

  const activeLogo = explicitLogoUrl || publicSettings?.logoUrl || '/pic_logo.png'

  // Dynamically synchronize browser tab favicon with the latest uploaded school logo
  React.useEffect(() => {
    if (activeLogo) {
      const existingFavicons = document.querySelectorAll("link[rel*='icon']")
      existingFavicons.forEach((el) => {
        (el as HTMLLinkElement).href = activeLogo
      })
      if (existingFavicons.length === 0) {
        const link = document.createElement('link')
        link.type = 'image/png'
        link.rel = 'shortcut icon'
        link.href = activeLogo
        document.getElementsByTagName('head')[0].appendChild(link)
      }
    }
  }, [activeLogo])

  return (
    <header
      className={`sticky top-0 z-40 w-full pt-3 sm:pt-4 px-4 sm:px-6 md:px-8 lg:px-8 xl:px-10 2xl:px-12 pl-safe pr-safe shrink-0 transition-all duration-300 pointer-events-none print:hidden ${className}`}
    >
      <div className="w-full max-w-7xl 2xl:max-w-[1440px] mx-auto pointer-events-auto">
        <div className="w-full flex items-center justify-between gap-3 sm:gap-4 md:gap-6 h-14 sm:h-16 lg:h-17 px-4 sm:px-6 md:px-7 lg:px-8 rounded-2xl bg-white/90 dark:bg-slate-950/90 border border-slate-200/90 dark:border-white/15 shadow-md shadow-slate-900/5 dark:shadow-slate-950/50 text-slate-900 dark:text-white backdrop-blur-xl transition-all">
          {/* SISI KIRI: Logo & Identitas SIMASMUH */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 min-w-0 pl-0.5 sm:pl-1">
            <Link href={logoHref} className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 group min-w-0">
              <div className="p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 bg-blue-50 dark:bg-white/10 border-blue-200/80 dark:border-white/15 backdrop-blur-md flex items-center justify-center overflow-hidden">
                {activeLogo.startsWith('http') || activeLogo.startsWith('data:') ? (
                  <img
                    src={activeLogo}
                    alt="Logo SIMASMUH"
                    className="h-6 sm:h-7 lg:h-8 w-auto object-contain rounded-lg max-w-[36px] sm:max-w-[44px]"
                  />
                ) : (
                  <NextImage
                    src={activeLogo}
                    alt="Logo SIMASMUH"
                    width={32}
                    height={32}
                    className="h-6 sm:h-7 lg:h-8 w-auto object-contain"
                    priority
                  />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight leading-none text-blue-600 dark:text-blue-400 truncate">
                  SIMASMUH
                </span>
                {subtitle && (
                  <span
                    className={`text-[9px] sm:text-[10px] lg:text-[11px] font-normal leading-tight text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[120px] sm:max-w-[160px] 2xl:max-w-none ${
                      hideSubtitleOnMobile ? 'hidden 2xl:inline' : 'hidden md:inline'
                    }`}
                  >
                    {subtitle}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* SISI TENGAH: Menu Navigasi */}
          {children && (
            <div className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2 text-slate-700 dark:text-slate-200 min-w-0 flex-1 px-2">
              {children}
            </div>
          )}

          {/* SISI KANAN: Fitur Kustom Sesuai Halaman */}
          {actions && (
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0 min-w-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
