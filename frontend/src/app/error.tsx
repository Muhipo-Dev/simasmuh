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
    // Otomatis refresh jika browser memuat hash chunk versi sebelumnya (ChunkLoadError)
    const isChunkError =
      error?.message?.includes('Failed to load chunk') ||
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk')

    if (isChunkError && typeof window !== 'undefined') {
      const storageKey = 'simasmuh_chunk_reload_ts'
      const lastReload = sessionStorage.getItem(storageKey)
      const now = Date.now()
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(storageKey, now.toString())
        window.location.reload()
      }
    }
  }, [error])

  return (
    <ErrorPageContainer
      code={500}
      customDescription={error.message || 'Terjadi kesalahan sistem pada aplikasi SIMASMUH.'}
      reset={reset}
    />
  )
}
