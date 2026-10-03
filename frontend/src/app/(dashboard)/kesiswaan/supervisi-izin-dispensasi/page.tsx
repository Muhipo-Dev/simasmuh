'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ClipboardCheck,
  Award,
  Search,
  Filter,
  CalendarDays,
  Clock,
  GraduationCap,
  Loader2,
  FileImage,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface SupervisiIzinItem {
  id: string
  date: string
  waktuKeluar: string
  estimasiKembali?: string
  alasan: string
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanAdmin?: string
  createdAt: string
  userId: string
  user?: {
    id: string
    name: string
    role: string
    student?: {
      id: string
      name: string
      nis: string
      nisn: string
      class?: { name: string }
    }
  }
}

export default function SupervisiIzinKesiswaanPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'SAKIT' | 'KELUARGA' | 'DISPENSASI'>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Fetch seluruh data riwayat izin & dispensasi siswa riil dari PostgreSQL
  const { data: rawList, isLoading, refetch, isRefetching } = useQuery<SupervisiIzinItem[]>({
    queryKey: ['supervisi-kesiswaan-izin-dispensasi', filterDate],
    queryFn: async () => {
      const url = `/api-backend/izin-keluar?category=SISWA${filterDate ? `&date=${filterDate}` : ''}`
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json) ? json : []
    },
    enabled: !!session,
    staleTime: 1000 * 10,
  })

  const listData = rawList || []

  // Statistik Real-Time
  const stats = useMemo(() => {
    const total = listData.length
    const sakit = listData.filter(i => (i.alasan || '').includes('[IZIN SAKIT]')).length
    const keluarga = listData.filter(i => (i.alasan || '').includes('[IZIN KELUARGA]')).length
    const dispensasi = listData.filter(i =>
      (i.alasan || '').includes('[IZIN DISPENSASI]') ||
      (i.alasan || '').includes('[DISPENSASI') ||
      (i.alasan || '').includes('[IZIN KEGIATAN]')
    ).length
    const disetujui = listData.filter(i => i.status === 'DISETUJUI').length
    const menunggu = listData.filter(i => i.status === 'MENUNGGU').length
    const ditolak = listData.filter(i => i.status === 'DITOLAK').length

    return { total, sakit, keluarga, dispensasi, disetujui, menunggu, ditolak }
  }, [listData])

  // Filter & Search
  const filteredData = useMemo(() => {
    return listData.filter(item => {
      const isDisp =
        (item.alasan || '').includes('[IZIN DISPENSASI]') ||
        (item.alasan || '').includes('[DISPENSASI') ||
        (item.alasan || '').includes('[IZIN KEGIATAN]')
      const isSkt = (item.alasan || '').includes('[IZIN SAKIT]')
      const isKlg = (item.alasan || '').includes('[IZIN KELUARGA]')

      if (filterType === 'DISPENSASI' && !isDisp) return false
      if (filterType === 'SAKIT' && !isSkt) return false
      if (filterType === 'KELUARGA' && !isKlg) return false

      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = item.user?.name?.toLowerCase().includes(q) || false
        const matchNis = item.user?.student?.nis?.includes(q) || false
        const matchClass = item.user?.student?.class?.name?.toLowerCase().includes(q) || false
        const matchReason = item.alasan?.toLowerCase().includes(q) || false
        return matchName || matchNis || matchClass || matchReason
      }

      return true
    })
  }, [listData, filterType, filterStatus, searchQuery])

  const parseAlasanAndLampiran = (rawAlasan: string) => {
    const lampiranMatch = rawAlasan.match(/\[LAMPIRAN_SURAT\]:\s*([^\s\n]+)/)
    const lampiranUrl = lampiranMatch ? lampiranMatch[1] : null
    const cleanAlasan = rawAlasan.replace(/\n?\[LAMPIRAN_SURAT\]:\s*[^\s\n]+/, '').trim()
    return { cleanAlasan, lampiranUrl }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header Utama Supervisi Kesiswaan */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-md border border-white/10">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-blue-400/20 text-blue-200 text-[10px] px-2.5 py-0.5 rounded-full font-extrabold backdrop-blur-md border border-blue-400/30 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-300" />
              Supervisi Kesiswaan
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-300 shrink-0" />
            Supervisi Izin & Dispensasi
          </h1>
          <p className="text-blue-100 mt-0.5 text-xs">
            Monitoring perizinan harian, verifikasi dispensasi, dan log kehadiran siswa.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl h-9 px-3 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Sinkron Data
          </Button>
        </div>
      </div>

      {/* Grid Statistik Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500">Total Log Catatan</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Izin Sakit</p>
            <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{stats.sakit}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Izin Keluarga</p>
            <p className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">{stats.keluarga}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-400">Dispensasi Resmi</p>
            <p className="text-2xl font-black text-purple-800 dark:text-purple-300 mt-1">{stats.dispensasi}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Telah Disetujui</p>
            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{stats.disetujui}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Menunggu / Ditolak</p>
            <p className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">{stats.menunggu + stats.ditolak}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Bar Pencarian */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('ALL')}
                className="rounded-xl text-xs font-bold h-9"
              >
                Semua Kategori
              </Button>
              <Button
                variant={filterType === 'DISPENSASI' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('DISPENSASI')}
                className={`rounded-xl text-xs font-bold h-9 ${filterType === 'DISPENSASI' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
              >
                🏆 Dispensasi Khusus
              </Button>
              <Button
                variant={filterType === 'SAKIT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('SAKIT')}
                className={`rounded-xl text-xs font-bold h-9 ${filterType === 'SAKIT' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                🤒 Izin Sakit
              </Button>
              <Button
                variant={filterType === 'KELUARGA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('KELUARGA')}
                className={`rounded-xl text-xs font-bold h-9 ${filterType === 'KELUARGA' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                🏡 Izin Keluarga
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || 'ALL')}>
                <SelectTrigger className="w-36 h-9 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="DISETUJUI">✓ Disetujui</SelectItem>
                  <SelectItem value="MENUNGGU">⏳ Menunggu</SelectItem>
                  <SelectItem value="DITOLAK">✕ Ditolak</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-36 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari siswa, NIS, kelas, atau kegiatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900 text-xs font-medium"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabel Log Supervisi Kesiswaan */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Log Audit Rekam Izin &amp; Dispensasi ({filteredData.length} Data)
              </CardTitle>
              <CardDescription className="text-xs">
                Log riwayat perizinan aktif yang dipantau langsung oleh Waka Kesiswaan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-500">Memuat data supervisi kesiswaan...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-2">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">Tidak ada data izin atau dispensasi tercatat</p>
              <p className="text-xs text-slate-400">Seluruh rekaman presensi izin dan dispensasi siswa akan tampil di tabel ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="text-xs font-bold min-w-[180px]">Nama Siswa &amp; Kelas</TableHead>
                    <TableHead className="text-xs font-bold min-w-[140px]">Kategori &amp; Jenis</TableHead>
                    <TableHead className="text-xs font-bold min-w-[150px]">Tanggal &amp; Waktu</TableHead>
                    <TableHead className="text-xs font-bold min-w-[220px]">Alasan &amp; Bukti</TableHead>
                    <TableHead className="text-xs font-bold min-w-[120px]">Status</TableHead>
                    <TableHead className="text-xs font-bold min-w-[180px]">Catatan Verifikator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => {
                    const student = item.user?.student
                    const { cleanAlasan, lampiranUrl } = parseAlasanAndLampiran(item.alasan || '')
                    const isDisp =
                      (item.alasan || '').includes('[IZIN DISPENSASI]') ||
                      (item.alasan || '').includes('[DISPENSASI') ||
                      (item.alasan || '').includes('[IZIN KEGIATAN]')
                    const isSkt = (item.alasan || '').includes('[IZIN SAKIT]')

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <TableCell className="text-center text-xs font-mono text-slate-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {item.user?.name || 'Siswa'}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              Kelas: <strong>{student?.class?.name || '-'}</strong> &bull; NIS: {student?.nis || '-'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isDisp ? (
                            <Badge className="bg-purple-600 text-white font-bold text-[10px] gap-1 rounded-md">
                              <Award className="w-3 h-3" /> Dispensasi
                            </Badge>
                          ) : isSkt ? (
                            <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1 rounded-md">
                              🤒 Sakit
                            </Badge>
                          ) : (
                            <Badge className="bg-indigo-600 text-white font-bold text-[10px] gap-1 rounded-md">
                              🏡 Keperluan Keluarga
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {item.waktuKeluar} - {item.estimasiKembali || 'Selesai'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 max-w-sm">
                            <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2" title={cleanAlasan}>
                              {cleanAlasan}
                            </p>
                            {lampiranUrl && (
                              <a
                                href={lampiranUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800"
                              >
                                <FileImage className="w-3 h-3" /> Bukti Lampiran <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status === 'DISETUJUI' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300">
                              ✓ Disetujui
                            </Badge>
                          ) : item.status === 'DITOLAK' ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-bold text-[10px] border border-rose-300">
                              ✕ Ditolak
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold text-[10px] border border-amber-300">
                              ⏳ Menunggu
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                            {item.catatanAdmin || '-'}
                          </p>
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
