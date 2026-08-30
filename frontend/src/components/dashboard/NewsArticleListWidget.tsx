'use client'

import Link from 'next/link'
import { Megaphone, ExternalLink, Calendar, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NewsArticleListWidgetProps {
  announcements?: any[]
  title?: string
  limit?: number
}

export function NewsArticleListWidget({
  announcements = [],
  title = 'Daftar Berita & Artikel',
  limit = 5
}: NewsArticleListWidgetProps) {
  const newsList = (announcements || []).filter(
    (a: any) => a.type === 'BERITA' || !a.type || a.type === 'PENGUMUMAN'
  ).slice(0, limit)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 sm:pb-2.5">
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
          <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
          <span>{title}</span>
        </div>
        <Link
          href="/berita"
          className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
        >
          Semua <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* List Content */}
      <div className="space-y-2.5 sm:space-y-3 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1">
        {newsList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Belum ada berita atau artikel terbaru.
          </div>
        ) : (
          newsList.map((item: any, idx: number) => {
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Terbaru'

            return (
              <div
                key={item.id || idx}
                className="flex items-start gap-2.5 sm:gap-3 p-1.5 sm:p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                {/* Thumbnail Image */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                      <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                  <h5 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h5>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    {dateStr}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
