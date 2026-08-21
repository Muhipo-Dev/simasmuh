'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ShieldCheck, Award, HeartHandshake, Sparkles, CheckCircle2, 
  AlertTriangle, BookOpen, Clock, Users, FileText, Info, ShieldAlert,
  Calendar, Check, UserCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  const etika = currentStudent?.etikaTataTertib || {}
  const assessmentHistory = etika.assessments || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Buku Saku Adab, Ibadah & Tata Tertib Siswa
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold px-2.5 py-0.5">
              Live Terintegrasi
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Monitoring rekam jejak kedisiplinan, etika kesantunan, perizinan dispensasi, dan amalan ibadah siswa secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a href="/presensi/izin-keluar">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5">
              <Clock className="w-4 h-4" />
              Ajukan Izin / Sakit / Dispensasi
            </Button>
          </a>

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
      </div>

      {/* Banner Integrasi Tim Tatatertib & BK */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider bg-white/25 px-2 py-0.5 rounded text-white">
                Terkoneksi Tim Tatib & BK
              </span>
              <span className="text-xs text-emerald-100 font-medium">Buku Saku Digital & Notifikasi WhatsApp</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Evaluasi Karakter Islami, Kedisiplinan & Perkembangan Siswa
            </h3>
          </div>
        </div>
        <div className="text-xs bg-white/15 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-emerald-50">
          <p className="font-semibold">Siswa: {currentStudent?.name || 'Siswa'}</p>
          <p className="text-[11px] opacity-90">Kelas: {currentStudent?.className || '-'} • NIS: {currentStudent?.nis || '-'}</p>
        </div>
      </div>

      {/* Grid Nilai & Statistika Karakter Live */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-100 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Poin Kedisiplinan</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {etika.kedisiplinanScore ?? 100}
                </h3>
                <span className="text-xs font-semibold text-slate-500">/ 100 Poin Maksimal</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {etika.kedisiplinanScore >= 90 ? 'Sangat Disiplin & Tertib' : etika.kedisiplinanScore >= 75 ? 'Cukup Disiplin' : 'Perlu Pembinaan'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 dark:border-teal-950/60 bg-gradient-to-br from-teal-50/40 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Amalan & Sholat Berjamaah</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {etika.ibadahScore || 'A'}
                </h3>
                <span className="text-xs font-semibold text-slate-500">(Aktif Beribadah)</span>
              </div>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold mt-1 flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" /> Terdata Sholat Dzuhur & Dhuha
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-100 dark:border-cyan-950/60 bg-gradient-to-br from-cyan-50/40 via-white to-white dark:from-cyan-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Adab & Kesantunan</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {etika.perilakuScore || 'A'}
                </h3>
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

      {/* Riwayat Catatan Evaluasi Karakter Realtime */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-emerald-600" />
            Riwayat Catatan Pembinaan, Ibadah & Pelanggaran Siswa
          </CardTitle>
          <CardDescription className="text-xs">
            Daftar catatan evaluasi yang diinput oleh Wali Kelas, Tim Ketertiban Sekolah, dan Guru BK/BP.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {assessmentHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Alhamdulillah, belum ada catatan pelanggaran tata tertib tercatat.
              </p>
              <p className="text-xs text-slate-400">
                Siswa memiliki rekam jejak kedisiplinan dan amalan ibadah yang sangat baik.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold">Tanggal</TableHead>
                    <TableHead className="text-xs font-bold">Kategori & Poin</TableHead>
                    <TableHead className="text-xs font-bold">Peristiwa / Evaluasi</TableHead>
                    <TableHead className="text-xs font-bold">Tindak Lanjut</TableHead>
                    <TableHead className="text-xs font-bold">Penilai / Pembina</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessmentHistory.map((item: any, idx: number) => {
                    const isNeg = item.points < 0 || item.category === 'PELANGGARAN' || item.type === 'NEGATIF'
                    return (
                      <TableRow key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs">
                        <TableCell className="text-center text-slate-400 font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {new Date(item.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isNeg
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                  : item.category === 'IBADAH'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {item.category?.replace('_', ' ')}
                            </Badge>
                            <span className={`font-bold text-xs ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.points > 0 ? `+${item.points}` : item.points}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description || '-'}</p>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-slate-600 dark:text-slate-300">{item.actionTaken || 'Dipantau berkala'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                            {item.evaluator?.name || 'Tim Pembina'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {item.evaluator?.subRole || item.evaluator?.role || 'TATIB/BK'}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
