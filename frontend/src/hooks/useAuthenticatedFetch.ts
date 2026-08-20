import { getSession, signOut } from 'next-auth/react'
import { useCallback } from 'react'

interface AuthenticatedFetchOptions extends RequestInit {
  skipAuth?: boolean
}

export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(
    async (url: string, options: AuthenticatedFetchOptions = {}) => {
      const { skipAuth = false, headers = {}, ...restOptions } = options

      const mergedHeaders = new Headers(headers as HeadersInit)
      
      // Add authorization header if we have a session and not skipping auth
      if (!skipAuth) {
        const session = await getSession()
        if (session && (session as any).accessToken) {
          mergedHeaders.set('Authorization', `Bearer ${(session as any).accessToken}`)
        }
      }

      // Don't set Content-Type if body is FormData
      const isFormData = restOptions.body instanceof FormData
      if (!isFormData && !mergedHeaders.has('Content-Type')) {
        mergedHeaders.set('Content-Type', 'application/json')
      }

      // Add API Key for backend communication
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026'
      mergedHeaders.set('x-api-key', apiKey)

      const fetchOptions: RequestInit = {
        ...restOptions,
        headers: mergedHeaders,
        cache: 'no-store' // prevent browser caching to fix sync issues
      }

      const res = await fetch(url, fetchOptions)

      // Jika sesi telah di-unlink atau token tidak lagi valid (401 Unauthorized), logout otomatis
      if (res.status === 401 && !skipAuth) {
        try {
          if (typeof window !== 'undefined') {
            signOut({ callbackUrl: '/login?expired=1' })
          }
        } catch (e) {
          // ignore
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