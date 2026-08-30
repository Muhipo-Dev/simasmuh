'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AgendaItem {
  id: string
  title: string
  content?: string
  eventDate?: string | Date
  createdAt?: string | Date
  type?: string
}

interface ActivityCalendarWidgetProps {
  announcements?: any[]
  title?: string
}

export function ActivityCalendarWidget({ announcements = [], title = 'Kalender Kegiatan' }: ActivityCalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')
  const [selectedDateEvents, setSelectedDateEvents] = useState<AgendaItem[] | null>(null)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() // 0-indexed

  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ]
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  // Filter agenda items
  const agendaList: AgendaItem[] = (announcements || []).filter(
    (item: any) => item.type === 'AGENDA' || item.eventDate
  )

  // Map of YYYY-MM-DD -> array of agenda items
  const eventsByDate = agendaList.reduce((acc: Record<string, AgendaItem[]>, item: AgendaItem) => {
    if (!item.eventDate) return acc
    const d = new Date(item.eventDate)
    if (isNaN(d.getTime())) return acc
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays = []

  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const d = new Date(year, month - 1, day)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    calendarDays.push({
      day,
      date: d,
      key,
      isCurrentMonth: false,
      events: eventsByDate[key] || []
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    calendarDays.push({
      day,
      date: d,
      key,
      isCurrentMonth: true,
      events: eventsByDate[key] || []
    })
  }

  // Next month padding to fill grid (multiple of 7)
  const remainingDays = (7 - (calendarDays.length % 7)) % 7
  for (let day = 1; day <= remainingDays; day++) {
    const d = new Date(year, month + 1, day)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    calendarDays.push({
      day,
      date: d,
      key,
      isCurrentMonth: false,
      events: eventsByDate[key] || []
    })
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const now = new Date()
    setCurrentDate(now)
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (eventsByDate[todayKey]) {
      setSelectedDateEvents(eventsByDate[todayKey])
      setSelectedDateStr(todayKey)
    }
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
      {/* Header Widget */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 sm:pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm">
          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            className={`h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold rounded-lg ${
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
            className={`h-6 sm:h-7 px-2 text-[10px] sm:text-[11px] font-semibold rounded-lg ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-600 dark:text-slate-400'
            }`}
            onClick={() => setViewMode('list')}
          >
            Agenda
          </Button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <>
          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={prevMonth}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg border-slate-200 dark:border-slate-800"
              >
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg border-slate-200 dark:border-slate-800"
              >
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToday}
                className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-bold rounded-lg border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
              >
                Hari Ini
              </Button>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-[11px] sm:text-xs text-slate-800 dark:text-slate-100 tracking-wide block leading-none">
                {monthNames[month]}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 font-mono">
                {year}
              </span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
            {/* Days Header */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-center py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">
              {dayNames.map((d, i) => (
                <div key={i} className={i === 0 ? 'text-rose-500' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60 text-center text-xs">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.key === todayKey
                const hasEvents = cell.events.length > 0
                const isSelected = selectedDateStr === cell.key

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (hasEvents) {
                        setSelectedDateEvents(cell.events)
                        setSelectedDateStr(cell.key)
                      } else {
                        setSelectedDateEvents(null)
                        setSelectedDateStr(cell.key)
                      }
                    }}
                    className={`min-h-[38px] sm:min-h-[44px] p-0.5 sm:p-1 flex flex-col items-center justify-between transition-colors relative ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/40 dark:bg-slate-900/30 text-slate-300 dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    } ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`}
                  >
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : hasEvents
                          ? 'text-emerald-700 dark:text-emerald-300 font-extrabold'
                          : ''
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Event indicators */}
                    {hasEvents && (
                      <div className="w-full mt-0.5 space-y-0.5">
                        <div
                          title={cell.events[0]?.title}
                          className="text-[8px] sm:text-[9px] font-semibold truncate px-0.5 sm:px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-left leading-none"
                        >
                          {cell.events[0]?.title}
                        </div>
                        {cell.events.length > 1 && (
                          <span className="text-[7px] sm:text-[8px] font-bold text-emerald-600 dark:text-emerald-400 block text-right pr-0.5">
                            +{cell.events.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected Date Popup / Banner */}
          {selectedDateEvents && selectedDateEvents.length > 0 && (
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Agenda pada {selectedDateStr}:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateEvents(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  ✕ Tutup
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedDateEvents.map((ev, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-100 dark:border-emerald-900 text-xs">
                    <p className="font-extrabold text-slate-800 dark:text-slate-100 leading-snug">{ev.title}</p>
                    {ev.content && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{ev.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* List Mode View */
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {agendaList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Belum ada agenda kegiatan yang diterbitkan.
            </div>
          ) : (
            agendaList.map((agenda, i) => {
              const d = agenda.eventDate ? new Date(agenda.eventDate) : null
              return (
                <div
                  key={agenda.id || i}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                      {agenda.title}
                    </h5>
                    {d && (
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300">
                        {d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </Badge>
                    )}
                  </div>
                  {agenda.content && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {agenda.content}
                    </p>
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
