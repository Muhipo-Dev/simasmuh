'use client'

import Link from 'next/link'
import {
  BookOpen, Users, UserCheck, CalendarDays, Wallet, Award,
  ShieldCheck, GraduationCap, Package, Megaphone, Settings,
  Contact, Mail, UserCog, Camera, DoorOpen, ClipboardCheck,
  Receipt, BarChart3, HardDrive, BellRing, LucideIcon,
  Sparkles, Briefcase, Layers
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

// Common / General employee action links to put in secondary section
const COMMON_ACTION_HREFS = [
  '/presensi/scan-qr',
  '/presensi/kehadiran-pegawai',
  '/presensi/jurnal-karyawan',
  '/keuangan/slip-gaji',
  '/presensi/izin-keluar',
  '/presensi/cuti',
  '/pengaturan/notifikasi-pengguna',
  '/pengaturan/notifikasi-wali',
  '/fitur/disposisi',
]

export function CenterQuickAccessGrid({ links = [], role }: CenterQuickAccessGridProps) {
  // Pisahkan modul khusus peran/tugas (Atas) dan modul umum harian (Bawah)
  const isSpecializedRole = role === 'KEPALA_SEKOLAH' || role === 'KEUANGAN' || role === 'KEUANGAN_ALL' || role === 'KEUANGAN_MASUK' || role === 'KEUANGAN_KELUAR' ||
    role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA' || role === 'SUPERVISOR_KEUANGAN' || role === 'PEGAWAI' || role === 'KARYAWAN' || role === 'GURU'

  // Pisahkan link menjadi roleSpecific dan common
  const roleSpecificLinks: QuickActionItem[] = []
  const commonLinks: QuickActionItem[] = []

  links.forEach(l => {
    // Jika link tersebut adalah link umum pegawai
    if (COMMON_ACTION_HREFS.some(ch => l.href.startsWith(ch))) {
      commonLinks.push(l)
    } else {
      roleSpecificLinks.push(l)
    }
  })

  // Jika tidak ada pembagian spesifik atau role admin murni, render single grid biasa
  if (roleSpecificLinks.length === 0 || commonLinks.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {links.map((link, idx) => renderCard(link, idx))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KELOMPOK 1: MODUL LAYANAN (ATAS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
            <Briefcase className="w-3 h-3 text-blue-600" />
            Layanan ({roleSpecificLinks.length})
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {roleSpecificLinks.map((link, idx) => renderCard(link, idx))}
        </div>
      </div>

      {/* KELOMPOK 2: AKTIVITAS (BAWAH) */}
      <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
            <Layers className="w-3 h-3 text-slate-500" />
            Aktivitas ({commonLinks.length})
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {commonLinks.map((link, idx) => renderCard(link, idx + roleSpecificLinks.length))}
        </div>
      </div>
    </div>
  )
}

function renderCard(link: QuickActionItem, idx: number) {
  const Icon = link.icon || BookOpen
  const gradientClass = link.gradient || cardGradients[idx % cardGradients.length]

  return (
    <Link
      key={idx}
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

