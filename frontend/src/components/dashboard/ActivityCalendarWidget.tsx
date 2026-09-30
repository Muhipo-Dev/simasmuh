'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Layers,
  Plus,
  BookOpen,
  Maximize2,
  ExternalLink,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  initialKegiatan?: any[]
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

const getKategoriInfo = (kategori?: string) => {
  switch (kategori) {
    case 'KAJIAN_SELASA_PAGI':
      return { badge: 'Kajian Selasa Pagi', tag: '#KajianSelasa', isIsmuba: true }
    case 'SHOLAT_JUMAT':
      return { badge: 'Sholat Jumat Berjamaah', tag: '#SholatJumat', isIsmuba: true }
    case 'MABIT':
      return { badge: 'MABIT Siswa', tag: '#MABIT', isIsmuba: true }
    case 'BAITUL_ARQAM':
      return { badge: 'Baitul Arqam', tag: '#BaitulArqam', isIsmuba: true }
    case 'TADARUS_TAHFIDZ':
      return { badge: 'Tadarus & Tahfidz', tag: '#Tahfidz', isIsmuba: true }
    case 'PENGAJIAN_AKBAR':
      return { badge: 'Pengajian Akbar', tag: '#Pengajian', isIsmuba: true }
    case 'UPACARA_APEL':
      return { badge: 'Upacara / Apel', tag: '#Upacara', isIsmuba: false }
    case 'RAPAT_DINAS':
      return { badge: 'Rapat Dinas', tag: '#Rapat', isIsmuba: false }
    case 'WORKSHOP_PELATIHAN':
      return { badge: 'Workshop & Pelatihan', tag: '#Workshop', isIsmuba: false }
    case 'LOMBA_AKADEMIK':
    case 'LOMBA_NON_AKADEMIK':
      return { badge: 'Lomba & Kejuaraan', tag: '#Prestasi', isIsmuba: false }
    case 'CLASSMEETING':
      return { badge: 'Classmeeting', tag: '#Classmeeting', isIsmuba: false }
    case 'MILAD_SEKOLAH':
      return { badge: 'Milad Sekolah', tag: '#Milad', isIsmuba: false }
    case 'STUDY_TOUR_OUTING':
      return { badge: 'Study Tour / Outing', tag: '#Outing', isIsmuba: false }
    case 'BAKSOS_SOSIAL':
      return { badge: 'Bakti Sosial', tag: '#Baksos', isIsmuba: false }
    case 'ISMUBA_LAINNYA':
      return { badge: 'Kegiatan ISMUBA', tag: '#ISMUBA', isIsmuba: true }
    default:
      return { badge: 'Kegiatan Sekolah', tag: '#KegiatanSekolah', isIsmuba: false }
  }
}

