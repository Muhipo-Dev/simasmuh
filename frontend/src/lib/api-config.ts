/**
 * Centralized API & System Domain Configuration
 * 
 * ATURAN MUTLAK KONEKSI:
 * 1. Backend API (port 3001) MUTLAK HANYA diakses oleh Server Next.js via internal loopback (http://127.0.0.1:3001).
 *    Browser Client / End-User TIDAK PERNAH mengakses port backend secara langsung.
 * 2. Seluruh request dari client-side browser menggunakan relative path `/api-backend/...`
 *    yang di-proxy secara transparan oleh Next.js rewrite engine.
 * 3. Domain Publik Sistem (publicDomainUrl) dari Pengaturan Sistem adalah Single Source of Truth
 *    untuk seluruh link fitur, QR code verifikasi, e-sign, dan OAuth redirect.
 */

// Global memory cache untuk public domain URL dari Pengaturan Sistem
let cachedSystemPublicDomain: string | null = null;

export function setCachedSystemPublicDomain(domain: string | null) {
  if (domain && typeof domain === 'string') {
    cachedSystemPublicDomain = domain.trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('simasmuh_system_domain', cachedSystemPublicDomain);
      } catch {}
    }
  }
}

export function getSystemPublicDomain(): string {
  // 1. Cek memory cache
  if (cachedSystemPublicDomain) {
    return cachedSystemPublicDomain;
  }

  // 2. Cek localStorage (client-side)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('simasmuh_system_domain');
      if (stored) {
        cachedSystemPublicDomain = stored.trim().replace(/\/+$/, '');
        return cachedSystemPublicDomain;
      }
    } catch {}
  }

  // 3. Fallback ke environment variable atau default publik resmi
  const envDomain = process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_DOMAIN_URL || 'https://simasmuh.razagopo.my.id';
  return envDomain.replace(/\/+$/, '');
}

/**
 * Mendapatkan backend URL untuk komunikasi internal server-side (Next.js server -> NestJS backend).
 * Browser client TIDAK PERNAH memanggil backend secara langsung.
 */
export function getBackendUrl(req?: any): string {
  // Komunikasi server-side (RSC / Route Handlers / NextAuth / Server Actions)
  // Selalu gunakan loopback lokal internal 127.0.0.1:3001
  return (
    process.env.BACKEND_URL ||
    'http://127.0.0.1:3001'
  );
}

/**
 * Returns API endpoint URL.
 * - Client Side: Selalu menggunakan relative path `/api-backend/path` (Next.js proxy).
 * - Server Side: Menggunakan internal loopback `http://127.0.0.1:3001/path`.
 */
export function getPublicApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    return `/api-backend${cleanPath}`;
  }
  return `${getBackendUrl()}${cleanPath}`;
}

/**
 * Mendapatkan URL absolut fitur aplikasi (untuk QR Code, Tautan Cetak, Tautan Verifikasi, dll).
 * Menggunakan domain publik yang diatur di Pengaturan Sistem sebagai Single Source of Truth.
 */
export function getAppFeatureUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseDomain = getSystemPublicDomain();
  return `${baseDomain}${cleanPath}`;
}
