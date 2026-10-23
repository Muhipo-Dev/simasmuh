'use client'

import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#090d16', color: '#f8fafc', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '20px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
            Terjadi Kesalahan Sistem
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
            {error?.message || 'Terjadi gangguan internal pada server SIMASMUH. Silakan muat ulang halaman atau kembali ke beranda.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Coba Lagi
            </button>
            <Link
              href="/"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                textDecoration: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                display: 'inline-block'
              }}
            >
              Beranda
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
