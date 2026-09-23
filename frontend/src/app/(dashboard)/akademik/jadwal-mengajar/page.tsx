'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JadwalMengajarRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/akademik/jurnal-mengajar')
  }, [router])

  return null
}
