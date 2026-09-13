/**
 * KHGT (Kalender Hijriah Global Tunggal) & Astronomical Prayer Times Calculation Engine
 * Mengikuti pedoman Majelis Tarjih dan Tajdid Pimpinan Pusat Muhammadiyah
 *
 * Standar Koordinat Default: SMA Muhammadiyah 1 Ponorogo
 * Latitude: -7.8681° S, Longitude: 111.4623° E, Timezone: UTC+7 (WIB), Ketinggian: 105 mdpl
 *
 * Parameter Tarjih Muhammadiyah:
 * - Subuh: Sudut depresi matahari -18.0° (hasil Musyawarah Nasional Tarjih ke-31)
 * - Terbit (Sunrise): Ketinggian matahari -0.833° (koreksi refraksi dan semi-diameter)
 * - Dhuha: Ketinggian matahari +4.5° (kira-kira 15-20 menit setelah terbit)
 * - Dzuhur: Saat matahari melintasi meridian langit (zawal) + 1-2 menit ihtiyat
 * - Ashar: Bayangan benda sama dengan panjang benda aslinya + panjang bayangan saat zawal (Madzhab Syafi'i/Jumhur)
 * - Maghrib: Terbenamnya seluruh piringan matahari (-0.833°) + 1-2 menit ihtiyat
 * - Isya: Sudut depresi matahari -18.0°
 * - Imsak: 10 menit sebelum waktu Subuh
 */

export interface SchoolCoordinates {
  latitude: number
  longitude: number
  elevation: number
  timezoneOffset: number // in hours, e.g. 7 for WIB
  locationName: string
}

export const DEFAULT_PONOROGO_COORDS: SchoolCoordinates = {
  latitude: -7.8681,
  longitude: 111.4623,
  elevation: 105,
  timezoneOffset: 7,
  locationName: 'Ponorogo (SMA Muhammadiyah 1)'
}

export interface PrayerTimeItem {
  id: 'imsak' | 'subuh' | 'terbit' | 'dhuha' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'
  name: string
  arabicName: string
  time: string // format "HH:mm"
  timestamp: Date
  isCurrent: boolean
  isNext: boolean
  remainingMinutes?: number
  isFardhu: boolean
}

export interface DailyPrayerSchedule {
  date: string // YYYY-MM-DD
  dateFormatted: string // e.g. "Ahad, 13 September 2026"
  hijriFormatted: string // e.g. "2 Rabi'ul Akhir 1448 H (KHGT)"
  locationName: string
  items: PrayerTimeItem[]
  currentPrayer: PrayerTimeItem | null
  nextPrayer: PrayerTimeItem | null
  countdownString: string
  isRamadhan: boolean
}

// Math helpers for spherical astronomy
const degToRad = (deg: number) => (deg * Math.PI) / 180.0
const radToDeg = (rad: number) => (rad * 180.0) / Math.PI
const sinDeg = (deg: number) => Math.sin(degToRad(deg))
const cosDeg = (deg: number) => Math.cos(degToRad(deg))
const tanDeg = (deg: number) => Math.tan(degToRad(deg))
const asinDeg = (x: number) => radToDeg(Math.asin(x))
const acosDeg = (x: number) => radToDeg(Math.acos(x))
const atanDeg = (x: number) => radToDeg(Math.atan(x))

const fixHour = (h: number): number => {
  let res = h - 24.0 * Math.floor(h / 24.0)
  return res < 0 ? res + 24.0 : res
}

/**
 * Menghitung Julian Day Number dari tanggal Gregorian
 */
function getJulianDay(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1
    month += 12
  }
  const a = Math.floor(year / 100)
  const b = 2 - a + Math.floor(a / 4)
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5
}

/**
 * Menghitung deklinasi dan Equation of Time (Perata Waktu) matahari
 */
