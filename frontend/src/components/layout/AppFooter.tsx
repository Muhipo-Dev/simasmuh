import React from 'react'

interface AppFooterProps {
  variant?: 'minimal' | 'full'
  className?: string
  isDarkWallpaper?: boolean
}

export function AppFooter({ variant = 'minimal', className = '', isDarkWallpaper = false }: AppFooterProps) {
  if (isDarkWallpaper) {
    return (
      <footer
        className={`w-full py-4 border-t border-white/10 bg-slate-950/50 backdrop-blur-md text-xs font-semibold text-white/90 flex items-center justify-center gap-2 shadow-xs transition-colors duration-200 z-10 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
        <span>Copyright &copy; 2026 - Muhipo Dev &bull; SMA Muhammadiyah 1 Ponorogo</span>
      </footer>
    )
  }

  return (
    <footer
      className={`w-full py-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 shadow-xs transition-colors duration-200 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
      <span>Copyright &copy; 2026 - Muhipo Dev &bull; SMA Muhammadiyah 1 Ponorogo</span>
    </footer>
  )
}
