import React from 'react'

interface AppFooterProps {
  variant?: 'minimal' | 'full'
  className?: string
  isDarkWallpaper?: boolean
}

export function AppFooter({ variant = 'minimal', className = '', isDarkWallpaper = true }: AppFooterProps) {
  return (
    <footer
      className={`w-full py-4 border-t border-white/10 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 shadow-xs transition-colors duration-200 z-10 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
      <span>Copyright &copy; 2026 - Muhipo Dev &bull; SMA Muhammadiyah 1 Ponorogo</span>
    </footer>
  )
}