function getSunPosition(jd: number): { declination: number; equationOfTime: number } {
  const d = jd - 2451545.0
  const g = fixHour(357.529 + 0.98560028 * d)
  const q = fixHour(280.459 + 0.98564736 * d)
  const l = fixHour(q + 1.915 * sinDeg(g) + 0.02 * sinDeg(2 * g))

  const e = 23.439 - 0.00000036 * d
  const dd = asinDeg(sinDeg(e) * sinDeg(l))

  const ra = fixHour(atanDeg(cosDeg(e) * sinDeg(l)) / 15.0)
  const eqt = (q / 15.0 - ra) * 60.0 // in minutes

  return { declination: dd, equationOfTime: eqt }
}

/**
 * Menghitung sudut waktu matahari (Hour Angle) untuk ketinggian sudut tertentu
 */
function getHourAngle(altitude: number, latitude: number, declination: number): number {
  const cosH = (sinDeg(altitude) - sinDeg(latitude) * sinDeg(declination)) / (cosDeg(latitude) * cosDeg(declination))
  if (cosH > 1) return 0 // Sun never rises
  if (cosH < -1) return 180 // Sun never sets
  return acosDeg(cosH)
}

/**
 * Format decimal hours ke format "HH:mm"
 */
function formatHoursToTime(hours: number): string {
  const fixed = fixHour(hours)
  const h = Math.floor(fixed)
  const m = Math.floor((fixed - h) * 60 + 0.5)
  const normalizedH = m >= 60 ? (h + 1) % 24 : h
  const normalizedM = m >= 60 ? 0 : m
  return `${String(normalizedH).padStart(2, '0')}:${String(normalizedM).padStart(2, '0')}`
}

/**
 * Mesin kalkulasi waktu sholat akurat standar Tarjih Muhammadiyah & KHGT
 */
