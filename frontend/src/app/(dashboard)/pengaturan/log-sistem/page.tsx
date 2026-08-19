'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import {
  Database,
  Archive,
  HardDrive,
  Download,
  Eye,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Sparkles,
  Zap,
  Layers,
  ArrowDownToLine,
  FileText,
  Clock,
  ShieldCheck,
  Server,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export default function SystemLogsPage() {
  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()

  const [activeTab, setActiveTab] = useState<'archives' | 'realtime'>('archives')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArchive, setSelectedArchive] = useState<any | null>(null)
  const [previewContent, setPreviewContent] = useState<any | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [compressionAlgo, setCompressionAlgo] = useState<'GZIP_LEVEL_9' | 'BROTLI_MAX'>('GZIP_LEVEL_9')

  // Fetch Storage & Compression Stats
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['system-logs-stats'],
    queryFn: () => authenticatedQuery('/system-logs/stats'),
    refetchInterval: 30000,
  })

  // Fetch Compressed Archives from Supabase
  const { data: archivesData, isLoading: isArchivesLoading, refetch: refetchArchives } = useQuery({
    queryKey: ['system-logs-archives', categoryFilter],
    queryFn: () =>
      authenticatedQuery(
        `/system-logs/archives?category=${categoryFilter}&limit=50`,
      ),
  })

  // Fetch Real-time Logs
  const { data: realtimeLogsData, isLoading: isLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['system-logs-realtime', categoryFilter, levelFilter, searchQuery],
    queryFn: () =>
      authenticatedQuery(
        `/system-logs?category=${categoryFilter}&level=${levelFilter}&search=${encodeURIComponent(
          searchQuery,
        )}&limit=50`,
      ),
    refetchInterval: activeTab === 'realtime' ? 10000 : false,
  })

  // Manual Trigger Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: async (payload: { category: string; algorithm: string }) => {
      const res = await authenticatedFetch('/system-logs/archive-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal mengarsipkan log')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-logs-stats'] })
      queryClient.invalidateQueries({ queryKey: ['system-logs-archives'] })
      queryClient.invalidateQueries({ queryKey: ['system-logs-realtime'] })

      if (data.metrics) {
        Swal.fire({
          icon: 'success',
          title: 'Kompresi & Simpan Supabase Berhasil!',
          html: `
            <div class="text-left text-sm space-y-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p>📦 <b>Total Record:</b> ${data.metrics.totalRecords} baris log</p>
              <p>📄 <b>Ukuran Asli:</b> ${data.metrics.originalSize}</p>
              <p>🗜️ <b>Ukuran Terkompres:</b> <span class="text-emerald-600 font-bold">${data.metrics.compressedSize}</span></p>
              <p>🚀 <b>Penghematan:</b> <span class="text-emerald-600 font-bold">${data.metrics.savedBytes} (${data.metrics.compressionRatio})</span></p>
              <p>☁️ <b>Bucket Supabase:</b> <code>system-logs</code></p>
            </div>
          `,
          confirmButtonColor: '#059669',
        })
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Pemberitahuan',
          text: data.message || 'Semua log sudah terarsip rapi.',
        })
      }
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengarsipkan',
        text: err.message,
      })
    },
  })

  // Handle Download
  const handleDownload = async (archiveId: string, filename: string, decompress = false) => {
    try {
      Swal.fire({
        title: 'Mengunduh Arsip...',
        text: decompress ? 'Mendekompresi data dari Supabase...' : 'Mengunduh file terkompresi...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
        },
      })

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
      const res = await fetch(
        `http://localhost:3001/api/system-logs/archives/${archiveId}/download?decompress=${decompress}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!res.ok) throw new Error('Gagal mengunduh file log')

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = decompress ? filename.replace(/\.(gz|br)$/, '') : filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)

      Swal.close()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Download Gagal',
        text: err.message,
      })
    }
  }

  // Handle Preview
  const handlePreview = async (archive: any) => {
    setSelectedArchive(archive)
    setIsPreviewLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
      const res = await fetch(
        `http://localhost:3001/api/system-logs/archives/${archive.id}/preview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      if (!res.ok) throw new Error('Gagal membaca isi log')
      const data = await res.json()
      setPreviewContent(data.data)
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Preview Gagal',
        text: err.message,
      })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const stats = statsData || {
    supabaseStorage: { bucket: 'system-logs', status: 'ONLINE', compressionStandard: 'GZIP Level 9 / Brotli Max' },
    counts: { totalLogs: 0, unarchivedLogs: 0, archivedRecords: 0, totalArchives: 0 },
    storageMetrics: {
      formattedOriginalSize: '0 Bytes',
      formattedCompressedSize: '0 Bytes',
      formattedSavedSize: '0 Bytes',
      overallCompressionRatio: '0%',
    },
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white font-semibold">{level}</Badge>
      case 'WARN':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">{level}</Badge>
      default:
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">INFO</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      AUTH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      PRESENSI: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
      KEUANGAN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      WHATSAPP: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
      AKADEMIK: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
      SECURITY: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
      SISTEM: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    }
    return (
      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[category] || colors.SISTEM}`}>
        {category}
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-900/90 via-teal-900/80 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-7 h-7 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">Penyimpanan Log Sistem</h1>
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs">
              Supabase Storage Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-300">
            Arsip terkompresi maksimal (Gzip Level 9 / Brotli) untuk menghemat ruang dan menjamin jejak audit sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats()
              refetchArchives()
              refetchLogs()
            }}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() =>
              archiveMutation.mutate({
                category: categoryFilter,
                algorithm: compressionAlgo,
              })
            }
            disabled={archiveMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {archiveMutation.isPending ? 'Mengompresi...' : 'Kompres & Arsipkan Sekarang'}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Supabase Storage</CardTitle>
            <Server className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {stats.supabaseStorage.status}
            </div>
            <p className="text-xs text-slate-500 mt-1">Bucket: <code className="text-emerald-600 font-semibold">{stats.supabaseStorage.bucket}</code></p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Rasio Kompresi</CardTitle>
            <Zap className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.storageMetrics.overallCompressionRatio}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hemat {stats.storageMetrics.formattedSavedSize} dari ukuran asli
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Penyimpanan Terkompres</CardTitle>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.storageMetrics.formattedCompressedSize}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dari ukuran asli: <span className="line-through text-slate-400">{stats.storageMetrics.formattedOriginalSize}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-slate-500">Total Log & Arsip</CardTitle>
            <Archive className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.counts.totalArchives} <span className="text-sm font-normal text-slate-500">Berkas Arsip</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.counts.totalLogs} total baris log ({stats.counts.unarchivedLogs} belum diarsip)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <Button
            variant={activeTab === 'archives' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('archives')}
            className={activeTab === 'archives' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium' : ''}
          >
            <Archive className="w-4 h-4 mr-2" />
            Berkas Arsip Supabase ({stats.counts.totalArchives})
          </Button>
          <Button
            variant={activeTab === 'realtime' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('realtime')}
            className={activeTab === 'realtime' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Log Real-Time ({stats.counts.totalLogs})
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter Kategori"
            className="text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="AUTH">Autentikasi (AUTH)</option>
            <option value="PRESENSI">Presensi & Wajah (PRESENSI)</option>
            <option value="KEUANGAN">Keuangan & Pembayaran (KEUANGAN)</option>
            <option value="WHATSAPP">Pesan WhatsApp (WHATSAPP)</option>
            <option value="AKADEMIK">Akademik & Nilai (AKADEMIK)</option>
            <option value="SECURITY">Keamanan & Antivirus (SECURITY)</option>
            <option value="SISTEM">Sistem & Pengaturan (SISTEM)</option>
          </select>

          {/* Compression algorithm selector */}
          <select
            value={compressionAlgo}
            onChange={(e) => setCompressionAlgo(e.target.value as any)}
            aria-label="Algoritma Kompresi"
            className="text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="GZIP_LEVEL_9">Gzip Maksimal (Level 9 - Standard .gz)</option>
            <option value="BROTLI_MAX">Brotli Maksimal (Quality 11 - .br)</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Supabase Compressed Archives */}
      {activeTab === 'archives' && (
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-emerald-500" />
              Daftar Paket Log Terkompresi di Supabase Storage
            </CardTitle>
            <CardDescription>
              Setiap berkas dienkapsulasi dan dikompresi hingga 90%+ lebih kecil dari ukuran mentah aslinya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isArchivesLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Memuat berkas arsip Supabase...
              </div>
            ) : !archivesData?.items || archivesData.items.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Archive className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-medium text-slate-500">Belum ada berkas arsip terkompresi di Supabase.</p>
                <Button
                  size="sm"
                  onClick={() => archiveMutation.mutate({ category: categoryFilter, algorithm: compressionAlgo })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Buat Arsip Perdana Sekarang
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                      <th className="py-3 px-4">Nama Berkas</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Ukuran Asli</th>
                      <th className="py-3 px-4">Ukuran Terkompres</th>
                      <th className="py-3 px-4">Penghematan</th>
                      <th className="py-3 px-4">Record</th>
                      <th className="py-3 px-4">Tanggal Arsip</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {archivesData.items.map((archive: any) => (
                      <tr key={archive.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-mono text-xs text-slate-900 dark:text-white font-medium">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="truncate max-w-[220px]" title={archive.filename}>
                              {archive.filename}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getCategoryBadge(archive.category)}</td>
                        <td className="py-3 px-4 text-xs text-slate-500 line-through">
                          {archive.formattedOriginalSize}
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {archive.formattedCompressedSize}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs">
                            {archive.compressionRatio}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {archive.recordCount} baris
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(archive.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(archive)}
                              className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300"
                              title="Lihat Isi Log"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Intip
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(archive.id, archive.filename, false)}
                              className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Unduh File Terkompres (.gz/.br)"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> Unduh .gz
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(archive.id, archive.filename, true)}
                              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
                              title="Unduh Ekstrak JSON"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Real-time Live Log Stream */}
      {activeTab === 'realtime' && (
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Live Log Stream & Jejak Audit
              </CardTitle>
              <CardDescription>Aktivitas autentikasi, presensi wajah, keuangan, dan WhatsApp terkini.</CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari aksi, user, pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                aria-label="Filter Level Log"
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Semua Level</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {isLogsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Memuat log aktif...
              </div>
            ) : !realtimeLogsData?.items || realtimeLogsData.items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                Tidak ada log yang sesuai dengan filter pencarian.
              </div>
            ) : (
              <div className="space-y-2">
                {realtimeLogsData.items.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getLevelBadge(log.level)}
                        {getCategoryBadge(log.category)}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                        {log.userName && (
                          <span className="text-slate-500 font-medium">
                            • {log.userName} {log.userRole ? `(${log.userRole})` : ''}
                          </span>
                        )}
                        {log.isArchived && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            ✓ Terarsip Supabase
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed">{log.message}</p>
                      {log.details && (
                        <pre className="text-[11px] font-mono bg-slate-100 dark:bg-slate-950 p-2 rounded text-slate-600 dark:text-slate-400 overflow-x-auto max-h-24">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>

                    <div className="text-right text-slate-400 text-[11px] shrink-0">
                      <div>
                        {new Date(log.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div>{new Date(log.createdAt).toLocaleDateString('id-ID')}</div>
                      {log.ipAddress && <div className="font-mono text-[10px]">{log.ipAddress}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* JSON Viewer Modal */}
      {selectedArchive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{selectedArchive.filename}</h3>
                  <p className="text-xs text-slate-500">
                    Didekompresi on-the-fly dari Supabase Storage ({selectedArchive.formattedOriginalSize})
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedArchive(null)}>
                ✕ Tutup
              </Button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-emerald-400">
              {isPreviewLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Mendekompresi dari Supabase...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{JSON.stringify(previewContent, null, 2)}</pre>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <div className="text-xs text-slate-500 font-mono">
                SHA-256: {selectedArchive.checksumSha256?.substring(0, 24)}...
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownload(selectedArchive.id, selectedArchive.filename, false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Unduh .gz
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedArchive(null)} className="text-xs">
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
