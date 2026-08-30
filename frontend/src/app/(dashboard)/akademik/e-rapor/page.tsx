'use client'

import { AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function ERaporPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <Card className="max-w-xl w-full border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl">
        <CardContent className="space-y-5 p-0 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Modul E-Rapor Dinonaktifkan
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              Pengelolaan dan penerbitan <strong>E-Rapor Digital</strong> dikelola secara terpisah mengikuti standar server resmi Dapodik & Kemendikdasmen RI.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-left space-y-1.5 w-full">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Informasi Akses Eksternal:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Seluruh proses entri nilai, pencetakan leger rapor kurikulum merdeka, dan rekapitulasi nilai rapor peserta didik dilakukan secara eksternal melalui aplikasi E-Rapor Kemendikbudristek/Dikdasmen.
            </p>
          </div>

          <Link href="/dashboard" className="w-full pt-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard SIMASMUH
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
