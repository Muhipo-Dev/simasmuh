export interface NationalHoliday {
  date: string // YYYY-MM-DD
  description: string
  isCutiBersama?: boolean
}

export interface HijriDayInfo {
  gregorianDate: string // YYYY-MM-DD
  hijriDateFormatted: string // e.g. "2 Rabi'ul Akhir 1448 H"
  hijriDay: number
  hijriMonthNumber: number
  hijriMonthName: string
  hijriYear: number
  day?: number
  month?: number
  monthName?: string
  year?: number
  islamicHolidays: string[]
  muhammadiyahEvents: string[]
  nationalEvents: string[]
}

export const HIJRI_MONTH_NAMES_ID: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: 'Rabi\'ul Awwal',
  4: 'Rabi\'ul Akhir',
  5: 'Jumadil Ula',
  6: 'Jumadil Akhir',
  7: 'Rajab',
  8: 'Sya\'ban',
  9: 'Ramadhan',
  10: 'Syawal',
  11: 'Dzulqa\'dah',
  12: 'Dzulhijjah'
}

// In-memory cache
const holidayCache: Record<number, { data: NationalHoliday[]; timestamp: number }> = {}
const hijriMonthCache: Record<string, { data: Record<string, HijriDayInfo>; timestamp: number }> = {}

const CACHE_TTL = 1000 * 60 * 60 * 12 // 12 jam cache

/**
 * Built-in standard national holidays fallback database (2025 - 2027)
 */
/**
 * Built-in standard national holidays database & long-term astronomical projection (2024 - 2036+)
 * Mendukung sinkronisasi penuh hingga 10+ tahun ke depan.
 */
