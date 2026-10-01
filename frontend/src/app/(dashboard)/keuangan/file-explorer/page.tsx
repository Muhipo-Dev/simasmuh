'use client'

import { FileExplorerManagement } from '@/components/explorer/FileExplorerManagement'
import { Receipt, HardDrive } from 'lucide-react'

export default function KeuanganFileExplorerPage() {
  return (
    <div className="space-y-4">
      {/* Header Halaman Keuangan File Explorer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            File Explorer & Bukti Bayar Keuangan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manajemen arsip bukti pembayaran, struk transfer, dan dokumen keuangan siswa di penyimpanan server lokal.
          </p>
        </div>
      </div>

      {/* Komponen Utama File Explorer (Default Fokus ke folder payment-proofs) */}
      <FileExplorerManagement initialPath="payment-proofs" forcedTitle="Bukti Pembayaran Keuangan" />
    </div>
  )
}
