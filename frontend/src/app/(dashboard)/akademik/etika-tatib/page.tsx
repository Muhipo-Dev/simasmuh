'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ShieldCheck, Award, HeartHandshake, Sparkles, CheckCircle2, 
  AlertTriangle, BookOpen, Clock, Users, FileText, Info
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function EtikaTatibPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [selectedChildIndex, setSelectedChildIndex] = useState(0)

  // Ambil data dashboard wali murid / siswa
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['parent-dashboard-etika'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/my-dashboard')
      if (!res.ok) {
        // Fallback untuk akun siswa langsung
        const resSiswa = await authenticatedFetch('/api-backend/users/me')
        return resSiswa.json()
      }
      return res.json()
    },
  })

  const students = dashboardData?.students || []
  const currentStudent = students[selectedChildIndex] || students[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Penilaian Etika & Tata Tertib
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5">
              Coming Soon
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Monitoring rekam jejak kedisiplinan, etika kesantunan, dan amalan ibadah siswa secara langsung (View Only).
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
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 font-bold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {st.name} ({st.nis})
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Banner Integrasi Tim Tatatertib */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-2 py-0.5 rounded text-white">
                Terkoneksi Subrole Tim Tatib
              </span>
              <span className="text-xs text-emerald-100 font-medium">BP/BK & Kedisiplinan Madrasah</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Sistem Buku Saku Kedisiplinan & Penilaian Karakter Islami
            </h3>
          </div>
        </div>
        <div className="text-xs bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-emerald-50">
          <p className="font-semibold">Siswa: {currentStudent?.name || 'Siswa'}</p>
          <p className="text-[11px] opacity-90">Kelas: {currentStudent?.className || '-'} • NIS: {currentStudent?.nis || '-'}</p>
        </div>
      </div>

      {/* Grid Nilai & Statistika Karakter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Poin Kedisiplinan</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">100</h3>
                <span className="text-xs font-semibold text-slate-500">/ 100 Poin Maksimal</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sangat Disiplin (Tanpa Pelanggaran)
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 dark:border-teal-950/60 bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Amalan & Sholat Berjamaah</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">A</h3>
                <span className="text-xs font-semibold text-slate-500">(Sangat Baik)</span>
              </div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" /> Aktif Sholat Dzuhur & Dhuha
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-100 dark:border-cyan-950/60 bg-gradient-to-br from-cyan-50/40 via-white to-white dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Etika & Kesantunan</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">A</h3>
                <span className="text-xs font-semibold text-slate-500">(Terpuji)</span>
              </div>
              <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Santun kepada Guru & Teman
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catatan Pembina / Tim Tatib */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Catatan Pembinaan Karakter Siswa (Tim Ketertiban & Wali Kelas)
          </CardTitle>
          <CardDescription>
            Rekapitulasi evaluasi sikap dan perkembangan kepribadian peserta didik selama semester berjalan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Catatan Wali Kelas & Tim Ketertiban:
              </span>
              <span className="text-xs text-slate-400">Semester Ganjil 2026/2027</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              &quot;Siswa menunjukkan kepribadian yang sangat santun, berakhlakul karimah, aktif mengikuti sholat berjamaah tepat waktu, berbusana rapi sesuai syariat madrasah, dan memiliki interaksi yang rukun dengan sesama siswa.&quot;
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Informasi Fitur Lengkap (Coming Soon):</p>
              <p>
                Modul input poin pelanggaran, kartu kredit poin reward/penghargaan, dan log presensi sholat digital saat ini sedang disiapkan untuk dapat diinput langsung oleh pengguna ber-subrole <strong>Tim Tatatertib</strong> dan dapat dipantau langsung oleh Wali Murid & Siswa secara real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
