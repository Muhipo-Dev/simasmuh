'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Sparkles, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function ThemeToggle({ className, size = 'default' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = React.useState(false)

  // Mencegah hydration mismatch pada Render Next.js dan mendeteksi ponsel/tablet
  React.useEffect(() => {
    setMounted(true)
    const checkDevice = () => {
      const isMobile = window.innerWidth < 1024 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase())
      setIsMobileOrTablet(isMobile)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  if (!mounted) {
    // Menampilkan placeholder saat awal load agar layout tidak melompat (no layout shift), disembunyikan di bawah breakpoint lg (mobile/tablet)
    const placeholderSize = size === 'sm' ? 'w-14 h-8' : size === 'lg' ? 'w-20 h-11' : 'w-16 h-9'
    return (
      <div 
        className={cn(
          'hidden lg:inline-flex rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse border border-slate-300 dark:border-slate-700 shrink-0',
          placeholderSize,
          className
        )} 
      />
    )
  }

  // Jika diakses melalui perangkat ponsel atau tablet, toogle tema dihilangkan sama sekali (hanya tersedia mode cerah)
  if (isMobileOrTablet) {
    return null
  }

  const isDark = resolvedTheme === 'dark'

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const newTheme = isDark ? 'light' : 'dark'
    
    // 1. Trigger eksekusi Next-Themes
    setTheme(newTheme)

    // 2. Manipulasi langsung DOM secara sinkron agar seketika bekerja di iOS Safari & Chrome Android (0ms latency)
    if (typeof window !== 'undefined' && document.documentElement) {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      }

      // 3. Menyimpan pengaturan tema ke memori cache Cookie & LocalStorage (365 hari)
      try {
        document.cookie = `simasmuh_theme_cache=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
        window.localStorage.setItem('simasmuh_theme_cache', newTheme)
      } catch (err) {
        console.error('Gagal menyimpan cache cookie tema:', err)
      }
    }
  }

  const switchSize = size === 'sm' ? 'w-15 h-8.5 p-1' : size === 'lg' ? 'w-20 h-11 p-1.5' : 'w-16 h-9 p-1.5'
  const knobSize = size === 'sm' ? 'w-6.5 h-6.5' : size === 'lg' ? 'w-8 h-8' : 'w-6.5 h-6.5'
  const translateDist = size === 'sm' ? 'translate-x-6.5' : size === 'lg' ? 'translate-x-9' : 'translate-x-7'

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle Tema"
      title={isDark ? 'Beralih ke Mode Siang' : 'Beralih ke Mode Malam'}
      className={cn(
        'relative hidden lg:inline-flex items-center rounded-full transition-colors duration-300 ease-in-out cursor-pointer select-none overflow-hidden border shadow-inner active:scale-95 focus:outline-none shrink-0 touch-manipulation [-webkit-tap-highlight-color:transparent]',
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-indigo-500/60 shadow-indigo-950/60 text-amber-300'
          : 'bg-gradient-to-r from-amber-200 via-sky-300 to-blue-400 border-sky-400/70 shadow-sky-200/70 text-amber-500',
        switchSize,
        className
      )}
    >
      {/* Background Decorative Particles: pointer-events-none WAJIB agar tap di iOS tidak terbuang ke elemen internal */}
      <span className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none overflow-hidden">
        {/* Indikator Awan Mode Siang */}
        <span
          className={cn(
            'flex items-center transition-opacity duration-300 transform pointer-events-none',
            isDark ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          )}
        >
          <Cloud className="w-3.5 h-3.5 text-white fill-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] pointer-events-none" />
        </span>

        {/* Indikator Bintang Mode Malam */}
        <span
          className={cn(
            'flex items-center transition-opacity duration-300 transform ml-auto pointer-events-none',
            isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse drop-shadow-[0_0_6px_rgba(252,211,77,0.8)] pointer-events-none" />
        </span>
      </span>

      {/* Tuas Geser (Sliding Knob dengan Hardware GPU acceleration transform-gpu & pointer-events-none) */}
      <span
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full transition-transform duration-300 transform-gpu ease-out shadow-md pointer-events-none',
          knobSize,
          isDark
            ? cn(translateDist, 'bg-slate-900 border border-amber-400/60 text-amber-300 shadow-indigo-500/50')
            : 'translate-x-0 bg-white border border-amber-300 text-amber-500 shadow-amber-500/30'
        )}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 transition-transform duration-300 rotate-[-15deg] drop-shadow-[0_0_4px_rgba(252,211,77,0.5)] pointer-events-none" />
        ) : (
          <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)] pointer-events-none" />
        )}
      </span>

      {/* Kilau Halus saat Disentuh */}
      <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}
