'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Clock, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { calculateKHGTPrayerTimes, DEFAULT_PONOROGO_COORDS, DailyPrayerSchedule } from '@/lib/prayer-times-khgt'
import { fetchHijriMonthCalendar, calculateLocalHijriDate } from '@/lib/national-holidays'
import Link from 'next/link'

interface NavbarPrayerWidgetProps {
  className?: string
}

export function NavbarPrayerWidget({ className = '' }: NavbarPrayerWidgetProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [hijriDateStr, setHijriDateStr] = useState<string>('')

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

    const localHijri = calculateLocalHijriDate(now)
    setHijriDateStr(`${localHijri.day} ${localHijri.monthName} ${localHijri.year} H`)

    fetchHijriMonthCalendar(m, y)
      .then((data) => {
        if (isMounted && data[dateKey]?.hijriDateFormatted) {
          setHijriDateStr(data[dateKey].hijriDateFormatted)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear()])

  const prayerSchedule: DailyPrayerSchedule = useMemo(() => {
    return calculateKHGTPrayerTimes(currentDate, DEFAULT_PONOROGO_COORDS, hijriDateStr)
  }, [currentDate, hijriDateStr])

  const nextPrayer = prayerSchedule.nextPrayer

  if (!nextPrayer) return null

  const getPrayerIcon = (id: string) => {
    switch (id) {
      case 'imsak':
      case 'subuh':
        return <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
      case 'terbit':
      case 'dhuha':
        return <Sunrise className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
      case 'dzuhur':
        return <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
      case 'ashar':
        return <Sun className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
      case 'maghrib':
        return <Sunset className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
      case 'isya':
        return <Moon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
      default:
        return <Clock className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
    }
  }

  return (
    <Link
      href="/agenda"
      title={`Jadwal Sholat & Ibadah KHGT Ponorogo: ${prayerSchedule.countdownString || nextPrayer.name + ' ' + nextPrayer.time}`}
      className={`hidden md:flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-teal-50/80 dark:bg-teal-500/15 border border-teal-200/80 dark:border-teal-400/30 text-teal-800 dark:text-teal-200 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-teal-100/80 dark:hover:bg-teal-500/25 transition-all group shrink-0 ${className}`}
    >
      <div className="flex items-center gap-1 shrink-0">
        {getPrayerIcon(nextPrayer.id)}
        <span className="font-extrabold uppercase tracking-tight text-teal-900 dark:text-teal-100 text-[11px] sm:text-xs">
          {nextPrayer.name}
        </span>
        <span className="font-mono font-bold text-teal-700 dark:text-teal-300 text-[11px] sm:text-xs">
          {nextPrayer.time}
        </span>
      </div>

      {prayerSchedule.countdownString && (
        <>
          <span className="text-teal-400 dark:text-teal-500/80">&bull;</span>
          <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 dark:bg-amber-500/20 px-1.5 py-0.2 rounded-full border border-amber-300/60 dark:border-amber-500/30 shrink-0">
            {prayerSchedule.countdownString.replace(` menuju ${nextPrayer.name}`, '')}
          </span>
        </>
      )}
    </Link>
  )
}
