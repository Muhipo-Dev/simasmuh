'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Building2,
  TrendingUp,
  FileCheck2,
  Info
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface CbtNilaiItem {
  idPesertaUjian: string
  nis: string
  nisn: string | null
  namaSiswa: string
  jenisKelamin: string | null
  kelas: string
  tingkat: number
  jurusan: string | null
  kodeUjian: string
  judulUjian: string
  jenisPenilaian: 'PAS' | 'PTS' | 'UH' | 'TRYOUT' | string
  kodeMapel: string
  namaMapel: string
  guruPengampu: string
  nipGuru: string
  kkm: number
  nilaiPG: number
  nilaiEsai: number
  nilaiTotal: number
  isKoreksiSelesai: boolean
  statusKetuntasan: 'TUNTAS' | 'BELUM_TUNTAS'
  waktuMulai: string | null
  waktuSelesai: string | null
}

export default function NilaiSemesterPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMapel, setSelectedMapel] = useState('ALL')
  const [selectedTipe, setSelectedTipe] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedClass, setSelectedClass] = useState('ALL')

  const user = session?.user as any
  const studentNis = user?.username || user?.nis || ''

  const userRole = String(user?.role || '').toUpperCase()
  const userRolesList = [userRole, user?.subRole, user?.subRole2].filter(Boolean)
  const isExecutiveSupervisor = userRolesList.some(r => ['KEPALA_SEKOLAH', 'SUPERADMIN', 'ADMIN_IT', 'KURIKULUM', 'ADMIN_TU', 'BAU'].includes(r))
  const isStudentOrParent = (userRole === 'SISWA' || userRole.includes('WALI')) && !isExecutiveSupervisor

  // 1. Fetch data profil siswa aktif SIMASMUH (hanya jika siswa/wali murid)
  const { data: activeStudent } = useQuery({
    queryKey: ['active-student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id || !isStudentOrParent) return null
      const res = await authenticatedFetch(`/api-backend/students/by-user/${user.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!user?.id && isStudentOrParent,
  })

  // NIS efektif yang digunakan
  const effectiveNis = isStudentOrParent ? (activeStudent?.nis || studentNis) : ''

  // 2. Fetch data nilai semester dari CBT MUHIPO Engine atau fallback Grade lokal SIMASMUH
  const {
    data: nilaiData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<{ success: boolean; total: number; data: CbtNilaiItem[] }>({
    queryKey: ['cbt-nilai-semester', isExecutiveSupervisor ? 'all' : effectiveNis],
    queryFn: async () => {
      let cbtHost = process.env.NEXT_PUBLIC_CBT_URL
      if (!cbtHost) {
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname || 'localhost'
          const protocol = window.location.protocol || 'http:'
          cbtHost = `${protocol}//${hostname}:3010`
        } else {
          cbtHost = 'http://localhost:3010'
        }
      }
      const apiUrl = isStudentOrParent && effectiveNis
        ? `${cbtHost}/api/external/simasmuh/nilai-semester?nis=${effectiveNis}`
        : `${cbtHost}/api/external/simasmuh/nilai-semester`

      try {
        const res = await fetch(apiUrl, {
          headers: {
            'x-api-key': 'muhipo-simasmuh-sync-secret-2026',
          },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Gagal mengambil data dari CBT')
        return res.json()
      } catch {
        // Fallback: Jika CBT offline/cross-origin gagal, ambil dari data tabel Grade lokal SIMASMUH
        const fallbackUrl = isStudentOrParent && effectiveNis 
          ? `/api-backend/grades?nis=${effectiveNis}` 
          : '/api-backend/grades'
        const fallbackRes = await authenticatedFetch(fallbackUrl)
        if (fallbackRes.ok) {
          const rawGrades = await fallbackRes.json()
          const mappedData: CbtNilaiItem[] = (rawGrades || []).map((g: any) => ({
            idPesertaUjian: g.id,
            nis: g.student?.nis || effectiveNis || '-',
            nisn: g.student?.nisn || null,
            namaSiswa: g.student?.name || (isStudentOrParent ? user?.name : 'Siswa'),
            jenisKelamin: g.student?.gender || null,
            kelas: g.student?.class?.name || (isStudentOrParent ? activeStudent?.class?.name : '-') || '-',
            tingkat: g.student?.class?.gradeLevel || 10,
            jurusan: g.student?.class?.program || 'Reguler',
            kodeUjian: `${g.type}-CBT`,
            judulUjian: `Asesmen ${g.type} CBT (${g.subject?.name || 'Mapel'})`,
            jenisPenilaian: g.type,
            kodeMapel: g.subject?.code || 'MAPEL',
            namaMapel: g.subject?.name || 'Mata Pelajaran',
            guruPengampu: 'Guru Pengampu CBT',
            nipGuru: '-',
            kkm: 75,
            nilaiPG: 0,
            nilaiEsai: 0,
            nilaiTotal: Number(g.score) || 0,
            isKoreksiSelesai: true,
            statusKetuntasan: (Number(g.score) || 0) >= 75 ? 'TUNTAS' : 'BELUM_TUNTAS',
            waktuMulai: null,
            waktuSelesai: null,
          }))

          return {
            success: true,
            total: mappedData.length,
            data: mappedData,
          }
        }
        return { success: false, total: 0, data: [] }
      }
    },
    enabled: isExecutiveSupervisor || (isStudentOrParent && !!effectiveNis),
    staleTime: 1000 * 30, // 30 detik
  })

  // Pastikan isolasi data: jika siswa/wali murid, hanya tampilkan NIS bersangkutan. Jika supervisor, tampilkan seluruh nilai
  const rawList = (nilaiData?.data || []).filter((item) => {
    if (isStudentOrParent) {
      if (!effectiveNis) return false
      return String(item.nis).trim().toLowerCase() === String(effectiveNis).trim().toLowerCase()
    }
    return true
  })

  // Ekstrak daftar mapel & kelas unik untuk dropdown filter
  const mapelOptions = Array.from(new Set(rawList.map((item) => item.namaMapel))).filter(Boolean)
  const classOptions = Array.from(new Set(rawList.map((item) => item.kelas))).filter(Boolean)

  // Filter list data berdasarkan search & dropdown
  const filteredList = rawList.filter((item) => {
    const matchSearch =
      item.namaMapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.judulUjian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kodeMapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.guruPengampu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaSiswa && item.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.nis && item.nis.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchMapel = selectedMapel === 'ALL' || item.namaMapel === selectedMapel
    const matchTipe = selectedTipe === 'ALL' || item.jenisPenilaian === selectedTipe
    const matchStatus = selectedStatus === 'ALL' || item.statusKetuntasan === selectedStatus
    const matchClass = selectedClass === 'ALL' || item.kelas === selectedClass

    return matchSearch && matchMapel && matchTipe && matchStatus && matchClass
  })

  // Kalkulasi statistik ringkas
  const totalUjian = rawList.length
  const rataRataNilai =
    totalUjian > 0
      ? (rawList.reduce((acc, curr) => acc + (Number(curr.nilaiTotal) || 0), 0) / totalUjian).toFixed(1)
      : '0.0'
  const totalTuntas = rawList.filter((n) => n.statusKetuntasan === 'TUNTAS').length
  const totalBelumTuntas = totalUjian - totalTuntas
  const persentaseKetuntasan = totalUjian > 0 ? ((totalTuntas / totalUjian) * 100).toFixed(0) : '0'
  const nilaiTertinggi =
    totalUjian > 0 ? Math.max(...rawList.map((n) => Number(n.nilaiTotal) || 0)).toFixed(1) : '0.0'

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Banner & Identitas Peserta Didik / Supervisi Eksekutif */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold backdrop-blur-md">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {isExecutiveSupervisor ? 'Supervisi Nilai Asesmen Sekolah' : 'Rekapitulasi Asesmen CBT MUHIPO Terintegrasi'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isExecutiveSupervisor ? 'Rekap Nilai Semester Sekolah' : 'Nilai Semester Siswa'}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              {isExecutiveSupervisor
                ? 'Monitoring capaian hasil ujian CBT seluruh siswa, rekap ketuntasan KKM per kelas dan mata pelajaran, serta evaluasi hasil penilaian terintegrasi.'
                : 'Daftar perolehan nilai hasil pengerjaan ujian berbasis komputer (CBT) yang tersinkronisasi otomatis dengan basis data kurikulum dan penilaian SIMASMUH.'}
            </p>
          </div>

          {/* Kartu Profil / Status Supervisor */}
          <div className="bg-white/15 border border-white/20 backdrop-blur-md rounded-2xl p-4 min-w-[260px] space-y-2 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-black text-sm text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm truncate">{user?.name || 'Pengguna'}</h4>
                <p className="text-blue-200 font-mono text-[11px]">
                  {isExecutiveSupervisor ? `Peran: ${userRole}` : `NIS: ${effectiveNis || '-'}`}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100 font-medium">
              <span>
                {isExecutiveSupervisor
                  ? `Total Peserta Ujian: ${rawList.length}`
                  : `Kelas: ${activeStudent?.class?.name || (rawList[0]?.kelas ?? '-')}`}
              </span>
              <span>Semester: <strong>Ganjil</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Kartu Ringkasan Indikator Nilai */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Ujian */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Total Ujian Diikuti
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {totalUjian}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Rata-Rata Nilai */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Rata-Rata Nilai
              </span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {rataRataNilai}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Status Tuntas */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Mencapai KKM (Tuntas)
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {totalTuntas}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Nilai Tertinggi */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Nilai Tertinggi
              </span>
              <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                {nilaiTertinggi}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter & Toolbar Pencarian */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari mata pelajaran, judul ujian, guru pengampu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
              {/* Filter Mapel */}
              <Select value={selectedMapel} onValueChange={(v) => setSelectedMapel(v || 'ALL')}>
                <SelectTrigger className="w-full sm:w-[170px] rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Semua Mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Mapel</SelectItem>
                  {mapelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Tipe Asesmen */}
              <Select value={selectedTipe} onValueChange={(v) => setSelectedTipe(v || 'ALL')}>
                <SelectTrigger className="w-full sm:w-[130px] rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Tipe Ujian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe</SelectItem>
                  <SelectItem value="PAS">PAS / SAS</SelectItem>
                  <SelectItem value="PTS">PTS / STS</SelectItem>
                  <SelectItem value="UH">Ulangan Harian</SelectItem>
                  <SelectItem value="TRYOUT">Try Out</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter Kelas (Khusus Supervisor / Guru) */}
              {isExecutiveSupervisor && (
                <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v || 'ALL')}>
                  <SelectTrigger className="w-full sm:w-[130px] rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        Kelas {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Filter Status Ketuntasan */}
              <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v || 'ALL')}>
                <SelectTrigger className="w-full sm:w-[130px] rounded-xl text-xs h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Ketuntasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="TUNTAS">Tuntas (≥ KKM)</SelectItem>
                  <SelectItem value="BELUM_TUNTAS">Belum Tuntas</SelectItem>
                </SelectContent>
              </Select>

              {/* Tombol Refresh */}
              <Button
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                variant="outline"
                size="sm"
                className="rounded-xl h-10 px-3 border-slate-200 dark:border-slate-800 text-xs shrink-0"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
                />
                Muat Ulang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabel Daftar Nilai Ujian Semester */}
      <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              {isExecutiveSupervisor ? 'Rekapitulasi Nilai Asesmen Sekolah' : 'Daftar Hasil Nilai Asesmen CBT'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredList.length} dari {totalUjian} catatan penilaian ujian semester
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tuntas ({persentaseKetuntasan}%)
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-rose-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Belum Tuntas
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-slate-500 font-semibold">Mengambil data nilai dari CBT MUHIPO...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center space-y-2 p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Belum Ada Catatan Nilai
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm || selectedMapel !== 'ALL' || selectedTipe !== 'ALL' || selectedClass !== 'ALL'
                  ? 'Tidak ada hasil penilaian yang sesuai dengan filter pencarian Anda.'
                  : 'Belum ada data nilai ujian CBT yang tersinkronisasi untuk kriteria ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-extrabold">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    {isExecutiveSupervisor && <TableHead>Siswa & Kelas</TableHead>}
                    <TableHead>Mata Pelajaran & Ujian</TableHead>
                    <TableHead>Guru Pengampu</TableHead>
                    <TableHead className="text-center">Tipe Ujian</TableHead>
                    <TableHead className="text-center">KKM</TableHead>
                    <TableHead className="text-right">Nilai Akhir</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {filteredList.map((item, index) => {
                    const isPassed = item.statusKetuntasan === 'TUNTAS'
                    const score = Number(item.nilaiTotal) || 0

                    return (
                      <TableRow
                        key={item.idPesertaUjian || index}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <TableCell className="text-center font-bold text-slate-400">
                          {index + 1}
                        </TableCell>
                        {isExecutiveSupervisor && (
                          <TableCell>
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                {item.namaSiswa}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-slate-500">
                                  NIS: {item.nis}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                                >
                                  Kelas {item.kelas}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 dark:text-white text-xs">
                                {item.namaMapel}
                              </span>
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px] px-1.5 py-0 border-slate-200 dark:border-slate-700"
                              >
                                {item.kodeMapel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {item.judulUjian}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                              {item.guruPengampu}
                            </span>
                            {item.nipGuru && item.nipGuru !== '-' && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                NIP: {item.nipGuru}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 ${
                              item.jenisPenilaian === 'PAS'
                                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/30'
                                : item.jenisPenilaian === 'PTS'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30'
                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30'
                            }`}
                          >
                            {item.jenisPenilaian}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                          {item.kkm}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-col items-end">
                            <span
                              className={`text-sm font-black font-mono ${
                                isPassed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {score.toFixed(1)}
                            </span>
                            {item.nilaiPG > 0 && (
                              <span className="text-[9px] text-slate-400">
                                PG: {item.nilaiPG} | Esai: {item.nilaiEsai}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={`text-[10px] font-bold gap-1 px-2.5 py-0.5 rounded-full ${
                              isPassed
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30'
                            }`}
                          >
                            {isPassed ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                            )}
                            <span>{isPassed ? 'TUNTAS' : 'REMIDI'}</span>
                          </Badge>
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
