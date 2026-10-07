'use client'

import ErrorPageContainer from '@/components/ui/ErrorPageContainer'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <ErrorPageContainer
          code={500}
          customDescription={error?.message || 'Terjadi kesalahan internal pada server SIMASMUH.'}
          reset={reset}
        />
      </body>
    </html>
  )
}
