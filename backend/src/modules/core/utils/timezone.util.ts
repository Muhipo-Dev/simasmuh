import * as os from 'os';

/**
 * Utilitas Manajemen Tanggal & Waktu Terpusat SIMASMUH
 * Menjamin konsistensi zona waktu UTC+7 (Asia/Jakarta / Bangkok)
 * di seluruh server di manapun aplikasi diinstal.
 */

export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Jakarta';
export const DEFAULT_UTC_OFFSET_HOURS = 7;
export const DEFAULT_UTC_OFFSET_MINUTES = 7 * 60; // 420 menit

export interface ServerTimeInfo {
  serverTimestamp: number;
  serverTimeIso: string;
  serverTimeFormatted: string;
  serverDateFormatted: string;
  serverTimeString: string;
  timezone: string;
  utcOffset: string;
  utcOffsetMinutes: number;
  serverLocation: string;
  serverHost: string;
  serverUptime: number;
}

/**
 * Mengatur zona waktu proses NodeJS ke zona waktu target (Default: Asia/Jakarta)
 */
export function initializeSystemTimezone(tz: string = DEFAULT_TIMEZONE): void {
  process.env.TZ = tz;
}

/**
 * Mendapatkan waktu sekarang dalam representasi zona waktu UTC+7
 */
export function getNowUtc7(): Date {
  const now = new Date();
  return now;
}

/**
 * Mengembalikan string jam HH:mm:ss dalam zona waktu Asia/Jakarta (UTC+7)
 */
export function getTimeStringUtc7(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\./g, ':');
}

/**
 * Mengembalikan string tanggal YYYY-MM-DD dalam zona waktu Asia/Jakarta (UTC+7)
 */
export function getDateStringUtc7(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Format YYYY-MM-DD
}

/**
 * Mendapatkan awal hari (00:00:00.000) terhitung dalam zona waktu UTC+7
 */
export function getStartOfDayUtc7(date: Date | string = new Date()): Date {
  const target = typeof date === 'string' ? new Date(date) : new Date(date);
  const dateStr = getDateStringUtc7(target); // YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000+07:00`);
}

/**
 * Mendapatkan akhir hari (23:59:59.999) terhitung dalam zona waktu UTC+7
 */
export function getEndOfDayUtc7(date: Date | string = new Date()): Date {
  const target = typeof date === 'string' ? new Date(date) : new Date(date);
  const dateStr = getDateStringUtc7(target); // YYYY-MM-DD
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}

/**
 * Format tanggal dalam Bahasa Indonesia sesuai zona waktu UTC+7 (Asia/Jakarta)
 */
export function formatDateIndonesia(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(target.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('id-ID', defaultOptions).format(target);
}

/**
 * Format tanggal dan waktu lengkap dalam Bahasa Indonesia (UTC+7)
 */
export function formatDateTimeIndonesia(date: Date | string): string {
  const target = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(target.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(target).replace(/\./g, ':');
}

/**
 * Mendapatkan informasi lengkap waktu dan konfigurasi server
 */
export function getServerTimeInfo(locationName: string = 'Ponorogo, Jawa Timur, Indonesia'): ServerTimeInfo {
  const now = new Date();
  
  return {
    serverTimestamp: now.getTime(),
    serverTimeIso: now.toISOString(),
    serverTimeFormatted: formatDateTimeIndonesia(now),
    serverDateFormatted: formatDateIndonesia(now),
    serverTimeString: getTimeStringUtc7(now),
    timezone: DEFAULT_TIMEZONE,
    utcOffset: '+07:00',
    utcOffsetMinutes: DEFAULT_UTC_OFFSET_MINUTES,
    serverLocation: locationName,
    serverHost: os.hostname(),
    serverUptime: Math.floor(process.uptime()),
  };
}
