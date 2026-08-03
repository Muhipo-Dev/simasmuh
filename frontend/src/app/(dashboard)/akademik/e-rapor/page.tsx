'use client'

import { useState } from 'react'
import { Sparkles, Award, ArrowRight, Bell, FileText, CheckCircle2, Clock, BookOpenCheck, BarChart3, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function ERaporComingSoonPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
  }

  const features = [
    {
      title: 'Input Nilai Formatif & Sumatif',
      desc: 'Guru pengampu mata pelajaran dapat menginput nilai asesmen harian, PTS, dan PAS sesuai standar Kurikulum Merdeka.',
      icon: BookOpenCheck,
      color: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Perhitungan Otomatis Leger & KKM',
      desc: 'Nilai akhir semester, rata-rata kelas, bobot nilai, dan peringkat leger siswa terhitung secara otomatis presisi.',
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'Cetak Rapor Digital PDF',
      desc: 'Wali kelas & siswa dapat mencetak atau mengunduh lembar Rapor Hasil Belajar format PDF siap cetak kapan saja.',
      icon: Printer,
      color: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Tanda Tangan & Kunci Rapor Digital',
      desc: 'Mendukung validasi dokumen rapor digital dengan ttd Kepala Sekolah dan fitur penguncian nilai semester.',
      icon: Award,
      color: 'from-purple-500 to-pink-600'
    }
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Mendatang (Coming Soon) &bull; Modul Akademik</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            e-Rapor Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-200">Sekolah</span>
          </h1>

          <p className="text-purple-100/90 text-base sm:text-lg leading-relaxed font-normal">
            Sistem pengolahan nilai dan cetak Rapor Hasil Belajar Digital yang dirancang khusus sesuai standar Kurikulum Merdeka & K-13 secara cepat, akurat, dan transparan.
          </p>

          {/* Form langganan rilis */}
          <div className="pt-2">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
                <Input
                  type="email"
                  placeholder="Masukkan email Anda..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-purple-200/60 h-12 rounded-xl focus-visible:ring-purple-400"
                  required
                />
                <Button type="submit" className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl shadow-lg hover:shadow-purple-500/25 shrink-0">
                  <Bell className="w-4 h-4 mr-2" />
                  Kabari Saat Rilis
                </Button>
              </form>
            ) : (
              <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Terima kasih! Kami akan memberi tahu Anda begitu modul e-Rapor aktif.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Fitur Masa Depan e-Rapor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Fitur Utama e-Rapor Digital
          </h2>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tahap Integrasi Penilaian</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((item, index) => {
            const Icon = item.icon
            return (
              <Card key={index} className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Banner Informasi Tambahan */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Integrasi Penilaian & Nilai Harian</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Terhubung langsung dengan data Guru Pengampu & Wali Kelas.</p>
          </div>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="font-bold text-xs">
            Kembali ke Dashboard
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
