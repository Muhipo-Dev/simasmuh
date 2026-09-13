'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, Moon, Sun, Sunrise, Sunset, Compass, Sparkles, ChevronRight, Volume2, Calendar } from 'lucide-react'
import { calculateKHGTPrayerTimes, DEFAULT_PONOROGO_COORDS, DailyPrayerSchedule, PrayerTimeItem } from '@/lib/prayer-times-khgt'
import { fetchHijriMonthCalendar, calculateLocalHijriDate } from '@/lib/national-holidays'
import Link from 'next/link'

interface PrayerTimesWidgetProps {
  variant?: 'compact' | 'full' | 'banner'
  className?: string
  showHijriBadge?: boolean
  showCountdown?: boolean
}

export function PrayerTimesWidget({
  variant = 'compact',
  className = '',
  showHijriBadge = true,
  showCountdown = true
}: PrayerTimesWidgetProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [hijriDateStr, setHijriDateStr] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'today' | 'info'>('today')

  // Realtime clock ticker per detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Sinkronisasi data Hijriah KHGT
  useEffect(() => {
    let isMounted = true
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    // Instant local calculation
    const localHijri = calculateLocalHijriDate(now)
    setHijriDateStr(`${localHijri.day} ${localHijri.monthName} ${localHijri.year} H (KHGT)`)

    // Async sync with Aladhan / Tarjih database
    fetchHijriMonthCalendar(m, y).then(data => {
      if (isMounted && data[dateKey]?.hijriDateFormatted) {
        setHijriDateStr(`${data[dateKey].hijriDateFormatted} (KHGT)`)
      }
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear()])

  const prayerSchedule: DailyPrayerSchedule = useMemo(() => {
    return calculateKHGTPrayerTimes(currentDate, DEFAULT_PONOROGO_COORDS, hijriDateStr)
  }, [currentDate, hijriDateStr])

  // Filter 5 waktu sholat fardhu + Dhuha & Imsak
  const displayItems = prayerSchedule.items.filter(it =>
    ['subuh', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'].includes(it.id)
  )

  const getPrayerIcon = (id: string) => {
    switch (id) {
      case 'imsak':
      case 'subuh':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />
      case 'terbit':
      case 'dhuha':
        return <Sunrise className="w-3.5 h-3.5 text-amber-400" />
      case 'dzuhur':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />
      case 'ashar':
        return <Sun className="w-3.5 h-3.5 text-orange-400" />
      case 'maghrib':
        return <Sunset className="w-3.5 h-3.5 text-rose-400" />
      case 'isya':
        return <Moon className="w-3.5 h-3.5 text-blue-400" />
      default:
        return <Clock className="w-3.5 h-3.5 text-teal-400" />
    }
  }

  // Render Horizontal Banner Variant (Cocok untuk Header / Top Dashboard Siswa & Guru)
  if (variant === 'banner') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 border border-teal-800/40 shadow-md p-3.5 sm:p-4 text-white ${className}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          {/* Sisi Kiri: Lokasi & Status Sholat Terdekat */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-teal-200 tracking-tight flex items-center gap-1">
                  Jadwal Sholat & Waktu Ibadah
                </span>
                {showHijriBadge && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                    {hijriDateStr || 'Kalender KHGT'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5 font-medium">
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-teal-400" />
                  Ponorogo (WIB)
                </span>
                {showCountdown && prayerSchedule.countdownString && (
                  <>
                    <span>&bull;</span>
                    <span className="text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {prayerSchedule.countdownString}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Grid 6 Waktu Sholat */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {displayItems.map((p) => {
              const isNext = p.isNext
              return (
                <div
                  key={p.id}
                  className={`px-2.5 py-1.5 rounded-xl text-center border transition-all ${
                    isNext
                      ? 'bg-teal-500/30 border-teal-400 text-white shadow-xs scale-105 ring-1 ring-teal-400/50'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    {getPrayerIcon(p.id)}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{p.name}</span>
                  </div>
                  <div className={`text-xs sm:text-sm font-black font-mono leading-none ${isNext ? 'text-teal-200' : 'text-white'}`}>
                    {p.time}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Render Compact Card Widget (Cocok untuk Sidebar Dashboard / Kolom Kanan-Kiri)
  return (
    <Card className={`border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs rounded-2xl overflow-hidden flex flex-col ${className}`}>
      {/* Header Widget */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50/60 to-indigo-50/40 dark:from-teal-950/30 dark:to-indigo-950/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              Jadwal Sholat & KHGT
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-teal-500" />
              Ponorogo &bull; Majelis Tarjih PP Muhammadiyah
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 font-bold shrink-0">
          WIB (UTC+7)
        </Badge>
      </div>

      {/* KHGT Hijri Date Banner */}
      <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          {hijriDateStr || 'Kalender Hijriah Global Tunggal'}
        </span>
        {prayerSchedule.countdownString && (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
            {prayerSchedule.countdownString}
          </span>
        )}
      </div>

      {/* Grid Waktu Sholat */}
      <div className="p-3 sm:p-3.5 space-y-1.5 flex-1">
        {displayItems.map((item) => {
          const isNext = item.isNext
          return (
            <div
              key={item.id}
              className={`p-2 rounded-xl flex items-center justify-between transition-all ${
                isNext
                  ? 'bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-transparent border border-teal-400/50 shadow-2xs dark:from-teal-950/60 dark:to-slate-900'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isNext
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {getPrayerIcon(item.id)}
                </div>
                <div>
                  <span className={`text-xs font-bold block leading-tight ${isNext ? 'text-teal-900 dark:text-teal-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    {item.name}
                  </span>
                  <span className="text-[9px] text-slate-400 font-serif">
                    {item.arabicName}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xs sm:text-sm font-black font-mono block ${isNext ? 'text-teal-600 dark:text-teal-300' : 'text-slate-900 dark:text-white'}`}>
                  {item.time}
                </span>
                {isNext && (
                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                    Selanjutnya
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info Singkat */}
      <div className="p-2.5 px-3.5 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Ketinggian Subuh -18° (Tarjih)</span>
        <Link href="/agenda" className="hover:text-teal-600 dark:hover:text-teal-400 font-bold flex items-center gap-0.5">
          Kalender KHGT &rarr;
        </Link>
      </div>
    </Card>
  )
}
