'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ServerTimePayload {
  serverTimestamp: number
  serverTimeIso: string
  serverTimeFormatted: string
  serverDateFormatted: string
  serverTimeString: string
  timezone: string
  utcOffset: string
  utcOffsetMinutes: number
  serverLocation: string
  serverHost: string
  serverUptime: number
  clientSentAt?: number | null
  serverReceivedAt?: number
  serverSentAt?: number
}

// Global in-memory time offset (ms) antara client browser dan server
let globalServerTimeOffset = 0
let lastSyncTimestamp = 0
let isInitialSyncDone = false

export const DEFAULT_SERVER_TIMEZONE = 'Asia/Jakarta'

/**
 * Melakukan sinkronisasi waktu presisi dengan server backend (NTP-like roundtrip algorithm)
 */
export async function syncServerTime(): Promise<{ offset: number; roundTripLatency: number; serverInfo: ServerTimePayload }> {
  const t0 = Date.now()
  try {
    const res = await fetch(`/api-backend/settings/time-sync?t=${t0}`, {
      cache: 'no-store',
    })
    const t3 = Date.now()
    if (!res.ok) throw new Error('Gagal sinkronisasi waktu server')
    
    const data: ServerTimePayload = await res.json()
    const t1 = data.serverReceivedAt || data.serverTimestamp
    const t2 = data.serverSentAt || data.serverTimestamp

    // Rumus estimasi roundtrip delay dan offset clock
    // offset = ((t1 - t0) + (t2 - t3)) / 2
    const roundTripLatency = Math.max(0, (t3 - t0) - (t2 - t1))
    const calculatedOffset = ((t1 - t0) + (t2 - t3)) / 2

    globalServerTimeOffset = calculatedOffset
    lastSyncTimestamp = t3
    isInitialSyncDone = true

    return {
      offset: calculatedOffset,
      roundTripLatency,
      serverInfo: data,
    }
  } catch (err) {
    // Fallback: anggap offset 0 jika jaringan offline
    console.warn('Gagal melakukan sinkronisasi waktu dengan server:', err)
    return {
      offset: globalServerTimeOffset,
      roundTripLatency: 0,
      serverInfo: {
        serverTimestamp: Date.now(),
        serverTimeIso: new Date().toISOString(),
        serverTimeFormatted: formatDateTimeWib(new Date()),
        serverDateFormatted: formatDateWib(new Date()),
        serverTimeString: formatTimeWib(new Date()),
        timezone: DEFAULT_SERVER_TIMEZONE,
        utcOffset: '+07:00',
        utcOffsetMinutes: 420,
        serverLocation: 'Server SIMASMUH',
        serverHost: 'localhost',
        serverUptime: 0,
      },
    }
  }
}

/**
 * Mendapatkan objek Date terkini yang telah disinkronkan dengan waktu server
 */
export function getSyncedDate(): Date {
  return new Date(Date.now() + globalServerTimeOffset)
}

/**
 * Format tanggal dalam standar Bahasa Indonesia & Zona Waktu Server (Asia/Jakarta UTC+7)
 */
export function formatDateWib(date: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_SERVER_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(d)
}

/**
 * Format jam dalam standar HH:mm:ss (Asia/Jakarta UTC+7)
 */
export function formatTimeWib(date: Date | string | number | null | undefined, includeSeconds = true): string {
  if (!date) return '-'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_SERVER_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(d).replace(/\./g, ':')
}

/**
 * Format tanggal & jam lengkap (Asia/Jakarta UTC+7)
 */
export function formatDateTimeWib(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_SERVER_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d).replace(/\./g, ':')
}

/**
 * React Hook untuk live real-time server clock yang selalu akurat dan tersinkronisasi
 */
export function useRealtimeServerClock(syncIntervalMs: number = 60000) {
  const [currentDate, setCurrentDate] = useState<Date>(() => getSyncedDate())
  const [serverMeta, setServerMeta] = useState<ServerTimePayload | null>(null)
  const [latency, setLatency] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  const triggerSync = useCallback(async () => {
    setIsSyncing(true)
    const result = await syncServerTime()
    setLatency(result.roundTripLatency)
    setServerMeta(result.serverInfo)
    setLastSyncTime(new Date())
    setIsSyncing(false)
  }, [])

  useEffect(() => {
    // Sinkronisasi pertama kali
    triggerSync()

    // Timer interval sinkronisasi ulang dengan backend
    const syncInterval = setInterval(() => {
      triggerSync()
    }, syncIntervalMs)

    return () => clearInterval(syncInterval)
  }, [triggerSync, syncIntervalMs])

  useEffect(() => {
    // Tick interval setiap detik untuk tampilan jam real-time
    const tickInterval = setInterval(() => {
      setCurrentDate(getSyncedDate())
    }, 1000)

    return () => clearInterval(tickInterval)
  }, [])

  return {
    currentDate,
    timeString: formatTimeWib(currentDate, true),
    dateString: formatDateWib(currentDate, { weekday: 'long' }),
    fullDateTimeString: formatDateTimeWib(currentDate),
    timezone: serverMeta?.timezone || DEFAULT_SERVER_TIMEZONE,
    utcOffset: serverMeta?.utcOffset || '+07:00',
    serverLocation: serverMeta?.serverLocation || 'Ponorogo, Jawa Timur',
    serverHost: serverMeta?.serverHost || 'Local/Cloud Server',
    latency,
    isSyncing,
    lastSyncTime,
    reSync: triggerSync,
  }
}
