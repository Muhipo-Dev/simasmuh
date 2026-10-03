'use client'

import React from 'react'
import Link from 'next/link'
import {
  BookOpen, Users, UserCheck, CalendarDays, Wallet, Award,
  ShieldCheck, GraduationCap, Package, Megaphone, Settings,
  Contact, Mail, UserCog, Camera, DoorOpen, ClipboardCheck,
  Receipt, BarChart3, HardDrive, BellRing, LucideIcon,
  Sparkles, Briefcase, Layers, UserCircle, QrCode, FileCheck, Database, HeartPulse, BookCheck
} from 'lucide-react'

export interface QuickActionItem {
  name: string
  href: string
  icon?: LucideIcon | any
  subtitle?: string
  gradient?: string
  bgPattern?: string
  group?: string
}

interface CenterQuickAccessGridProps {
  links: QuickActionItem[]
  role?: string
}

// Curated vibrant 6-color gradient sequence matching the user reference photo
const cardGradients = [
  'from-indigo-600 to-cyan-600 shadow-indigo-500/20 text-white',
  'from-teal-500 to-emerald-600 shadow-teal-500/20 text-white',
  'from-cyan-600 to-sky-700 shadow-cyan-500/20 text-white',
  'from-amber-500 to-orange-600 shadow-amber-500/20 text-white',
  'from-blue-600 to-indigo-700 shadow-blue-500/20 text-white',
  'from-sky-500 to-indigo-600 shadow-sky-500/20 text-white',
  'from-rose-500 to-pink-600 shadow-rose-500/20 text-white',
  'from-purple-600 to-indigo-700 shadow-purple-500/20 text-white',
  'from-emerald-600 to-teal-700 shadow-emerald-500/20 text-white',
]

// Icon mapping per category group for visual clarity (Corporate & Commercial Standard)
const groupIcons: Record<string, LucideIcon> = {
  // Supervisi & Eksekutif
  'Supervisi Eksekutif': BookCheck,
  'Supervisi Kurikulum': GraduationCap,
  'Supervisi Kesiswaan': Award,
  'Supervisi Humas & SDM': Users,
  'Supervisi Sarana & Prasarana': Package,
  'Supervisi ISMUBA': BookOpen,
  'Supervisi Kesiswaan & Disiplin': ShieldCheck,
  'Supervisi Bimbingan Konseling': Users,

  // Operasional & Divisi
  'Operasional Akademik': BookOpen,
  'Kinerja Operasional': BookOpen,
  'Tugas Perwalian': UserCheck,
  'Piket Operasional': Briefcase,
  'Administrasi & Persuratan': Package,
  'Administrasi Persuratan': FileCheck,
  'Master Data': Database,
  'Konfigurasi Lanjutan': Settings,
  'Operasional Sistem': Settings,
  'Manajemen Finansial': Wallet,
  'Penerimaan Kas': Wallet,
  'Pengeluaran Kas': Receipt,
  'Layanan Mandiri': UserCircle,
  'Otorisasi & Dokumen': FileCheck,
  'Kesiswaan & Karakter': Award,
  'Data & Tata Kelola': Database,
  'Tata Kelola Operasional': Briefcase,
  'Layanan Akademik': GraduationCap,
  'Layanan Administrasi': Sparkles,
  'Monitoring Perkembangan': Users,
  'Layanan & Tagihan': Wallet,
  'Layanan Perpustakaan': BookOpen,
  'Program Tahfidz': BookOpen,
  'Pengembangan Siswa': Sparkles,
  'Publikasi Portal': Megaphone,
  'Layanan Fasilitas': Sparkles,
  'Layanan Keamanan': ShieldCheck,
  'Layanan Kesehatan': HeartPulse,
}

export function CenterQuickAccessGrid({ links = [], role }: CenterQuickAccessGridProps) {
  // Kelompokkan tautan berdasarkan properti `group`
  // Jika item tidak memiliki group (seperti Presensi QR, Log Presensi, Disposisi), masukkan ke 'Akses Utama'
  const groupedLinks: { [groupName: string]: QuickActionItem[] } = {}

  links.forEach(link => {
    const groupName = link.group || 'Akses Utama'
    if (!groupedLinks[groupName]) {
      groupedLinks[groupName] = []
    }
    groupedLinks[groupName].push(link)
  })

  const groupKeys = Object.keys(groupedLinks)

  // Jika hanya ada 1 grup atau links kosong
  if (groupKeys.length <= 1) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {links.map((link, idx) => renderCard(link, idx))}
      </div>
    )
  }

  let globalIndex = 0

  return (
    <div className="space-y-4 sm:space-y-5">
      {groupKeys.map((groupName) => {
        const items = groupedLinks[groupName]
        if (!items || items.length === 0) return null

        const GroupIcon = groupIcons[groupName] || (groupName === 'Akses Utama' ? Sparkles : Briefcase)
        const isSupervisi = groupName.startsWith('Supervisi')
        const isPersonal = groupName === 'Layanan Mandiri' || groupName === 'Layanan Administrasi' || groupName === 'Layanan & Tagihan'
        const isAdvance = groupName === 'Konfigurasi Lanjutan' || groupName === 'Operasional Sistem'

        const badgeStyle = isSupervisi
          ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/60'
          : isAdvance
          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60'
          : isPersonal
          ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60'
          : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/60'

        return (
          <div key={groupName} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wider border px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs ${badgeStyle}`}>
                <GroupIcon className="w-3 h-3" />
                {groupName} ({items.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {items.map((link) => {
                const card = renderCard(link, globalIndex)
                globalIndex++
                return card
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderCard(link: QuickActionItem, idx: number) {
  const Icon = link.icon || BookOpen
  const gradientClass = link.gradient || cardGradients[idx % cardGradients.length]

  return (
    <Link
      key={link.href + idx}
      href={link.href}
      className="group relative block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
    >
      <div
        className={`h-full min-h-[90px] sm:min-h-[96px] p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br ${gradientClass} flex flex-col justify-between gap-2 shadow-xs relative overflow-hidden`}
      >
        {/* Background watermark icon for rich depth */}
        <Icon className="absolute -right-2 -bottom-2 w-16 sm:w-20 h-16 sm:h-20 text-white/10 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />

        {/* Top row: Icon */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/30 transition-all duration-300 shadow-inner">
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 drop-shadow-xs" />
          </div>
        </div>

        {/* Bottom text info */}
        <div className="relative z-10 space-y-0.5 min-w-0">
          <h4 className="font-black text-xs sm:text-[13px] leading-snug tracking-tight text-white drop-shadow-xs line-clamp-2">
            {link.name}
          </h4>
          {link.subtitle && (
            <p className="text-[9.5px] sm:text-[10px] text-white/80 font-medium leading-tight truncate">
              {link.subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
