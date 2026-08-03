/**
 * Centralized API URL Configuration
 * Dynamic backend URL resolution that adapts to client hostname, IP address, domain, or environment variables.
 */

export function getBackendUrl(): string {
  // If running in browser (Client-Side)
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '3001'

    // If port 80/443 or standard domain proxy
    if (window.location.port === '' || window.location.port === '80' || window.location.port === '443') {
      return `${protocol}//${hostname}`
    }
    return `${protocol}//${hostname}:${port}`
  }

  // Running on Next.js Server (RSC / Server Side / Route Handlers)
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:3001'
  )
}

/**
 * Returns API endpoint URL.
 * - Client Side: Uses relative path `/api-backend/path` (Next.js rewrite proxy dynamically matches user IP/Domain).
 * - Server Side: Uses `http://127.0.0.1:3001/path` or configured `BACKEND_URL`.
 */
export function getPublicApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined') {
    return `/api-backend${cleanPath}`
  }
  return `${getBackendUrl()}${cleanPath}`
}
