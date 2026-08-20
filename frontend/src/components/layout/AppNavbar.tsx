'use client'

import React from 'react'
import Link from 'next/link'
import NextImage from 'next/image'

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
  subtitle = 'SMA Muhammadiyah 1 Ponorogo',
  hideSubtitleOnMobile = true,
  logoHref = '/',
  actions,
  children,
  className = '',
  isDarkWallpaper = false,
}: AppNavbarProps) {
  return (
    <header
      className={`h-16 lg:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-12 sticky top-0 z-40 shadow-xs transition-colors duration-300 ${
        isDarkWallpaper
          ? 'bg-slate-950/60 border-b border-white/10 text-white backdrop-blur-xl'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800'
      } ${className}`}
    >
      {/* SISI KIRI: Logo SIMASMUH */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href={logoHref} className="flex items-center gap-2.5 group">
          <div
            className={`p-1.5 rounded-xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 ${
              isDarkWallpaper
                ? 'bg-white/15 border-white/20 backdrop-blur-md'
                : 'bg-white/10 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-700/50'
            }`}
          >
            <NextImage
              src="/pic_logo.png"
              alt="Logo SIMASMUH"
              width={34}
              height={34}
              className="h-7 sm:h-8 lg:h-9 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span
              className={`font-black text-sm sm:text-base lg:text-lg tracking-tight leading-tight ${
                isDarkWallpaper ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              SIMASMUH
            </span>
            {subtitle && (
              <span
                className={`text-[10px] font-medium leading-none ${
                  hideSubtitleOnMobile ? 'hidden sm:inline' : 'inline'
                } ${isDarkWallpaper ? 'text-blue-200/90' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* SISI TENGAH: Menu Navigasi (Jika ada) */}
      {children && (
        <div className="hidden lg:flex items-center gap-8">
          {children}
        </div>
      )}

      {/* SISI KANAN: Fitur Kustom Sesuai Halaman */}
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
