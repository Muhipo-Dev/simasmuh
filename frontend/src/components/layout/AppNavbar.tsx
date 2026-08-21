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
      className={`h-14 sm:h-16 lg:h-20 flex items-center justify-between px-3 sm:px-5 lg:px-8 xl:px-12 sticky top-0 z-40 shadow-xs transition-all duration-300 bg-slate-950/80 dark:bg-slate-950/90 border-b border-white/10 text-white backdrop-blur-xl shrink-0 w-full overflow-x-clip ${className}`}
    >
      {/* SISI KIRI: Logo & Identitas SIMASMUH */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <Link href={logoHref} className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 group min-w-0">
          <div className="p-1 sm:p-1.5 rounded-xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 bg-white/15 border-white/20 backdrop-blur-md flex items-center justify-center">
            {activeLogo.startsWith('http') || activeLogo.startsWith('data:') ? (
              <img
                src={activeLogo}
                alt="Logo SIMASMUH"
                className="h-6 sm:h-7 lg:h-9 w-auto object-contain rounded-lg max-w-[40px] sm:max-w-[48px]"
              />
            ) : (
              <NextImage
                src={activeLogo}
                alt="Logo SIMASMUH"
                width={36}
                height={36}
                className="h-6 sm:h-7 lg:h-9 w-auto object-contain"
                priority
              />
            )}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-black text-sm sm:text-base lg:text-lg xl:text-xl tracking-tight leading-none text-blue-500 dark:text-blue-400 truncate">
              SIMASMUH
            </span>
            {subtitle && (
              <span
                className={`text-[9px] sm:text-[10px] lg:text-xs font-normal leading-tight text-slate-300 dark:text-slate-400 mt-0.5 truncate max-w-[140px] sm:max-w-[200px] lg:max-w-none ${
                  hideSubtitleOnMobile ? 'hidden md:inline' : 'inline'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* SISI TENGAH: Menu Navigasi (Otomatis fleksibel & bebas tabrakan) */}
      {children && (
        <div className="hidden xl:flex items-center gap-1 2xl:gap-2 text-slate-200 min-w-0 mx-2 2xl:mx-4 shrink">
          {children}
        </div>
      )}

      {/* SISI KANAN: Fitur Kustom Sesuai Halaman */}
      {actions && (
        <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3.5 shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
