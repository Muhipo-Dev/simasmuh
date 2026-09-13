'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Bell, Info, ShieldCheck, ChevronRight, Sparkles, Clock, User, X, ImageIcon, Server } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const userSubRole = (session?.user as any)?.subRole || ''
  const isSuperadminOrIT = ['SUPERADMIN', 'ADMIN_IT'].includes(userRole) || ['SUPERADMIN', 'ADMIN_IT'].includes(userSubRole)

  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [showAllModal, setShowAllModal] = useState(false)

  const infoList = (announcements || []).filter(
    (a: any) => a.type === 'PENGUMUMAN' || a.type === 'INFORMASI' || !a.type
  )
  const displayedList = infoList.slice(0, limit)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 sm:pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 min-w-0">
          <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        {isSuperadminOrIT ? (
          <Link
            href="/pengaturan/pengumuman-sistem"
            className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0"
          >
            Kelola <ChevronRight className="w-3 h-3" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
          >
            Lihat ({infoList.length}) <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content items with card bubble styling */}
      <div className="space-y-2 sm:space-y-2.5 max-h-[320px] sm:max-h-[360px] overflow-y-auto pr-1">
        {displayedList.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Belum ada pengumuman sistem saat ini.
          </div>
        ) : (
          displayedList.map((info: any, idx: number) => {
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

            const bgBadge = idx % 3 === 0
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200'
              : idx % 3 === 1
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200'

            return (
              <div
                key={info.id || idx}
                onClick={() => setSelectedItem(info)}
                className="p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-1 sm:space-y-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <h5 className="font-extrabold text-[11px] sm:text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                    {info.title}
                  </h5>
                  <Badge variant="outline" className={`text-[8px] sm:text-[9px] px-1.5 py-0 font-bold shrink-0 ${bgBadge}`}>
                    {info.type === 'INFORMASI' ? 'INFORMASI' : 'PENGUMUMAN'}
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
        {isSuperadminOrIT ? (
          <Link href="/pengaturan/pengumuman-sistem">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-[11px] sm:text-xs font-semibold h-7 sm:h-8 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Kelola Pengumuman Sistem
            </Button>
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAllModal(true)}
            className="w-full text-[11px] sm:text-xs font-semibold h-7 sm:h-8 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Lihat Selengkapnya ({infoList.length})
          </Button>
        )}
      </div>

      {/* MODAL 1: Detail Pengumuman Tunggal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-5">
          {selectedItem && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {selectedItem.type === 'INFORMASI' ? '🛡️ Update & Keamanan' : '📢 Pengumuman Sistem'}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    }) : ''}
                  </span>
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Diterbitkan oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedItem.author?.name || 'Admin SIMASMUH'}</span> ({selectedItem.author?.role || 'SISTEM'})
                </DialogDescription>
              </DialogHeader>

              {selectedItem.image && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[260px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {selectedItem.content}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setSelectedItem(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Daftar Seluruh Pengumuman Sistem (Untuk Pengguna Non-Superadmin) */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="sm:max-w-[620px] rounded-2xl p-5 max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Server className="w-5 h-5 text-indigo-600" />
              Semua Informasi & Pengumuman Sistem
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftar seluruh instruksi, pemeliharaan server, dan informasi keamanan resmi SIMASMUH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto py-3 pr-1 flex-1">
            {infoList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Belum ada pengumuman sistem yang diterbitkan.
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

                return (
                  <div
                    key={info.id || idx}
                    onClick={() => {
                      setShowAllModal(false)
                      setSelectedItem(info)
                    }}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {info.title}
                      </h4>
                      <Badge variant="outline" className="text-[9px] px-2 py-0.5 shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                        {info.type === 'INFORMASI' ? 'INFORMASI' : 'PENGUMUMAN'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {info.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>📅 {dateStr} {timeStr ? `• ${timeStr} WIB` : ''}</span>
                      <span>👤 {info.author?.name || 'Admin SIMASMUH'}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => setShowAllModal(false)}
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