const KNOWN_NATIONAL_HOLIDAYS: Record<string, { desc: string; isCuti?: boolean }> = {
  // 2024
  '2024-01-01': { desc: 'Tahun Baru 2024 Masehi' },
  '2024-02-08': { desc: 'Isra Mi\'raj Nabi Muhammad SAW' },
  '2024-02-10': { desc: 'Tahun Baru Imlek 2575 Kongzili' },
  '2024-03-11': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1946' },
  '2024-03-29': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2024-03-31': { desc: 'Hari Paskah' },
  '2024-04-10': { desc: 'Hari Raya Idul Fitri 1445 H' },
  '2024-04-11': { desc: 'Hari Raya Idul Fitri 1445 H' },
  '2024-05-01': { desc: 'Hari Buruh Internasional' },
  '2024-05-09': { desc: 'Kenaikan Yesus Kristus' },
  '2024-05-23': { desc: 'Hari Raya Waisak 2568 BE' },
  '2024-06-01': { desc: 'Hari Lahir Pancasila' },
  '2024-06-17': { desc: 'Hari Raya Idul Adha 1445 H' },
  '2024-07-07': { desc: 'Tahun Baru Islam 1446 H' },
  '2024-08-17': { desc: 'Hari Kemerdekaan RI ke-79' },
  '2024-09-16': { desc: 'Maulid Nabi Muhammad SAW' },
  '2024-12-25': { desc: 'Hari Raya Natal' },

  // 2025
  '2025-01-01': { desc: 'Tahun Baru 2025 Masehi' },
  '2025-01-27': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2025-01-29': { desc: 'Tahun Baru Imlek 2576 Kongzili' },
  '2025-03-29': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1947' },
  '2025-03-31': { desc: 'Hari Raya Idul Fitri 1446 H' },
  '2025-04-01': { desc: 'Hari Raya Idul Fitri 1446 H' },
  '2025-04-18': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2025-04-20': { desc: 'Kebangkitan Yesus Kristus (Paskah)' },
  '2025-05-01': { desc: 'Hari Buruh Internasional' },
  '2025-05-12': { desc: 'Hari Raya Waisak 2569 BE' },
  '2025-05-29': { desc: 'Kenaikan Yesus Kristus' },
  '2025-06-01': { desc: 'Hari Lahir Pancasila' },
  '2025-06-07': { desc: 'Hari Raya Idul Adha 1446 H' },
  '2025-06-27': { desc: 'Tahun Baru Islam 1447 H' },
  '2025-08-17': { desc: 'Hari Kemerdekaan RI ke-80' },
  '2025-09-05': { desc: 'Maulid Nabi Muhammad SAW' },
  '2025-12-25': { desc: 'Hari Raya Natal' },

  // 2026
  '2026-01-01': { desc: 'Tahun Baru 2026 Masehi' },
  '2026-01-16': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2026-02-17': { desc: 'Tahun Baru Imlek 2577 Kongzili' },
  '2026-03-18': { desc: 'Cuti Bersama Hari Suci Nyepi', isCuti: true },
  '2026-03-19': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1948' },
  '2026-03-20': { desc: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', isCuti: true },
  '2026-03-21': { desc: 'Hari Raya Idul Fitri 1447 Hijriyah' },
  '2026-03-22': { desc: 'Hari Raya Idul Fitri 1447 Hijriyah' },
  '2026-03-23': { desc: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', isCuti: true },
  '2026-03-24': { desc: 'Cuti Bersama Hari Raya Idul Fitri 1447 H', isCuti: true },
  '2026-04-03': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2026-04-05': { desc: 'Kebangkitan Yesus Kristus (Paskah)' },
  '2026-05-01': { desc: 'Hari Buruh Internasional' },
  '2026-05-14': { desc: 'Kenaikan Yesus Kristus' },
  '2026-05-15': { desc: 'Cuti Bersama Kenaikan Yesus Kristus', isCuti: true },
  '2026-05-27': { desc: 'Hari Raya Idul Adha 1447 Hijriyah' },
  '2026-05-28': { desc: 'Cuti Bersama Hari Raya Idul Adha 1447 H', isCuti: true },
  '2026-05-31': { desc: 'Hari Raya Waisak 2570 BE' },
  '2026-06-01': { desc: 'Hari Lahir Pancasila' },
  '2026-06-16': { desc: 'Tahun Baru Islam 1448 Hijriyah' },
  '2026-08-17': { desc: 'Hari Kemerdekaan RI ke-81' },
  '2026-08-25': { desc: 'Maulid Nabi Muhammad SAW' },
  '2026-12-24': { desc: 'Cuti Bersama Hari Raya Natal', isCuti: true },
  '2026-12-25': { desc: 'Hari Raya Natal' },

  // 2027
  '2027-01-01': { desc: 'Tahun Baru 2027 Masehi' },
  '2027-01-05': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2027-02-06': { desc: 'Tahun Baru Imlek 2578 Kongzili' },
  '2027-03-09': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1949' },
  '2027-03-10': { desc: 'Hari Raya Idul Fitri 1448 Hijriyah' },
  '2027-03-11': { desc: 'Hari Raya Idul Fitri 1448 Hijriyah' },
  '2027-03-26': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2027-03-28': { desc: 'Kebangkitan Yesus Kristus (Paskah)' },
  '2027-05-01': { desc: 'Hari Buruh Internasional' },
  '2027-05-06': { desc: 'Kenaikan Yesus Kristus' },
  '2027-05-16': { desc: 'Hari Raya Idul Adha 1448 Hijriyah' },
  '2027-05-20': { desc: 'Hari Raya Waisak 2571 BE' },
  '2027-06-01': { desc: 'Hari Lahir Pancasila' },
  '2027-06-06': { desc: 'Tahun Baru Islam 1449 Hijriyah' },
  '2027-08-15': { desc: 'Maulid Nabi Muhammad SAW' },
  '2027-08-17': { desc: 'Hari Kemerdekaan RI ke-82' },
  '2027-12-25': { desc: 'Hari Raya Natal' },

  // 2028
  '2028-01-01': { desc: 'Tahun Baru 2028 Masehi' },
  '2028-01-25': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2028-01-26': { desc: 'Tahun Baru Imlek 2579 Kongzili' },
  '2028-02-28': { desc: 'Hari Raya Idul Fitri 1449 Hijriyah' },
  '2028-02-29': { desc: 'Hari Raya Idul Fitri 1449 Hijriyah' },
  '2028-03-27': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1950' },
  '2028-04-14': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2028-04-16': { desc: 'Kebangkitan Yesus Kristus (Paskah)' },
  '2028-05-01': { desc: 'Hari Buruh Internasional' },
  '2028-05-05': { desc: 'Hari Raya Idul Adha 1449 Hijriyah' },
  '2028-05-09': { desc: 'Hari Raya Waisak 2572 BE' },
  '2028-05-25': { desc: 'Kenaikan Yesus Kristus' },
  '2028-05-26': { desc: 'Tahun Baru Islam 1450 Hijriyah' },
  '2028-06-01': { desc: 'Hari Lahir Pancasila' },
  '2028-08-04': { desc: 'Maulid Nabi Muhammad SAW' },
  '2028-08-17': { desc: 'Hari Kemerdekaan RI ke-83' },
  '2028-12-25': { desc: 'Hari Raya Natal' },

  // 2029
  '2029-01-01': { desc: 'Tahun Baru 2029 Masehi' },
  '2029-01-13': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2029-02-13': { desc: 'Tahun Baru Imlek 2580 Kongzili' },
  '2029-02-16': { desc: 'Hari Raya Idul Fitri 1450 Hijriyah' },
  '2029-02-17': { desc: 'Hari Raya Idul Fitri 1450 Hijriyah' },
  '2029-03-15': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1951' },
  '2029-03-30': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2029-04-24': { desc: 'Hari Raya Idul Adha 1450 Hijriyah' },
  '2029-05-01': { desc: 'Hari Buruh Internasional' },
  '2029-05-10': { desc: 'Kenaikan Yesus Kristus' },
  '2029-05-15': { desc: 'Tahun Baru Islam 1451 Hijriyah' },
  '2029-05-28': { desc: 'Hari Raya Waisak 2573 BE' },
  '2029-06-01': { desc: 'Hari Lahir Pancasila' },
  '2029-07-24': { desc: 'Maulid Nabi Muhammad SAW' },
  '2029-08-17': { desc: 'Hari Kemerdekaan RI ke-84' },
  '2029-12-25': { desc: 'Hari Raya Natal' },

  // 2030
  '2030-01-01': { desc: 'Tahun Baru 2030 Masehi' },
  '2030-01-03': { desc: 'Isra Mi’raj Nabi Muhammad SAW' },
  '2030-02-03': { desc: 'Tahun Baru Imlek 2581 Kongzili' },
  '2030-02-05': { desc: 'Hari Raya Idul Fitri 1451 Hijriyah' },
  '2030-02-06': { desc: 'Hari Raya Idul Fitri 1451 Hijriyah' },
  '2030-03-05': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1952' },
  '2030-04-14': { desc: 'Hari Raya Idul Adha 1451 Hijriyah' },
  '2030-04-19': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2030-05-01': { desc: 'Hari Buruh Internasional' },
  '2030-05-05': { desc: 'Tahun Baru Islam 1452 Hijriyah' },
  '2030-05-17': { desc: 'Hari Raya Waisak 2574 BE' },
  '2030-05-30': { desc: 'Kenaikan Yesus Kristus' },
  '2030-06-01': { desc: 'Hari Lahir Pancasila' },
  '2030-07-14': { desc: 'Maulid Nabi Muhammad SAW' },
  '2030-08-17': { desc: 'Hari Kemerdekaan RI ke-85' },
  '2030-12-25': { desc: 'Hari Raya Natal' },

  // 2031
  '2031-01-01': { desc: 'Tahun Baru 2031 Masehi' },
  '2031-01-23': { desc: 'Tahun Baru Imlek 2582 Kongzili' },
  '2031-01-25': { desc: 'Hari Raya Idul Fitri 1452 Hijriyah' },
  '2031-01-26': { desc: 'Hari Raya Idul Fitri 1452 Hijriyah' },
  '2031-03-24': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1953' },
  '2031-04-03': { desc: 'Hari Raya Idul Adha 1452 Hijriyah' },
  '2031-04-11': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2031-04-24': { desc: 'Tahun Baru Islam 1453 Hijriyah' },
  '2031-05-01': { desc: 'Hari Buruh Internasional' },
  '2031-05-06': { desc: 'Hari Raya Waisak 2575 BE' },
  '2031-05-22': { desc: 'Kenaikan Yesus Kristus' },
  '2031-06-01': { desc: 'Hari Lahir Pancasila' },
  '2031-07-03': { desc: 'Maulid Nabi Muhammad SAW' },
  '2031-08-17': { desc: 'Hari Kemerdekaan RI ke-86' },
  '2031-12-25': { desc: 'Hari Raya Natal' },

  // 2032
  '2032-01-01': { desc: 'Tahun Baru 2032 Masehi' },
  '2032-01-14': { desc: 'Hari Raya Idul Fitri 1453 Hijriyah' },
  '2032-01-15': { desc: 'Hari Raya Idul Fitri 1453 Hijriyah' },
  '2032-02-11': { desc: 'Tahun Baru Imlek 2583 Kongzili' },
  '2032-03-12': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1954' },
  '2032-03-22': { desc: 'Hari Raya Idul Adha 1453 Hijriyah' },
  '2032-03-26': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2032-04-12': { desc: 'Tahun Baru Islam 1454 Hijriyah' },
  '2032-05-01': { desc: 'Hari Buruh Internasional' },
  '2032-05-06': { desc: 'Kenaikan Yesus Kristus' },
  '2032-05-24': { desc: 'Hari Raya Waisak 2576 BE' },
  '2032-06-01': { desc: 'Hari Lahir Pancasila' },
  '2032-06-21': { desc: 'Maulid Nabi Muhammad SAW' },
  '2032-08-17': { desc: 'Hari Kemerdekaan RI ke-87' },
  '2032-12-25': { desc: 'Hari Raya Natal' },

  // 2033
  '2033-01-01': { desc: 'Tahun Baru 2033 Masehi' },
  '2033-01-03': { desc: 'Hari Raya Idul Fitri 1454 Hijriyah' },
  '2033-01-04': { desc: 'Hari Raya Idul Fitri 1454 Hijriyah' },
  '2033-01-31': { desc: 'Tahun Baru Imlek 2584 Kongzili' },
  '2033-03-01': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1955' },
  '2033-03-11': { desc: 'Hari Raya Idul Adha 1454 Hijriyah' },
  '2033-04-01': { desc: 'Tahun Baru Islam 1455 Hijriyah' },
  '2033-04-15': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2033-05-01': { desc: 'Hari Buruh Internasional' },
  '2033-05-13': { desc: 'Hari Raya Waisak 2577 BE' },
  '2033-05-26': { desc: 'Kenaikan Yesus Kristus' },
  '2033-06-01': { desc: 'Hari Lahir Pancasila' },
  '2033-06-10': { desc: 'Maulid Nabi Muhammad SAW' },
  '2033-08-17': { desc: 'Hari Kemerdekaan RI ke-88' },
  '2033-12-23': { desc: 'Hari Raya Idul Fitri 1455 Hijriyah' },
  '2033-12-24': { desc: 'Hari Raya Idul Fitri 1455 Hijriyah' },
  '2033-12-25': { desc: 'Hari Raya Natal' },

  // 2034
  '2034-01-01': { desc: 'Tahun Baru 2034 Masehi' },
  '2034-02-19': { desc: 'Tahun Baru Imlek 2585 Kongzili' },
  '2034-02-28': { desc: 'Hari Raya Idul Adha 1455 Hijriyah' },
  '2034-03-20': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1956' },
  '2034-03-21': { desc: 'Tahun Baru Islam 1456 Hijriyah' },
  '2034-04-07': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2034-05-01': { desc: 'Hari Buruh Internasional' },
  '2034-05-03': { desc: 'Hari Raya Waisak 2578 BE' },
  '2034-05-18': { desc: 'Kenaikan Yesus Kristus' },
  '2034-05-30': { desc: 'Maulid Nabi Muhammad SAW' },
  '2034-06-01': { desc: 'Hari Lahir Pancasila' },
  '2034-08-17': { desc: 'Hari Kemerdekaan RI ke-89' },
  '2034-12-12': { desc: 'Hari Raya Idul Fitri 1456 Hijriyah' },
  '2034-12-13': { desc: 'Hari Raya Idul Fitri 1456 Hijriyah' },
  '2034-12-25': { desc: 'Hari Raya Natal' },

  // 2035
  '2035-01-01': { desc: 'Tahun Baru 2035 Masehi' },
  '2035-02-08': { desc: 'Tahun Baru Imlek 2586 Kongzili' },
  '2035-02-17': { desc: 'Hari Raya Idul Adha 1456 Hijriyah' },
  '2035-03-10': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1957' },
  '2035-03-11': { desc: 'Tahun Baru Islam 1457 Hijriyah' },
  '2035-03-23': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2035-05-01': { desc: 'Hari Buruh Internasional' },
  '2035-05-10': { desc: 'Kenaikan Yesus Kristus' },
  '2035-05-19': { desc: 'Maulid Nabi Muhammad SAW' },
  '2035-05-22': { desc: 'Hari Raya Waisak 2579 BE' },
  '2035-06-01': { desc: 'Hari Lahir Pancasila' },
  '2035-08-17': { desc: 'Hari Kemerdekaan RI ke-90' },
  '2035-12-01': { desc: 'Hari Raya Idul Fitri 1457 Hijriyah' },
  '2035-12-02': { desc: 'Hari Raya Idul Fitri 1457 Hijriyah' },
  '2035-12-25': { desc: 'Hari Raya Natal' },

  // 2036
  '2036-01-01': { desc: 'Tahun Baru 2036 Masehi' },
  '2036-01-28': { desc: 'Tahun Baru Imlek 2587 Kongzili' },
  '2036-02-06': { desc: 'Hari Raya Idul Adha 1457 Hijriyah' },
  '2036-02-28': { desc: 'Tahun Baru Islam 1458 Hijriyah' },
  '2036-03-28': { desc: 'Hari Suci Nyepi Tahun Baru Saka 1958' },
  '2036-04-11': { desc: 'Wafat Yesus Kristus (Jumat Agung)' },
  '2036-05-01': { desc: 'Hari Buruh Internasional' },
  '2036-05-08': { desc: 'Maulid Nabi Muhammad SAW' },
  '2036-05-10': { desc: 'Hari Raya Waisak 2580 BE' },
  '2036-05-22': { desc: 'Kenaikan Yesus Kristus' },
  '2036-06-01': { desc: 'Hari Lahir Pancasila' },
  '2036-08-17': { desc: 'Hari Kemerdekaan RI ke-91' },
  '2036-11-20': { desc: 'Hari Raya Idul Fitri 1458 Hijriyah' },
  '2036-11-21': { desc: 'Hari Raya Idul Fitri 1458 Hijriyah' },
  '2036-12-25': { desc: 'Hari Raya Natal' }
}

/**
 * Islamic Hijri Day Commemorations (Month, Day)
 */
/**
 * Islamic Hijri Day Commemorations (Month-Day)
 * 1: Muharram, 2: Safar, 3: Rabi'ul Awwal, 4: Rabi'ul Akhir, 5: Jumadil Ula, 6: Jumadil Akhir
 * 7: Rajab, 8: Sya'ban, 9: Ramadhan, 10: Syawal, 11: Dzulqa'dah, 12: Dzulhijjah
 */
const ISLAMIC_HIJRI_EVENTS: Record<string, string[]> = {
  // 1. Muharram
  '1-1': ['Tahun Baru Islam 1 Muharram'],
  '1-9': ['Puasa Sunnah Tasu\'a (9 Muharram)'],
  '1-10': ['Hari Asyura (10 Muharram) & Puasa Asyura'],
  '1-13': ['Puasa Ayyamul Bidh (13 Muharram)'],
  '1-14': ['Puasa Ayyamul Bidh (14 Muharram)'],
  '1-15': ['Puasa Ayyamul Bidh (15 Muharram)'],

  // 2. Safar
  '2-13': ['Puasa Ayyamul Bidh (13 Safar)'],
  '2-14': ['Puasa Ayyamul Bidh (14 Safar)'],
  '2-15': ['Puasa Ayyamul Bidh (15 Safar)'],

  // 3. Rabi'ul Awwal
  '3-12': ['Maulid Nabi Muhammad SAW (12 Rabi\'ul Awwal)'],
  '3-13': ['Puasa Ayyamul Bidh (13 Rabi\'ul Awwal)'],
  '3-14': ['Puasa Ayyamul Bidh (14 Rabi\'ul Awwal)'],
  '3-15': ['Puasa Ayyamul Bidh (15 Rabi\'ul Awwal)'],

  // 4. Rabi'ul Akhir
  '4-13': ['Puasa Ayyamul Bidh (13 Rabi\'ul Akhir)'],
  '4-14': ['Puasa Ayyamul Bidh (14 Rabi\'ul Akhir)'],
  '4-15': ['Puasa Ayyamul Bidh (15 Rabi\'ul Akhir)'],

  // 5. Jumadil Ula
  '5-13': ['Puasa Ayyamul Bidh (13 Jumadil Ula)'],
  '5-14': ['Puasa Ayyamul Bidh (14 Jumadil Ula)'],
  '5-15': ['Puasa Ayyamul Bidh (15 Jumadil Ula)'],

  // 6. Jumadil Akhir
  '6-13': ['Puasa Ayyamul Bidh (13 Jumadil Akhir)'],
  '6-14': ['Puasa Ayyamul Bidh (14 Jumadil Akhir)'],
  '6-15': ['Puasa Ayyamul Bidh (15 Jumadil Akhir)'],

  // 7. Rajab
  '7-1': ['Awal Bulan Rajab (Bulan Haram)'],
  '7-13': ['Puasa Ayyamul Bidh (13 Rajab)'],
  '7-14': ['Puasa Ayyamul Bidh (14 Rajab)'],
  '7-15': ['Puasa Ayyamul Bidh (15 Rajab)'],
  '7-27': ['Isra\' Mi\'raj Nabi Muhammad SAW (27 Rajab)'],

  // 8. Sya'ban
  '8-1': ['Awal Bulan Sya\'ban'],
  '8-13': ['Puasa Ayyamul Bidh (13 Sya\'ban)'],
  '8-14': ['Puasa Ayyamul Bidh (14 Sya\'ban)'],
  '8-15': ['Malam Nisfu Sya\'ban (15 Sya\'ban)'],

  // 9. Ramadhan
  '9-1': ['Awal Puasa Ramadhan (1 Ramadhan)'],
  '9-17': ['Peringatan Nuzulul Qur\'an (17 Ramadhan)'],
  '9-21': ['Malam 21 Ramadhan (Lailatul Qadar)'],
  '9-23': ['Malam 23 Ramadhan (Lailatul Qadar)'],
  '9-25': ['Malam 25 Ramadhan (Lailatul Qadar)'],
  '9-27': ['Malam 27 Ramadhan (Lailatul Qadar)'],
  '9-29': ['Malam 29 Ramadhan (Lailatul Qadar)'],

  // 10. Syawal
  '10-1': ['Hari Raya Idul Fitri (1 Syawal)'],
  '10-2': ['Hari Raya Idul Fitri (2 Syawal)'],
  '10-13': ['Puasa Ayyamul Bidh (13 Syawal)'],
  '10-14': ['Puasa Ayyamul Bidh (14 Syawal)'],
  '10-15': ['Puasa Ayyamul Bidh (15 Syawal)'],

  // 11. Dzulqa'dah
  '11-1': ['Awal Bulan Dzulqa\'dah (Bulan Haram)'],
  '11-13': ['Puasa Ayyamul Bidh (13 Dzulqa\'dah)'],
  '11-14': ['Puasa Ayyamul Bidh (14 Dzulqa\'dah)'],
  '11-15': ['Puasa Ayyamul Bidh (15 Dzulqa\'dah)'],

  // 12. Dzulhijjah
  '12-1': ['Awal 10 Hari Pertama Dzulhijjah'],
  '12-8': ['Hari Tarwiyah (8 Dzulhijjah)'],
  '12-9': ['Hari Arafah & Puasa Sunnah Arafah (9 Dzulhijjah)'],
  '12-10': ['Hari Raya Idul Adha (10 Dzulhijjah)'],
  '12-11': ['Hari Tasyrik ke-1 (11 Dzulhijjah)'],
  '12-12': ['Hari Tasyrik ke-2 (12 Dzulhijjah)'],
  '12-13': ['Hari Tasyrik ke-3 (13 Dzulhijjah)'],
  '12-14': ['Puasa Ayyamul Bidh (14 Dzulhijjah)'],
  '12-15': ['Puasa Ayyamul Bidh (15 Dzulhijjah)']
}

/**
 * Muhammadiyah & Ortom Commemorations (Masehi: MM-DD, Hijriah: M-D)
 */
export const MUHAMMADIYAH_GREGORIAN_EVENTS: Record<string, string[]> = {
  '01-08': ['Milad Majelis Dikdasmen & PNF Muhammadiyah'],
  '03-14': ['Milad Ikatan Mahasiswa Muhammadiyah (IMM)'],
  '05-02': ['Milad Pemuda Muhammadiyah (2 Mei 1932 M)'],
  '05-19': ['Milad \'Aisyiyah (19 Mei 1917 M)'],
  '07-18': ['Milad Ikatan Pelajar Muhammadiyah (IPM)'],
  '07-31': ['Milad Tapak Suci Putera Muhammadiyah (31 Juli 1963 M)'],
  '09-18': ['Milad Komando Kesiapsiagaan Angkatan Muda Muhammadiyah (KOKAM)'],
  '11-18': ['Milad Muhammadiyah (18 November 1912 M di Yogyakarta)'],
  '12-20': ['Milad Gerakan Kepanduan Hizbul Wathan / HW (20 Desember 1918 M)']
}

export const MUHAMMADIYAH_HIJRI_EVENTS: Record<string, string[]> = {
  '7-27': ['Milad \'Aisyiyah - Penanggalan Hijriah (27 Rajab 1335 H)'],
  '12-8': ['Milad Muhammadiyah - Penanggalan Hijriah (8 Dzulhijjah 1330 H)'],
  '12-28': ['Milad Nasyiatul \'Aisyiyah / NA (28 Dzulhijjah 1349 H)']
}

/**
 * Peringatan Hari Besar Nasional Republik Indonesia (Bukan Hari Libur Resmi)
 */
export const NATIONAL_COMMEMORATIONS: Record<string, string[]> = {
  '01-25': ['Hari Gizi Nasional'],
  '02-09': ['Hari Pers Nasional (HPN)'],
  '03-09': ['Hari Musik Nasional'],
  '03-30': ['Hari Film Nasional'],
  '04-21': ['Hari Kartini'],
  '05-02': ['Hari Pendidikan Nasional (Hardiknas)'],
  '05-20': ['Hari Kebangkitan Nasional (Harkitnas)'],
  '07-23': ['Hari Anak Nasional (HAN)'],
  '08-10': ['Hari Veteran Nasional'],
  '09-09': ['Hari Olahraga Nasional (Haornas)'],
  '09-24': ['Hari Tani Nasional'],
  '10-01': ['Hari Kesaktian Pancasila'],
  '10-02': ['Hari Batik Nasional'],
  '10-22': ['Hari Santri Nasional (Resolusi Jihad)'],
  '10-28': ['Hari Sumpah Pemuda'],
  '11-10': ['Hari Pahlawan Nasional'],
  '11-12': ['Hari Kesehatan Nasional (HKN)'],
  '11-25': ['Hari Guru Nasional (HUT PGRI)'],
  '12-13': ['Hari Nusantara'],
  '12-22': ['Hari Ibu Nasional']
}

export interface LocalHijriResult {
  hijriDay: number
  hijriMonthNumber: number
  hijriMonthName: string
  hijriYear: number
  day: number
  month: number
  monthName: string
  year: number
}

/**
 * High accuracy local Hijri calculation using Intl.DateTimeFormat (Umm Al-Qura / SIHAT)
 */
export function calculateLocalHijriDate(date: Date): LocalHijriResult {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
    const parts = formatter.formatToParts(date)
    let day = 1
    let month = 1
    let year = 1448

    parts.forEach(p => {
      if (p.type === 'day') day = parseInt(p.value, 10) || 1
      if (p.type === 'month') month = parseInt(p.value, 10) || 1
      if (p.type === 'year') year = parseInt(p.value, 10) || 1448
    })

    return {
      hijriDay: day,
      hijriMonthNumber: month,
      hijriMonthName: HIJRI_MONTH_NAMES_ID[month] || `Bulan ${month}`,
      hijriYear: year,
      day,
      month,
      monthName: HIJRI_MONTH_NAMES_ID[month] || `Bulan ${month}`,
      year
    }
  } catch {
    // Fallback mathematical Kuwaity astronomical conversion
    let m = date.getMonth() + 1
    let y = date.getFullYear()
    const d = date.getDate()
    if (m < 3) {
      y -= 1
      m += 12
    }
    const a = Math.floor(y / 100)
    const b = 2 - a + Math.floor(a / 4)
    const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5
    const z = Math.floor(jd + 0.5)
    let l = z - 1948440 + 10632
    const n = Math.floor((l - 1) / 10631)
    l = l - 10631 * n + 354
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238)
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
    const hm = Math.floor((24 * l) / 709)
    const hd = l - Math.floor((709 * hm) / 24)
    const hy = 30 * n + j - 30

    return {
      hijriDay: hd,
      hijriMonthNumber: hm,
      hijriMonthName: HIJRI_MONTH_NAMES_ID[hm] || `Bulan ${hm}`,
      hijriYear: hy,
      day: hd,
      month: hm,
      monthName: HIJRI_MONTH_NAMES_ID[hm] || `Bulan ${hm}`,
      year: hy
    }
  }
}

