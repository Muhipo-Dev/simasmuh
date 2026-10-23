import { getSession, signOut } from 'next-auth/react'
import { useCallback } from 'react'
import { getOverrideSession } from '@/lib/override-session'

interface AuthenticatedFetchOptions extends RequestInit {
  skipAuth?: boolean
}

let isHandling401 = false

let cachedSession: any = null
let sessionFetchTime = 0
const SESSION_CACHE_TTL = 15000 // 15 detik TTL

async function getCachedSession() {
  const now = Date.now()
  if (cachedSession && now - sessionFetchTime < SESSION_CACHE_TTL) {
    return cachedSession
  }
  cachedSession = await getSession()
  sessionFetchTime = now
  return cachedSession
}

export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(
    async (url: string, options: AuthenticatedFetchOptions = {}) => {
      const { skipAuth = false, headers = {}, ...restOptions } = options

      const mergedHeaders = new Headers(headers as HeadersInit)
      
      // Add authorization header if not skipping auth
      if (!skipAuth) {
        // Cek apakah ada sesi override aktif di cookie
        const overrideSession = typeof window !== 'undefined' ? getOverrideSession() : null

        if (overrideSession?.access_token) {
          // Gunakan token akun target yang dioverride untuk mengakses data backend
          mergedHeaders.set('Authorization', `Bearer ${overrideSession.access_token}`)
        } else {
          const session = await getCachedSession()
          if (session && (session as any).accessToken) {
            mergedHeaders.set('Authorization', `Bearer ${(session as any).accessToken}`)
          }
        }

        // 🛡️ Proteksi Spectator Mode (Read Only): Cegah modifikasi data jika sedang dalam mode Spectator
        const isReadOnlySession =
          overrideSession?.isReadOnly === true ||
          overrideSession?.mode === 'spectator'

        const method = (restOptions.method || 'GET').toUpperCase()
        if (isReadOnlySession && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          // Kecualikan auth logout / override exit / override switch
          const isAllowedSpectatorPath =
            url.includes('/auth/logout') ||
            url.includes('/override-token') ||
            url.includes('/override-exit')

          if (!isAllowedSpectatorPath) {
            if (typeof window !== 'undefined') {
              try {
                const Swal = (await import('sweetalert2')).default
                Swal.fire({
                  icon: 'warning',
                  title: 'Mode Spectator (Read Only)',
                  text: 'Anda sedang berada dalam mode Spectator (Hanya Lihat). Operasi penambahan, perubahan, atau penghapusan data tidak diizinkan demi keamanan.',
                  confirmButtonColor: '#f59e0b',
                })
              } catch {}
            }
            return new Response(
              JSON.stringify({
                statusCode: 403,
                message: 'Operasi dilarang saat berada dalam Mode Spectator (Read Only).',
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        }
      }

      // Don't set Content-Type if body is FormData
      const isFormData = restOptions.body instanceof FormData
      if (!isFormData && !mergedHeaders.has('Content-Type')) {
        mergedHeaders.set('Content-Type', 'application/json')
      }

      // Add API Key for backend communication
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55'
      mergedHeaders.set('x-api-key', apiKey)

      const fetchOptions: RequestInit = {
        ...restOptions,
        headers: mergedHeaders,
        cache: 'no-store' // prevent browser caching to fix sync issues
      }

      const res = await fetch(url, fetchOptions)

      // Jika sesi telah di-unlink atau token tidak lagi valid (401 Unauthorized), logout otomatis terarah
      if (res.status === 401 && !skipAuth) {
        cachedSession = null
        if (!isHandling401 && typeof window !== 'undefined') {
          isHandling401 = true
          try {
            sessionStorage.clear()
          } catch {}
          try {
            signOut({ callbackUrl: '/login?expired=1' })
          } catch (e) {
            window.location.href = '/login?expired=1'
          }
        }
      }

      return res
    },
    []
  )

  return authenticatedFetch
}

// Custom hook for React Query with authentication
export function useAuthenticatedQuery() {
  const authenticatedFetch = useAuthenticatedFetch()

  const queryFn = useCallback(
    async (url: string, options?: AuthenticatedFetchOptions) => {
      const res = await authenticatedFetch(url, options)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`)
      }
      return res.json()
    },
    [authenticatedFetch]
  )

  return queryFn
}