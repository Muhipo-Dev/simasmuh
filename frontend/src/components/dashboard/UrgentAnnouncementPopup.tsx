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
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-white dark:bg-slate-900">
        {/* Banner Header Mendesak */}
        <div className={`p-4 sm:p-5 text-white relative overflow-hidden ${
          isInfo
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700'
            : 'bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700'
        }`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                {isInfo ? (
                  <ShieldAlert className="w-5 h-5 text-emerald-100 animate-pulse" />
                ) : (
                  <BellRing className="w-5 h-5 text-rose-100 animate-bounce" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white">
                    {isInfo ? '🛡️ UPDATE & KEAMANAN SISTEM' : '📢 PENGUMUMAN MENDESAK SISTEM'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                    PENTING
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-1 text-white leading-tight">
                  Pemberitahuan Penting untuk Anda
                </h3>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
