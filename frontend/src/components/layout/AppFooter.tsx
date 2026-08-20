import React from 'react'

interface AppFooterProps {
  variant?: 'minimal' | 'full'
  className?: string
}

export function AppFooter({ variant = 'minimal', className = '' }: AppFooterProps) {
  return (
    <footer className={`w-full py-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 shadow-xs transition-colors duration-200 ${className}`}>
      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
      <span>Copyright &copy; 2026 - Muhipo Dev &bull; SMA Muhammadiyah 1 Ponorogo</span>
    </footer>
  )
}
