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
  subtitle = 'Sistem Informasi Manajemen Sekolah',
  hideSubtitleOnMobile = false,
  logoHref = '/',
  actions,
  children,
  className = '',
  isDarkWallpaper = true,
}: AppNavbarProps) {
  return (
    <header
      className={`h-14 sm:h-16 lg:h-20 flex items-center justify-between px-3 sm:px-6 lg:px-12 sticky top-0 z-40 shadow-xs transition-colors duration-300 bg-slate-950/80 dark:bg-slate-950/90 border-b border-white/10 text-white backdrop-blur-xl shrink-0 w-full overflow-hidden ${className}`}
    >
      {/* SISI KIRI: Logo & Identitas SIMASMUH */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Link href={logoHref} className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="p-1 sm:p-1.5 rounded-xl border shadow-2xs transition-transform group-hover:scale-105 shrink-0 bg-white/15 border-white/20 backdrop-blur-md">
            <NextImage
              src="/pic_logo.png"
              alt="Logo SIMASMUH"
              width={38}
              height={38}
              className="h-7 sm:h-8 lg:h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-black text-base sm:text-lg lg:text-xl tracking-tight leading-none text-blue-500 dark:text-blue-400">
              SIMASMUH
            </span>
            {subtitle && (
              <span
                className={`text-[10px] sm:text-xs font-normal leading-tight text-slate-300 dark:text-slate-400 mt-0.5 ${
                  hideSubtitleOnMobile ? 'hidden sm:inline' : 'inline'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* SISI TENGAH: Menu Navigasi (Jika ada) */}
      {children && (
        <div className="hidden lg:flex items-center gap-8 text-slate-200">
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
