'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Terminal, 
  Trash2, 
  RefreshCw, 
  Search, 
  Copy, 
  Check, 
  Pause, 
  Play, 
  Download,
  Filter,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface SystemLogEntry {
  id: string
  timestamp: string
  level: 'LOG' | 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE' | 'FATAL'
  context: string
  message: string
  trace?: string
  raw: string
}

export function SystemLiveConsoleViewer() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const logContainerRef = useRef<HTMLDivElement>(null)

  // Query log dari backend NestJS
  const { 
    data: logsResponse, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useQuery<{
    status: string
    total: number
    limit: number
    serverTime: string
    logs: SystemLogEntry[]
  }>({
    queryKey: ['system-live-logs', levelFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append('limit', '300')
      if (levelFilter !== 'ALL') params.append('level', levelFilter)
      if (searchQuery.trim() !== '') params.append('search', searchQuery.trim())
      return authenticatedQuery(`/api-backend/settings/system-logs?${params.toString()}`)
    },
    refetchInterval: isLiveAutoRefresh ? 3000 : false, // Poll log setiap 3 detik jika live aktif
  })

  const logs: SystemLogEntry[] = logsResponse?.logs || []

  // Auto-scroll ke paling bawah saat ada log baru
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Clear log mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/system-logs/clear', {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal membersihkan log sistem')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-live-logs'] })
      Swal.fire({
        title: 'Buffer Log Bersih!',
        text: 'Riwayat console log di memori backend berhasil dikosongkan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal membersihkan log', 'error')
    },
  })

  // Format timestamp agar selalu presisi mengikuti UTC+7 (Asia/Jakarta / WIB)
  const formatLogTimestampUtc7 = (ts: string) => {
    if (!ts) return ''
    try {
      // Jika format sudah 'YYYY-MM-DD HH:mm:ss'
      const match = ts.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/)
      if (match) {
        return `${match[1]} ${match[2]} WIB`
      }

      // Parse format tanggal ISO / timestamp lainnya
      const date = new Date(ts)
      if (isNaN(date.getTime())) {
        return ts
      }

      const datePart = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)

      const timePart = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .format(date)
        .replace(/\./g, ':')

      return `${datePart} ${timePart} WIB`
    } catch {
      return ts
    }
  }

  const handleCopyLogs = () => {
    if (!logs.length) return
    const textToCopy = logs
      .map(
        (l) =>
          `[${formatLogTimestampUtc7(l.timestamp)}] [${l.level}] [${l.context}] ${l.message}${l.trace ? `\n  Trace: ${l.trace}` : ''}`
      )
      .join('\n')
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadLogs = () => {
    if (!logs.length) return
    const textContent = logs
      .map(
        (l) =>
          `[${formatLogTimestampUtc7(l.timestamp)}] [${l.level}] [${l.context}] ${l.message}${l.trace ? `\n  Trace: ${l.trace}` : ''}`
      )
      .join('\n')
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `simasmuh-system-logs-${new Date().toISOString().substring(0, 10)}.log`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getLevelColor = (lvl: string) => {
    switch (lvl) {
      case 'ERROR':
      case 'FATAL':
        return 'text-rose-400 bg-rose-950/40 border-rose-800'
      case 'WARN':
        return 'text-amber-400 bg-amber-950/40 border-amber-800'
      case 'DEBUG':
        return 'text-sky-400 bg-sky-950/40 border-sky-800'
      case 'VERBOSE':
        return 'text-purple-400 bg-purple-950/40 border-purple-800'
      case 'LOG':
      case 'INFO':
      default:
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
    }
  }

  return (
    <Card className={`border-slate-800 bg-slate-950 text-slate-100 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all duration-200 ${
      isFullScreen ? 'fixed inset-4 z-50 rounded-2xl' : 'w-full'
    }`}>
      {/* Top Console Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                Live Console Terminal Log
              </h3>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono py-0 px-2 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isLiveAutoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {isLiveAutoRefresh ? 'Live Stream' : 'Paused'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Output proses runtime NestJS, FaceNet Bio-Fusion AI, incoming routes, dan aktivitas sistem
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Pause / Resume Stream */}
          <Button
            onClick={() => setIsLiveAutoRefresh(!isLiveAutoRefresh)}
            size="sm"
            variant="outline"
            title={isLiveAutoRefresh ? 'Jeda Stream Log' : 'Lanjutkan Stream Log'}
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
          >
            {isLiveAutoRefresh ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Jeda</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Resume</span>
              </>
            )}
          </Button>

          {/* Refresh Manual */}
          <Button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            size="sm"
            variant="outline"
            title="Muat Ulang Log"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </Button>

          {/* Auto Scroll Toggle */}
          <Button
            onClick={() => setAutoScroll(!autoScroll)}
            size="sm"
            variant="outline"
            title={autoScroll ? 'Matikan Auto Scroll' : 'Nyalakan Auto Scroll ke Bawah'}
            className={`h-8 px-2.5 text-xs font-semibold rounded-xl border-slate-700 gap-1.5 ${
              autoScroll ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Auto-Scroll</span>
          </Button>

          {/* Salin Log */}
          <Button
            onClick={handleCopyLogs}
            disabled={!logs.length}
            size="sm"
            variant="outline"
            title="Salin Semua Log ke Clipboard"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
            <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
          </Button>

          {/* Download Log File */}
          <Button
            onClick={handleDownloadLogs}
            disabled={!logs.length}
            size="sm"
            variant="outline"
            title="Unduh File Log .txt/.log"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden md:inline">Unduh</span>
          </Button>

          {/* Clear Buffer */}
          <Button
            onClick={() => {
              Swal.fire({
                title: 'Bersihkan Log Sistem?',
                text: 'Riwayat console log aktif di memori backend akan dikosongkan.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#e11d48',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Ya, Bersihkan',
                cancelButtonText: 'Batal',
              }).then((result) => {
                if (result.isConfirmed) {
                  clearMutation.mutate()
                }
              })
            }}
            disabled={clearMutation.isPending || !logs.length}
            size="sm"
            variant="outline"
            title="Bersihkan Memory Buffer Log"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-rose-900/60 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Clear</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            onClick={() => setIsFullScreen(!isFullScreen)}
            size="sm"
            variant="outline"
            title={isFullScreen ? 'Perkecil' : 'Layar Penuh'}
            className="h-8 px-2 text-xs rounded-xl border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari kata kunci di log (contoh: RouterExplorer, error, payment, auth)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-7 px-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Level</option>
              <option value="LOG">LOG / INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
              <option value="VERBOSE">VERBOSE</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span>Menampilkan: <strong className="text-emerald-400">{logs.length}</strong> baris</span>
          <span>Buffer: <strong className="text-slate-300">1000 max</strong></span>
        </div>
      </div>

      {/* Console Viewer Window */}
      <div 
        ref={logContainerRef}
        className={`p-3.5 sm:p-4 bg-slate-950 font-mono text-[11px] sm:text-xs leading-relaxed overflow-y-auto space-y-1 select-text ${
          isFullScreen ? 'h-[calc(100vh-140px)]' : 'h-[380px] sm:h-[450px]'
        }`}
      >
        {isLoading && !logs.length ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Menghubungkan ke live terminal backend...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Terminal className="w-6 h-6 text-slate-600" />
            <span>Belum ada log yang tercatat atau cocok dengan filter pencarian.</span>
          </div>
        ) : (
          logs.map((log, idx) => (
            <div 
              key={log.id || idx} 
              className="flex items-start gap-2 py-0.5 px-1.5 rounded-sm hover:bg-slate-900/80 transition-colors border-l-2 border-transparent hover:border-emerald-500"
            >
              {/* Timestamp UTC+7 Jakarta */}
              <span className="text-slate-500 shrink-0 text-[10px] sm:text-[11px] select-none font-mono">
                {formatLogTimestampUtc7(log.timestamp)}
              </span>

              {/* Level Badge */}
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 uppercase ${getLevelColor(log.level)}`}>
                {log.level}
              </span>

              {/* Context Tag */}
              <span className={`shrink-0 font-semibold ${
                log.context === 'FaceNet-AI' ? 'text-amber-400 font-bold' : 'text-cyan-400'
              }`}>
                [{log.context || 'System'}]
              </span>

              {/* Message Content */}
              <span className={`break-all flex-1 ${
                log.level === 'ERROR' || log.level === 'FATAL' 
                  ? 'text-rose-300 font-medium' 
                  : log.level === 'WARN' 
                  ? 'text-amber-200' 
                  : log.context === 'FaceNet-AI'
                  ? 'text-amber-100 font-mono'
                  : log.context === 'RouterExplorer' || log.context === 'RoutesResolver' 
                  ? 'text-emerald-300' 
                  : 'text-slate-200'
              }`}>
                {log.message}
                {log.trace && (
                  <div className="mt-1 p-2 rounded bg-rose-950/30 border border-rose-900/50 text-rose-300 text-[10px] whitespace-pre-wrap">
                    {log.trace}
                  </div>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Terminal Footer Info Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Backend API Host: <strong className="text-slate-200">http://localhost:3001</strong></span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Format: [Timestamp] [Level] [Context] Message</span>
        </div>
      </div>
    </Card>
  )
}
