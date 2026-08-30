'use client'

import Link from 'next/link'
import {
  BookOpen, Users, UserCheck, CalendarDays, Wallet, Award,
  ShieldCheck, GraduationCap, Package, Megaphone, Settings,
  Contact, Mail, UserCog, Camera, DoorOpen, ClipboardCheck,
  Receipt, BarChart3, HardDrive, BellRing, LucideIcon
} from 'lucide-react'

export interface QuickActionItem {
  name: string
  href: string
  icon?: LucideIcon | any
  subtitle?: string
  gradient?: string
  bgPattern?: string
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

export function CenterQuickAccessGrid({ links = [], role }: CenterQuickAccessGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
      {links.map((link, idx) => {
        const Icon = link.icon || BookOpen
        const gradientClass = link.gradient || cardGradients[idx % cardGradients.length]

        return (
          <Link
            key={idx}
            href={link.href}
            className="group relative block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
          >
            <div
              className={`h-full min-h-[68px] sm:min-h-[76px] p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r ${gradientClass} flex items-center justify-between gap-3 shadow-sm relative overflow-hidden`}
            >
              {/* Background watermark icon for rich depth */}
              <Icon className="absolute -right-3 -bottom-3 w-16 sm:w-20 h-16 sm:h-20 text-white/10 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500" />

              {/* Left text info */}
              <div className="relative z-10 space-y-0.5 max-w-[78%] min-w-0">
                <h4 className="font-extrabold text-xs sm:text-sm leading-snug tracking-tight text-white drop-shadow-xs truncate">
                  {link.name}
                </h4>
                {link.subtitle && (
                  <p className="text-[10px] sm:text-[11px] text-white/80 font-medium leading-none truncate">
                    {link.subtitle}
                  </p>
                )}
              </div>

              {/* Right icon card */}
              <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:scale-105 group-hover:bg-white/30 transition-all duration-300 shadow-inner">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-xs" />
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
