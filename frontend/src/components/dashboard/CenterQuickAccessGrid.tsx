'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BookOpen, Users, UserCheck, CalendarDays, Wallet, Award,
  ShieldCheck, GraduationCap, Package, Megaphone, Settings,
  Contact, Mail, UserCog, Camera, DoorOpen, ClipboardCheck,
  Receipt, BarChart3, HardDrive, BellRing, LucideIcon,
  Sparkles, Briefcase, Layers, UserCircle, QrCode, FileCheck, Database, HeartPulse, BookCheck,
  Search, Filter, X, Check, RotateCcw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
  'Konfigurasi Sistem': Settings,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL')
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)

  // Ekstraksi seluruh grup unik
  const allGroups = useMemo(() => {
    const set = new Set<string>()
    links.forEach(link => {
      set.add(link.group || 'Akses Utama')
    })
    return Array.from(set).sort((a, b) => {
      if (a === 'Akses Utama') return -1
      if (b === 'Akses Utama') return 1
      if (a === 'Layanan Mandiri') return 1
      if (b === 'Layanan Mandiri') return -1
      return a.localeCompare(b)
    })
  }, [links])

  // Filter links berdasarkan query pencarian dan kategori grup terpilih
  const filteredLinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return links.filter(link => {
      const matchGroup = selectedGroup === 'ALL' || (link.group || 'Akses Utama') === selectedGroup
      if (!matchGroup) return false

      if (!q) return true
      const nameMatch = link.name.toLowerCase().includes(q)
      const subMatch = link.subtitle ? link.subtitle.toLowerCase().includes(q) : false
      const groupMatch = (link.group || 'Akses Utama').toLowerCase().includes(q)
      const hrefMatch = link.href.toLowerCase().includes(q)
      return nameMatch || subMatch || groupMatch || hrefMatch
    })
  }, [links, searchQuery, selectedGroup])

  // Kelompokkan hasil filter berdasarkan properti `group`
  const groupedLinks: { [groupName: string]: QuickActionItem[] } = useMemo(() => {
    const grouped: { [groupName: string]: QuickActionItem[] } = {}
    filteredLinks.forEach(link => {
      const groupName = link.group || 'Akses Utama'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      grouped[groupName].push(link)
    })
    return grouped
  }, [filteredLinks])

  // Urutkan grup:
  // 1. Paling atas: 'Akses Utama' (Dashboard, Log Presensi, QR Scanner, Disposisi)
  // 2. Di tengah: Fitur Role & Sub-role (Master Data, Supervisi, Operasional, Administrasi, Konfigurasi, dll.)
  // 3. Paling bawah: Layanan Mandiri (Slip Gaji, Tunjangan Harian, Izin Keluar, Cuti, Notifikasi)
  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedLinks).sort((a, b) => {
      if (a === 'Akses Utama') return -1
      if (b === 'Akses Utama') return 1
      if (a === 'Layanan Mandiri') return 1
      if (b === 'Layanan Mandiri') return -1
      return 0
    })
  }, [groupedLinks])

  const hasActiveFilter = searchQuery.trim() !== '' || selectedGroup !== 'ALL'

  const handleResetFilter = () => {
    setSearchQuery('')
    setSelectedGroup('ALL')
  }

  let globalIndex = 0

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Searchbar & Tombol Filter Terpusat (Popover) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tombol akses cepat atau menu..."
            className="pl-8 sm:pl-9 pr-8 h-9 text-xs sm:text-sm bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tombol Filter Popover */}
        {allGroups.length > 1 && (
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-9 px-2.5 sm:px-3 text-xs font-bold rounded-xl gap-1.5 shrink-0 transition-all ${
                    selectedGroup !== 'ALL'
                      ? 'border-blue-500/60 bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kategori</span>
                  {selectedGroup !== 'ALL' && (
                    <Badge className="h-4 px-1 text-[9.5px] font-black bg-blue-600 text-white rounded-full">
                      1
                    </Badge>
                  )}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-64 p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Filter Kategori Menu
                </span>
                {selectedGroup !== 'ALL' && (
                  <button
                    onClick={() => setSelectedGroup('ALL')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                <button
                  onClick={() => {
                    setSelectedGroup('ALL')
                    setFilterPopoverOpen(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                    selectedGroup === 'ALL'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>Semua Kategori</span>
                  {selectedGroup === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                {allGroups.map((group) => {
                  const GroupIcon = groupIcons[group] || (group === 'Akses Utama' ? Sparkles : Briefcase)
                  const count = links.filter(l => (l.group || 'Akses Utama') === group).length
                  const isSelected = selectedGroup === group
                  return (
                    <button
                      key={group}
                      onClick={() => {
                        setSelectedGroup(group)
                        setFilterPopoverOpen(false)
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <GroupIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{group}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Reset Filter Button jika aktif */}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilter}
            className="h-9 px-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl"
            title="Reset semua pencarian dan filter"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>

      {/* Empty State jika hasil pencarian tidak ditemukan */}
      {filteredLinks.length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tombol akses cepat tidak ditemukan
          </p>
          <p className="text-[11px] text-slate-400">
            Tidak ada menu yang sesuai dengan kata kunci &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilter}
            className="h-7 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700 mt-2"
          >
            Tampilkan Semua Menu
          </Button>
        </div>
      ) : sortedGroupKeys.length <= 1 ? (
        /* Jika hanya ada 1 grup */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5">
          {filteredLinks.map((link, idx) => renderCard(link, idx))}
        </div>
      ) : (
        /* Render per grup kategori */
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
      )}
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
