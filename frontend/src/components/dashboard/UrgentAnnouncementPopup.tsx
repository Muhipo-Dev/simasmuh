'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { BellRing, ShieldAlert, AlertTriangle, X, ArrowRight, ExternalLink, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SystemAnnouncement {
  id: string
  title: string
  content: string
  target: string
  type: string
  image?: string
  isUrgent?: boolean
  createdAt: string
  author?: {
    name: string
    role: string
  }
}

interface UrgentAnnouncementPopupProps {
  announcements?: SystemAnnouncement[]
}

export function UrgentAnnouncementPopup({ announcements = [] }: UrgentAnnouncementPopupProps) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id || ''
  
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Filter pengumuman mendesak (isUrgent: true)
  const urgentAnnouncements = (announcements || []).filter(
    (item) => item.isUrgent === true && (item.type === 'PENGUMUMAN' || item.type === 'INFORMASI' || !item.type)
  )

  useEffect(() => {
    if (!urgentAnnouncements || urgentAnnouncements.length === 0 || !userId) return

    // Temukan pengumuman mendesak terbaru yang belum pernah ditutup/dikonfirmasi di sesi/storage lokal pengguna ini
    const unreadUrgent = urgentAnnouncements.find((item) => {
      const dismissedKey = `simasmuh_dismissed_urgent_${item.id}_${userId}`
      return !localStorage.getItem(dismissedKey)
    })

    if (unreadUrgent) {
      setActiveAnnouncement(unreadUrgent)
      // Sedikit delay agar transisi rendering halaman dashboard selesai dengan mulus
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [urgentAnnouncements, userId])

  const handleDismiss = () => {
    if (activeAnnouncement && userId) {
      const dismissedKey = `simasmuh_dismissed_urgent_${activeAnnouncement.id}_${userId}`
      localStorage.setItem(dismissedKey, new Date().toISOString())
    }
    setIsOpen(false)
  }

  if (!activeAnnouncement) return null

  const isInfo = activeAnnouncement.type === 'INFORMASI'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDismiss()
    }}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
        {/* Header Pengumuman */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isInfo
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
            }`}>
              {isInfo ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <BellRing className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  isInfo
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                }`}>
                  {isInfo ? 'Update Sistem' : 'Pengumuman Penting'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  Prioritas
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold mt-1 text-slate-900 dark:text-white leading-tight">
                Pemberitahuan Sistem
              </h3>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Isi Popup */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
          {/* Judul Pengumuman */}
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
              {activeAnnouncement.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>📅 {new Date(activeAnnouncement.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>•</span>
              <span>👤 {activeAnnouncement.author?.name || 'Admin SIMASMUH'}</span>
            </div>
          </div>

          {/* Lampiran Gambar (Jika ada) */}
          {activeAnnouncement.image && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[260px] bg-slate-100 dark:bg-slate-800/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeAnnouncement.image}
                alt={activeAnnouncement.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Rincian Pesan/Instruksi */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {activeAnnouncement.content}
          </div>
        </div>

        {/* Footer Aksi */}
        <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Pesan ini disiarkan secara otomatis oleh Admin Sistem.
          </p>
          <Button
            onClick={handleDismiss}
            className={`w-full sm:w-auto rounded-xl text-xs font-bold text-white shadow-md transition-all ${
              isInfo
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
            size="sm"
          >
            Saya Mengerti & Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
