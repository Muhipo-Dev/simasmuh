'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Sparkles,
  Layers,
  GraduationCap,
  Moon,
  Landmark,
  Plus,
  BookOpen,
  Maximize2,
  ExternalLink,
  Filter,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  fetchNationalHolidays,
  fetchHijriMonthCalendar,
  calculateLocalHijriDate,
  type NationalHoliday,
  type HijriDayInfo
} from '@/lib/national-holidays'

interface AgendaItem {
  id: string
  title: string
  content?: string
  eventDate?: string | Date
  createdAt?: string | Date
  type?: string
  target?: string
}

interface ActivityCalendarWidgetProps {
  announcements?: any[]
  title?: string
  onAddAgenda?: () => void
  showAddButton?: boolean
  isModal?: boolean
}

export type EventCategoryType = 'AGENDA' | 'LIBUR_NASIONAL' | 'CUTI_BERSAMA' | 'ISLAMIC_EVENT' | 'MUHAMMADIYAH_EVENT' | 'PERINGATAN_NASIONAL'

export interface CalendarDayEvent {
  title: string
  type: EventCategoryType
  tag?: string
  content?: string
  badgeLabel?: string
}

export function ActivityCalendarWidget({
  announcements = [],
  title = 'Kalender & Agenda Terpadu',
  onAddAgenda,
  showAddButton = false,
  isModal = false
}: ActivityCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [filterType, setFilterType] = useState<'ALL' | 'AGENDA' | 'HOLIDAY' | 'ISLAMIC' | 'MUHAMMADIYAH' | 'NATIONAL'>('ALL')
  const [holidays, setHolidays] = useState<NationalHoliday[]>([])
  const [hijriCalendar, setHijriCalendar] = useState<Record<string, HijriDayInfo>>({})
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false)
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarDayEvent[] | null>(null)
  const [selectedDateHijri, setSelectedDateHijri] = useState<HijriDayInfo | null>(null)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed (0 = Jan, 8 = Sep)
  const monthApiNumber = month + 1 // 1-12

  // Fetch National Holidays & Hijri Calendar Realtime when month or year changes
  useEffect(() => {
    let isMounted = true
    async function loadRealtimeCalendar() {
      setLoadingCalendar(true)
      try {
        const [holidayList, hijriData] = await Promise.all([
          fetchNationalHolidays(year),
          fetchHijriMonthCalendar(monthApiNumber, year)
        ])
        if (isMounted) {
          setHolidays(holidayList)
          setHijriCalendar(hijriData)
        }
      } catch (err) {
        console.error('Failed to load realtime calendar data:', err)
      } finally {
        if (isMounted) setLoadingCalendar(false)
      }
    }
    loadRealtimeCalendar()
    return () => {
      isMounted = false
    }
  }, [monthApiNumber, year])

  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ]
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // Filter agenda items sekolah
  const agendaList: AgendaItem[] = useMemo(() => {
    return (announcements || []).filter(
      (item: any) => item.type === 'AGENDA' || item.eventDate
    )
  }, [announcements])

  // Map of YYYY-MM-DD -> array of events
  const eventsByDate: Record<string, CalendarDayEvent[]> = useMemo(() => {
    const map: Record<string, CalendarDayEvent[]> = {}

    // 1. Masukkan Libur Nasional & Cuti Bersama
    holidays.forEach(h => {
      if (!map[h.date]) map[h.date] = []
      map[h.date].push({
        title: h.description,
        type: h.isCutiBersama ? 'CUTI_BERSAMA' : 'LIBUR_NASIONAL',
        tag: h.isCutiBersama ? '#CutiBersama' : '#LiburNasional',
        content: h.isCutiBersama ? 'Cuti Bersama Resmi Pemerintah Indonesia' : 'Hari Libur Nasional Indonesia (Pemerintah RI)',
        badgeLabel: h.isCutiBersama ? 'Cuti Bersama' : 'Libur Nasional'
      })
    })

    // 2. Masukkan Hari Besar Islam, Milad Muhammadiyah, & Peringatan Nasional
    Object.keys(hijriCalendar).forEach(dateKey => {
      const hInfo = hijriCalendar[dateKey]
      if (hInfo) {
        // Islamic Events
        if (hInfo.islamicHolidays && hInfo.islamicHolidays.length > 0) {
          if (!map[dateKey]) map[dateKey] = []
          hInfo.islamicHolidays.forEach(hName => {
            const alreadyExists = map[dateKey].some(e =>
              e.title.toLowerCase().includes(hName.toLowerCase()) ||
              hName.toLowerCase().includes(e.title.toLowerCase())
            )
            if (!alreadyExists) {
              map[dateKey].push({
                title: hName,
                type: 'ISLAMIC_EVENT',
                tag: '#HariBesarIslam',
                content: `Penanggalan Hijriah: ${hInfo.hijriDateFormatted} (KHGT)`,
                badgeLabel: 'Hari Besar Islam'
              })
            }
          })
        }

        // Muhammadiyah & Ortom Events
        if (hInfo.muhammadiyahEvents && hInfo.muhammadiyahEvents.length > 0) {
          if (!map[dateKey]) map[dateKey] = []
          hInfo.muhammadiyahEvents.forEach(mName => {
            const alreadyExists = map[dateKey].some(e =>
              e.title.toLowerCase().includes(mName.toLowerCase()) ||
              mName.toLowerCase().includes(e.title.toLowerCase())
            )
            if (!alreadyExists) {
              map[dateKey].push({
                title: mName,
                type: 'MUHAMMADIYAH_EVENT',
                tag: '#Muhammadiyah',
                content: `Peringatan Milad & Momentum Persyarikatan Muhammadiyah`,
                badgeLabel: 'Muhammadiyah'
              })
            }
          })
        }

        // Peringatan Nasional (Bukan Libur)
        if (hInfo.nationalEvents && hInfo.nationalEvents.length > 0) {
          if (!map[dateKey]) map[dateKey] = []
          hInfo.nationalEvents.forEach(nName => {
            const alreadyExists = map[dateKey].some(e =>
              e.title.toLowerCase().includes(nName.toLowerCase()) ||
              nName.toLowerCase().includes(e.title.toLowerCase())
            )
            if (!alreadyExists) {
              map[dateKey].push({
                title: nName,
                type: 'PERINGATAN_NASIONAL',
                tag: '#PeringatanNasional',
                content: `Peringatan Hari Besar Nasional Republik Indonesia (Bukan Libur Resmi)`,
                badgeLabel: 'Peringatan Nasional'
              })
            }
          })
        }
      }
    })

    // 3. Masukkan Agenda Sekolah
    agendaList.forEach(item => {
      if (!item.eventDate) return
      const d = new Date(item.eventDate)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push({
        title: item.title,
        type: 'AGENDA',
        tag: '#AgendaSekolah',
        content: item.content || 'Agenda Kegiatan Sekolah SIMASMUH',
        badgeLabel: 'Agenda Sekolah'
      })
    })

    return map
  }, [holidays, hijriCalendar, agendaList])

  // Count events for badges (Synchronized for current active month)
  const counts = useMemo(() => {
    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

    // 1. Libur Nasional Khusus Bulan Ini
    const holidayCount = holidays.filter(h => h.date.startsWith(currentMonthPrefix)).length

    // 2. Hari Besar Islam, Muhammadiyah, & Nasional
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

    // 3. Agenda Sekolah Bulan Ini
    const agendaCount = agendaList.filter(item => {
      if (!item.eventDate) return false
      const d = new Date(item.eventDate)
      return d.getFullYear() === year && d.getMonth() === month
    }).length

    return { holidayCount, islamicCount, muhammadiyahCount, agendaCount, nationalCount }
  }, [holidays, hijriCalendar, agendaList, year, month])

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays = useMemo(() => {
    const days = []

    const filterEventFn = (events: CalendarDayEvent[]) => {
      if (filterType === 'ALL') return events
      if (filterType === 'AGENDA') return events.filter(e => e.type === 'AGENDA')
      if (filterType === 'HOLIDAY') return events.filter(e => e.type === 'LIBUR_NASIONAL' || e.type === 'CUTI_BERSAMA')
      if (filterType === 'ISLAMIC') return events.filter(e => e.type === 'ISLAMIC_EVENT')
      if (filterType === 'MUHAMMADIYAH') return events.filter(e => e.type === 'MUHAMMADIYAH_EVENT')
      if (filterType === 'NATIONAL') return events.filter(e => e.type === 'PERINGATAN_NASIONAL')
      return events
    }

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const d = new Date(year, month - 1, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const filteredEvents = filterEventFn(allEvents)
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
      const filteredEvents = filterEventFn(allEvents)
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

    // Next month padding to fill grid (multiple of 7)
    const remainingDays = (7 - (days.length % 7)) % 7
    for (let day = 1; day <= remainingDays; day++) {
      const d = new Date(year, month + 1, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const filteredEvents = filterEventFn(allEvents)
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
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth, eventsByDate, filterType, hijriCalendar])

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const now = new Date()
    setCurrentDate(now)
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (eventsByDate[todayKey] || hijriCalendar[todayKey]) {
      setSelectedDateEvents(eventsByDate[todayKey] || [])
      setSelectedDateHijri(hijriCalendar[todayKey] || null)
      setSelectedDateStr(todayKey)
    }
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Combined List for List Mode
  const combinedList = useMemo(() => {
    const list: Array<{
      id: string
      dateStr: string
      title: string
      content?: string
      type: EventCategoryType
      dateObj: Date
      hijriFormatted?: string
    }> = []

    // 1. Agenda Sekolah
    agendaList.forEach(a => {
      const d = a.eventDate ? new Date(a.eventDate) : new Date()
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      list.push({
        id: `agenda-${a.id}`,
        dateStr: dKey,
        title: a.title,
        content: a.content,
        type: 'AGENDA',
        dateObj: d,
        hijriFormatted: hijriCalendar[dKey]?.hijriDateFormatted
      })
    })

    // 2. Libur Nasional
    holidays.forEach((h, i) => {
      const d = new Date(h.date)
      list.push({
        id: `hol-${i}-${h.date}`,
        dateStr: h.date,
        title: h.description,
        content: h.isCutiBersama ? 'Cuti Bersama Nasional' : 'Hari Libur Nasional Indonesia',
        type: h.isCutiBersama ? 'CUTI_BERSAMA' : 'LIBUR_NASIONAL',
        dateObj: d,
        hijriFormatted: hijriCalendar[h.date]?.hijriDateFormatted
      })
    })

    // 3. Islamic & Muhammadiyah Events
    Object.keys(hijriCalendar).forEach(dateKey => {
      const hInfo = hijriCalendar[dateKey]
      if (hInfo) {
        const d = new Date(dateKey)
        hInfo.islamicHolidays?.forEach((ih, i) => {
          list.push({
            id: `islamic-${dateKey}-${i}`,
            dateStr: dateKey,
            title: ih,
            content: `Peringatan Hari Besar Islam (${hInfo.hijriDateFormatted})`,
            type: 'ISLAMIC_EVENT',
            dateObj: d,
            hijriFormatted: hInfo.hijriDateFormatted
          })
        })
        hInfo.muhammadiyahEvents?.forEach((mh, i) => {
          list.push({
            id: `muh-${dateKey}-${i}`,
            dateStr: dateKey,
            title: mh,
            content: `Momentum & Milad Persyarikatan Muhammadiyah`,
            type: 'MUHAMMADIYAH_EVENT',
            dateObj: d,
            hijriFormatted: hInfo.hijriDateFormatted
          })
        })
        hInfo.nationalEvents?.forEach((ne, i) => {
          list.push({
            id: `nat-commem-${dateKey}-${i}`,
            dateStr: dateKey,
            title: ne,
            content: `Peringatan Hari Besar Nasional Republik Indonesia (Bukan Libur Resmi)`,
            type: 'PERINGATAN_NASIONAL',
            dateObj: d,
            hijriFormatted: hInfo.hijriDateFormatted
          })
        })
      }
    })

    return list
      .filter(item => {
        if (filterType === 'AGENDA') return item.type === 'AGENDA'
        if (filterType === 'HOLIDAY') return item.type === 'LIBUR_NASIONAL' || item.type === 'CUTI_BERSAMA'
        if (filterType === 'ISLAMIC') return item.type === 'ISLAMIC_EVENT'
        if (filterType === 'MUHAMMADIYAH') return item.type === 'MUHAMMADIYAH_EVENT'
        if (filterType === 'NATIONAL') return item.type === 'PERINGATAN_NASIONAL'
        return true
      })
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [agendaList, holidays, hijriCalendar, filterType])

  // Mid-month Hijri info for header
  const midMonthHijri = useMemo(() => {
    const midKey = `${year}-${String(month + 1).padStart(2, '0')}-15`
    return hijriCalendar[midKey] || calculateLocalHijriDate(new Date(year, month, 15))
  }, [hijriCalendar, year, month])

  return (
    <div className="space-y-2.5">
      {/* Header Widget */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h4>
        </div>

        {/* View Mode Toggle & Maximize */}
        <div className="flex items-center gap-1 shrink-0">
          {showAddButton && onAddAgenda && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 sm:h-6.5 px-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 hover:bg-emerald-100"
              onClick={onAddAgenda}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Agenda
            </Button>
          )}
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            className={`h-6 sm:h-6.5 px-2 text-[10px] font-semibold rounded-lg ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => {
              setViewMode('month')
              setSelectedDateEvents(null)
            }}
          >
            Bulan
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            className={`h-6 sm:h-6.5 px-2 text-[10px] font-semibold rounded-lg ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setViewMode('list')}
          >
            Daftar
          </Button>
          {!isModal && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 sm:h-6.5 px-1.5 text-[10px] font-bold rounded-lg border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => setIsExpanded(true)}
              title="Perbesar Kalender (Layar Penuh / Dialog)"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs / Dropdown */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Mobile Filter: Compact Bordered Box */}
        <div className="sm:hidden flex-1">
          <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
            <Filter className="w-3 h-3 text-slate-500 shrink-0" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-transparent text-[10px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none w-full cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">Semua Kategori ({counts.holidayCount + counts.islamicCount + counts.muhammadiyahCount + counts.agendaCount + counts.nationalCount})</option>
              <option value="HOLIDAY" className="bg-white dark:bg-slate-900">Libur ({counts.holidayCount})</option>
              <option value="NATIONAL" className="bg-white dark:bg-slate-900">Nasional ({counts.nationalCount})</option>
              <option value="ISLAMIC" className="bg-white dark:bg-slate-900">Islam ({counts.islamicCount})</option>
              <option value="MUHAMMADIYAH" className="bg-white dark:bg-slate-900">Muhammadiyah ({counts.muhammadiyahCount})</option>
              <option value="AGENDA" className="bg-white dark:bg-slate-900">Sekolah ({counts.agendaCount})</option>
            </select>
          </div>
        </div>

        {/* Desktop Filter Pills */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-0.5 text-[9.5px] scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-2 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilterType('HOLIDAY')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'HOLIDAY'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <Flag className="w-2.5 h-2.5" />
            Libur ({counts.holidayCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('NATIONAL')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'NATIONAL'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100'
            }`}
          >
            Nasional ({counts.nationalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('ISLAMIC')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'ISLAMIC'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <Moon className="w-2.5 h-2.5" />
            Islam ({counts.islamicCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('MUHAMMADIYAH')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'MUHAMMADIYAH'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-100'
            }`}
          >
            <Landmark className="w-2.5 h-2.5" />
            Muhammadiyah ({counts.muhammadiyahCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('AGENDA')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold transition-colors whitespace-nowrap ${
              filterType === 'AGENDA'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <GraduationCap className="w-2.5 h-2.5" />
            Sekolah ({counts.agendaCount})
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <>
          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={prevMonth}
                className="h-6 w-6 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-6 w-6 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToday}
                className="h-6 px-1.5 text-[10px] font-bold rounded-lg border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
              >
                Hari Ini
              </Button>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                <span className="font-black text-xs text-slate-900 dark:text-white tracking-tight">
                  {monthNames[month]} {year}
                </span>
                <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 font-mono bg-amber-100/80 dark:bg-amber-950/80 px-1 py-0.2 rounded border border-amber-300/80">
                  {midMonthHijri.monthName} {midMonthHijri.year} H
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Grid - Solid Background & High Legibility */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-center py-1 text-[9.5px] font-black text-slate-600 dark:text-slate-300 uppercase">
              {dayNames.map((d, i) => (
                <div key={i} className={i === 0 ? 'text-rose-600 dark:text-rose-400' : i === 5 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800 text-center text-xs">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.key === todayKey
                const hasEvents = cell.events.length > 0
                const isSelected = selectedDateStr === cell.key

                const hasHoliday = cell.allEvents.some(e => e.type === 'LIBUR_NASIONAL' || e.type === 'CUTI_BERSAMA')
                const hasIslamic = cell.allEvents.some(e => e.type === 'ISLAMIC_EVENT')
                const hasMuhammadiyah = cell.allEvents.some(e => e.type === 'MUHAMMADIYAH_EVENT')
                const hasAgenda = cell.allEvents.some(e => e.type === 'AGENDA')

                const isRedDay = cell.isSunday || hasHoliday

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (cell.allEvents.length > 0 || cell.hijri) {
                        setSelectedDateEvents(cell.allEvents)
                        setSelectedDateHijri(cell.hijri as any)
                        setSelectedDateStr(cell.key)
                      } else {
                        setSelectedDateEvents(null)
                        setSelectedDateHijri(null)
                        setSelectedDateStr(cell.key)
                      }
                    }}
                    className={`${
                      isModal ? 'min-h-[72px] sm:min-h-[84px] p-1.5' : 'h-[38px] sm:h-[42px] p-0.5 sm:p-1'
                    } flex flex-col items-center justify-between transition-colors relative group bg-white dark:bg-slate-900 ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/70 dark:bg-slate-950/60 text-slate-300 dark:text-slate-600'
                        : hasHoliday
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 text-slate-800 dark:text-slate-100 hover:bg-rose-100/70'
                        : hasMuhammadiyah
                        ? 'bg-sky-50/70 dark:bg-sky-950/40 text-slate-800 dark:text-slate-100 hover:bg-sky-100/70'
                        : hasIslamic
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 text-slate-800 dark:text-slate-100 hover:bg-amber-100/70'
                        : hasAgenda
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-slate-800 dark:text-slate-100 hover:bg-emerald-100/70'
                        : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    } ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                  >
                    {/* Top Date: Gregorian (Masehi) on Top-Left */}
                    <div className="w-full flex items-center justify-between px-0.5">
                      <span
                        className={`text-[10.5px] font-bold w-4 h-4 flex items-center justify-center rounded-full leading-none ${
                          isToday
                            ? 'bg-blue-600 text-white font-black shadow-xs'
                            : isRedDay && cell.isCurrentMonth
                            ? 'text-rose-600 dark:text-rose-400 font-black'
                            : hasEvents
                            ? 'text-slate-950 dark:text-white font-black'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.hijri && (
                        <span className="text-[8px] font-bold font-mono text-amber-700/80 dark:text-amber-400/80 leading-none">
                          {cell.hijri.day}
                        </span>
                      )}
                    </div>

                    {/* Event indicators (colored badges/dots) */}
                    {hasEvents ? (
                      <div className="w-full space-y-0.5">
                        {cell.events.slice(0, isModal ? 3 : 1).map((ev, evIdx) => (
                          <div
                            key={evIdx}
                            title={ev.title}
                            className={`${
                              isModal ? 'text-[9.5px] py-0.5 px-1' : 'text-[7px] px-0.5 py-0.2'
                            } font-bold truncate rounded text-left leading-tight ${
                              ev.type === 'LIBUR_NASIONAL'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300'
                                : ev.type === 'CUTI_BERSAMA'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border border-orange-300'
                                : ev.type === 'ISLAMIC_EVENT'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300'
                                : ev.type === 'MUHAMMADIYAH_EVENT'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border border-sky-300'
                              : ev.type === 'PERINGATAN_NASIONAL'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300'
                            }`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {isModal && cell.events.length > 3 && (
                          <div className="text-[8.5px] font-bold text-slate-500 text-left px-1">
                            +{cell.events.length - 3} lainnya
                          </div>
                        )}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Date Popup / Banner */}
          {selectedDateStr && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tanggal {selectedDateStr}</span>
                  {selectedDateHijri && (
                    <span className="text-[10.5px] text-amber-700 dark:text-amber-300 font-mono font-semibold bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                      {selectedDateHijri.hijriDateFormatted}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateEvents(null)
                    setSelectedDateHijri(null)
                    setSelectedDateStr('')
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕ Tutup
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedDateEvents && selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((ev, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border text-xs ${
                        ev.type === 'LIBUR_NASIONAL'
                          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-100'
                          : ev.type === 'CUTI_BERSAMA'
                          ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-950 dark:text-orange-100'
                          : ev.type === 'ISLAMIC_EVENT'
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-100'
                          : ev.type === 'MUHAMMADIYAH_EVENT'
                          ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900 text-sky-950 dark:text-sky-100'
                          : ev.type === 'PERINGATAN_NASIONAL'
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-950 dark:text-indigo-100'
                          : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
                        <span className="font-extrabold leading-snug">{ev.title}</span>
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
                            {ev.badgeLabel || ev.type}
                          </Badge>
                        </div>
                      </div>
                      {ev.content && (
                        <p className="text-[11px] opacity-90 line-clamp-2 mt-0.5">
                          {ev.content}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                    Tidak ada agenda atau hari libur khusus pada tanggal ini.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* List Mode View */
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {combinedList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Tidak ada agenda atau hari besar yang sesuai filter.
            </div>
          ) : (
            combinedList.map((item, i) => {
              const d = item.dateObj
              const isHoliday = item.type === 'LIBUR_NASIONAL'
              const isCuti = item.type === 'CUTI_BERSAMA'
              const isIslamic = item.type === 'ISLAMIC_EVENT'
              const isMuhammadiyah = item.type === 'MUHAMMADIYAH_EVENT'
              const isNational = item.type === 'PERINGATAN_NASIONAL'

              const tag = isHoliday
                ? '#LiburNasional'
                : isCuti
                ? '#CutiBersama'
                : isIslamic
                ? '#HariBesarIslam'
                : isMuhammadiyah
                ? '#Muhammadiyah'
                : isNational
                ? '#PeringatanNasional'
                : '#AgendaSekolah'

              return (
                <div
                  key={item.id || i}
                  className={`p-2.5 rounded-xl border space-y-1 ${
                    isHoliday
                      ? 'border-rose-100 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                      : isCuti
                      ? 'border-orange-100 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20'
                      : isIslamic
                      ? 'border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
                      : isMuhammadiyah
                      ? 'border-sky-100 dark:border-sky-900/50 bg-sky-50/40 dark:bg-sky-950/20'
                      : isNational
                      ? 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5
                        className={`font-bold text-xs leading-tight ${
                          isHoliday
                            ? 'text-rose-900 dark:text-rose-200'
                            : isCuti
                            ? 'text-orange-900 dark:text-orange-200'
                            : isIslamic
                            ? 'text-amber-900 dark:text-amber-200'
                            : isMuhammadiyah
                            ? 'text-sky-900 dark:text-sky-200'
                            : isNational
                            ? 'text-indigo-900 dark:text-indigo-200'
                            : 'text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        {item.title}
                      </h5>
                      <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tag}
                      </span>
                    </div>
                    {d && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-mono ${
                          isHoliday
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300'
                            : isCuti
                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300'
                            : isIslamic
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300'
                            : isMuhammadiyah
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-300'
                            : isNational
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300'
                        }`}
                      >
                        {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Badge>
                    )}
                  </div>
                  {item.content && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  )}
                  {item.hijriFormatted && (
                    <span className="text-[9.5px] font-mono text-amber-700 dark:text-amber-400 block">
                      Hijriah: {item.hijriFormatted}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* POPUP / DIALOG PERBESAR KALENDER */}
      {!isModal && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span>{title} — Mode Tampilan Penuh</span>
              </DialogTitle>
            </DialogHeader>

            <div className="pt-2">
              <ActivityCalendarWidget
                announcements={announcements}
                title={title}
                onAddAgenda={onAddAgenda}
                showAddButton={showAddButton}
                isModal={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
