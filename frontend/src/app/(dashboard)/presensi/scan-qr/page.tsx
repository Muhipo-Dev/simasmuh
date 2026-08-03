'use client'

import { QrScanner } from '@/components/QrScanner'

export default function ScanQrPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Scan QR Absen</h1>
        <p className="text-slate-500 mt-1">Pindai QR Code untuk presensi kehadiran.</p>
      </div>
      <QrScanner />
    </div>
  )
}
