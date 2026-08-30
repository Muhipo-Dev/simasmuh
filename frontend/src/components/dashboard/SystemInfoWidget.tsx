'use client'

import Link from 'next/link'
import { Bell, Info, ShieldCheck, ChevronRight, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SystemInfoWidgetProps {
  announcements?: any[]
  title?: string
  limit?: number
}

export function SystemInfoWidget({
  announcements = [],
  title = 'Informasi & Pengumuman Sistem',
  limit = 4
}: SystemInfoWidgetProps) {
  const infoList = (announcements || []).filter(
    (a: any) => a.type === 'PENGUMUMAN' || a.type === 'INFORMASI' || a.type === 'BERITA'
  ).slice(0, limit)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 sm:pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 min-w-0">
          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <Link
          href="/informasi/pengumuman"
          className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0"
        >
          Lihat <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content items with card bubble styling */}
      <div className="space-y-2 sm:space-y-2.5 max-h-[320px] sm:max-h-[360px] overflow-y-auto pr-1">
        {infoList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Belum ada pengumuman sistem saat ini.
          </div>
        ) : (
          infoList.map((info: any, idx: number) => {
            const dateStr = info.createdAt
              ? new Date(info.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Terkini'

            const timeStr = info.createdAt
              ? new Date(info.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : ''

            // Color scheme by index
            const bgBadge = idx % 3 === 0
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200'
              : idx % 3 === 1
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'

            return (
              <div
                key={info.id || idx}
                className="p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-1 sm:space-y-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <h5 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                    {info.title}
                  </h5>
                  <Badge variant="outline" className={`text-[8px] sm:text-[9px] px-1.5 py-0 font-bold shrink-0 ${bgBadge}`}>
                    {info.type || 'Pengumuman'}
                  </Badge>
                </div>
                {info.content && (
                  <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {info.content}
                  </p>
                )}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-medium pt-0.5">
                  <span className="truncate">📅 {dateStr} {timeStr ? `• ${timeStr} WIB` : ''}</span>
                  <span className="truncate max-w-[120px]">👤 {info.author?.name || 'Admin SIMASMUH'}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="pt-0.5">
        <Link href="/informasi/pengumuman">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[11px] sm:text-xs font-semibold h-7 sm:h-8 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Lihat Selengkapnya
          </Button>
        </Link>
      </div>
    </div>
  )
}