export function calculateKHGTPrayerTimes(
  date: Date = new Date(),
  coords: SchoolCoordinates = DEFAULT_PONOROGO_COORDS,
  hijriFormattedString?: string
): DailyPrayerSchedule {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const jd = getJulianDay(year, month, day)
  const { declination: dec, equationOfTime: eqt } = getSunPosition(jd)

  // Solar noon (Transit / Zawal) in local time
  const transitTime = 12 + coords.timezoneOffset - coords.longitude / 15.0 - eqt / 60.0

  // 1. DZUHUR: Transit + 2 menit ihtiyat pengaman zawal
  const dzuhurDec = transitTime + 2.0 / 60.0

  // 2. SUBUH: Sudut depresi -18° (Putusan Majelis Tarjih PP Muhammadiyah Munas ke-31) + 2 menit ihtiyat
  const fajrAngle = -18.0
  const fajrHA = getHourAngle(fajrAngle, coords.latitude, dec) / 15.0
  const subuhDec = transitTime - fajrHA + 2.0 / 60.0

  // 3. IMSAK: 10 menit sebelum subuh
  const imsakDec = subuhDec - 10.0 / 60.0

  // 4. TERBIT (Sunrise): Altitude -0.833° - (0.0347 * sqrt(elev))
  const sunriseAlt = -0.8333 - 0.0347 * Math.sqrt(Math.max(0, coords.elevation))
  const sunriseHA = getHourAngle(sunriseAlt, coords.latitude, dec) / 15.0
  const terbitDec = transitTime - sunriseHA

  // 5. DHUHA: Altitude +4.5° (Matahari setinggi tombak)
  const dhuhaAlt = 4.5
  const dhuhaHA = getHourAngle(dhuhaAlt, coords.latitude, dec) / 15.0
  const dhuhaDec = transitTime - dhuhaHA

  // 6. ASHAR: Panjang bayangan = tan(|lat - dec|) + 1
  const asharAlt = radToDeg(Math.atan(1.0 / (1.0 + Math.tan(degToRad(Math.abs(coords.latitude - dec))))))
  const asharHA = getHourAngle(asharAlt, coords.latitude, dec) / 15.0
  const asharDec = transitTime + asharHA + 2.0 / 60.0

  // 7. MAGHRIB: Sunset altitude + 2 menit ihtiyat
  const sunsetAlt = -0.8333 - 0.0347 * Math.sqrt(Math.max(0, coords.elevation))
  const sunsetHA = getHourAngle(sunsetAlt, coords.latitude, dec) / 15.0
  const maghribDec = transitTime + sunsetHA + 2.0 / 60.0

  // 8. ISYA: Sudut depresi -18.0° + 2 menit ihtiyat
  const ishaAngle = -18.0
  const ishaHA = getHourAngle(ishaAngle, coords.latitude, dec) / 15.0
  const isyaDec = transitTime + ishaHA + 2.0 / 60.0

  // Create Prayer item list
  const rawList: { id: PrayerTimeItem['id']; name: string; arabicName: string; decHours: number; isFardhu: boolean }[] = [
    { id: 'imsak', name: 'Imsak', arabicName: 'الإمساك', decHours: imsakDec, isFardhu: false },
    { id: 'subuh', name: 'Subuh', arabicName: 'الفجر', decHours: subuhDec, isFardhu: true },
    { id: 'terbit', name: 'Terbit', arabicName: 'الشروق', decHours: terbitDec, isFardhu: false },
    { id: 'dhuha', name: 'Dhuha', arabicName: 'الضحى', decHours: dhuhaDec, isFardhu: false },
    { id: 'dzuhur', name: 'Dzuhur', arabicName: 'الظهر', decHours: dzuhurDec, isFardhu: true },
    { id: 'ashar', name: 'Ashar', arabicName: 'العصر', decHours: asharDec, isFardhu: true },
    { id: 'maghrib', name: 'Maghrib', arabicName: 'المغرب', decHours: maghribDec, isFardhu: true },
    { id: 'isya', name: 'Isya\'', arabicName: 'العشاء', decHours: isyaDec, isFardhu: true },
  ]

  const nowMinutes = date.getHours() * 60 + date.getMinutes()
  let currentPrayer: PrayerTimeItem | null = null
  let nextPrayer: PrayerTimeItem | null = null
  let countdownString = ''

  const items: PrayerTimeItem[] = rawList.map(item => {
    const timeStr = formatHoursToTime(item.decHours)
    const [hStr, mStr] = timeStr.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const itemDate = new Date(date)
    itemDate.setHours(h, m, 0, 0)

    return {
      id: item.id,
      name: item.name,
      arabicName: item.arabicName,
      time: timeStr,
      timestamp: itemDate,
      isCurrent: false,
      isNext: false,
      isFardhu: item.isFardhu
    }
  })

  // Urutkan untuk mencari jadwal saat ini & berikutnya
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemMin = item.timestamp.getHours() * 60 + item.timestamp.getMinutes()

    if (nowMinutes >= itemMin) {
      currentPrayer = item
    } else if (!nextPrayer && nowMinutes < itemMin) {
      nextPrayer = item
    }
  }

  // Jika waktu sekarang sudah melewati Isya, waktu berikutnya adalah Imsak/Subuh esok hari
  if (!nextPrayer && items.length > 0) {
    const firstTomorrow = { ...items[0] }
    const tomorrowDate = new Date(date)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const [hStr, mStr] = firstTomorrow.time.split(':')
    tomorrowDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0)
    firstTomorrow.timestamp = tomorrowDate
    nextPrayer = firstTomorrow
  }

  if (currentPrayer) {
    const match = items.find(it => it.id === currentPrayer?.id)
    if (match) match.isCurrent = true
  }

  if (nextPrayer) {
    const match = items.find(it => it.id === nextPrayer?.id)
    if (match) match.isNext = true

    const diffMs = nextPrayer.timestamp.getTime() - date.getTime()
    if (diffMs > 0) {
      const diffMinsTotal = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMinsTotal / 60)
      const diffMins = diffMinsTotal % 60
      if (diffHours > 0) {
        countdownString = `${diffHours}j ${diffMins}m menuju ${nextPrayer.name}`
      } else {
        countdownString = `${diffMins} menit menuju ${nextPrayer.name}`
      }
    }
  }

  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dateFormatted = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const isRamadhan = (hijriFormattedString || '').toLowerCase().includes('ramadhan')

  return {
    date: dateKey,
    dateFormatted,
    hijriFormatted: hijriFormattedString || 'KHGT Majelis Tarjih PP Muhammadiyah',
    locationName: coords.locationName,
    items,
    currentPrayer,
    nextPrayer,
    countdownString,
    isRamadhan
  }
}
