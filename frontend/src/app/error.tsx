'use client'

import React, { useEffect } from 'react'
import ErrorPageContainer from '@/components/ui/ErrorPageContainer'

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Captured Runtime Error:', error)
  }, [error])

  return (
    <ErrorPageContainer
      code={500}
      customDescription={error.message || 'Terjadi kesalahan sistem pada aplikasi SIMASMUH.'}
      reset={reset}
    />
  )
}
