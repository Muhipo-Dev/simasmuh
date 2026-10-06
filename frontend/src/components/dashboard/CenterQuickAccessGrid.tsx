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

// Curated clean tactile themes with subtle tinted backgrounds and contrast border
const cardStyles = [
  'bg-blue-50/90 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100 border-blue-200/80 dark:border-blue-900/60 hover:border-blue-400 hover:bg-blue-100/80 icon-bg-blue-600',
  'bg-emerald-50/90 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100 border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400 hover:bg-emerald-100/80 icon-bg-emerald-600',
  'bg-indigo-50/90 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100 border-indigo-200/80 dark:border-indigo-900/60 hover:border-indigo-400 hover:bg-indigo-100/80 icon-bg-indigo-600',
  'bg-amber-50/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100 border-amber-200/80 dark:border-amber-900/60 hover:border-amber-400 hover:bg-amber-100/80 icon-bg-amber-600',
  'bg-purple-50/90 text-purple-950 dark:bg-purple-950/40 dark:text-purple-100 border-purple-200/80 dark:border-purple-900/60 hover:border-purple-400 hover:bg-purple-100/80 icon-bg-purple-600',
  'bg-teal-50/90 text-teal-950 dark:bg-teal-950/40 dark:text-teal-100 border-teal-200/80 dark:border-teal-900/60 hover:border-teal-400 hover:bg-teal-100/80 icon-bg-teal-600',
  'bg-rose-50/90 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100 border-rose-200/80 dark:border-rose-900/60 hover:border-rose-400 hover:bg-rose-100/80 icon-bg-rose-600',
  'bg-slate-50/90 text-slate-950 dark:bg-slate-800/60 dark:text-slate-100 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-400 hover:bg-slate-100/80 icon-bg-slate-700',
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

  // Urutkan grup:
  // 1. Paling atas: 'Akses Utama' (Dashboard, Log Presensi, QR Scanner, Disposisi)
  // 2. Di tengah: Fitur Role & Sub-role (Master Data, Supervisi, Operasional, Administrasi, Konfigurasi, dll.)
  // 3. Paling bawah: Layanan Mandiri (Slip Gaji, Tunjangan Harian, Izin Keluar, Cuti, Notifikasi)
  const sortedGroupKeys = Object.keys(groupedLinks).sort((a, b) => {
    if (a === 'Akses Utama') return -1
    if (b === 'Akses Utama') return 1
    if (a === 'Layanan Mandiri') return 1
    if (b === 'Layanan Mandiri') return -1
    return 0
  })

  // Jika hanya ada 1 grup atau links kosong
  if (sortedGroupKeys.length <= 1) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5">
        {links.map((link, idx) => renderCard(link, idx))}
      </div>
    )
  }

  let globalIndex = 0

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {sortedGroupKeys.map((groupName) => {
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
          <div key={groupName} className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-center">
              <span className={`text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider border px-2.5 sm:px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs ${badgeStyle}`}>
                <GroupIcon className="w-3 h-3" />
                {groupName} ({items.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
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
  const styleClass = link.gradient || cardStyles[idx % cardStyles.length]

  return (
    <Link
      key={link.href + idx}
      href={link.href}
      className="group relative block rounded-2xl transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
    >
      <div
        className={`h-full min-h-[72px] sm:min-h-[78px] p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all shadow-2xs ${styleClass}`}
      >
        {/* Flat Contrast Icon Badge */}
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-200 shrink-0">
          <Icon className="w-4 h-4 text-slate-800 dark:text-slate-100" />
        </div>

        {/* Text Details */}
        <div className="space-y-0.5 w-full min-w-0">
          <h4 className="font-extrabold text-[11.5px] sm:text-xs leading-tight tracking-tight line-clamp-2">
            {link.name}
          </h4>
          {link.subtitle && (
            <p className="text-[9.5px] opacity-80 font-medium leading-tight truncate">
              {link.subtitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