/**
 * Mengambil Hari Libur Nasional & Cuti Bersama secara realtime dari API Nasional dengan Fallback Built-in
 */
export async function fetchNationalHolidays(year: number): Promise<NationalHoliday[]> {
  const now = Date.now()
  if (holidayCache[year] && (now - holidayCache[year].timestamp) < CACHE_TTL) {
    return holidayCache[year].data
  }

  const holidaysMap = new Map<string, NationalHoliday>()

  // 1. Seed with known built-in national holidays for this year
  Object.keys(KNOWN_NATIONAL_HOLIDAYS).forEach(dKey => {
    if (dKey.startsWith(String(year))) {
      const item = KNOWN_NATIONAL_HOLIDAYS[dKey]
      holidaysMap.set(dKey, {
        date: dKey,
        description: item.desc,
        isCutiBersama: Boolean(item.isCuti)
      })
    }
  })

  // 2. Provider 1: API Hari Libur Nasional Indonesia (Vercel Endpoint Resmi)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500)

    const res = await fetch(`https://api-hari-libur.vercel.app/api?year=${year}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const json = await res.json()
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        json.data.forEach((item: any) => {
          const d = item.date || item.holiday_date
          const desc = item.holiday_name || item.description || item.name || ''
          if (d && desc) {
            const isCuti = desc.toLowerCase().includes('cuti')
            holidaysMap.set(d, {
              date: d,
              description: desc,
              isCutiBersama: isCuti
            })
          }
        })
      }
    }
  } catch (err) {
    console.warn('[Calendar API] API Hari Libur Vercel offline, using local & secondary source')
  }

  // 3. Provider 2: Titimangsa / Dayoff API Public Repository Raw
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500)

    const res = await fetch(`https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/calendar.json`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const json = await res.json()
      if (json && typeof json === 'object') {
        Object.keys(json).forEach(dateKey => {
          if (dateKey.startsWith(String(year))) {
            const item = json[dateKey]
            if (item && item.holiday) {
              const desc = item.summary || 'Hari Libur Nasional'
              const isCuti = desc.toLowerCase().includes('cuti')
              holidaysMap.set(dateKey, {
                date: dateKey,
                description: desc,
                isCutiBersama: isCuti
              })
            }
          }
        })
      }
    }
  } catch (err) {
    // Secondary API error handled silently
  }

  const result = Array.from(holidaysMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  holidayCache[year] = { data: result, timestamp: now }
  return result
}

/**
 * Mengambil penanggalan Islam (Hijriah), Hari Peringatan Islam, dan Hari Besar Muhammadiyah
 */
export async function fetchHijriMonthCalendar(month: number, year: number): Promise<Record<string, HijriDayInfo>> {
  const cacheKey = `${year}-${month}`
  const now = Date.now()
  if (hijriMonthCache[cacheKey] && (now - hijriMonthCache[cacheKey].timestamp) < CACHE_TTL) {
    return hijriMonthCache[cacheKey].data
  }

  const result: Record<string, HijriDayInfo> = {}
  const daysInMonth = new Date(year, month, 0).getDate()

  // 1. Inisialisasi setiap hari dalam bulan dengan kalkulasi Hijriah lokal presisi
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day)
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const mmDd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const hijriCalc = calculateLocalHijriDate(dateObj)
    const hijriKey = `${hijriCalc.month}-${hijriCalc.day}`

    const islamicHolidays: string[] = []
    if (ISLAMIC_HIJRI_EVENTS[hijriKey]) {
      islamicHolidays.push(...ISLAMIC_HIJRI_EVENTS[hijriKey])
    }

    const muhammadiyahEvents: string[] = []
    if (MUHAMMADIYAH_GREGORIAN_EVENTS[mmDd]) {
      muhammadiyahEvents.push(...MUHAMMADIYAH_GREGORIAN_EVENTS[mmDd])
    }
    if (MUHAMMADIYAH_HIJRI_EVENTS[hijriKey]) {
      muhammadiyahEvents.push(...MUHAMMADIYAH_HIJRI_EVENTS[hijriKey])
    }

    const nationalEvents: string[] = []
    if (NATIONAL_COMMEMORATIONS[mmDd]) {
      nationalEvents.push(...NATIONAL_COMMEMORATIONS[mmDd])
    }

    result[dateKey] = {
      gregorianDate: dateKey,
      hijriDateFormatted: `${hijriCalc.day} ${hijriCalc.monthName} ${hijriCalc.year} H`,
      hijriDay: hijriCalc.day,
      hijriMonthNumber: hijriCalc.month,
      hijriMonthName: hijriCalc.monthName,
      hijriYear: hijriCalc.year,
      islamicHolidays,
      muhammadiyahEvents,
      nationalEvents
    }
  }

  // 2. Sinkronisasi realtime dengan API Aladhan (Umm Al-Qura / SIHAT Kemenag)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500)

    const res = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const json = await res.json()
      if (json && json.code === 200 && Array.isArray(json.data)) {
        json.data.forEach((item: any) => {
          const gDay = item.gregorian?.day
          const gMonth = item.gregorian?.month?.number
          const gYear = item.gregorian?.year
          if (!gDay || !gMonth || !gYear) return

          const dateKey = `${gYear}-${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`
          const hMonthNum = item.hijri?.month?.number || 1
          const hMonthName = HIJRI_MONTH_NAMES_ID[hMonthNum] || item.hijri?.month?.en || ''
          const hDay = parseInt(item.hijri?.day, 10) || 1
          const hYear = parseInt(item.hijri?.year, 10) || 1448

          const mmDd = `${String(gMonth).padStart(2, '0')}-${String(gDay).padStart(2, '0')}`
          const hijriKey = `${hMonthNum}-${hDay}`

          const islamicHolidays = [...(result[dateKey]?.islamicHolidays || [])]
          if (ISLAMIC_HIJRI_EVENTS[hijriKey]) {
            ISLAMIC_HIJRI_EVENTS[hijriKey].forEach(h => {
              if (!islamicHolidays.includes(h)) islamicHolidays.push(h)
            })
          }
          if (Array.isArray(item.hijri?.holidays)) {
            item.hijri.holidays.forEach((h: string) => {
              if (h && !islamicHolidays.includes(h)) islamicHolidays.push(h)
            })
          }

          const muhammadiyahEvents = [...(result[dateKey]?.muhammadiyahEvents || [])]
          if (MUHAMMADIYAH_GREGORIAN_EVENTS[mmDd]) {
            MUHAMMADIYAH_GREGORIAN_EVENTS[mmDd].forEach(mEvent => {
              if (!muhammadiyahEvents.includes(mEvent)) muhammadiyahEvents.push(mEvent)
            })
          }
          if (MUHAMMADIYAH_HIJRI_EVENTS[hijriKey]) {
            MUHAMMADIYAH_HIJRI_EVENTS[hijriKey].forEach(mEvent => {
              if (!muhammadiyahEvents.includes(mEvent)) muhammadiyahEvents.push(mEvent)
            })
          }

          const nationalEvents = [...(result[dateKey]?.nationalEvents || [])]
          if (NATIONAL_COMMEMORATIONS[mmDd]) {
            NATIONAL_COMMEMORATIONS[mmDd].forEach(ne => {
              if (!nationalEvents.includes(ne)) nationalEvents.push(ne)
            })
          }

          result[dateKey] = {
            gregorianDate: dateKey,
            hijriDateFormatted: `${hDay} ${hMonthName} ${hYear} H`,
            hijriDay: hDay,
            hijriMonthNumber: hMonthNum,
            hijriMonthName: hMonthName,
            hijriYear: hYear,
            islamicHolidays,
            muhammadiyahEvents,
            nationalEvents
          }
        })
      }
    }
  } catch (err) {
    console.warn('[Hijri API] Aladhan realtime sync offline, running on precision local engine')
  }

  hijriMonthCache[cacheKey] = { data: result, timestamp: now }
  return result
}