export function ActivityCalendarWidget({
  announcements = [],
  initialKegiatan = [],
  title = 'Kalender & Agenda Terpadu',
  onAddAgenda,
  showAddButton = false,
  isModal = false
}: ActivityCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [holidays, setHolidays] = useState<NationalHoliday[]>([])
  const [hijriCalendar, setHijriCalendar] = useState<Record<string, HijriDayInfo>>({})
  const [kegiatanList, setKegiatanList] = useState<any[]>(initialKegiatan)
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false)
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarDayEvent[] | null>(null)
  const [selectedDateHijri, setSelectedDateHijri] = useState<HijriDayInfo | null>(null)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed (0 = Jan, 8 = Sep)
  const monthApiNumber = month + 1 // 1-12

  // Fetch National Holidays, Hijri Calendar & Public Scheduled Kegiatan
  useEffect(() => {
    let isMounted = true
    async function loadRealtimeCalendar() {
      setLoadingCalendar(true)
      try {
        const [holidayList, hijriData, kegRes] = await Promise.all([
          fetchNationalHolidays(year),
          fetchHijriMonthCalendar(monthApiNumber, year),
          fetch('/api-backend/kegiatan-sekolah/public').then(r => r.ok ? r.json() : []).catch(() => [])
        ])
        if (isMounted) {
          setHolidays(holidayList)
          setHijriCalendar(hijriData)
          if (Array.isArray(kegRes) && kegRes.length > 0) {
            setKegiatanList(kegRes)
          }
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

    // 3. Masukkan Agenda Sekolah dari Announcement
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

    // 4. Masukkan Kegiatan Sekolah (Admin TU & Waka ISMUBA) - ONLY TERJADWAL
    ;(kegiatanList || []).forEach(keg => {
      if (keg.sifatKegiatan === 'MENDESAK' || !keg.tanggal) return
      const d = new Date(keg.tanggal)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []

      const kInfo = getKategoriInfo(keg.kategori)
      const descParts: string[] = []
      if (keg.waktuMulai) descParts.push(`⏰ ${keg.waktuMulai}${keg.waktuSelesai ? ` - ${keg.waktuSelesai}` : ''} WIB`)
      if (keg.tempat) descParts.push(`📍 ${keg.tempat}`)
      if (keg.pemateri) descParts.push(`🎙️ Pemateri: ${keg.pemateri}`)
      if (keg.penanggungJawab) descParts.push(`👤 PJ: ${keg.penanggungJawab}`)
      if (keg.ringkasanMateri) descParts.push(`📝 ${keg.ringkasanMateri}`)

      map[key].push({
        title: keg.namaKegiatan,
        type: kInfo.isIsmuba ? 'ISLAMIC_EVENT' : 'AGENDA',
        tag: kInfo.tag,
        content: descParts.length > 0 ? descParts.join(' | ') : 'Kegiatan Sekolah SIMASMUH',
        badgeLabel: kInfo.badge
      })
    })

    return map
  }, [holidays, hijriCalendar, agendaList, kegiatanList])

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays = useMemo(() => {
    const days = []

    // Prev month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const d = new Date(year, month - 1, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: allEvents,
        allEvents,
        hijri
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const allEvents = eventsByDate[key] || []
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: true,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: allEvents,
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
      const hijri = hijriCalendar[key] || calculateLocalHijriDate(d)

      days.push({
        day,
        date: d,
        key,
        isCurrentMonth: false,
        isSunday: d.getDay() === 0,
        isFriday: d.getDay() === 5,
        events: allEvents,
        allEvents,
        hijri
      })
    }

    return days
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth, eventsByDate, hijriCalendar])

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

    // 4. Kegiatan Sekolah (Admin TU & Waka ISMUBA) - ONLY TERJADWAL
    ;(kegiatanList || []).forEach(keg => {
      if (keg.sifatKegiatan === 'MENDESAK' || !keg.tanggal) return
      const d = new Date(keg.tanggal)
      if (isNaN(d.getTime())) return
      const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const kInfo = getKategoriInfo(keg.kategori)

      const descParts: string[] = []
      if (keg.waktuMulai) descParts.push(`⏰ ${keg.waktuMulai}${keg.waktuSelesai ? ` - ${keg.waktuSelesai}` : ''} WIB`)
      if (keg.tempat) descParts.push(`📍 ${keg.tempat}`)
      if (keg.pemateri) descParts.push(`🎙️ Pemateri: ${keg.pemateri}`)
      if (keg.penanggungJawab) descParts.push(`👤 PJ: ${keg.penanggungJawab}`)
      if (keg.ringkasanMateri) descParts.push(`📝 ${keg.ringkasanMateri}`)

      list.push({
        id: `keg-${keg.id}`,
        dateStr: dKey,
        title: keg.namaKegiatan,
        content: descParts.length > 0 ? descParts.join(' | ') : 'Kegiatan Sekolah SIMASMUH',
        type: kInfo.isIsmuba ? 'ISLAMIC_EVENT' : 'AGENDA',
        dateObj: d,
        hijriFormatted: hijriCalendar[dKey]?.hijriDateFormatted
      })
    })

    return list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [agendaList, holidays, hijriCalendar, kegiatanList])

  // Mid-month Hijri info for header
  const midMonthHijri = useMemo(() => {
    const midKey = `${year}-${String(month + 1).padStart(2, '0')}-15`
    return hijriCalendar[midKey] || calculateLocalHijriDate(new Date(year, month, 15))
  }, [hijriCalendar, year, month])

  return (
    <div className="space-y-2.5">
      {/* Header Widget */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h4>
        </div>

        {/* View Mode Toggle & Maximize (Glass Style) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showAddButton && onAddAgenda && (
            <button
              type="button"
              onClick={onAddAgenda}
              className="h-7 px-2.5 inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg backdrop-blur-sm transition-all"
            >
              <Plus className="w-3 h-3 mr-0.5" />
              Agenda
            </button>
          )}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('month')
                setSelectedDateEvents(null)
              }}
              className={`h-6 px-2.5 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-6 px-2.5 text-[10px] font-bold rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daftar
            </button>
          </div>
          <Link
            href="/agenda"
            className="h-7 w-7 inline-flex items-center justify-center text-[10px] font-bold rounded-lg bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white/75 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs"
            title="Buka Halaman Khusus Kalender (Layar Penuh)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {viewMode === 'month' ? (
        <>
          {/* Navigation Controls (Glass Style with Subtle Curves) */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white/75 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white/75 dark:hover:bg-slate-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs"
                title="Bulan Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-7 px-2.5 inline-flex items-center justify-center text-[10.5px] font-bold rounded-lg bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/60 dark:border-white/10 text-blue-600 dark:text-blue-400 hover:bg-white/75 dark:hover:bg-slate-700/60 transition-all shadow-2xs"
              >
                Hari Ini
              </button>
            </div>
            <div className="text-right flex items-center justify-end gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight uppercase">
                {monthNames[month]} {year}
              </span>
              <span className="text-[9.5px] font-bold text-amber-800 dark:text-amber-300 font-mono bg-amber-500/10 dark:bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-500/20 dark:border-amber-400/20 backdrop-blur-xs">
                {midMonthHijri.monthName} {midMonthHijri.year} H
              </span>
            </div>
          </div>

          {/* Calendar Grid - Semi-glass with subtle clean rounded-lg borders */}
          <div className="border border-slate-200/70 dark:border-white/10 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-2xs">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-slate-100/60 dark:bg-slate-800/60 backdrop-blur-xs border-b border-slate-200/70 dark:border-white/10 text-center py-1.5 text-[9.5px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              {dayNames.map((d, i) => (
                <div key={i} className={i === 0 ? 'text-rose-600 dark:text-rose-400' : i === 5 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/50 dark:divide-white/5 text-center text-xs">
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
                    } flex flex-col items-center justify-between transition-colors relative group ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-100/25 dark:bg-slate-950/30 text-slate-400/50 dark:text-slate-600'
                        : hasHoliday
                        ? 'bg-rose-50/40 dark:bg-rose-950/25 text-slate-800 dark:text-slate-100 hover:bg-rose-100/50'
                        : hasMuhammadiyah
                        ? 'bg-sky-50/40 dark:bg-sky-950/25 text-slate-800 dark:text-slate-100 hover:bg-sky-100/50'
                        : hasIslamic
                        ? 'bg-amber-50/40 dark:bg-amber-950/25 text-slate-800 dark:text-slate-100 hover:bg-amber-100/50'
                        : hasAgenda
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/25 text-slate-800 dark:text-slate-100 hover:bg-emerald-100/50'
                        : 'bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 hover:bg-white/75 dark:hover:bg-slate-800/70'
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
                                ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300/80'
                                : ev.type === 'CUTI_BERSAMA'
                                ? 'bg-orange-100/80 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border border-orange-300/80'
                                : ev.type === 'ISLAMIC_EVENT'
                                ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300/80'
                                : ev.type === 'MUHAMMADIYAH_EVENT'
                                ? 'bg-sky-100/80 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border border-sky-300/80'
                              : ev.type === 'PERINGATAN_NASIONAL'
                                ? 'bg-indigo-100/80 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300/80'
                              : 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/80'
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
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 rounded-lg space-y-2 shadow-xs animate-in fade-in">
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
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
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
                  className={`p-2.5 rounded-lg border space-y-1 backdrop-blur-sm ${
                    isHoliday
                      ? 'border-rose-200/70 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20'
                      : isCuti
                      ? 'border-orange-200/70 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20'
                      : isIslamic
                      ? 'border-amber-200/70 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20'
                      : isMuhammadiyah
                      ? 'border-sky-200/70 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20'
                      : isNational
                      ? 'border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
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
    </div>
  )
}
