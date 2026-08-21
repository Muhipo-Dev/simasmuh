import React from 'react'

interface AppFooterProps {
  variant?: 'minimal' | 'full'
  className?: string
  isDarkWallpaper?: boolean
}

export function AppFooter({ variant = 'minimal', className = '', isDarkWallpaper = true }: AppFooterProps) {
  return (
    <footer
      className={`w-full py-3 sm:py-3.5 border-t border-white/10 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md text-xs font-medium text-slate-300 dark:text-slate-400 flex items-center justify-center gap-2.5 shadow-xs transition-colors duration-200 z-10 shrink-0 select-none ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
      </span>
      <span className="tracking-wide">Copyright &copy; 2026 - Muhipo Dev</span>
    </footer>
  )
}
