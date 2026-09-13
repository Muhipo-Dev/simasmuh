'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Moon,
  Landmark,
  GraduationCap,
  Award,
  Sparkles,
  Search,
  Filter,
  Layers,
  MapPin,
  ExternalLink,
  Plus,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  fetchNationalHolidays,
  fetchHijriMonthCalendar,
  calculateLocalHijriDate,
  type NationalHoliday,
  type HijriDayInfo
} from '@/lib/national-holidays'

interface AnnouncementItem {
  id: string
  title: string
  content?: string
  eventDate?: string | Date
  createdAt?: string | Date
  type?: string
  target?: string
  image?: string
  author?: { name: string }
}

interface FullCalendarViewProps {
  initialAnnouncements?: AnnouncementItem[]
}

type EventFilterCategory = 'ALL' | 'AGENDA' | 'HOLIDAY' | 'ISLAMIC' | 'MUHAMMADIYAH' | 'NATIONAL'

export function FullCalendarView({ initialAnnouncements = [] }: FullCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [filterCategory, setFilterCategory] = useState<EventFilterCategory>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda_list'>('calendar')

  const [holidays, setHolidays] = useState<NationalHoliday[]>([])
  const [hijriCalendar, setHijriCalendar] = useState<Record<string, HijriDayInfo>>({})
  const [loading, setLoading] = useState(false)

  // Selected date popup
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([])
  const [selectedDayHijri, setSelectedDayHijri] = useState<HijriDayInfo | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-11
  const monthApiNumber = month + 1

  // Load Realtime Holidays & Hijri Calendar
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      setLoading(true)
      try {
        const [hols, hijri] = await Promise.all([
          fetchNationalHolidays(year),
          fetchHijriMonthCalendar(monthApiNumber, year)
        ])
        if (isMounted) {
          setHolidays(hols)
          setHijriCalendar(hijri)
        }
      } catch (e) {
        console.error('Error loading calendar data:', e)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [year, monthApiNumber])

  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ]
  const dayNames = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  // Filter school agenda items
  const schoolAgendas = useMemo(() => {
    return initialAnnouncements.filter(a => a.type === 'AGENDA' || a.eventDate)
  }, [initialAnnouncements])

  // Events map by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {}

    // 1. National Holidays & Cuti Bersama
    holidays.forEach(h => {
      if (!map[h.date]) map[h.date] = []
      map[h.date].push({
        id: `nat-${h.date}`,
        title: h.description,
        type: h.isCutiBersama ? 'CUTI_BERSAMA' : 'LIBUR_NASIONAL',
        tag: h.isCutiBersama ? '#CutiBersama' : '#LiburNasional',
        badge: h.isCutiBersama ? 'Cuti Bersama' : 'Libur Nasional',
        content: h.isCutiBersama ? 'Cuti Bersama Resmi Pemerintah Indonesia' : 'Hari Libur Nasional Indonesia (Pemerintah RI)',
        color: h.isCutiBersama ? 'orange' : 'rose'
      })
    })

    // 2. Islamic Events, Muhammadiyah Milestones, & National Commemorations
    Object.keys(hijriCalendar).forEach(dKey => {
      const hInfo = hijriCalendar[dKey]
      if (hInfo) {
        // Islamic Events
        hInfo.islamicHolidays?.forEach((ih, i) => {
          if (!map[dKey]) map[dKey] = []
          const exists = map[dKey].some(x => x.title.toLowerCase().includes(ih.toLowerCase()))
          if (!exists) {
            map[dKey].push({
              id: `islamic-${dKey}-${i}`,
              title: ih,
              type: 'ISLAMIC_EVENT',
              tag: '#HariBesarIslam',
              badge: 'Hari Besar Islam',
              content: `Penanggalan Hijriah: ${hInfo.hijriDateFormatted} (KHGT)`,
              color: 'amber'
            })
          }
        })

        // Muhammadiyah & Ortom Events
        hInfo.muhammadiyahEvents?.forEach((mh, i) => {
          if (!map[dKey]) map[dKey] = []
          const exists = map[dKey].some(x => x.title.toLowerCase().includes(mh.toLowerCase()))
          if (!exists) {
            map[dKey].push({
              id: `muh-${dKey}-${i}`,
              title: mh,
              type: 'MUHAMMADIYAH_EVENT',
              tag: '#Muhammadiyah',
              badge: 'Muhammadiyah',
              content: `Milad & Momentum Persyarikatan Muhammadiyah`,
              color: 'sky'
            })
          }
        })

        // Peringatan Nasional (Bukan Libur)
        hInfo.nationalEvents?.forEach((ne, i) => {
          if (!map[dKey]) map[dKey] = []
          const exists = map[dKey].some(x => x.title.toLowerCase().includes(ne.toLowerCase()))
          if (!exists) {
            map[dKey].push({
              id: `nat-commem-${dKey}-${i}`,
              title: ne,
              type: 'PERINGATAN_NASIONAL',
              tag: '#PeringatanNasional',
              badge: 'Peringatan Nasional',
              content: 'Peringatan Hari Besar Nasional Republik Indonesia (Bukan Libur Resmi)',
              color: 'indigo'
            })
          }
        })
      }
    })

    // 3. School Agendas
    schoolAgendas.forEach(ag => {
      if (!ag.eventDate) return
      const d = new Date(ag.eventDate)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push({
        id: ag.id,
        title: ag.title,
        type: 'AGENDA',
        tag: '#AgendaSekolah',
        badge: 'Agenda Sekolah',
        content: ag.content,
        target: ag.target,
        author: ag.author?.name,
        eventDate: ag.eventDate,
        color: 'emerald'
      })
    })

    return map
  }, [holidays, hijriCalendar, schoolAgendas])

  // Counts (Synchronized for current month)
  const counts = useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

    const holidayCount = holidays.filter(h => h.date.startsWith(currentMonthPrefix)).length
    let islamicCount = 0
    let muhammadiyahCount = 0
    let nationalCount = 0

    Object.keys(hijriCalendar).forEach(dKey => {
      if (dKey.startsWith(currentMonthPrefix)) {
        const h = hijriCalendar[dKey]
        if (h.islamicHolidays) islamicCount += h.islamicHolidays.length
        if (h.muhammadiyahEvents) muhammadiyahCount += h.muhammadiyahEvents.length
        if (h.nationalEvents) nationalCount += h.nationalEvents.length
      }
    })

    const agendaCount = schoolAgendas.filter(ag => {
      if (!ag.eventDate) return false
      const d = new Date(ag.eventDate)
      return d.getFullYear() === year && d.getMonth() === month
    }).length

    return { holidayCount, islamicCount, muhammadiyahCount, agendaCount, nationalCount }
  }, [holidays, hijriCalendar, schoolAgendas, year, month])

  // Calendar Grid Days
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays = useMemo(() => {
    const days = []

    const filterFn = (events: any[]) => {
      if (filterCategory === 'ALL') return events
      if (filterCategory === 'AGENDA') return events.filter(e => e.type === 'AGENDA')
      if (filterCategory === 'HOLIDAY') return events.filter(e => e.type === 'LIBUR_NASIONAL' || e.type === 'CUTI_BERSAMA')
      if (filterCategory === 'ISLAMIC') return events.filter(e => e.type === 'ISLAMIC_EVENT')
      if (filterCategory === 'MUHAMMADIYAH') return events.filter(e => e.type === 'MUHAMMADIYAH_EVENT')
      if (filterCategory === 'NATIONAL') return events.filter(e => e.type === 'PERINGATAN_NASIONAL')
      return events
    }

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const d = new Date(year, month - 1, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const filteredEvents = filterFn(allEvents)
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: filteredEvents,
        allEvents,
        hijri
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const filteredEvents = filterFn(allEvents)
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: true,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: filteredEvents,
        allEvents,
        hijri
      })
    }

    // Next month padding
    const remainingDays = (7 - (days.length % 7)) % 7
    for (let day = 1; day <= remainingDays; day++) {
      const d = new Date(year, month + 1, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const filteredEvents = filterFn(allEvents)
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: filteredEvents,
        allEvents,
        hijri
      })
    }

    return days
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth, eventsByDate, filterCategory, hijriCalendar])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const now = new Date()
    setCurrentDate(now)
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (eventsByDate[key]) {
      setSelectedDate(key)
      setSelectedDayEvents(eventsByDate[key])
      setSelectedDayHijri(hijriCalendar[key] || null)
    }
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Combined List for Agenda List View
  const combinedAgendaList = useMemo(() => {
    const list: any[] = []

    // School Agendas
    schoolAgendas.forEach(ag => {
      const d = ag.eventDate ? new Date(ag.eventDate) : new Date(ag.createdAt || Date.now())
      list.push({
        id: ag.id,
        title: ag.title,
        content: ag.content,
        target: ag.target,
        dateObj: d,
        type: 'AGENDA',
        badge: 'Agenda Sekolah',
        color: 'emerald'
      })
    })

    // Holidays
    holidays.forEach((h, i) => {
      const d = new Date(h.date)
      list.push({
        id: `hol-${i}`,
        title: h.description,
        content: h.isCutiBersama ? 'Cuti Bersama Resmi' : 'Hari Libur Nasional Indonesia',
        dateObj: d,
        type: h.isCutiBersama ? 'CUTI_BERSAMA' : 'LIBUR_NASIONAL',
        badge: h.isCutiBersama ? 'Cuti Bersama' : 'Libur Nasional',
        color: 'rose'
      })
    })

    // Islamic & Muhammadiyah
    Object.keys(hijriCalendar).forEach(dateKey => {
      const hInfo = hijriCalendar[dateKey]
      if (hInfo) {
        const d = new Date(dateKey)
        hInfo.islamicHolidays?.forEach((ih, i) => {
          list.push({
            id: `isl-${dateKey}-${i}`,
            title: ih,
            content: `Peringatan Hari Besar Islam (${hInfo.hijriDateFormatted})`,
            dateObj: d,
            type: 'ISLAMIC_EVENT',
            badge: 'Hari Besar Islam',
            color: 'amber'
          })
        })
        hInfo.muhammadiyahEvents?.forEach((mh, i) => {
          list.push({
            id: `muh-${dateKey}-${i}`,
            title: mh,
            content: `Momentum & Milad Persyarikatan Muhammadiyah`,
            dateObj: d,
            type: 'MUHAMMADIYAH_EVENT',
            badge: 'Muhammadiyah',
            color: 'sky'
          })
        })
        hInfo.nationalEvents?.forEach((ne, i) => {
          list.push({
            id: `nat-commem-${dateKey}-${i}`,
            title: ne,
            content: `Peringatan Hari Besar Nasional Republik Indonesia (Bukan Libur Resmi)`,
            dateObj: d,
            type: 'PERINGATAN_NASIONAL',
            badge: 'Peringatan Nasional',
            color: 'indigo'
          })
        })
      }
    })

    return list
      .filter(item => {
        if (filterCategory === 'AGENDA') return item.type === 'AGENDA'
        if (filterCategory === 'HOLIDAY') return item.type === 'LIBUR_NASIONAL' || item.type === 'CUTI_BERSAMA'
        if (filterCategory === 'ISLAMIC') return item.type === 'ISLAMIC_EVENT'
        if (filterCategory === 'MUHAMMADIYAH') return item.type === 'MUHAMMADIYAH_EVENT'
        if (filterCategory === 'NATIONAL') return item.type === 'PERINGATAN_NASIONAL'
        return true
      })
      .filter(item => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          item.title?.toLowerCase().includes(q) ||
          item.content?.toLowerCase().includes(q) ||
          item.badge?.toLowerCase().includes(q) ||
          item.target?.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [schoolAgendas, holidays, hijriCalendar, filterCategory, searchQuery])

  const midMonthHijri = useMemo(() => {
    const midKey = `${year}-${String(month + 1).padStart(2, '0')}-15`
    return hijriCalendar[midKey] || calculateLocalHijriDate(new Date(year, month, 15))
  }, [hijriCalendar, year, month])

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 0. Official KHGT Muhammadiyah Verification Banner */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 border border-amber-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-white rounded-xl border border-amber-200/90 shadow-2xs shrink-0 flex items-center justify-center">
            <Image
              src="/logo-khgt.png"
              alt="Logo KHGT Muhammadiyah"
              width={140}
              height={40}
              className="h-6 sm:h-8 w-auto object-contain"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-tight">
                Kalender Hijriah Global Tunggal (KHGT)
              </h3>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[9px] font-bold py-0">
                PP Muhammadiyah
              </Badge>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Penanggalan Islam unifikasi Majelis Tarjih PP Muhammadiyah.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">Agenda</span>
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {counts.agendaCount}
          </p>
          <span className="text-[9px] text-emerald-600 font-semibold truncate block">Kegiatan Sekolah</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">Libur Nasional</span>
            <Flag className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-600 mt-0.5">
            {counts.holidayCount}
          </p>
          <span className="text-[9px] text-slate-400 font-semibold truncate block">Tahun {year} M</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">Peringatan</span>
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-indigo-600 mt-0.5">
            {counts.nationalCount}
          </p>
          <span className="text-[9px] text-indigo-600 font-semibold truncate block">Nasional (Non-Libur)</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">Hari Islam</span>
            <Moon className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
            {counts.islamicCount}
          </p>
          <span className="text-[9px] text-slate-400 font-semibold truncate block">Tahun {midMonthHijri.hijriYear || midMonthHijri.year} H</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase truncate">Muhammadiyah</span>
            <Landmark className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-lg sm:text-xl font-black text-sky-600 mt-0.5">
            {counts.muhammadiyahCount}
          </p>
          <span className="text-[9px] text-sky-600 font-semibold truncate block">Milad &amp; Momentum</span>
        </div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 overflow-hidden">
        {/* Navigation & Month Heading */}
        <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border-slate-200 dark:border-slate-800"
            >
              <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border-slate-200 dark:border-slate-800"
            >
              <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="h-7 sm:h-8 px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-bold rounded-lg border-blue-200 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
            >
              Hari Ini
            </Button>
          </div>
          <div className="pl-1 sm:pl-2 text-right sm:text-left">
            <h2 className="text-xs sm:text-sm lg:text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[10px] sm:text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              {midMonthHijri.hijriMonthName || midMonthHijri.monthName} {midMonthHijri.hijriYear || midMonthHijri.year} H
            </p>
          </div>
        </div>

        {/* View mode & Category Filter */}
        <div className="flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap min-w-0 max-w-full">
          {/* Mobile & Medium screen Filter: Compact Bordered Box */}
          <div className="lg:hidden flex-1 min-w-[140px] max-w-[220px]">
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
              <Filter className="w-3 h-3 text-slate-500 shrink-0" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as EventFilterCategory)}
                className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none w-full cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-white dark:bg-slate-900">Semua ({counts.holidayCount + counts.islamicCount + counts.muhammadiyahCount + counts.agendaCount + counts.nationalCount})</option>
                <option value="HOLIDAY" className="bg-white dark:bg-slate-900">Libur ({counts.holidayCount})</option>
                <option value="NATIONAL" className="bg-white dark:bg-slate-900">Nasional ({counts.nationalCount})</option>
                <option value="ISLAMIC" className="bg-white dark:bg-slate-900">Islam ({counts.islamicCount})</option>
                <option value="MUHAMMADIYAH" className="bg-white dark:bg-slate-900">Muhammadiyah ({counts.muhammadiyahCount})</option>
                <option value="AGENDA" className="bg-white dark:bg-slate-900">Sekolah ({counts.agendaCount})</option>
              </select>
            </div>
          </div>

          {/* Large Screen Filter Pills: Compact & sleek */}
          <div className="hidden lg:flex items-center gap-0.5 text-[10px] xl:text-[10.5px] bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterCategory('HOLIDAY')}
              className={`px-1.5 xl:px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'HOLIDAY'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              Libur ({counts.holidayCount})
            </button>
            <button
              onClick={() => setFilterCategory('NATIONAL')}
              className={`px-1.5 xl:px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'NATIONAL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
              }`}
            >
              Nasional ({counts.nationalCount})
            </button>
            <button
              onClick={() => setFilterCategory('ISLAMIC')}
              className={`px-1.5 xl:px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'ISLAMIC'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              Islam ({counts.islamicCount})
            </button>
            <button
              onClick={() => setFilterCategory('MUHAMMADIYAH')}
              className={`px-1.5 xl:px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'MUHAMMADIYAH'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40'
              }`}
            >
              Muhammadiyah ({counts.muhammadiyahCount})
            </button>
            <button
              onClick={() => setFilterCategory('AGENDA')}
              className={`px-1.5 xl:px-2 py-0.5 rounded-md font-bold transition-all whitespace-nowrap ${
                filterCategory === 'AGENDA'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Sekolah ({counts.agendaCount})
            </button>
          </div>

          {/* Mode switch */}
          <div className="flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              className={`h-6 sm:h-7 px-2 text-[10px] sm:text-[10.5px] font-bold rounded-md transition-all ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('calendar')}
            >
              Kalender
            </button>
            <button
              className={`h-6 sm:h-7 px-2 text-[10px] sm:text-[10.5px] font-bold rounded-md transition-all ${
                viewMode === 'agenda_list' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              onClick={() => setViewMode('agenda_list')}
            >
              Daftar
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Display Area */}
      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-center py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {dayNames.map((d, i) => (
              <div key={i} className={i === 0 ? 'text-rose-600 dark:text-rose-400' : i === 5 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarDays.map((cell, idx) => {
              const isToday = cell.key === todayKey
              const isSelected = selectedDate === cell.key

              const hasHoliday = cell.allEvents.some(e => e.type === 'LIBUR_NASIONAL' || e.type === 'CUTI_BERSAMA')
              const hasIslamic = cell.allEvents.some(e => e.type === 'ISLAMIC_EVENT')
              const hasMuhammadiyah = cell.allEvents.some(e => e.type === 'MUHAMMADIYAH_EVENT')
              const hasAgenda = cell.allEvents.some(e => e.type === 'AGENDA')

              const isRedDay = cell.isSunday || hasHoliday

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(cell.key)
                    setSelectedDayEvents(cell.allEvents)
                    setSelectedDayHijri(cell.hijri as any)
                  }}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-300 dark:text-slate-600'
                      : hasHoliday
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 hover:bg-rose-50/60'
                      : hasMuhammadiyah
                      ? 'bg-sky-50/30 dark:bg-sky-950/20 hover:bg-sky-50/60'
                      : hasIslamic
                      ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60'
                      : hasAgenda
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  } ${isSelected ? 'ring-2 ring-blue-500 z-10 bg-blue-50/20' : ''}`}
                >
                  {/* Top Bar in Cell: Gregorian (Masehi) on Top-Left */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-black w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isRedDay && cell.isCurrentMonth
                          ? 'text-rose-600 dark:text-rose-400'
                          : ''
                      }`}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {/* Event Badges in Cell */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden min-h-[30px]">
                    {cell.events.slice(0, 3).map((ev: any, evIdx: number) => (
                      <div
                        key={evIdx}
                        title={ev.title}
                        className={`text-[8.5px] sm:text-[9.5px] font-bold truncate px-1.5 py-0.5 rounded-md leading-tight ${
                          ev.type === 'LIBUR_NASIONAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                            : ev.type === 'CUTI_BERSAMA'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200 border border-orange-200 dark:border-orange-800'
                            : ev.type === 'ISLAMIC_EVENT'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                            : ev.type === 'MUHAMMADIYAH_EVENT'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-200 border border-sky-200 dark:border-sky-800'
                            : ev.type === 'PERINGATAN_NASIONAL'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {cell.events.length > 3 && (
                      <span className="text-[8px] font-extrabold text-slate-500 block text-right pr-1">
                        +{cell.events.length - 3} lainnya
                      </span>
                    )}
                  </div>

                  {/* Bottom Bar: Hijri Date on Bottom-Right */}
                  <div className="flex items-center justify-end pt-1 mt-auto">
                    {cell.hijri && (
                      <span
                        title={`${cell.hijri.hijriDay ?? cell.hijri.day} ${cell.hijri.hijriMonthName || cell.hijri.monthName} ${cell.hijri.hijriYear || cell.hijri.year} H`}
                        className={`text-[9.5px] sm:text-[11px] font-mono font-bold leading-none ${
                          cell.isCurrentMonth
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {cell.hijri.hijriDay ?? cell.hijri.day}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Agenda List Mode View */
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari agenda kegiatan atau hari libur..."
              className="pl-9 h-10 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {combinedAgendaList.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Tidak ada agenda yang ditemukan</p>
                <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter kategori.</p>
              </div>
            ) : (
              combinedAgendaList.map((item, idx) => {
                const isHoliday = item.type === 'LIBUR_NASIONAL'
                const isCuti = item.type === 'CUTI_BERSAMA'
                const isIslamic = item.type === 'ISLAMIC_EVENT'
                const isMuhammadiyah = item.type === 'MUHAMMADIYAH_EVENT'

                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isHoliday
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                        : isCuti
                        ? 'bg-orange-50/30 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                        : isIslamic
                        ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                        : isMuhammadiyah
                        ? 'bg-sky-50/30 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isHoliday
                                ? 'bg-rose-100 text-rose-700 border-rose-300'
                                : isCuti
                                ? 'bg-orange-100 text-orange-700 border-orange-300'
                                : isIslamic
                                ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : isMuhammadiyah
                                ? 'bg-sky-100 text-sky-700 border-sky-300'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            }`}
                          >
                            {item.badge}
                          </Badge>
                          {item.tag && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {item.dateObj.toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </h3>
                      {item.content && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {item.content}
                        </p>
                      )}
                    </div>

                    {item.target && (
                      <div className="text-[10px] text-slate-400 font-semibold border-t pt-2 border-slate-100 dark:border-slate-800">
                        Target: {item.target}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Selected Date Detail Modal / Popover */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span>Tanggal {selectedDate}</span>
                </h3>
                {selectedDayHijri && (
                  <p className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                    {selectedDayHijri.hijriDateFormatted}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayEvents.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-xs text-slate-500">
                  Tidak ada agenda sekolah atau hari besar khusus pada tanggal ini.
                </div>
              ) : (
                selectedDayEvents.map((ev: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      ev.type === 'LIBUR_NASIONAL'
                        ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 text-rose-950 dark:text-rose-100'
                        : ev.type === 'CUTI_BERSAMA'
                        ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200 text-orange-950 dark:text-orange-100'
                        : ev.type === 'ISLAMIC_EVENT'
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 text-amber-950 dark:text-amber-100'
                        : ev.type === 'MUHAMMADIYAH_EVENT'
                        ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 text-sky-950 dark:text-sky-100'
                        : ev.type === 'PERINGATAN_NASIONAL'
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 text-indigo-950 dark:text-indigo-100'
                        : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 text-emerald-950 dark:text-emerald-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-extrabold text-sm">{ev.title}</span>
                      <div className="flex items-center gap-1">
                        {ev.tag && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 shadow-2xs border border-black/5">
                            {ev.tag}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[9px] shrink-0 font-bold ${
                            ev.type === 'LIBUR_NASIONAL'
                              ? 'bg-rose-100 text-rose-700 border-rose-300'
                              : ev.type === 'CUTI_BERSAMA'
                              ? 'bg-orange-100 text-orange-700 border-orange-300'
                              : ev.type === 'ISLAMIC_EVENT'
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : ev.type === 'MUHAMMADIYAH_EVENT'
                              ? 'bg-sky-100 text-sky-700 border-sky-300'
                              : ev.type === 'PERINGATAN_NASIONAL'
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {ev.badge || ev.type}
                        </Badge>
                      </div>
                    </div>
                    {ev.content && (
                      <p className="text-xs opacity-90 leading-relaxed whitespace-pre-wrap">
                        {ev.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
              <Button
                onClick={() => setSelectedDate(null)}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl h-8 px-4"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
