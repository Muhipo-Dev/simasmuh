'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Sparkles, Award, ArrowRight, Bell, FileText, CheckCircle2, 
  Clock, BookOpenCheck, BarChart3, Printer, Download, GraduationCap, 
  AlertCircle, Users, TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Link from 'next/link'

export default function ERaporPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [selectedChildIndex, setSelectedChildIndex] = useState(0)

  // Ambil data dashboard wali murid / siswa
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['parent-dashboard-erapor'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/my-dashboard')
      if (!res.ok) {
        const resSiswa = await authenticatedFetch('/api-backend/users/me')
        return resSiswa.json()
      }
      return res.json()
    },
  })

  const students = dashboardData?.students || []
  const currentStudent = students[selectedChildIndex] || students[0]

  const features = [
    {
      title: 'Input Nilai Formatif & Sumatif',
      desc: 'Guru pengampu mata pelajaran menginput nilai asesmen harian, PTS, dan PAS sesuai standar Kurikulum Merdeka.',
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
      title: 'Cetak & Unduh Rapor PDF',
      desc: 'Wali kelas, wali murid, dan siswa dapat mencetak atau mengunduh lembar Rapor Hasil Belajar format PDF.',
      icon: Printer,
      color: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Tanda Tangan Digital Kepala Sekolah',
      desc: 'Mendukung validasi dokumen rapor digital dengan QR verifikasi dan ttd resmi Kepala Sekolah.',
      icon: Award,
      color: 'from-purple-500 to-pink-600'
    }
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              E-Rapor & Hasil Belajar Siswa
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5">
              Coming Soon
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Statistika nilai akademik, peringkat kelas, dan dokumen Rapor Hasil Belajar Digital peserta didik.
          </p>
        </div>

        {/* Tab Pilih Anak (Jika ada lebih dari 1 siswa) */}
        {students.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 px-2">Pilih Siswa:</span>
            {students.map((st: any, idx: number) => (
              <Button
                key={st.id || idx}
                size="sm"
                variant={selectedChildIndex === idx ? 'default' : 'ghost'}
                onClick={() => setSelectedChildIndex(idx)}
                className={`text-xs h-8 ${
                  selectedChildIndex === idx
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {st.name} ({st.nis})
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-400/30 text-purple-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Modul E-Rapor Digital Sekolah</span>
            </div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-md font-medium">
              Tahun Ajaran 2026/2027
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Hasil Belajar: {currentStudent?.name || 'Siswa'}
              </h2>
              <p className="text-purple-100 text-sm mt-0.5">
                Kelas: {currentStudent?.className || '-'} &bull; NIS: {currentStudent?.nis || '-'} &bull; Program: {currentStudent?.program || 'Reguler'}
              </p>
            </div>

            <Button
              disabled
              className="bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-md border border-white/30 rounded-xl gap-2 opacity-90 cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Unduh Rapor PDF (Coming Soon)
            </Button>
          </div>
        </div>
      </div>

      {/* Statistika Nilai Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Rata-Rata Nilai (IP)</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">3.85</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Sangat Baik (A)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-100 dark:border-purple-950/60 bg-gradient-to-br from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Peringkat Kelas</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">3</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">Dari 32 Siswa Kelas {currentStudent?.className || ''}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Status Ketuntasan</p>
              <h3 className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">TUNTAS</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">Memenuhi Seluruh Kriteria KKM</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informasi Rencana Fitur */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Fitur Utama E-Rapor Digital Sekolah
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Tahap Akhir Integrasi Penilaian</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((item, index) => {
            const Icon = item.icon
            return (
              <Card key={index} className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{item.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
