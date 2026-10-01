'use client'

import { FileExplorerManagement } from '@/components/explorer/FileExplorerManagement'
import { HardDrive } from 'lucide-react'

export default function FileExplorerPage() {
  return (
    <div className="space-y-4">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            File Explorer & Penyimpanan Server
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manajemen berkas foto profil siswa, FaceNet AI biometrik, scan E-Arsip dokumen, dan ijazah sekolah.
          </p>
        </div>
      </div>

      {/* Komponen Utama File Explorer */}
      <FileExplorerManagement />
    </div>
  )
}
