'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function LpjKeuanganPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">LPJ Keuangan</h1>
          <p className="text-slate-500 mt-1">Laporan Pertanggung Jawaban Pemasukan dan Pengeluaran</p>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Fitur dalam Pengembangan
          </CardTitle>
          <CardDescription>
            Modul LPJ Keuangan sedang dalam tahap perbaikan dan pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Segera Hadir</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2">
              Nantikan pembaruan sistem SIMASMUH selanjutnya untuk menikmati fitur Laporan Pertanggung Jawaban Keuangan (LPJ) yang lebih komprehensif tanpa ada kendala error.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
