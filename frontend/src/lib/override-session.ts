'use client'

export interface OverrideSessionData {
  access_token: string
  sessionId?: string
  mode: 'override' | 'spectator'
  isReadOnly: boolean
  user: {
    id: string
    email?: string | null
    username?: string | null
    nipNbm?: string | null
    name: string
    role: string
    isActive?: boolean
    subRole?: string | null
    subRole2?: string | null
    subRole3?: string | null
    subRole4?: string | null
    subRole5?: string | null
    avatarUrl?: string | null
    isOverrideSession: true
    overrideMode: 'override' | 'spectator'
    isReadOnly: boolean
    overrideByAdminId: string
    overrideByAdminName: string
    overrideByAdminRole: string
  }
}

const OVERRIDE_COOKIE_NAME = 'simasmuh_override_session'

/**
 * Menyimpan data sesi override ke cookie browser secara aman.
 * Sesi ini berdiri sendiri dan TIDAK MENGGANTIKAN cookie NextAuth admin utama.
 */
export function setOverrideSession(data: OverrideSessionData): void {
  if (typeof document === 'undefined') return
  try {
    const jsonStr = encodeURIComponent(JSON.stringify(data))
    // Simpan di cookie dengan path / sehingga terbaca di semua rute
    // Sesi override berlaku selama browser aktif (session cookie) atau max-age 86400 (24 jam)
    document.cookie = `${OVERRIDE_COOKIE_NAME}=${jsonStr}; path=/; max-age=86400; SameSite=Lax`
    // Trigger storage/custom event agar komponen lain realtime re-render
    window.dispatchEvent(new Event('simasmuh-override-changed'))
  } catch (e) {
    console.error('Gagal menyimpan override session:', e)
  }
}

/**
 * Mengambil data sesi override aktif dari cookie browser.
 */
export function getOverrideSession(): OverrideSessionData | null {
  if (typeof document === 'undefined') return null
  try {
    const nameEQ = `${OVERRIDE_COOKIE_NAME}=`
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) {
        const raw = decodeURIComponent(c.substring(nameEQ.length, c.length))
        const parsed = JSON.parse(raw)
        if (parsed?.access_token && parsed?.user?.id) {
          return parsed as OverrideSessionData
        }
      }
    }
  } catch (e) {
    console.error('Gagal membaca override session:', e)
  }
  return null
}

/**
 * Menghapus data sesi override dan membersihkan cookie.
 * Cookie login admin utama tetap utuh tidak tersentuh.
 */
export function clearOverrideSession(): void {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${OVERRIDE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    window.dispatchEvent(new Event('simasmuh-override-changed'))
  } catch (e) {
    console.error('Gagal menghapus override session:', e)
  }
}
