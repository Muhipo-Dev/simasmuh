'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Calendar as CalendarIcon,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  MapPin,
  Printer,
  Sparkles,
  Info,
  ChevronRight,
  Download
} from 'lucide-react'
import {
  calculateKHGTPrayerTimes,
  DEFAULT_PONOROGO_COORDS,
  DailyPrayerSchedule,
  PrayerTimeItem
} from '@/lib/prayer-times-khgt'
import { calculateLocalHijriDate, HijriDayInfo } from '@/lib/national-holidays'

interface KHGTPrayerScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  hijriCalendar?: Record<string, HijriDayInfo>
  currentYear?: number
  currentMonth?: number // 0-11
}

type RangeOption = 'week' | 'month_ahead' | 'calendar_month'

export function KHGTPrayerScheduleModal({
  isOpen,
  onClose,
  hijriCalendar = {},
  currentYear = new Date().getFullYear(),
  currentMonth = new Date().getMonth(),
}: KHGTPrayerScheduleModalProps) {
  const [range, setRange] = useState<RangeOption>('week')

  // Generate prayer items based on selected range
  const scheduleRows = useMemo(() => {
    const rows: {
      dateObj: Date
      dateKey: string
      dayName: string
      dateMasehi: string
      hijriStr: string
      isToday: boolean
      isFriday: boolean
      schedule: DailyPrayerSchedule
    }[] = []

    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    let startDate: Date
    let totalDays: number

    if (range === 'week') {
      // 7 hari mulai hari ini
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      totalDays = 7
    } else if (range === 'month_ahead') {
      // 30 hari ke depan
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      totalDays = 30
    } else {
      // Kalender bulan yang sedang dilihat di kalender akademik
      startDate = new Date(currentYear, currentMonth, 1)
      const daysInTargetMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      totalDays = daysInTargetMonth
    }

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)

      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const dayNum = d.getDate()
      const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

      // Hijri date lookup or fallback calculation
      let hijriStr = ''
      if (hijriCalendar[dateKey]?.hijriDateFormatted) {
        hijriStr = hijriCalendar[dateKey].hijriDateFormatted
      } else {
        const localH = calculateLocalHijriDate(d)
        hijriStr = `${localH.day} ${localH.monthName} ${localH.year} H`
      }

      const schedule = calculateKHGTPrayerTimes(d, DEFAULT_PONOROGO_COORDS, hijriStr)

      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' })
      const dateMasehi = d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })

      rows.push({
        dateObj: d,
        dateKey,
        dayName,
        dateMasehi,
        hijriStr,
        isToday: dateKey === todayKey,
        isFriday: d.getDay() === 5,
        schedule
      })
    }

    return rows
  }, [range, currentYear, currentMonth, hijriCalendar])

  const handlePrint = () => {
    window.print()
  }

  const getPrayerTime = (schedule: DailyPrayerSchedule, prayerId: PrayerTimeItem['id']) => {
    return schedule.items.find(it => it.id === prayerId)?.time || '-'
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-50/70 via-white to-amber-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                    <Clock className="w-4 h-4" />
                  </span>
                  Jadwal Waktu Sholat & Imsakiyah KHGT
                </DialogTitle>
                <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                  Tarjih Muhammadiyah
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  SMA Muhammadiyah 1 Ponorogo
                </span>
                <span>&bull;</span>
                <span>Lintang: -7.8681° &bull; Bujur: 111.4623° &bull; WIB (UTC+7)</span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>Cetak</span>
              </Button>
            </div>
          </div>

          {/* Range Selector Tab */}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <Tabs
              value={range}
              onValueChange={(val) => setRange(val as RangeOption)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-3 h-8 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <TabsTrigger
                  value="week"
                  className="text-[11px] font-bold px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 shadow-2xs"
                >
                  7 Hari ke Depan
                </TabsTrigger>
                <TabsTrigger
                  value="month_ahead"
                  className="text-[11px] font-bold px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 shadow-2xs"
                >
                  30 Hari (Sebulan)
                </TabsTrigger>
                <TabsTrigger
                  value="calendar_month"
                  className="text-[11px] font-bold px-2.5 py-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 shadow-2xs"
                >
                  Bulan Kalender
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Menampilkan <b className="text-slate-800 dark:text-slate-200">{scheduleRows.length} hari</b> jadwal
            </span>
          </div>
        </DialogHeader>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 max-h-[55vh]">
          <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 min-w-[140px] sticky left-0 bg-slate-50 dark:bg-slate-800/95 z-10">
                      Hari & Tanggal
                    </th>
                    <th className="py-2.5 px-2.5 text-center min-w-[70px]">
                      Hijriah (KHGT)
                    </th>
                    <th className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400">Imsak</th>
                    <th className="py-2.5 px-2 text-center text-indigo-700 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/20">Subuh</th>
                    <th className="py-2.5 px-2 text-center text-amber-700 dark:text-amber-400">Terbit</th>
                    <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-500">Dhuha</th>
                    <th className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20">Dzuhur</th>
                    <th className="py-2.5 px-2 text-center text-orange-700 dark:text-orange-400 font-bold bg-orange-50/40 dark:bg-orange-950/20">Ashar</th>
                    <th className="py-2.5 px-2 text-center text-rose-700 dark:text-rose-400 font-bold bg-rose-50/50 dark:bg-rose-950/20">Maghrib</th>
                    <th className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20">Isya&apos;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scheduleRows.map((row, idx) => {
                    const isToday = row.isToday
                    const isFriday = row.isFriday

                    return (
                      <tr
                        key={row.dateKey}
                        className={`transition-colors text-[11.5px] ${
                          isToday
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 font-semibold ring-1 ring-inset ring-amber-400/50'
                            : idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                            : 'bg-slate-50/40 dark:bg-slate-850/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Tanggal Masehi */}
                        <td className={`py-2 px-3 sticky left-0 z-10 ${
                          isToday
                            ? 'bg-amber-50 dark:bg-amber-950/90'
                            : idx % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/90 dark:bg-slate-850'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div>
                              <span className={`font-bold block leading-tight ${
                                isToday
                                  ? 'text-amber-800 dark:text-amber-200 font-black'
                                  : isFriday
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {row.dayName}, {row.dateMasehi}
                              </span>
                            </div>
                            {isToday && (
                              <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] px-1 py-0 h-4 shrink-0">
                                HARI INI
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Tanggal Hijriah KHGT */}
                        <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400 text-[11px] font-medium whitespace-nowrap">
                          {row.hijriStr.replace(' (KHGT)', '')}
                        </td>

                        {/* Imsak */}
                        <td className="py-2 px-2 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                          {getPrayerTime(row.schedule, 'imsak')}
                        </td>

                        {/* Subuh */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/15">
                          {getPrayerTime(row.schedule, 'subuh')}
                        </td>

                        {/* Terbit */}
                        <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                          {getPrayerTime(row.schedule, 'terbit')}
                        </td>

                        {/* Dhuha */}
                        <td className="py-2 px-2 text-center font-mono text-amber-700 dark:text-amber-400 font-semibold">
                          {getPrayerTime(row.schedule, 'dhuha')}
                        </td>

                        {/* Dzuhur */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/15">
                          {getPrayerTime(row.schedule, 'dzuhur')}
                        </td>

                        {/* Ashar */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-orange-900 dark:text-orange-200 bg-orange-50/20 dark:bg-orange-950/15">
                          {getPrayerTime(row.schedule, 'ashar')}
                        </td>

                        {/* Maghrib */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-rose-900 dark:text-rose-200 bg-rose-50/30 dark:bg-rose-950/15">
                          {getPrayerTime(row.schedule, 'maghrib')}
                        </td>

                        {/* Isya */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-900 dark:text-blue-200 bg-blue-50/30 dark:bg-blue-950/15">
                          {getPrayerTime(row.schedule, 'isya')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer / Tarjih Methodology Note */}
        <div className="p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px]">
            <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>
              Ketetapan Munas Tarjih ke-31: Subuh (-18°), Isya (-18°), Dzuhur (+2m ihtiyat zawal), Ketinggian 105 mdpl.
            </span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold self-end sm:self-auto"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
