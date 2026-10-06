'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Activity, Zap, RefreshCw, Clock, Radio, HardDrive, Users, 
  Server, DoorOpen, Laptop, LogOut, Trash2, Eye, X, Search, 
  Loader2, CheckCircle2, ShieldCheck
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useRealtimeServerClock } from '@/lib/time-sync'

interface SystemRuntimeSupervisorProps {
  isSuperadminRole?: boolean
}

export function SystemRuntimeSupervisor({ isSuperadminRole = true }: SystemRuntimeSupervisorProps) {
  const clock = useRealtimeServerClock(30000)
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  // Sesi Checkbox Selection State for Rule 16
  const [selectedSessionUserIds, setSelectedSessionUserIds] = useState<string[]>([])

  // Supervisor Metrics Query (Auto refresh realtime every 5 seconds)
  const { 
    data: supervisorData, 
    isLoading: loadingSupervisor, 
    refetch: refetchSupervisor, 
    isRefetching: refetchingSupervisor 
  } = useQuery<any>({
    queryKey: ['system-supervisor-metrics'],
    queryFn: () => authenticatedQuery('/api-backend/settings/supervisor-metrics'),
    enabled: isSuperadminRole,
    refetchInterval: 5000
  })

  // State untuk Real Live Speed Test & Ping Benchmark
  const [speedTesting, setSpeedTesting] = useState(false)
  const [speedTestStep, setSpeedTestStep] = useState<string>('')
  const [speedTestResult, setSpeedTestResult] = useState<{
    downloadSpeed: string
    uploadSpeed: string
    ping: number
    jitter: number
    clientIp: string
    ispName?: string
    serverHost: string
    timestamp: string
  } | null>(null)

  const handleRunSpeedTest = async () => {
    try {
      setSpeedTesting(true)
      setSpeedTestStep('Mendeteksi IP & ISP...')

      const pings: number[] = []
      let detectedClientIp = supervisorData?.runtime?.clientIp || '127.0.0.1'
      let detectedServerHost = window.location.host || supervisorData?.runtime?.serverHost || 'localhost:3000'
      let detectedIsp = ''

      try {
        const ipifyPromise = fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
        const ipInfoPromise = fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2500) })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)

        const [ipifyRes, ipInfoRes] = await Promise.all([ipifyPromise, ipInfoPromise])
        if (ipInfoRes?.ip) {
          detectedClientIp = ipInfoRes.ip
          if (ipInfoRes.org || ipInfoRes.isp) {
            detectedIsp = `${ipInfoRes.org || ipInfoRes.isp}${ipInfoRes.city ? ` (${ipInfoRes.city})` : ''}`
          }
        } else if (ipifyRes?.ip) {
          detectedClientIp = ipifyRes.ip
        }
      } catch {
        // Fallback ke deteksi IP backend
      }

      setSpeedTestStep('Mengukur Latensi...')
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now()
        const res = await fetch(`/api-backend/settings/network-benchmark/ping?t=${Date.now()}`, { cache: 'no-store' })
        const t1 = performance.now()
        pings.push(Math.round(t1 - t0))
        if (res.ok) {
          const pingData = await res.json()
          if ((!detectedClientIp || detectedClientIp === '127.0.0.1') && pingData.clientIp && pingData.clientIp !== '127.0.0.1') {
            detectedClientIp = pingData.clientIp
          }
          if (pingData.serverHost) detectedServerHost = pingData.serverHost
        }
      }

      if (!detectedClientIp || detectedClientIp === '127.0.0.1') {
        detectedClientIp = window.location.hostname || '127.0.0.1 (Local Host / LAN)'
      }

      const avgPing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
      const jitter = Math.max(0, Math.round(Math.max(...pings) - Math.min(...pings)))

      setSpeedTestStep('Menguji Download...')
      const dlStart = performance.now()
      const dlRes = await fetch(`/api-backend/settings/network-benchmark/download?size=1536&_t=${Date.now()}`, { cache: 'no-store' })
      const dlData = await dlRes.json()
      const dlEnd = performance.now()
      const dlDurationSec = (dlEnd - dlStart) / 1000
      const dlBytes = dlData?.sizeBytes || (1536 * 1024)
      const dlBps = (dlBytes * 8) / Math.max(0.01, dlDurationSec)
      const dlMbps = (dlBps / (1024 * 1024)).toFixed(1)

      setSpeedTestStep('Menguji Upload...')
      const dummyPayload = 'X'.repeat(768 * 1024)
      const ulStart = performance.now()
      await fetch('/api-backend/settings/network-benchmark/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dummyPayload, sizeBytes: 768 * 1024 }),
        cache: 'no-store'
      })
      const ulEnd = performance.now()
      const ulDurationSec = (ulEnd - ulStart) / 1000
      const ulBytes = 768 * 1024
      const ulBps = (ulBytes * 8) / Math.max(0.01, ulDurationSec)
      const ulMbps = (ulBps / (1024 * 1024)).toFixed(1)

      setSpeedTestResult({
        downloadSpeed: `${dlMbps} Mbps`,
        uploadSpeed: `${ulMbps} Mbps`,
        ping: Math.max(1, avgPing),
        jitter,
        clientIp: detectedClientIp,
        ispName: detectedIsp,
        serverHost: detectedServerHost,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      })
      refetchSupervisor()
    } catch (err) {
      console.error('Error running network benchmark:', err)
    } finally {
      setSpeedTesting(false)
      setSpeedTestStep('')
    }
  }

  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null)
  const [terminatingAll, setTerminatingAll] = useState<boolean>(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [deletingAllLogs, setDeletingAllLogs] = useState<boolean>(false)
  const [viewingUserSessions, setViewingUserSessions] = useState<any | null>(null)
  const [showAllSessionsModal, setShowAllSessionsModal] = useState<boolean>(false)
  const [searchSessionQuery, setSearchSessionQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')

  // Query All Sessions Modal
  const { data: allUserSessionsData, isLoading: loadingAllSessions, refetch: refetchAllSessions } = useQuery<any[]>({
    queryKey: ['supervisor-all-active-sessions'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users/all-active-sessions')
      if (!res.ok) throw new Error('Gagal memuat semua sesi')
      return res.json()
    },
    enabled: showAllSessionsModal && isSuperadminRole,
    refetchInterval: showAllSessionsModal ? 5000 : false,
  })

  // Terminate Single Session
  const handleTerminateSession = async (sessionItem: any) => {
    const result = await Swal.fire({
      title: 'Putus Sesi Pengguna?',
      html: `Putuskan sesi <strong>${sessionItem.name}</strong> (@${sessionItem.username}) pada perangkat <code>${sessionItem.device}</code>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Putus Sesi',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setTerminatingSessionId(sessionItem.id)
      const res = await authenticatedFetch(`/api-backend/users/terminate-session/${sessionItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal memutuskan sesi')

      Swal.fire({
        title: 'Sesi Diputus!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Memutuskan Sesi',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setTerminatingSessionId(null)
    }
  }

  // Terminate All Sessions
  const handleTerminateAllSessions = async () => {
    const result = await Swal.fire({
      title: 'Akhiri Semua Sesi Pengguna?',
      html: 'Tindakan ini akan <strong>mengeluarkan seluruh sesi login pengguna aktif</strong> (kecuali akun Superadmin). Lanjutkan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Akhiri Semua Sesi',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setTerminatingAll(true)
      const res = await authenticatedFetch('/api-backend/users/terminate-all-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengakhiri semua sesi')

      Swal.fire({
        title: 'Semua Sesi Diakhiri!',
        text: data.message,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) refetchAllSessions()
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Memutuskan Sesi',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setTerminatingAll(false)
    }
  }

  // Delete Single Session
  const handleDeleteSingleSession = async (sessionItem: any) => {
    const result = await Swal.fire({
      title: 'Hapus Riwayat Sesi?',
      html: `Hapus log perangkat <code>${sessionItem.device || 'Perangkat'}</code> milik <strong>${sessionItem.name || 'Pengguna'}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Data',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setDeletingSessionId(sessionItem.id)
      const res = await authenticatedFetch(`/api-backend/users/session/${sessionItem.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus riwayat sesi')

      Swal.fire({
        title: 'Riwayat Dihapus!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) refetchAllSessions()
      if (viewingUserSessions) {
        setViewingUserSessions((prev: any) => {
          if (!prev) return null
          const updated = prev.sessions.filter((s: any) => s.id !== sessionItem.id)
          if (updated.length === 0) return null
          return { ...prev, sessions: updated }
        })
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Menghapus',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setDeletingSessionId(null)
    }
  }

  // Delete All Sessions of User
  const handleDeleteUserSessions = async (userSessionItem: any) => {
    const result = await Swal.fire({
      title: 'Hapus Semua Sesi Pengguna?',
      html: `Hapus seluruh riwayat perangkat milik <strong>${userSessionItem.name}</strong> (@${userSessionItem.username})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setDeletingSessionId(userSessionItem.userId)
      const res = await authenticatedFetch(`/api-backend/users/${userSessionItem.userId}/all-sessions`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus riwayat sesi')

      Swal.fire({
        title: 'Semua Sesi Dihapus!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) refetchAllSessions()
      if (viewingUserSessions?.userId === userSessionItem.userId) {
        setViewingUserSessions(null)
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Menghapus',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setDeletingSessionId(null)
    }
  }

  // Delete All Inactive Logs
  const handleDeleteAllSessionLogs = async () => {
    const result = await Swal.fire({
      title: 'Hapus Semua Riwayat Sesi?',
      html: 'Hapus seluruh riwayat log sesi yang sudah offline dari database?<br/><span class="text-xs text-emerald-600 font-medium">&bull; Sesi pengguna yang sedang aktif dan Superadmin tetap aman terlindungi.</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Riwayat',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setDeletingAllLogs(true)
      const res = await authenticatedFetch('/api-backend/users/all-session-logs', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus riwayat sesi')

      Swal.fire({
        title: 'Riwayat Dibersihkan!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) refetchAllSessions()
      if (viewingUserSessions) setViewingUserSessions(null)
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Menghapus',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setDeletingAllLogs(false)
    }
  }

  // Bulk Delete Selected Sessions
  const handleBulkDeleteSelected = async () => {
    if (selectedSessionUserIds.length === 0) return
    const result = await Swal.fire({
      title: `Hapus ${selectedSessionUserIds.length} Sesi Terpilih?`,
      text: 'Riwayat sesi dari pengguna yang dipilih akan dihapus permanen dari database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Terpilih',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      for (const uid of selectedSessionUserIds) {
        await authenticatedFetch(`/api-backend/users/${uid}/all-sessions`, { method: 'DELETE' })
      }
      Swal.fire({
        title: 'Berhasil!',
        text: `Data sesi untuk ${selectedSessionUserIds.length} pengguna berhasil dihapus.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      setSelectedSessionUserIds([])
      refetchSupervisor()
      if (showAllSessionsModal) refetchAllSessions()
    } catch (err: any) {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  }

  if (!isSuperadminRole) return null

  const activeSessionsList = supervisorData?.taskManager?.lastActiveSessions || []
  const filteredSessions = activeSessionsList.filter((s: any) => {
    const q = searchSessionQuery.toLowerCase()
    const matchesSearch = !q || 
      s.name?.toLowerCase().includes(q) || 
      s.username?.toLowerCase().includes(q) || 
      s.role?.toLowerCase().includes(q) || 
      s.ipAddress?.toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (statusFilter === 'ONLINE') return s.isLiveOnline
    if (statusFilter === 'OFFLINE') return !s.isLiveOnline
    return true
  })

  const isAllSelected = filteredSessions.length > 0 && filteredSessions.every((s: any) => selectedSessionUserIds.includes(s.userId))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSessionUserIds([])
    } else {
      setSelectedSessionUserIds(filteredSessions.map((s: any) => s.userId).filter(Boolean))
    }
  }

  const toggleSelectRow = (userId: string) => {
    setSelectedSessionUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. SINKRONISASI TANGGAL & WAKTU SERVER */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Sinkronisasi Tanggal & Waktu Server
                  </h2>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/60 text-[10px] font-semibold py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Terkalibrasi Aktif
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standar zona waktu server <strong>UTC+7 (WIB / Asia/Jakarta)</strong> mengunci konsistensi presensi, log, dan jadwal.
                </p>
              </div>
            </div>
          </div>

          {/* Live Clock Box & Sync Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50/90 dark:bg-slate-950/80 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-xl sm:text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400 font-mono leading-none">
                {clock.timeString} <span className="text-[10px] font-sans font-semibold text-slate-500">WIB</span>
              </div>
              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {clock.dateString}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clock.reSync()
                Swal.fire({
                  title: 'Waktu Dikalibrasi!',
                  text: `Waktu sistem telah disinkronkan langsung dengan server (${clock.latency} ms).`,
                  icon: 'success',
                  timer: 1800,
                  showConfirmButton: false,
                })
              }}
              disabled={clock.isSyncing}
              className="rounded-xl border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-300 font-bold gap-1.5 text-xs h-8 px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${clock.isSyncing ? 'animate-spin' : ''}`} />
              <span>{clock.isSyncing ? 'Sinkron...' : 'Kalibrasi'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. RUNTIME & MONITORING SISTEM */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs border">
        {/* Header Runtime Monitoring */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Runtime & Monitoring Sistem
                </h2>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/60 text-[10px] font-semibold py-0">
                  Live
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Status Uptime, Latensi, RAM, Port 4 Layanan, dan Kapasitas Sistem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRunSpeedTest}
              disabled={speedTesting}
              size="sm"
              variant="outline"
              className="font-semibold text-xs rounded-xl gap-1.5 h-8 px-3 border-slate-200 dark:border-slate-700"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-500 ${speedTesting ? 'animate-bounce' : ''}`} />
              <span>{speedTesting ? 'Menguji...' : 'Bench Jaringan'}</span>
            </Button>
            <Button
              onClick={() => refetchSupervisor()}
              disabled={loadingSupervisor || refetchingSupervisor}
              variant="outline"
              size="sm"
              className="font-semibold text-xs rounded-xl gap-1.5 h-8 px-2.5 border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${refetchingSupervisor ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
          </div>
        </div>

        {/* Grid 4 Metrik Kunci */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
          {/* Uptime */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span className="font-semibold uppercase text-[10px] tracking-wider">Uptime Sistem</span>
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="my-1.5">
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {supervisorData?.runtime?.uptimeHuman || '0j 0m 0d'}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Host: {supervisorData?.runtime?.hostname || 'localhost'}
            </div>
          </div>

          {/* Latensi */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span className="font-semibold uppercase text-[10px] tracking-wider">Latensi</span>
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="my-1.5">
              <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {supervisorData?.performance?.apiLatencyMs ?? 2} ms
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              DB: {supervisorData?.performance?.dbLatencyMs ?? 1} ms ({supervisorData?.performance?.dbStatus || 'HEALTHY'})
            </div>
          </div>

          {/* Info RAM */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span className="font-semibold uppercase text-[10px] tracking-wider">Info RAM</span>
              <HardDrive className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="my-1.5">
              <div className="text-lg sm:text-xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                {supervisorData?.performance?.heapUsedMb ?? 0} MB <span className="text-xs font-normal text-slate-500">Heap</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              Free: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{supervisorData?.performance?.freeSystemMemoryGb ?? 0} GB</strong> / {supervisorData?.performance?.totalSystemMemoryGb ?? 0} GB
            </div>
          </div>

          {/* Koneksi Pengguna */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span className="font-semibold uppercase text-[10px] tracking-wider">Koneksi Pengguna</span>
              <Users className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="my-1.5">
              <div className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {supervisorData?.taskManager?.activeConnectedSessions ?? 1} <span className="text-xs font-normal text-slate-500">Sesi Aktif</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Total Terdaftar: <strong>{supervisorData?.taskManager?.totalRegisteredUsers ?? 0}</strong> Pengguna
            </div>
          </div>
        </div>

        {/* Sub-grid: Status Port 4 Layanan SIMASMUH + Bench Jaringan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Status Port Layanan */}
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Status Port 4 Layanan SIMASMUH
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(supervisorData?.taskManager?.services || [
                { name: 'Frontend Web', port: 3000, status: 'ONLINE', latencyMs: 2 },
                { name: 'Backend API', port: 3001, status: 'ONLINE', latencyMs: 2 },
                { name: 'Prisma Studio', port: 51212, status: 'ONLINE', latencyMs: 1 },
                { name: 'PostgreSQL DB', port: 54322, status: 'ONLINE', latencyMs: 2 },
              ]).map((srv: any, idx: number) => {
                const isOnline = srv.status === 'ONLINE' || srv.status === 'READY'
                return (
                  <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <div className="truncate mr-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate text-[11px]">{srv.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Port :{srv.port}</span>
                    </div>
                    {isOnline ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] font-mono px-1.5 py-0">
                        {srv.latencyMs !== undefined ? `${srv.latencyMs}ms` : 'Online'}
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 text-[10px] px-1.5 py-0">
                        Offline
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bench Jaringan Ringkas */}
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Bench Jaringan
                </span>
                {speedTestResult && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {speedTestResult.timestamp}
                  </span>
                )}
              </div>

              {speedTesting ? (
                <div className="py-3 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{speedTestStep || 'Menguji transmisi...'}</span>
                </div>
              ) : speedTestResult ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Down</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-cyan-400 font-mono">{speedTestResult.downloadSpeed}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Up</span>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">{speedTestResult.uploadSpeed}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Ping</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{speedTestResult.ping}ms</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">Jitter</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">{speedTestResult.jitter}ms</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono px-1">
                    <span className="truncate max-w-[55%]">IP: {speedTestResult.clientIp}</span>
                    <span className="truncate max-w-[40%] text-right">Host: {speedTestResult.serverHost}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2.5 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-white/50 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Klik <strong>&quot;Bench Jaringan&quot;</strong> untuk mengukur throughput & latensi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Load Kapasitas Sistem */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Kapasitas Load:</span>{' '}
                <span className="text-slate-600 dark:text-slate-400 font-mono">
                  ~{supervisorData?.performance?.loadCapacity?.estimatedMaxUsers ?? 500} Pengguna Serentak (Beban: {supervisorData?.performance?.loadCapacity?.currentLoadPercent ?? 1}%)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-500 text-[11px]">Waiting Room:</span>
              {supervisorData?.performance?.loadCapacity?.waitingRoomStatus === 'CRITICAL' ? (
                <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 text-[10px]">
                  Wajib Aktif
                </Badge>
              ) : supervisorData?.performance?.loadCapacity?.waitingRoomStatus === 'RECOMMENDED' ? (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px]">
                  Disarankan
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px]">
                  Standby (Aman)
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. SESI PENGGUNA LIVE LOG (TERSELARAS STANDAR TABEL ATURAN 15 & 16) */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs border">
        {/* Header Sesi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Sesi Pengguna Live Log
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Aktivitas perangkat & pemantauan sesi login terkini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleTerminateAllSessions}
              disabled={terminatingAll}
              variant="outline"
              size="sm"
              title="Keluarkan paksa seluruh sesi login pengguna aktif"
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 gap-1.5 shadow-2xs"
            >
              <LogOut className={`w-3 h-3 ${terminatingAll ? 'animate-spin' : ''}`} />
              <span>Akhiri Semua Sesi</span>
            </Button>
            <Button
              onClick={handleDeleteAllSessionLogs}
              disabled={deletingAllLogs}
              variant="outline"
              size="sm"
              title="Hapus seluruh data riwayat sesi semua pengguna dari database"
              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 gap-1.5 shadow-2xs"
            >
              <Trash2 className={`w-3 h-3 ${deletingAllLogs ? 'animate-spin' : ''}`} />
              <span>Hapus Semua Riwayat</span>
            </Button>
            <Button
              onClick={() => setShowAllSessionsModal(true)}
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold px-2 h-7 gap-1"
            >
              <span>Semua Sesi</span>
              <span>&rarr;</span>
            </Button>
          </div>
        </div>

        {/* Toolbar: Search & Filter Side-by-Side (Aturan 16) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sesi pengguna, nama, role, IP..."
                value={searchSessionQuery}
                onChange={(e) => setSearchSessionQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-blue-500 shrink-0"
            >
              <option value="ALL">Semua Status</option>
              <option value="ONLINE">Online Saja</option>
              <option value="OFFLINE">Offline Saja</option>
            </select>
          </div>

          {/* Bulk Action Bar saat ada item terseleksi */}
          {selectedSessionUserIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-xl text-xs">
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {selectedSessionUserIds.length} Terpilih
              </span>
              <Button
                onClick={handleBulkDeleteSelected}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Hapus
              </Button>
            </div>
          )}
        </div>

        {/* Tabel Data Responsif dengan Checkbox Seleksi */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3">Pengguna</th>
                <th className="py-2 px-3">Peran</th>
                <th className="py-2 px-3">Perangkat / IP</th>
                <th className="py-2 px-3">Aktivitas</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-center">Rincian</th>
                <th className="py-2 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-500">
                    Belum ada catatan riwayat sesi aktif yang sesuai filter
                  </td>
                </tr>
              ) : (
                filteredSessions.slice(0, 8).map((s: any, idx: number) => (
                  <tr key={s.userId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSessionUserIds.includes(s.userId)}
                        onChange={() => toggleSelectRow(s.userId)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-200">
                      {s.name}
                      <span className="text-[10px] text-slate-400 block font-normal font-mono">@{s.username || s.userId}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      {s.device || 'Desktop'}
                      <span className="text-[10px] text-slate-400 font-mono block">{s.ipAddress}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {s.lastActiveAt ? (
                        <div>
                          <span>{new Date(s.lastActiveAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {new Date(s.lastActiveAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-2 px-3">
                      {s.isLiveOnline ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Button
                        onClick={() => setViewingUserSessions(s)}
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-semibold rounded-lg border-slate-200 dark:border-slate-700 gap-1 mx-auto"
                      >
                        <Eye className="w-3 h-3 text-blue-500" />
                        <span>{s.sessions?.length || 1} Sesi</span>
                      </Button>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {s.isActive && (
                          <Button
                            onClick={() => handleTerminateSession({
                              id: s.primarySessionId || s.sessions?.[0]?.id,
                              name: s.name,
                              username: s.username,
                              device: s.device,
                            })}
                            disabled={terminatingSessionId === (s.primarySessionId || s.sessions?.[0]?.id)}
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px] font-semibold rounded-lg border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 gap-1"
                          >
                            <LogOut className={`w-3 h-3 ${terminatingSessionId === (s.primarySessionId || s.sessions?.[0]?.id) ? 'animate-spin' : ''}`} />
                            <span>Putus</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteUserSessions(s)}
                          disabled={deletingSessionId === s.userId}
                          size="sm"
                          variant="outline"
                          className="h-6 px-1.5 text-[10px] font-semibold rounded-lg border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 gap-1"
                        >
                          <Trash2 className={`w-3 h-3 ${deletingSessionId === s.userId ? 'animate-spin' : ''}`} />
                          <span>Hapus</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* POP-UP MODAL: LIHAT RINCIAN SESI PERANGKAT PENGGUNA */}
      {viewingUserSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 text-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    Rincian Sesi Perangkat
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
                      {viewingUserSessions.sessions?.length || 1} Perangkat
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pengguna: <strong className="text-slate-200">{viewingUserSessions.name}</strong> (@{viewingUserSessions.username}) &bull; Role: <strong className="text-indigo-400">{viewingUserSessions.role}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleDeleteUserSessions(viewingUserSessions)}
                  disabled={deletingSessionId === viewingUserSessions.userId}
                  variant="outline"
                  size="sm"
                  title="Hapus Seluruh Riwayat Sesi Pengguna Ini dari Database"
                  className="h-8 px-2.5 text-[11px] font-bold rounded-xl border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1.5 shadow-2xs"
                >
                  <Trash2 className={`w-3.5 h-3.5 text-rose-400 ${deletingSessionId === viewingUserSessions.userId ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Hapus Semua Sesi</span>
                </Button>
                <Button
                  onClick={() => setViewingUserSessions(null)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white rounded-xl h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {(viewingUserSessions.sessions || []).map((item: any, i: number) => (
                <div
                  key={item.id || i}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-200">{item.device}</span>
                      {item.isLiveOnline ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.isActive ? 'Offline' : 'Non-aktif'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                      <span>IP: {item.ipAddress}</span>
                      <span>&bull;</span>
                      <span>{item.browser} &bull; {item.os}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Aktivitas: {item.lastActiveAt ? `${new Date(item.lastActiveAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(item.lastActiveAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB` : '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {item.isActive && (
                      <Button
                        onClick={async () => {
                          await handleTerminateSession({
                            id: item.id,
                            name: viewingUserSessions.name,
                            username: viewingUserSessions.username,
                            device: item.device,
                          })
                          setViewingUserSessions(null)
                        }}
                        disabled={terminatingSessionId === item.id}
                        size="sm"
                        variant="outline"
                        title="Putus & Keluarkan Sesi Ini"
                        className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 gap-1"
                      >
                        <LogOut className={`w-3 h-3 text-amber-400 ${terminatingSessionId === item.id ? 'animate-spin' : ''}`} />
                        <span>Putus</span>
                      </Button>
                    )}

                    <Button
                      onClick={() => handleDeleteSingleSession({
                        id: item.id,
                        name: viewingUserSessions.name,
                        device: item.device,
                      })}
                      disabled={deletingSessionId === item.id}
                      size="sm"
                      variant="outline"
                      title="Hapus Permanen Riwayat Sesi Ini dari Database"
                      className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1"
                    >
                      <Trash2 className={`w-3 h-3 text-rose-400 ${deletingSessionId === item.id ? 'animate-spin' : ''}`} />
                      <span>Hapus Log</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <Button
                onClick={() => setViewingUserSessions(null)}
                variant="outline"
                size="sm"
                className="text-xs rounded-xl border-slate-700 text-slate-300"
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* POP-UP MODAL: LIHAT SEMUA SESI PENGGUNA */}
      {showAllSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border-slate-700 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    Semua Sesi Pengguna Terkoneksi
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      {(allUserSessionsData || []).filter(u => u.isLiveOnline).length} Online
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pengawasan seluruh sesi login pengguna aktif & riwayat sesi SIMASMUH
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleTerminateAllSessions}
                  disabled={terminatingAll}
                  size="sm"
                  variant="outline"
                  title="Keluarkan Semua Sesi Pengguna Lain yang Sedang Aktif"
                  className="h-8 px-2.5 text-xs font-bold rounded-xl border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 gap-1.5"
                >
                  <LogOut className={`w-3.5 h-3.5 text-amber-400 ${terminatingAll ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Akhiri Semua Sesi</span>
                </Button>
                <Button
                  onClick={handleDeleteAllSessionLogs}
                  disabled={deletingAllLogs}
                  size="sm"
                  variant="outline"
                  title="Hapus Seluruh Riwayat Sesi Semua Pengguna dari Database"
                  className="h-8 px-2.5 text-xs font-bold rounded-xl border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1.5"
                >
                  <Trash2 className={`w-3.5 h-3.5 text-rose-400 ${deletingAllLogs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Hapus Semua Riwayat</span>
                </Button>
                <Button
                  onClick={() => refetchAllSessions()}
                  variant="outline"
                  size="sm"
                  title="Muat Ulang Sesi"
                  className="h-8 px-2.5 text-xs rounded-xl border-slate-700 bg-slate-800 text-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAllSessions ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  onClick={() => setShowAllSessionsModal(false)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white rounded-xl h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Filter Search */}
            <div className="p-3 sm:p-4 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pengguna berdasarkan nama, username, peran, atau IP address..."
                  value={searchSessionQuery}
                  onChange={(e) => setSearchSessionQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingAllSessions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Memuat daftar semua sesi pengguna...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-3">Pengguna</th>
                        <th className="py-2 px-3">Peran</th>
                        <th className="py-2 px-3">Perangkat Utama</th>
                        <th className="py-2 px-3">IP Address</th>
                        <th className="py-2 px-3">Aktivitas Terakhir</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-center">Perangkat</th>
                        <th className="py-2 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {((allUserSessionsData || []).filter((u: any) => {
                        if (!searchSessionQuery) return true
                        const q = searchSessionQuery.toLowerCase()
                        return (
                          u.name?.toLowerCase().includes(q) ||
                          u.username?.toLowerCase().includes(q) ||
                          u.role?.toLowerCase().includes(q) ||
                          u.ipAddress?.toLowerCase().includes(q) ||
                          u.device?.toLowerCase().includes(q)
                        )
                      })).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            Tidak ditemukan data sesi pengguna yang sesuai
                          </td>
                        </tr>
                      ) : (
                        (allUserSessionsData || []).filter((u: any) => {
                          if (!searchSessionQuery) return true
                          const q = searchSessionQuery.toLowerCase()
                          return (
                            u.name?.toLowerCase().includes(q) ||
                            u.username?.toLowerCase().includes(q) ||
                            u.role?.toLowerCase().includes(q) ||
                            u.ipAddress?.toLowerCase().includes(q) ||
                            u.device?.toLowerCase().includes(q)
                          )
                        }).map((s: any, idx: number) => (
                          <tr key={s.userId || idx} className="hover:bg-slate-950/50">
                            <td className="py-2.5 px-3 font-bold text-slate-200">
                              {s.name}
                              <span className="text-[10px] text-slate-400 block font-normal font-mono">@{s.username || s.userId}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {s.role}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {s.device || 'Desktop'}
                              <span className="text-[10px] text-slate-500 block">{s.browser || 'Browser'} &bull; {s.os || 'OS'}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{s.ipAddress}</td>
                            <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                              {s.lastActiveAt ? (
                                <div>
                                  <span className="text-slate-200 font-medium block">
                                    {new Date(s.lastActiveAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(s.lastActiveAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                                  </span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {s.isLiveOnline ? (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  Offline
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                onClick={() => setViewingUserSessions(s)}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 gap-1 mx-auto"
                              >
                                <Eye className="w-3 h-3 text-cyan-400" />
                                <span>{s.sessions?.length || 1} Sesi</span>
                              </Button>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {s.isActive && (
                                  <Button
                                    onClick={async () => {
                                      await handleTerminateSession({
                                        id: s.primarySessionId || s.sessions?.[0]?.id,
                                        name: s.name,
                                        username: s.username,
                                        device: s.device,
                                      })
                                      refetchAllSessions()
                                    }}
                                    disabled={terminatingSessionId === (s.primarySessionId || s.sessions?.[0]?.id)}
                                    size="sm"
                                    variant="outline"
                                    title="Putus & Keluarkan Sesi Ini"
                                    className="h-7 px-2 text-[10px] font-bold rounded-lg border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 gap-1"
                                  >
                                    <LogOut className={`w-3 h-3 text-amber-400 ${terminatingSessionId === (s.primarySessionId || s.sessions?.[0]?.id) ? 'animate-spin' : ''}`} />
                                    <span>Putus</span>
                                  </Button>
                                )}

                                <Button
                                  onClick={() => handleDeleteUserSessions(s)}
                                  disabled={deletingSessionId === s.userId}
                                  size="sm"
                                  variant="outline"
                                  title="Hapus Permanen Seluruh Riwayat Sesi Pengguna Ini dari Database"
                                  className="h-7 px-2 text-[10px] font-bold rounded-lg border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 gap-1"
                                >
                                  <Trash2 className={`w-3 h-3 text-rose-400 ${deletingSessionId === s.userId ? 'animate-spin' : ''}`} />
                                  <span>Hapus</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Menampilkan seluruh pengguna terdaftar dengan status sesi login</span>
              <Button
                onClick={() => setShowAllSessionsModal(false)}
                variant="outline"
                size="sm"
                className="text-xs rounded-xl border-slate-700 text-slate-300"
              >
                Tutup
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
