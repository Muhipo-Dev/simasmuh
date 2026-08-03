'use client'

import React from 'react'
import { Clock, Sparkles } from 'lucide-react'

interface ComingSoonProps {
  title?: string
  description?: string
}

export function ComingSoon({
  title = 'Fitur Segera Hadir',
  description = 'Halaman ini sedang dalam tahap pengembangan akhir. Fitur lengkap akan segera tersedia.',
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[380px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center my-6">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>
        <div className="absolute -top-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>
      
      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-3 tracking-wide uppercase">
        Segera Hadir (Coming Soon)
      </span>
      
      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
        {description}
      </p>
    </div>
  )
}
