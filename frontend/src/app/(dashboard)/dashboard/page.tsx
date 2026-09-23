'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, UserSquare2, CalendarDays, ClipboardCheck, Loader2,
  Briefcase, BookOpen, UserCheck, Receipt, CreditCard, AlertTriangle,
  GraduationCap, Award, BellRing, Sparkles, ChevronDown, TrendingUp,
  TrendingDown, Wallet, Landmark, DollarSign, Activity, CheckCircle2,
  ArrowUpRight, FileText, FileCheck, PieChart, ShieldAlert, BarChart3, Clock,
  ArrowRight, ShieldCheck, Mail, Contact, Package, Settings, DoorOpen, HeartHandshake, Megaphone, Camera, CornerDownRight,
  Server, Cpu, HardDrive, Zap, Network, RefreshCw, Radio, Terminal, Laptop, Globe, Check, Key, Send, LogOut, Lock, Eye, Monitor, Smartphone, X, Search, Trash2, Banknote, PenTool
} from 'lucide-react'
import PaymentBillingPopup from '@/components/student/PaymentBillingPopup'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { getRoleLinks } from '@/lib/nav-links'
import { UserAccountCard } from '@/components/dashboard/UserAccountCard'
import { CenterQuickAccessGrid } from '@/components/dashboard/CenterQuickAccessGrid'
import { SystemInfoWidget } from '@/components/dashboard/SystemInfoWidget'
import { UrgentAnnouncementPopup } from '@/components/dashboard/UrgentAnnouncementPopup'
import { ActivityCalendarWidget } from '@/components/dashboard/ActivityCalendarWidget'
import { NewsArticleListWidget } from '@/components/dashboard/NewsArticleListWidget'
import { StudentDashboard } from '@/components/dashboard/StudentDashboard'
import { PrayerTimesWidget } from '@/components/dashboard/PrayerTimesWidget'
import { SignaturePadDialog } from '@/components/dashboard/SignaturePadDialog'
import { ExecutiveStatsPanel } from '@/components/dashboard/ExecutiveStatsPanel'

import { useRealtimeServerClock } from '@/lib/time-sync'

const formatProgramName = (code?: string | null) => {
  if (!code) return 'Reguler'
  const c = code.toLowerCase()
  if (c === 'mic') return 'Muhipo Internasional'
  if (c === 'tahfidz') return 'Tahfidz'
  if (c === 'olahraga') return 'Olahraga'
  if (c === 'kader') return 'Kader'
  if (c === 'inklusi') return 'Inklusi'
  if (c === 'enterpreneur' || c === 'entrepreneur') return 'Entrepreneur'
  return code.charAt(0).toUpperCase() + code.slice(1)
}

const parseTimeToMinutes = (t: string | undefined | null): number => {
  if (!t) return 0
  const clean = t.replace('.', ':').trim()
  const parts = clean.split(':')
  const hours = parseInt(parts[0] || '0', 10) || 0
  const minutes = parseInt(parts[1] || '0', 10) || 0
  return hours * 60 + minutes
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const clock = useRealtimeServerClock(30000)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const role = (session?.user as any)?.role || 'GURU'
  const subRole = (session?.user as any)?.subRole
  const subRole2 = (session?.user as any)?.subRole2
  const subRole3 = (session?.user as any)?.subRole3
  const userId = (session?.user as any)?.id
  const authenticatedQuery = useAuthenticatedQuery()

  const hasRole = (targetRole: string) => role === targetRole || subRole === targetRole || subRole2 === targetRole || subRole3 === targetRole
  const hasAnyRole = (roles: string[]) => roles.some(hasRole)

  const { data: myHistory, isLoading: loadingHistory } = useQuery<any[]>({
    queryKey: ['attendance-history', userId],
    queryFn: () => userId ? authenticatedQuery(`/api-backend/daily-attendances/history?userId=${userId}`) : Promise.resolve([]),
    enabled: !!userId
  })

  const { data: students, isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: () => authenticatedQuery('/api-backend/students')
  })

  const { data: classes, isLoading: loadingClasses } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: () => authenticatedQuery('/api-backend/classes')
  })

  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['schedules', userId, role, subRole, subRole2, subRole3],
    queryFn: () => {
      const isTeacherOnly = (role === 'GURU' || subRole === 'GURU' || subRole2 === 'GURU' || subRole3 === 'GURU') && role !== 'SUPERADMIN'
      const url = userId && isTeacherOnly ? `/api-backend/schedules?userId=${userId}` : '/api-backend/schedules'
      return authenticatedQuery(url)
    }
  })

  const { data: attendances, isLoading: loadingAttendances } = useQuery<any[]>({
    queryKey: ['attendances'],
    queryFn: () => authenticatedQuery('/api-backend/attendances')
  })

  const { data: announcements, isLoading: loadingAnnouncements } = useQuery<any[]>({
    queryKey: ['announcements', role, subRole, subRole2, subRole3],
    queryFn: () => authenticatedQuery(`/api-backend/announcements/dashboard?role=${role}&subRole=${subRole || ''}&subRole2=${subRole2 || ''}&subRole3=${subRole3 || ''}`)
  })

  const { data: systemAnnouncements, isLoading: loadingSystemAnnouncements } = useQuery<any[]>({
    queryKey: ['system-announcements-dashboard', role, subRole, subRole2, subRole3],
    queryFn: () => authenticatedQuery(`/api-backend/system-announcements/dashboard?role=${role}&subRole=${subRole || ''}&subRole2=${subRole2 || ''}&subRole3=${subRole3 || ''}`)
  })

  const { data: settings } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => authenticatedQuery('/api-backend/users'),
    enabled: role !== 'SISWA'
  })

  const { data: subjects, isLoading: loadingSubjects } = useQuery<any[]>({
    queryKey: ['subjects'],
    queryFn: () => authenticatedQuery('/api-backend/subjects'),
    enabled: role !== 'SISWA'
  })

  const { data: todayStaffAttendances, isLoading: loadingStaffAttendances } = useQuery<any[]>({
    queryKey: ['staff-attendances-today'],
    queryFn: () => authenticatedQuery('/api-backend/daily-attendances/today'),
    enabled: role !== 'SISWA'
  })

  const [selectedChildIdx, setSelectedChildIdx] = useState(0)
  const [selectedStatCategory, setSelectedStatCategory] = useState<string>('SEMUA')
  const [selectedCurveType, setSelectedCurveType] = useState<'PRESENSI' | 'KEUANGAN' | 'PRESTASI' | 'DEMOGRAFI'>('PRESENSI')
  const [showAllKsMenus, setShowAllKsMenus] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [showExecutiveStats, setShowExecutiveStats] = useState(false)

  // Query untuk tagihan siswa (khusus siswa & wali murid)
  const { data: studentTagihans } = useQuery<{
    student: any;
    tagihans: any[];
  }>({
    queryKey: ['my-tagihans'],
    queryFn: () => authenticatedQuery('/api-backend/finance/my-tagihan'),
    enabled: role === 'SISWA' || role === 'WALI_MURID',
  })

  // Data Siswa Terhubung khusus untuk Akun Orang Tua / Wali Murid
  const { data: connectedStudentsData } = useQuery({
    queryKey: ['my-connected-students'],
    queryFn: () => authenticatedQuery('/api-backend/master-data/parents/my-students'),
    enabled: role === 'WALI_MURID',
  })

  // Query khusus Dashboard Wali Murid
  const { data: parentDashboard } = useQuery<any>({
    queryKey: ['parent-my-dashboard'],
    queryFn: () => authenticatedQuery('/api-backend/parents/my-dashboard'),
    enabled: role === 'WALI_MURID'
  })

  // Query Khusus Dashboard Eksekutif & Statistika Lengkap Kepala Sekolah / Keuangan Penuh
  const isKepalaSekolah = role === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH' || subRole2 === 'KEPALA_SEKOLAH' || subRole3 === 'KEPALA_SEKOLAH'
  const isKeuanganAll = [role, subRole, subRole2, subRole3, (session?.user as any)?.subRole4, (session?.user as any)?.subRole5].includes('KEUANGAN_ALL') || role === 'SUPERVISOR_KEUANGAN'
  const isKeuanganMasuk = [role, subRole, subRole2, subRole3].includes('KEUANGAN_MASUK')
  const isKeuanganKeluar = [role, subRole, subRole2, subRole3].includes('KEUANGAN_KELUAR')
  const isExecOrFinAll = isKepalaSekolah || isKeuanganAll || isKeuanganMasuk || isKeuanganKeluar
  const { data: execStats, isLoading: loadingExecStats } = useQuery<any>({
    queryKey: ['executive-statistics'],
    queryFn: () => authenticatedQuery('/api-backend/settings/executive-statistics'),
    enabled: isExecOrFinAll || role === 'SUPERADMIN' || role === 'ADMIN_IT'
  })

  // Query Khusus Supervisor Task Manager & Real-Time Runtime Metrik (Superadmin & Admin IT)
  const isSuperadminRole = role === 'SUPERADMIN' || role === 'ADMIN_IT' || subRole === 'SUPERADMIN' || subRole === 'ADMIN_IT'
  const { data: supervisorData, isLoading: loadingSupervisor, refetch: refetchSupervisor, isRefetching: refetchingSupervisor } = useQuery<any>({
    queryKey: ['system-supervisor-metrics'],
    queryFn: () => authenticatedQuery('/api-backend/settings/supervisor-metrics'),
    enabled: isSuperadminRole,
    refetchInterval: 5000 // Auto refresh realtime setiap 5 detik
  })

  // State untuk Real Live Speed Test & Ping Benchmark (Client PC/IP -> Server SIMASMUH)
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
      setSpeedTestStep('Mendeteksi IP & ISP Pengakses...')

      // 1. PING & JITTER BENCHMARK (Client browser -> Server SIMASMUH endpoint)
      const pings: number[] = []
      let detectedClientIp = supervisorData?.runtime?.clientIp || '127.0.0.1'
      let detectedServerHost = window.location.host || supervisorData?.runtime?.serverHost || 'localhost:3000'
      let detectedIsp = ''

      // Deteksi IP Klien / Jaringan ISP Pengguna Aktif Langsung dari Browser
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

      setSpeedTestStep('Mengukur Latensi & Jitter...')
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

      // Jika masih localhost di jaringan local / Wi-Fi, tampilkan informasi host/jaringan lokal
      if (!detectedClientIp || detectedClientIp === '127.0.0.1') {
        detectedClientIp = window.location.hostname || '127.0.0.1 (Local Host / LAN)'
      }

      const avgPing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
      const jitter = Math.max(0, Math.round(Math.max(...pings) - Math.min(...pings)))

      // 2. DOWNLOAD SPEED BENCHMARK (Mengunduh chunk data nyata dari backend SIMASMUH)
      setSpeedTestStep('Menguji Throughput Unduh (Download)...')
      const dlStart = performance.now()
      const dlRes = await fetch(`/api-backend/settings/network-benchmark/download?size=1536&_t=${Date.now()}`, { cache: 'no-store' })
      const dlData = await dlRes.json()
      const dlEnd = performance.now()
      const dlDurationSec = (dlEnd - dlStart) / 1000
      const dlBytes = dlData?.sizeBytes || (1536 * 1024)
      const dlBps = (dlBytes * 8) / Math.max(0.01, dlDurationSec)
      const dlMbps = (dlBps / (1024 * 1024)).toFixed(1)

      // 3. UPLOAD SPEED BENCHMARK (Mengunggah payload data nyata ke backend SIMASMUH)
      setSpeedTestStep('Menguji Throughput Unggah (Upload)...')
      const dummyPayload = 'X'.repeat(768 * 1024) // 768 KB payload
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
      console.error('Error running real network speedtest:', err)
    } finally {
      setSpeedTesting(false)
      setSpeedTestStep('')
    }
  }

  const authenticatedFetch = useAuthenticatedFetch()
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [viewingUserSessions, setViewingUserSessions] = useState<any | null>(null)
  const [showAllSessionsModal, setShowAllSessionsModal] = useState<boolean>(false)
  const [searchSessionQuery, setSearchSessionQuery] = useState<string>('')

  // Query Semua Sesi Pengguna untuk Modal "Lihat Semua Sesi"
  const { data: allUserSessionsData, isLoading: loadingAllSessions, refetch: refetchAllSessions } = useQuery<any[]>({
    queryKey: ['supervisor-all-active-sessions'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users/all-active-sessions')
      if (!res.ok) throw new Error('Gagal memuat semua sesi')
      return res.json()
    },
    enabled: showAllSessionsModal && isSuperadminRole,
    refetchInterval: showAllSessionsModal ? 5000 : false, // Auto refresh setiap 5 detik saat modal terbuka
  })

  // Handler Supervisor: Putus & Akhiri Sesi Pengguna Tertentu
  const handleTerminateSession = async (sessionItem: any) => {
    const result = await Swal.fire({
      title: 'Putus Sesi Pengguna?',
      html: `Apakah Anda yakin ingin memutuskan dan mengeluarkan sesi <strong>${sessionItem.name}</strong> (@${sessionItem.username}) pada perangkat <code>${sessionItem.device}</code>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
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
        title: 'Sesi Berhasil Diakhiri!',
        text: data.message,
        icon: 'success',
        timer: 2500,
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

  const [terminatingAll, setTerminatingAll] = useState<boolean>(false)

  // Handler Supervisor: Putus & Akhiri Semua Sesi Pengguna Sekaligus (Kecuali Superadmin)
  const handleTerminateAllSessions = async () => {
    const result = await Swal.fire({
      title: 'Akhiri Semua Sesi Pengguna?',
      html: 'Tindakan ini akan <strong>mengeluarkan (force logout) seluruh sesi login pengguna</strong> yang sedang aktif di sistem SIMASMUH (kecuali seluruh akun Superadmin). Lanjutkan?',
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
        title: 'Semua Sesi Berhasil Diakhiri!',
        text: data.message,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) {
        refetchAllSessions()
      }
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Memutuskan Semua Sesi',
        text: err?.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
      })
    } finally {
      setTerminatingAll(false)
    }
  }

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  // Handler Superadmin: Hapus Permanen Riwayat Sesi Tertentu dari Database
  const handleDeleteSingleSession = async (sessionItem: any) => {
    const result = await Swal.fire({
      title: 'Hapus Riwayat Sesi?',
      html: `Hapus permanen riwayat sesi perangkat <code>${sessionItem.device || 'Perangkat'}</code> milik <strong>${sessionItem.name || 'Pengguna'}</strong> dari database?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#475569',
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
        title: 'Riwayat Sesi Dihapus!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) {
        refetchAllSessions()
      }
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

  // Handler Superadmin: Hapus Seluruh Riwayat Sesi Pengguna Tertentu dari Database
  const handleDeleteUserSessions = async (userSessionItem: any) => {
    const result = await Swal.fire({
      title: 'Hapus Semua Sesi Pengguna?',
      html: `Hapus seluruh data riwayat sesi perangkat milik <strong>${userSessionItem.name}</strong> (@${userSessionItem.username}) secara permanen dari database?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#475569',
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
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus seluruh sesi')

      Swal.fire({
        title: 'Semua Sesi Dihapus!',
        text: data.message,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) {
        refetchAllSessions()
      }
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

  const [deletingAllLogs, setDeletingAllLogs] = useState<boolean>(false)

  // Handler Superadmin: Hapus Riwayat Sesi Pengguna dari Database (Kecuali Pengguna Aktif & Superadmin)
  const handleDeleteAllSessionLogs = async () => {
    const result = await Swal.fire({
      title: 'Hapus Semua Riwayat Sesi?',
      html: 'Tindakan ini akan <strong>menghapus seluruh riwayat log sesi yang sudah offline / tidak aktif</strong> dari database.<br/><br/><span class="text-xs text-emerald-400 font-medium">&bull; Sesi pengguna yang sedang aktif (online) dan Superadmin tetap aman terlindungi.</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#475569',
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
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus seluruh riwayat sesi')

      Swal.fire({
        title: 'Riwayat Sesi Dibersihkan!',
        text: data.message,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
      })
      refetchSupervisor()
      if (showAllSessionsModal) {
        refetchAllSessions()
      }
      if (viewingUserSessions) {
        setViewingUserSessions(null)
      }
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

  // Handler Supervisor: Kirim Link Reset Password Resmi via WhatsApp (SOP Troubleshooting)
  const handleSendResetPassword = async (sessionItem: any) => {
    const result = await Swal.fire({
      title: 'Kirim Link Reset Password?',
      html: `SOP Bantuan Troubleshooting:<br/>Kirimkan tautan reset password resmi langsung ke nomor WhatsApp <strong>${sessionItem.name}</strong> (@${sessionItem.username})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Kirim Link WhatsApp',
      cancelButtonText: 'Batal'
    })

    if (!result.isConfirmed) return

    try {
      setResettingUserId(sessionItem.userId)
      const res = await authenticatedFetch(`/api-backend/users/${sessionItem.userId}/send-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal mengirim link reset')

      Swal.fire({
        title: 'Link Reset Terkirim!',
        html: `Tautan pemulihan sandi berhasil digenerate dan dikirim via WhatsApp ke <strong>${data.recipientName}</strong> (${data.targetPhone}).<br/><br/><small class="text-slate-500 font-mono text-[11px] block mt-1 break-all bg-slate-100 dark:bg-slate-800 p-2 rounded">${window.location.origin}${data.resetUrl}</small>`,
        icon: 'success',
      })
      refetchSupervisor()
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Mengirim Link',
        text: err?.message || 'Terjadi kesalahan saat memproses link reset.',
        icon: 'error',
      })
    } finally {
      setResettingUserId(null)
    }
  }


  // Query Khusus Dispensasi Siswa untuk Verifikasi Kepala Sekolah
  const { data: dispensasiList, refetch: refetchDispensasi } = useQuery<any[]>({
    queryKey: ['dispensasi-siswa-all'],
    queryFn: async () => {
      const res = await authenticatedQuery('/api-backend/izin-keluar?category=SISWA')
      if (Array.isArray(res)) {
        return res.filter((i: any) => 
          i.alasan?.includes('[IZIN DISPENSASI]') || 
          i.alasan?.includes('[DISPENSASI') || 
          i.alasan?.includes('[IZIN KEGIATAN]')
        )
      }
      return []
    },
    enabled: isKepalaSekolah || role === 'SUPERADMIN'
  })

  const [approvingDispId, setApprovingDispId] = useState<string | null>(null)

  const handleApproveDispensasi = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setApprovingDispId(id)
      const res = await authenticatedQuery(`/api-backend/izin-keluar/${id}/${action === 'APPROVE' ? 'approve' : 'reject'}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catatanAdmin: action === 'APPROVE' ? 'Disetujui oleh Kepala Sekolah' : 'Ditolak oleh Kepala Sekolah' })
      })
      refetchDispensasi()
    } catch (e) {
      console.error(e)
    } finally {
      setApprovingDispId(null)
    }
  }

  const isLoading = loadingStudents || loadingClasses || loadingSchedules || loadingAttendances || loadingAnnouncements || (role !== 'SISWA' && (loadingUsers || loadingSubjects || loadingStaffAttendances))

  const todayDayOfWeek = new Date().getDay()
  const todaySchedules = (schedules || [])
    .filter(s => {
      if (s.dayOfWeek !== todayDayOfWeek) return false;
      if (role === 'SUPERADMIN') return true;
      if (role === 'GURU' || subRole === 'GURU' || subRole2 === 'GURU' || subRole3 === 'GURU') {
        return s?.teacher?.userId === userId || s?.teacher?.user?.email === session?.user?.email || (s?.teacher?.user?.username && s?.teacher?.user?.username === (session?.user as any)?.username);
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = parseTimeToMinutes(a.startTime)
      const timeB = parseTimeToMinutes(b.startTime)
      if (timeA !== timeB) return timeA - timeB
      return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime)
    })

  const hadirCount = (attendances || []).filter(a => a.status === 'HADIR').length
  const attendancePercentage = attendances && attendances.length > 0
    ? Math.round((hadirCount / attendances.length) * 100)
    : 0

  const totalPegawai = (users || []).filter(u => u.role !== 'SISWA').length
  const totalMapel = (subjects || []).length

  const hadirStaffCount = Array.isArray(todayStaffAttendances) ? todayStaffAttendances.filter((a: any) => a.status === 'HADIR').length : 0
  const staffAttendancePercentage = totalPegawai > 0
    ? Math.min(100, Math.round((hadirStaffCount / totalPegawai) * 100))
    : 0

  const stats = [
    {
      title: 'Total Siswa',
      value: students?.length || 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/20',
      border: 'border-blue-200/80 dark:border-blue-400/30',
      glow: 'from-blue-500/10 to-indigo-500/10'
    },
    {
      title: 'Total Pegawai',
      value: totalPegawai,
      icon: Briefcase,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-500/20',
      border: 'border-teal-200/80 dark:border-teal-400/30',
      glow: 'from-teal-500/10 to-emerald-500/10'
    },
    {
      title: 'Total Kelas',
      value: classes?.length || 0,
      icon: UserSquare2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/20',
      border: 'border-emerald-200/80 dark:border-emerald-400/30',
      glow: 'from-emerald-500/10 to-teal-500/10'
    },
    {
      title: 'Total Mapel',
      value: totalMapel,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/20',
      border: 'border-indigo-200/80 dark:border-indigo-400/30',
      glow: 'from-indigo-500/10 to-purple-500/10'
    },
    {
      title: 'Jadwal Hari Ini',
      value: todaySchedules.length,
      icon: CalendarDays,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/20',
      border: 'border-amber-200/80 dark:border-amber-400/30',
      glow: 'from-amber-500/10 to-orange-500/10'
    },
    {
      title: 'Kehadiran Siswa',
      value: `${attendancePercentage}%`,
      icon: ClipboardCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/20',
      border: 'border-purple-200/80 dark:border-purple-400/30',
      glow: 'from-purple-500/10 to-pink-500/10'
    },
    {
      title: 'Kehadiran Guru & Karyawan',
      value: `${staffAttendancePercentage}%`,
      icon: UserCheck,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-500/20',
      border: 'border-rose-200/80 dark:border-rose-400/30',
      glow: 'from-rose-500/10 to-red-500/10'
    },
  ]

  const adminStats = [
    stats[0], // Total Siswa
    stats[2], // Total Kelas
    stats[3], // Total Mapel
    stats[6], // Kehadiran Guru & Karyawan
    stats[5], // Kehadiran Siswa
  ]

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mr-2 text-blue-600" />
        Memuat Data Dashboard...
      </div>
    )
  }

  const renderAttendanceLog = (isStudent = false) => (
    <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xs w-full flex flex-col rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-3.5 sm:p-4 pb-2.5 shrink-0 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            Log Absensi (30 Hari Terakhir)
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Riwayat kehadiran harian pegawai/guru
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[360px] p-3 sm:p-3.5">
        {loadingHistory ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : !myHistory || myHistory.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-1 text-xs">
            Belum ada data absensi tercatat
          </div>
        ) : (
          <div className="space-y-2">
            {myHistory.map((log: any, i: number) => (
              <div key={i} className="p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 space-y-1 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                    log.status === 'HADIR'
                      ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div className="flex gap-2.5 flex-wrap pt-0.5 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Masuk: {log.checkInTime || log.time || '-'}
                  </span>
                  {!isStudent && (
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                      Pulang: {log.checkOutTime || <span className="text-slate-400 dark:text-slate-500">Belum</span>}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderAnnouncements = () => (
    <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs w-full h-full rounded-2xl overflow-hidden flex flex-col">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 pb-4 shrink-0 flex flex-row items-center gap-4">
        {settings?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-md" />
        )}
        <div>
          <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
            Informasi dan Berita Sekolah
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
            Berita dan pengumuman terbaru untuk Anda
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-y-auto max-h-[460px]">
        <div className="space-y-6">
          {loadingAnnouncements ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : !announcements || announcements.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-2">
              Belum ada informasi atau agenda terbaru
            </div>
          ) : (
            announcements.map((news: any, i: number) => (
              <div key={news.id || i} className="relative pl-5 border-l-[3px] border-indigo-200 dark:border-indigo-700 py-0.5">
                <div className={`absolute w-3 h-3 rounded-full -left-[7.5px] top-1.5 border-2 border-white dark:border-slate-900 ring-2 ring-slate-50 dark:ring-slate-800 ${news.type === 'AGENDA' ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                <div className="text-xs font-bold tracking-wider uppercase mb-1 flex justify-between items-center">
                  <span className={news.type === 'AGENDA' ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}>{news.type}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal capitalize text-[11px]">{news.author?.name || 'Sistem'}</span>
                </div>
                {news.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={news.image} alt={news.title} className="w-full h-36 object-cover rounded-xl mb-3 shadow-xs border border-slate-100 dark:border-slate-800" />
                )}
                <h4 className="font-bold text-slate-900 dark:text-white leading-snug mb-1.5 text-base">{news.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2 leading-relaxed">{news.content}</p>
                {news.type === 'AGENDA' && news.eventDate && (
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center bg-orange-50 dark:bg-orange-950/80 w-fit px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900 shadow-2xs">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                    {new Date(news.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (role === 'SISWA') {
    const activeStudent = (Array.isArray(students) ? students : []).find((s: any) =>
      s.userId === userId ||
      (s.user && (s.user.id === userId || s.user.username === (session?.user as any)?.username || s.user.email === session?.user?.email)) ||
      s.nisn === (session?.user as any)?.username ||
      s.nis === (session?.user as any)?.username ||
      s.nisn === session?.user?.email ||
      s.nis === session?.user?.email
    )
    const studentClass = (Array.isArray(classes) ? classes : []).find((c: any) => c.id === activeStudent?.classId) || activeStudent?.class || (classes && classes.length > 0 ? classes[0] : null)
    
    // Classmates in the same class
    const classmates = (Array.isArray(students) ? students : []).filter((s: any) => s.classId === studentClass?.id)

    return (
      <StudentDashboard
        session={session}
        activeStudent={activeStudent}
        studentClass={studentClass}
        classmates={classmates}
        schedules={schedules || []}
        grades={activeStudent?.grades || []}
        dailyAttendanceHistory={myHistory || []}
        studentTagihans={studentTagihans}
        announcements={announcements || []}
        systemAnnouncements={systemAnnouncements || []}
        clock={clock}
      />
    )
  }

  // ============================================================
  // DASHBOARD WALI MURID (Orang Tua / Wali Siswa)
  // ============================================================
  if (role === 'WALI_MURID') {
    const parentStudents = parentDashboard?.students || []
    const activeStudent = parentStudents[selectedChildIdx] || parentStudents[0]
    const studentClass = activeStudent ? { name: activeStudent.className } : null

    // Tagihan belum lunas siswa aktif
    const allUnpaid = (activeStudent?.unpaidTagihans || []).filter((t: any) => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN')
    const totalUnpaidAmount = allUnpaid.reduce((sum: number, tagihan: any) => sum + Math.max(0, tagihan.amount - (tagihan.amountPaid || 0)), 0)

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount)

    const todayDayIndex = new Date().getDay()
    const daysMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    const myClassSchedules = (activeStudent?.schedules || [])
      .sort((a: any, b: any) => {
        const aIsToday = a.dayOfWeek === todayDayIndex ? 0 : 1
        const bIsToday = b.dayOfWeek === todayDayIndex ? 0 : 1
        if (aIsToday !== bIsToday) return aIsToday - bIsToday
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
        const timeA = parseTimeToMinutes(a.startTime)
        const timeB = parseTimeToMinutes(b.startTime)
        if (timeA !== timeB) return timeA - timeB
        return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime)
      })

    const parentNavLinks = getRoleLinks(role, subRole, subRole2, subRole3).filter(link => link.href !== '/dashboard')

    return (
      <div className="space-y-3.5 sm:space-y-4 w-full">
        {/* Banner Welcome Header Wali Murid & Selektor Siswa */}
        <div className="bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 w-full border border-white/10">
          <div>
            <h1 className="text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold">{clock.greeting} 👋,</span>
              <span className="font-extrabold italic">{(session?.user as any)?.name || 'Bapak/Ibu Wali Murid'}</span>
            </h1>
            <p className="text-indigo-100 mt-0.5 text-xs font-medium">
              Portal Pemantauan Terpadu Wali Murid SIMASMUH SMA Muhammadiyah 1 Ponorogo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {parentStudents.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChildIdx}
                  onChange={(e) => setSelectedChildIdx(parseInt(e.target.value, 10))}
                  aria-label="Pilih Siswa"
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold text-xs h-8 px-2.5 py-1 pr-7 rounded-xl border border-indigo-300 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  {parentStudents.map((st: any, idx: number) => (
                    <option key={st.id || idx} value={idx}>
                      {st.name} ({st.className})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {activeStudent && (
              <Badge className="bg-white/20 text-white font-bold text-[11px] px-2.5 py-0.5">
                Siswa: {activeStudent.name} (Kelas {activeStudent.className || '-'})
              </Badge>
            )}

            {allUnpaid.length > 0 && (
              <Button
                onClick={() => setShowPaymentPopup(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 rounded-xl shadow-xs"
                size="sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" />
                {allUnpaid.length} Tagihan
              </Button>
            )}
          </div>
        </div>

        {/* JADWAL SHOLAT & KHGT MUHAMMADIYAH REALTIME BANNER */}
        <PrayerTimesWidget variant="banner" />

        {/* 3-AREA DASHBOARD LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          {/* AREA KIRI: INFO AKUN & INFORMASI SISTEM */}
          <div className="md:col-span-1 xl:col-span-3 space-y-3.5 sm:space-y-4">
            <UserAccountCard
              role={role}
              activeStudent={activeStudent}
              profileAvatarUrl={(session?.user as any)?.avatarUrl}
            />
            <SystemInfoWidget announcements={systemAnnouncements} limit={3} />
          </div>

          {/* AREA TENGAH: TOMBOL AKSES CEPAT & WIDGET MONITORING */}
          <div className="md:col-span-2 xl:col-span-6 space-y-3.5 sm:space-y-4 order-first md:order-none">
            {/* Quick Access Tile Grid */}
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Menu Akses Cepat Wali Murid
              </h3>
              <CenterQuickAccessGrid links={parentNavLinks} role={role} />
            </div>

            {/* Monitoring Ringkasan Etika Tatib & Jadwal Siswa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Adab & Karakter Siswa */}
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900 shadow-2xs rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Poin Karakter & Adab
                    </span>
                    <Badge variant="outline" className="text-[9.5px] bg-emerald-50 text-emerald-700 border-emerald-300 px-1.5 py-0">
                      Live
                    </Badge>
                  </div>
                  <div className="flex items-center justify-around text-center py-1">
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Poin Tatib</span>
                      <span className="text-xl font-black text-emerald-600">
                        {activeStudent?.etikaTataTertib?.kedisiplinanScore ?? 100}
                      </span>
                    </div>
                    <div className="border-r border-slate-100 dark:border-slate-800 h-7" />
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Amalan Ibadah</span>
                      <span className="text-xl font-black text-teal-600">
                        {activeStudent?.etikaTataTertib?.ibadahGrade || 'A'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link href="/akademik/etika-tatib" className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-[11px] font-bold h-7 rounded-lg">
                    Buku Saku &rarr;
                  </Button>
                </Link>
              </Card>

              {/* Status Kehadiran Siswa */}
              <Card className="border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900 shadow-2xs rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                      Status Presensi & Izin
                    </span>
                    <Badge variant="outline" className="text-[9.5px] bg-blue-50 text-blue-700 border-blue-300 px-1.5 py-0">
                      Harian
                    </Badge>
                  </div>
                  <div className="flex items-center justify-around text-center py-1">
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Presensi Bulan Ini</span>
                      <span className="text-xl font-black text-blue-600">
                        {activeStudent?.attendances?.length || 0} Hari
                      </span>
                    </div>
                    <div className="border-r border-slate-100 dark:border-slate-800 h-7" />
                    <div>
                      <span className="text-[9.5px] text-slate-400 font-bold block uppercase">Izin Sakit/Lain</span>
                      <span className="text-xl font-black text-amber-600">
                        0
                      </span>
                    </div>
                  </div>
                </div>
                <Link href="/presensi/kehadiran-siswa" className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-[11px] font-bold h-7 rounded-lg">
                    Log Presensi &rarr;
                  </Button>
                </Link>
              </Card>
            </div>
          </div>

          {/* AREA KANAN: DAFTAR BERITA / ARTIKEL & KALENDER KEGIATAN */}
          <div className="md:col-span-1 xl:col-span-3 space-y-3.5 sm:space-y-4">
            <NewsArticleListWidget announcements={announcements} limit={4} />
            <ActivityCalendarWidget announcements={announcements} title="Kalender Kegiatan" />
          </div>
        </div>

        {/* Urgent System Announcement Popup */}
        <UrgentAnnouncementPopup announcements={systemAnnouncements} />

        {/* Payment Popup */}
        <PaymentBillingPopup
          open={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          studentId={activeStudent?.id}
        />
      </div>
    )
  }

  // DASHBOARD KEPALA SEKOLAH (Menggunakan layout universal 3-kolom modern dengan panel E-Sign & Statistika Khusus)
  // Alur dilanjutkan ke generic return di bawah agar compact & konsisten
  if (false && (role === 'KEPALA_SEKOLAH' || (isKepalaSekolah && !isKeuanganAll))) {


    const ov = execStats?.overview || {}
    const pr = execStats?.presensi || {}
    const fin = execStats?.keuangan || {}
    const dist = execStats?.studentDistribution || []
    const announcementsList = execStats?.recentAnnouncements || announcements || []
    const systemLogs = execStats?.recentLogs || []

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount || 0)

    const demo = execStats?.demografis || { gender: [], program: [], jalur: [], gelombang: [] }

    const effectiveCurveType =
      selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI'
        ? 'PRESENSI'
        : selectedStatCategory === 'KEUANGAN'
          ? 'KEUANGAN'
          : selectedStatCategory === 'KEDISIPLINAN'
            ? 'KEDISIPLINAN'
            : selectedStatCategory === 'AKADEMIK'
              ? 'AKADEMIK'
              : 'DEMOGRAFIS';

    return (
      <div className="space-y-6 lg:space-y-8 pb-10">
        {/* Banner Welcome Header Kepala Sekolah */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-extrabold backdrop-blur-md border border-white/20 uppercase tracking-wider flex items-center gap-1.5 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  Pusat Informasi & Analisis Eksekutif
                </span>
                <span className="text-xs text-amber-100 font-semibold bg-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Executive Real-Time Dashboard
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Dasbor Eksekutif & Ringkasan Sekolah
              </h1>
              <p className="text-amber-100 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
                <strong className="font-bold">{clock.greeting}</strong>, <strong className="text-white font-bold italic">{(session?.user as any)?.name || 'Bapak/Ibu Kepala Sekolah'}</strong>. Berikut adalah ikhtisar analitik komprehensif, rekapitulasi operasional, serta monitoring berkala seluruh sektor kegiatan sekolah.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs shadow-inner max-w-xs">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <Activity className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Periode T.A. 2026/2027</span>
                </div>
                <p className="text-[11px] text-amber-100/90 leading-tight">
                  Data terintegrasi mulai T.A. 2026/2027 (tidak tersinkronisasi dengan arsip sistem lama).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* JADWAL SHOLAT & KHGT MUHAMMADIYAH REALTIME BANNER */}
        <PrayerTimesWidget variant="banner" />

        {/* PUSAT PENGAWASAN & AKSES CEPAT LAYANAN DATA SEKOLAH (ATAS) */}
        {(() => {
          const primaryKsLinks = [
            { name: 'E-Sign & Surat', href: '/fitur/persuratan', icon: FileCheck, desc: 'E-Sign & Disposisi' },
            { name: 'Dispensasi Siswa', href: '/presensi/dispensasi', icon: Award, desc: 'Verifikasi Izin' },
            { name: 'Inventaris & Sarpras', href: '/fitur/inventaris', icon: Package, desc: 'Aset & Sarana' },
            { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck, desc: 'Personalia & Berkas' },
            { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, desc: 'Jadwal Pembelajaran' },
            { name: 'Data Kelas', href: '/master-data/kelas', icon: BookOpen, desc: 'Rombel & Ruang' },
            { name: 'Data Guru & Pegawai', href: '/master-data/guru', icon: Users, desc: 'Pendidik & Tendik' },
            { name: 'Data Siswa', href: '/master-data/siswa', icon: UserSquare2, desc: 'Buku Induk Siswa' },
          ]

          const allPermittedKsLinks = [
            // Pimpinan, Tata Usaha & Sarpras
            { category: 'Pimpinan, Tata Usaha & Sarana Prasarana', items: [
              { name: 'E-Sign & Persuratan', href: '/fitur/persuratan', icon: FileCheck, desc: 'Naskah Surat, Disposisi & E-Sign' },
              { name: 'Permohonan Dispensasi', href: '/presensi/dispensasi', icon: Award, desc: 'Verifikasi Izin & Dispensasi' },
              { name: 'Inventaris & Sarpras', href: '/fitur/inventaris', icon: Package, desc: 'Aset & Sarana Prasarana' },
              { name: 'Kepegawaian & HRD', href: '/fitur/kepegawaian', icon: UserCheck, desc: 'Data Personalia & Berkas Pegawai' },
            ]},
            // Akademik, Kurikulum & Master Data
            { category: 'Akademik, Kurikulum & Master Data', items: [
              { name: 'Supervisi Jadwal KBM', href: '/akademik/jadwal-pelajaran', icon: CalendarDays, desc: 'Jadwal Pembelajaran KBM' },
              { name: 'Data Rombel & Kelas', href: '/master-data/kelas', icon: BookOpen, desc: 'Daftar Kelas & Wali Kelas' },
              { name: 'Data Mata Pelajaran', href: '/master-data/mata-pelajaran', icon: GraduationCap, desc: 'Kurikulum & Mata Pelajaran' },
              { name: 'Data Guru & Karyawan', href: '/master-data/guru', icon: Users, desc: 'Buku Induk Guru & Tendik' },
              { name: 'Data Induk Siswa', href: '/master-data/siswa', icon: UserSquare2, desc: 'Buku Induk & Biodata Siswa' },
            ]},
            // Keuangan Pribadi & Notifikasi
            { category: 'Penghasilan & Informasi Akun', items: [
              { name: 'Slip Gaji Pribadi', href: '/keuangan/slip-gaji', icon: Banknote, desc: 'Rincian Penghasilan Pribadi' },
              { name: 'Notifikasi Akun', href: '/pengaturan/notifikasi-pengguna', icon: Mail, desc: 'Pemberitahuan & Notifikasi' },
            ]},
          ]

          return (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Pusat Pengawasan & Akses Layanan Data Sekolah
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tampilan log terpadu dan monitoring mandiri data sekolah (Akses supervisi & pemantauan eksekutif).
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllKsMenus(!showAllKsMenus)}
                  className="rounded-xl border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-bold gap-1.5 shadow-2xs self-start sm:self-auto transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{showAllKsMenus ? 'Tutup Menu Lainnya' : 'Tampilkan Menu Lainnya'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllKsMenus ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {/* Grid 8 Menu Utama / Akses Cepat Primer */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {primaryKsLinks.map((link, idx) => {
                  const Icon = link.icon
                  return (
                    <Link key={idx} href={link.href} className="group">
                      <Card className="h-full border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-2xs hover:shadow-lg hover:border-amber-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 flex flex-col items-center justify-center p-3.5 gap-2 rounded-2xl hover:-translate-y-0.5 text-center">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-orange-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-2xs">
                          <Icon className="w-5 h-5 transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-tight">
                            {link.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            {link.desc}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>

              {/* Panel Menu Lengkap yang Diizinkan untuk Kepala Sekolah (Expandable / Toggle) */}
              {showAllKsMenus && (
                <div className="mt-4 p-4 sm:p-5 rounded-3xl bg-slate-50/90 dark:bg-slate-900/90 border border-amber-200/70 dark:border-amber-900/50 shadow-inner space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Direktori Lengkap Hak Akses & Layanan Kepala Sekolah
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Seluruh modul, fitur persuratan, akademik, presensi, tata usaha, dan keuangan yang terotorisasi untuk pimpinan.
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] font-bold">
                      Akses Terotorisasi
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {allPermittedKsLinks.map((sec, sIdx) => (
                      <div key={sIdx} className="space-y-2">
                        <h4 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5 px-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                          {sec.category}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                          {sec.items.map((item, iIdx) => {
                            const ItemIcon = item.icon
                            return (
                              <Link key={iIdx} href={item.href} className="group">
                                <div className="h-full p-3 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800/80 hover:border-amber-500 hover:shadow-md transition-all flex flex-col justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                      <ItemIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                                      {item.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium line-clamp-1 pl-0.5">
                                    {item.desc}
                                  </span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* CARD UNIFIED KEPALA SEKOLAH: PUSAT PERSETUJUAN, DISPOSISI & E-SIGN PIMPINAN */}
        {(() => {
          const pendingDispCount = execStats?.persuratan?.pendingDispensasi ?? (dispensasiList || []).filter((d: any) => d.status === 'MENUNGGU').length
          const pendingDispCountVal = typeof pendingDispCount === 'number' ? pendingDispCount : 0
          const pendingDisposisi = execStats?.persuratan?.pendingDisposisi ?? 0
          const pendingSuratKeluar = execStats?.persuratan?.pendingSuratKeluar ?? 0

          return (role === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH') ? (
            <Card className="border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-blue-950/30 shadow-xs rounded-3xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0 mt-0.5">
                    <ShieldCheck className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                        Persetujuan, Disposisi & Tanda Tangan Digital Pimpinan
                      </h3>
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                        E-Sign Canvas & Disposisi
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 max-w-2xl">
                      Pusat pengesahan E-Sign digital untuk permohonan dispensasi siswa/pegawai, disposisi surat masuk, serta persetujuan surat keluar, Surat Keputusan (SK) Kepsek, dan naskah resmi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto flex-wrap">
                  <Link href="/presensi/dispensasi" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto bg-white dark:bg-slate-900 border-purple-300 text-purple-800 dark:text-purple-300 hover:bg-purple-50 rounded-2xl text-xs font-bold gap-1.5 shadow-2xs">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Permohonan Dispensasi</span>
                    </Button>
                  </Link>
                  <Link href="/fitur/persuratan" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold gap-2 shadow-sm">
                      <Mail className="w-4 h-4" /> Buka Persuratan & E-Sign
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Widget Grid Notifikasi Antrean Realtime (3 Items: Permohonan Dispensasi, Disposisi Surat Masuk, Surat Keluar & SK Kepsek) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <Link href="/presensi/dispensasi" className="block group">
                  <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-purple-100 dark:border-purple-900/50 flex items-center justify-between shadow-2xs group-hover:border-purple-400 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-700 transition-colors">Permohonan Dispensasi</p>
                        <p className="text-[10px] text-slate-500">Izin Siswa & Pegawai</p>
                      </div>
                    </div>
                    <Badge className={`${pendingDispCountVal > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white'} font-mono font-bold text-xs px-2 py-0.5 rounded-lg shrink-0`}>
                      {pendingDispCountVal > 0 ? `${pendingDispCountVal} Menunggu` : 'Semua Disetujui'}
                    </Badge>
                  </div>
                </Link>

                <Link href="/fitur/persuratan?tab=surat-masuk" className="block group">
                  <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between shadow-2xs group-hover:border-indigo-400 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <CornerDownRight className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 transition-colors">Disposisi Surat Masuk</p>
                        <p className="text-[10px] text-slate-500">Perlu Arahan Pimpinan</p>
                      </div>
                    </div>
                    <Badge className={`${pendingDisposisi > 0 ? 'bg-purple-600 text-white animate-pulse' : 'bg-emerald-600 text-white'} font-mono font-bold text-xs px-2 py-0.5 rounded-lg shrink-0`}>
                      {pendingDisposisi > 0 ? `${pendingDisposisi} Disposisi` : 'Selesai'}
                    </Badge>
                  </div>
                </Link>

                <Link href="/fitur/persuratan?tab=surat-keluar" className="block group">
                  <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-amber-100 dark:border-amber-900/50 flex items-center justify-between shadow-2xs group-hover:border-amber-400 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 transition-colors">Surat Keluar & SK Kepsek</p>
                        <p className="text-[10px] text-slate-500">Antrian Menunggu E-Sign</p>
                      </div>
                    </div>
                    <Badge className={`${pendingSuratKeluar > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white'} font-mono font-bold text-xs px-2 py-0.5 rounded-lg shrink-0`}>
                      {pendingSuratKeluar > 0 ? `${pendingSuratKeluar} Menunggu TTD` : 'Semua Ditandatangani'}
                    </Badge>
                  </div>
                </Link>
              </div>
            </Card>
          ) : null
        })()}

        {/* PILIHAN STATISTIKA KHUSUS (TAB NAVIGATION FILTER) */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shadow-xs">
          {[
            { id: 'SEMUA', label: '📊 Semua Statistika', desc: 'Ringkasan Penuh' },
            { id: 'PRESENSI', label: '⏱️ Presensi & Kehadiran', desc: 'Siswa, Guru & Karyawan' },
            { id: 'KEDISIPLINAN', label: '🛡️ Adab & Tata Tertib', desc: 'Pelanggaran, Ibadah & BK' },
            { id: 'KEUANGAN', label: '💰 Neraca & Keuangan', desc: 'Kas, Tagihan & Realisasi' },
            { id: 'AKADEMIK', label: '📚 Akademik & Pembelajaran', desc: 'Rombel, Jurnal & Sesi' },
            { id: 'DEMOGRAFIS', label: '👥 Siswa & Demografis', desc: 'Gender, Jalur & Program' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatCategory(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex flex-col items-start ${selectedStatCategory === tab.id
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-normal ${selectedStatCategory === tab.id ? 'text-amber-100' : 'text-slate-400'}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>

        {/* 1. KARTU RINGKASAN POPULASI & MASTER DATA */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Statistik Populasi & Ekosistem Sekolah
              </h2>
              <span className="text-xs text-slate-500 font-medium">Total Akun Terdata</span>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Siswa</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalSiswa ?? students?.length ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Siswa Aktif</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Guru</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalGuru ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Tenaga Pendidik</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Pegawai / BAU</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalPegawai ?? totalPegawai}</span>
                  <span className="text-[11px] text-slate-400 block">Staf & Karyawan</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Wali Murid</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalWaliMurid ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Akun Terhubung</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Rombel / Kelas</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <UserSquare2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalKelas ?? classes?.length ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Rombongan Belajar</span>
                </div>
              </Card>

              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs p-4 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Mata Pelajaran</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{ov.totalMapel ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block">Kurikulum Aktif</span>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* 2. KURVA & GRAFIK ANALITIK MULTI-SEKTOR EKSEKUTIF KOMPREHENSIF */}
        <div className="space-y-6">
          {/* A. SEKTOR KEUANGAN & NERACA KESELURUHAN */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEUANGAN') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Analitik & Kurva Komprehensif Neraca Keuangan Sekolah
                  </h2>
                  <p className="text-xs text-slate-500">
                    Visualisasi dinamika multi-indikator: Penerimaan Kas Harian, Estimasi Arus Pengeluaran, Saldo Bersih, dan Sisa Piutang Siswa.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-extrabold text-xs">
                  Sektor: Neraca Keuangan
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Arus Pemasukan Harian & Tren Saldo */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Penerimaan Pembayaran Siswa</h3>
                          <span className="text-[11px] text-slate-400">Pemasukan Lunas 7 Hari Terakhir</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-600 block">{formatCurrency(fin.totalPemasukanLunas ?? 0)}</span>
                        <span className="text-[10px] text-slate-400">Akumulatif Lunas</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Pemasukan */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="finGradIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxP = Math.max(...weekly.map((w: any) => w.pemasukan || 0), 1000000)
                          const pts = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.pemasukan || 0) / maxP) * 120,
                            val: w.pemasukan
                          }))
                          const pathStr = pts.reduce((acc: string, p: any, i: number, a: any[]) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const areaStr = `${pathStr} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`
                          return (
                            <>
                              <path d={areaStr} fill="url(#finGradIn)" />
                              <path d={pathStr} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p: any, i: number) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <span className="text-[9px] text-emerald-600 font-extrabold block truncate">
                          {w.pemasukan > 0 ? `Rp ${(w.pemasukan / 1000).toLocaleString('id-ID')}k` : '0'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Kurva Piutang Siswa vs Pengeluaran & Realisasi */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Piutang Siswa & Beban Pengeluaran</h3>
                          <span className="text-[11px] text-slate-400">Komparasi Tagihan Belum Tertagih vs Saldo Kas</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-600 block">{formatCurrency(fin.totalPiutangSiswa ?? 0)}</span>
                        <span className="text-[10px] text-slate-400">Sisa Piutang Siswa</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Saldo vs Pengeluaran */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="finGradOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="finGradSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? '66%' : lvl === 33 ? '33%' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxP = Math.max(
                            ...weekly.map((w: any) => Math.max(w.pemasukan || 0, w.pengeluaran || 0)),
                            1000000
                          )
                          const ptsOut = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - (Math.min(maxP, w.pengeluaran || 0) / maxP) * 115,
                            val: w.pengeluaran || 0,
                          }))
                          const ptsSaldo = weekly.map((w: any, i: number) => {
                            const net = Math.max(0, (w.pemasukan || 0) - (w.pengeluaran || 0))
                            return {
                              x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                              y: 150 - (Math.min(maxP, net) / maxP) * 120,
                              val: net,
                            }
                          })
                          const createPath = (pArr: any[]) => pArr.reduce((acc: string, p: any, i: number, a: any[]) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathOut = createPath(ptsOut)
                          const pathSaldo = createPath(ptsSaldo)
                          return (
                            <>
                              <path d={`${pathSaldo} L ${ptsSaldo[ptsSaldo.length - 1].x} 150 L ${ptsSaldo[0].x} 150 Z`} fill="url(#finGradSaldo)" />
                              <path d={`${pathOut} L ${ptsOut[ptsOut.length - 1].x} 150 L ${ptsOut[0].x} 150 Z`} fill="url(#finGradOut)" />
                              <path d={pathSaldo} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathOut} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" />
                              {ptsSaldo.map((p: any, i: number) => (
                                <circle key={`s-${i}`} cx={p.x} cy={p.y} r="4" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
                              ))}
                              {ptsOut.map((p: any, i: number) => (
                                <circle key={`o-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Estimasi Saldo: {formatCurrency(fin.saldoKasSekolah ?? 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">Pengeluaran: {formatCurrency(fin.totalPengeluaran ?? 0)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* B. SEKTOR PRESENSI & KEHADIRAN KOMPREHENSIF */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Analitik Kurva Presensi & Kedisiplinan Kehadiran Harian
                  </h2>
                  <p className="text-xs text-slate-500">
                    Perbandingan tren kehadiran 7 hari: Siswa (Hadir, Sakit, Izin, Alpha) dan Tenaga Pendidik / Pegawai Sekolah.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-extrabold text-xs">
                  Sektor: Presensi & Kehadiran
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Tingkat Hadir Siswa vs Tenaga Pendidik */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Persentase Kehadiran Harian (%)</h3>
                          <span className="text-[11px] text-slate-400">Komparasi Hadir Siswa vs Guru & Pegawai</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-blue-600">{pr.student?.percentage ?? 0}% Siswa</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-teal-600">{pr.staff?.percentage ?? staffAttendancePercentage}% Guru</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Kehadiran % */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="presGradSiswa" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="presGradStaff" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 25, 50, 75, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">{lvl}%</text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const ptsS = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.siswaPct || 0) / 100) * 125,
                          }))
                          const ptsSt = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.staffPct || 0) / 100) * 125,
                          }))
                          const createPath = (pArr: any[]) => pArr.reduce((acc: string, p: any, i: number, a: any[]) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathS = createPath(ptsS)
                          const pathSt = createPath(ptsSt)
                          return (
                            <>
                              <path d={`${pathS} L ${ptsS[ptsS.length - 1].x} 150 L ${ptsS[0].x} 150 Z`} fill="url(#presGradSiswa)" />
                              <path d={`${pathSt} L ${ptsSt[ptsSt.length - 1].x} 150 L ${ptsSt[0].x} 150 Z`} fill="url(#presGradStaff)" />
                              <path d={pathS} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathSt} fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {ptsS.map((p: any, i: number) => (
                                <circle key={`s-${i}`} cx={p.x} cy={p.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                              ))}
                              {ptsSt.map((p: any, i: number) => (
                                <circle key={`st-${i}`} cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <div className="flex items-center justify-center gap-1 text-[9px]">
                          <span className="text-blue-600 font-extrabold">{w.siswaPct}%</span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-teal-600 font-extrabold">{w.staffPct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Distribusi Status Kehadiran Siswa Hari Ini */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Status Presensi Siswa</h3>
                          <span className="text-[11px] text-slate-400">Total {pr.student?.totalSiswa ?? students?.length ?? 0} Siswa Terdaftar</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-[11px]">Realtime</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase">Hadir</span>
                        <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{pr.student?.hadir ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-center">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">Sakit</span>
                        <span className="text-2xl font-black text-amber-800 dark:text-amber-200">{pr.student?.sakit ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-center">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">Izin</span>
                        <span className="text-2xl font-black text-indigo-800 dark:text-indigo-200">{pr.student?.izin ?? 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-center">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block uppercase">Alpha</span>
                        <span className="text-2xl font-black text-rose-800 dark:text-rose-200">{pr.student?.alpha ?? 0}</span>
                      </div>
                    </div>

                    {/* Progress Bar Visual Kehadiran */}
                    {(() => {
                      const tot = Math.max(1, (pr.student?.hadir || 0) + (pr.student?.sakit || 0) + (pr.student?.izin || 0) + (pr.student?.alpha || 0))
                      const pHadir = Math.round(((pr.student?.hadir || 0) / tot) * 100)
                      const pSakit = Math.round(((pr.student?.sakit || 0) / tot) * 100)
                      const pIzin = Math.round(((pr.student?.izin || 0) / tot) * 100)
                      const pAlpha = Math.max(0, 100 - (pHadir + pSakit + pIzin))
                      return (
                        <div className="space-y-2 pt-1">
                          <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                            <div style={{ width: `${pHadir}%` }} className="bg-emerald-500 h-full" title={`Hadir: ${pHadir}%`} />
                            <div style={{ width: `${pSakit}%` }} className="bg-amber-500 h-full" title={`Sakit: ${pSakit}%`} />
                            <div style={{ width: `${pIzin}%` }} className="bg-indigo-500 h-full" title={`Izin: ${pIzin}%`} />
                            <div style={{ width: `${pAlpha}%` }} className="bg-rose-500 h-full" title={`Alpha: ${pAlpha}%`} />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                            <span className="text-emerald-600">Hadir: {pHadir}%</span>
                            <span className="text-amber-600">Sakit: {pSakit}%</span>
                            <span className="text-indigo-600">Izin: {pIzin}%</span>
                            <span className="text-rose-600">Alpha: {pAlpha}%</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Guru Hadir Hari Ini: <strong>{pr.staff?.hadir ?? hadirStaffCount} Orang</strong></span>
                    <span className="text-slate-400 italic">Sistem Face & QR Cerdas</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* C. SEKTOR ADAB, TATA TERTIB & BIMBINGAN KONSELING (BK) */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEDISIPLINAN') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Analitik Kurva Adab, Prestasi & Rekapitulasi Pelanggaran Tatib
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dinamika bimbingan konseling dan buku saku digital: Catatan Apresiasi Karakter vs Rekap Penindakan Tata Tertib.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-extrabold text-xs">
                  Sektor: Adab & Ketertiban
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Prestasi Siswa vs Pelanggaran */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Apresiasi & Pelanggaran</h3>
                          <span className="text-[11px] text-slate-400">Pencatatan 7 Hari Terakhir</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="text-emerald-600">+{ov.totalPrestasiSiswa ?? 0} Prestasi</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-rose-600">-{ov.totalPelanggaranSiswa ?? 0} Catatan</span>
                      </div>
                    </div>

                    {/* Canvas Kurva Prestasi/Pelanggaran */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="tatibGradPres" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="tatibGradPel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">{lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}</text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxC = Math.max(...weekly.map((w: any) => Math.max(w.prestasi || 0, w.pelanggaran || 0)), 5)
                          const ptsP = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.prestasi || 0) / maxC) * 120,
                          }))
                          const ptsPl = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.pelanggaran || 0) / maxC) * 120,
                          }))
                          const createPath = (pArr: any[]) => pArr.reduce((acc: string, p: any, i: number, a: any[]) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const pathP = createPath(ptsP)
                          const pathPl = createPath(ptsPl)
                          return (
                            <>
                              <path d={`${pathP} L ${ptsP[ptsP.length - 1].x} 150 L ${ptsP[0].x} 150 Z`} fill="url(#tatibGradPres)" />
                              <path d={`${pathPl} L ${ptsPl[ptsPl.length - 1].x} 150 L ${ptsPl[0].x} 150 Z`} fill="url(#tatibGradPel)" />
                              <path d={pathP} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              <path d={pathPl} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {ptsP.map((p: any, i: number) => (
                                <circle key={`p-${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                              {ptsPl.map((p: any, i: number) => (
                                <circle key={`pl-${i}`} cx={p.x} cy={p.y} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <div className="flex items-center justify-center gap-1 text-[9px]">
                          <span className="text-emerald-600 font-extrabold">+{w.prestasi}</span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-rose-600 font-extrabold">-{w.pelanggaran}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Ringkasan Rekapitulasi Pembinaan Karakter & Ibadah */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Amalan Ibadah & Pembinaan BK</h3>
                          <span className="text-[11px] text-slate-400">Poin Sholat, Kedisiplinan & Bimbingan</span>
                        </div>
                      </div>
                      <Badge className="bg-cyan-600 text-white font-bold text-[11px]">{ov.totalIbadahSiswa ?? 0} Sesi</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900">
                        <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block uppercase">Amalan Ibadah</span>
                        <span className="text-2xl font-black text-cyan-800 dark:text-cyan-200 mt-1 block">{ov.totalIbadahSiswa ?? 0}</span>
                        <span className="text-[10px] text-slate-400">Sholat & Ibadah Harian</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900">
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 block uppercase">Konseling BK/BP</span>
                        <span className="text-2xl font-black text-purple-800 dark:text-purple-200 mt-1 block">{ov.totalKarakterAssessments ?? 0}</span>
                        <span className="text-[10px] text-slate-400">Evaluasi Karakter Siswa</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Kepatuhan Tata Tertib Keseluruhan</span>
                      </div>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-xs">
                        {execStats?.karakterTatib?.kepatuhanPct ?? 100}% Tertib
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Terhubung dengan WhatsApp Wali Murid</span>
                    <span className="text-slate-400 font-medium">Buku Saku Digital</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* D. SEKTOR SISWA & DEMOGRAFIS MULTI-DIMENSI */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Analitik Distribusi Demografis & Jalur Kesiswaan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Proporsi Gender, Program Peminatan Siswa, Jalur Pendaftaran, dan Gelombang Masuk.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs">
                  Sektor: Siswa & Demografis
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva & Rasio Gender Siswa */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Rasio Gender Siswa</h3>
                          <span className="text-[11px] text-slate-400">Total {ov.totalSiswa ?? students?.length ?? 0} Siswa Aktif</span>
                        </div>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-[11px]">Kesiswaan</Badge>
                    </div>

                    {(() => {
                      const lCount = demo.gender?.find((g: any) => g.name === 'L')?.count || 0
                      const pCount = demo.gender?.find((g: any) => g.name === 'P')?.count || 0
                      const totalG = Math.max(lCount + pCount, 1)
                      const pctL = Math.round((lCount / totalG) * 100)
                      const pctP = Math.round((pCount / totalG) * 100)
                      return (
                        <div className="space-y-4 py-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex justify-between items-center">
                              <div>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block">Laki-Laki</span>
                                <span className="text-2xl font-black text-blue-900 dark:text-blue-100">{lCount} Siswa</span>
                              </div>
                              <span className="text-lg font-black text-blue-600">{pctL}%</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 flex justify-between items-center">
                              <div>
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block">Perempuan</span>
                                <span className="text-2xl font-black text-purple-900 dark:text-purple-100">{pCount} Siswa</span>
                              </div>
                              <span className="text-lg font-black text-purple-600">{pctP}%</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                              <div style={{ width: `${pctL}%` }} className="bg-blue-500 h-full" />
                              <div style={{ width: `${pctP}%` }} className="bg-purple-500 h-full" />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 font-semibold px-1">
                              <span className="text-blue-600">Laki-Laki ({pctL}%)</span>
                              <span className="text-purple-600">Perempuan ({pctP}%)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Terdaftar di {ov.totalKelas ?? classes?.length ?? 0} Rombel</span>
                    <span className="text-slate-400">Data Pokok Pendidikan</span>
                  </div>
                </Card>

                {/* 2. Distribusi Program Peminatan & Jalur */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Program Belajar & Peminatan</h3>
                          <span className="text-[11px] text-slate-400">Distribusi Peminatan Siswa SIMASMUH</span>
                        </div>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-[11px]">Kurikulum</Badge>
                    </div>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {demo.program?.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">Belum ada data program peminatan</div>
                      ) : (
                        demo.program?.map((p: any, idx: number) => {
                          const totP = demo.program.reduce((acc: number, item: any) => acc + (item.count || 0), 0) || 1
                          const pctProg = Math.round(((p.count || 0) / totP) * 100)
                          return (
                            <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                                <span className="font-black text-indigo-600">{p.count} Siswa ({pctProg}%)</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div style={{ width: `${pctProg}%` }} className="bg-indigo-600 h-full rounded-full" />
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Jalur Pendaftaran: <strong>{demo.jalur?.length || 0} Kategori</strong></span>
                    <span className="text-slate-400">Kesiswaan Terpadu</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* E. SEKTOR AKADEMIK & PEMBELAJARAN */}
          {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'AKADEMIK') && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Analitik Kurva Aktivitas Pembelajaran & Rombel
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dinamika Sesi KBM Harian, Rekap Jurnal Mengajar Guru, Jurnal Bimbingan Wali Kelas, dan Distribusi Siswa per Kelas.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs">
                  Sektor: Akademik & KBM
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Kurva Sesi KBM & Aktivitas Harian */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Tren Aktivitas Sesi Pembelajaran</h3>
                          <span className="text-[11px] text-slate-400">Total {todaySchedules.length} Sesi Terjadwal Hari Ini</span>
                        </div>
                      </div>
                      <Badge className="bg-indigo-600 text-white font-bold text-[11px]">{ov.totalJurnalMengajar ?? 0} Jurnal</Badge>
                    </div>

                    {/* Canvas Kurva Sesi Akademik */}
                    <div className="h-56 w-full relative bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-3">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                        <defs>
                          <linearGradient id="akaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[0, 33, 66, 100].map((lvl, i) => {
                          const y = 150 - (lvl / 100) * 125
                          return (
                            <g key={i}>
                              <line x1="30" y1={y} x2="480" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                              <text x="25" y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-sans font-medium">
                                {lvl === 100 ? 'Maks' : lvl === 66 ? 'Tinggi' : lvl === 33 ? 'Sedang' : '0'}
                              </text>
                            </g>
                          )
                        })}
                        {(() => {
                          const weekly = execStats?.weeklyTrends || []
                          if (weekly.length === 0) return null
                          const maxS = Math.max(...weekly.map((w: any) => w.jadwalCount || 0), todaySchedules.length, 1)
                          const pts = weekly.map((w: any, i: number) => ({
                            x: 45 + (i * (420 / Math.max(1, weekly.length - 1))),
                            y: 150 - ((w.jadwalCount || 0) / maxS) * 120,
                            val: w.jadwalCount || 0,
                          }))
                          const pathStr = pts.reduce((acc: string, p: any, i: number, a: any[]) => {
                            if (i === 0) return `M ${p.x} ${p.y}`
                            const prev = a[i - 1]
                            const cx1 = prev.x + (p.x - prev.x) / 2
                            const cy1 = prev.y
                            const cx2 = prev.x + (p.x - prev.x) / 2
                            const cy2 = p.y
                            return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
                          }, '')
                          const areaStr = `${pathStr} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`
                          return (
                            <>
                              <path d={areaStr} fill="url(#akaGrad)" />
                              <path d={pathStr} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p: any, i: number) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                              ))}
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                    {(execStats?.weeklyTrends || []).map((w: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block">{w.date}</span>
                        <span className="text-[9px] text-indigo-600 font-extrabold block">
                          {w.jadwalCount ?? (w.siswaHadir > 0 ? 6 : 0)} Sesi
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 2. Distribusi Komposisi Siswa per Kelas */}
                <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <UserSquare2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Distribusi Siswa per Rombel</h3>
                          <span className="text-[11px] text-slate-400">{dist.length} Rombongan Belajar Aktif</span>
                        </div>
                      </div>
                      <Badge className="bg-amber-600 text-white font-bold text-[11px]">
                        {dist.reduce((sum: number, item: any) => sum + (item.count || 0), 0)} Siswa
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {dist.length === 0 ? (
                        <div className="col-span-full text-center py-6 text-slate-400 text-xs">Belum ada data kelas</div>
                      ) : (
                        dist.map((item: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block truncate">{item.className}</span>
                            <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">{item.count} <span className="text-[10px] font-normal text-slate-400">Siswa</span></span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span>Total Mata Pelajaran: <strong>{ov.totalMapel ?? 0} Mapel</strong></span>
                    <span className="text-slate-400">Kurikulum Merdeka</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* 3. STATISTIK PRESENSI & KEHADIRAN */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Presensi Siswa Card */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Presensi Siswa Hari Ini</h3>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs">
                    {pr.student?.percentage ?? 0}% Hadir
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block uppercase">Hadir</span>
                    <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">{pr.student?.hadir ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block uppercase">Sakit</span>
                    <span className="text-xl font-extrabold text-amber-800 dark:text-amber-200">{pr.student?.sakit ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase">Izin</span>
                    <span className="text-xl font-extrabold text-indigo-800 dark:text-indigo-200">{pr.student?.izin ?? 0}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block uppercase">Alpha</span>
                    <span className="text-xl font-extrabold text-rose-800 dark:text-rose-200">{pr.student?.alpha ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Total Siswa Terdaftar: <strong>{pr.student?.totalSiswa ?? students?.length ?? 0}</strong></span>
                <span className="text-slate-400">Presensi Terkini</span>
              </div>
            </Card>

            {/* Presensi Pegawai & Guru Card */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Presensi Guru & Pegawai</h3>
                  </div>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 font-bold text-xs">
                    {pr.staff?.percentage ?? staffAttendancePercentage}% Hadir
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900">
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block uppercase">Pegawai Hadir</span>
                    <span className="text-2xl font-extrabold text-teal-800 dark:text-teal-200">{pr.staff?.hadir ?? hadirStaffCount}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block uppercase">Total Tenaga Kerja</span>
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{pr.staff?.totalPegawai ?? totalPegawai}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                <span>Jadwal Hari Ini: <strong>{todaySchedules.length} Sesi</strong></span>
                <span className="text-slate-400">Monitoring Kehadiran</span>
              </div>
            </Card>

            {/* Pengawasan Tugas Tertunda */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Antrean Menunggu Tindakan</h3>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Verifikasi Bukti Transfer</p>
                        <p className="text-[11px] text-slate-500">Menunggu pengecekan bendahara</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600 text-white font-extrabold">{ov.unverifiedPaymentProofs ?? 0}</Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <DoorOpen className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pengajuan Izin Keluar</p>
                        <p className="text-[11px] text-slate-500">Izin dinas/pribadi guru & karyawan</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white font-extrabold">{ov.izinKeluarPending ?? 0}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center text-xs">
                <span className="text-slate-400 italic">Terpantau otomatis</span>
              </div>
            </Card>
          </div>
        )}

        {/* 2.5 STATISTIKA ADAB, TATA TERTIB & BK */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEDISIPLINAN') && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-rose-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Pelanggaran Siswa</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600">{ov.totalPelanggaranSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Catatan Tata Tertib</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Tim Tatib Sekolah</span>
                <span className="font-semibold text-rose-600">Dipantau</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Prestasi & Teladan</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600">{ov.totalPrestasiSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Apresiasi Karakter</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Reward & Point +</span>
                <span className="font-semibold text-emerald-600">Teladan</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-cyan-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Amalan Ibadah</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-600">{ov.totalIbadahSiswa ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Sholat & Kedisiplinan Agama</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Sholat Berjamaah</span>
                <span className="font-semibold text-cyan-600">Aktif</span>
              </div>
            </Card>

            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-5 border-l-4 border-l-purple-500 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Evaluasi Karakter</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-purple-600">{ov.totalKarakterAssessments ?? 0}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Total Rekam Bimbingan</span>
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500">
                <span>Integrasi BK & Tatib</span>
                <span className="font-semibold text-purple-600">Realtime</span>
              </div>
            </Card>
          </div>
        )}

        {/* 3. STATISTIKA KEUANGAN SEKOLAH SECARA MENYELURUH */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEUANGAN') && (
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Neraca & Ringkasan Keuangan Keseluruhan
                </h2>
                <p className="text-xs text-slate-500">Statistik akumulatif penerimaan SPP, DPP, bantuan operasional, dan pengeluaran</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Saldo Bersih */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">
                  <span>Saldo Keuangan Keseluruhan</span>
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-emerald-800 dark:text-emerald-200">
                  {formatCurrency(fin.saldoKasSekolah ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Arus keuangan bersih aktif</span>
              </div>

              {/* Total Pemasukan Lunas */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-200 dark:border-blue-800/50">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-bold uppercase">
                  <span>Total Pemasukan (Lunas)</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-blue-800 dark:text-blue-200">
                  {formatCurrency(fin.totalPemasukanLunas ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Akumulasi penerimaan siswa</span>
              </div>

              {/* Total Piutang Siswa */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold uppercase">
                  <span>Sisa Piutang Siswa</span>
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-amber-800 dark:text-amber-200">
                  {formatCurrency(fin.totalPiutangSiswa ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tagihan belum tertagih</span>
              </div>

              {/* Total Pengeluaran */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-red-500/10 to-transparent border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold uppercase">
                  <span>Total Pengeluaran</span>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl lg:text-3xl font-black text-rose-800 dark:text-rose-200">
                  {formatCurrency(fin.totalPengeluaran ?? 0)}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Operasional & belanja modal</span>
              </div>
            </div>

            {/* Rincian Pos Tagihan & Kategori */}
            {fin.tagihanByType && Object.keys(fin.tagihanByType).length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-extrabold uppercase text-slate-500 mb-3 tracking-wider">
                  Realisasi Pembayaran Berdasarkan Pos Tagihan
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(fin.tagihanByType).map(([type, val]: [string, any]) => {
                    const pct = val.total > 0 ? Math.round((val.lunas / val.total) * 100) : 0
                    return (
                      <div key={type} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-white uppercase">{type}</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(val.lunas)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          dari {formatCurrency(val.total)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 4. STATISTIK AKADEMIK, ROMBEL & PEMBELAJARAN */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'AKADEMIK') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Metrik Pembelajaran */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Aktivitas Pembelajaran
                </h3>

                <div className="space-y-3 mt-4">
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">Jurnal Mengajar Guru</span>
                      <span className="text-[10px] text-slate-400">Total catatan KBM guru</span>
                    </div>
                    <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">{ov.totalJurnalMengajar ?? 0}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">Jurnal Wali Kelas</span>
                      <span className="text-[10px] text-slate-400">Bimbingan siswa & kelas</span>
                    </div>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{ov.totalJurnalWaliKelas ?? 0}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">Jadwal Sesi Pelajaran</span>
                      <span className="text-[10px] text-slate-400">Total jadwal KBM aktif</span>
                    </div>
                    <span className="text-xl font-black text-amber-700 dark:text-amber-300">{ov.totalJadwal ?? 0}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Distribusi Siswa per Kelas */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-3xl p-5 sm:p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Distribusi Komposisi Jumlah Siswa per Rombel / Kelas
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Total: <strong>{dist.reduce((sum: number, item: any) => sum + (item.count || 0), 0)} Siswa</strong> dalam <strong>{dist.length} Rombel</strong>
                </span>
              </div>

              {dist.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Belum ada data kelas terdaftar</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {dist.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.className}</span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{item.count}</span>
                        <span className="text-[11px] text-slate-400 font-medium">Siswa</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 5. STATISTIKA KHUSUS DEMOGRAFIS SISWA (KOMPOSISI GENDER, PROGRAM, JALUR & GELOMBANG) */}
        {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Komposisi Demografis & Jalur Pendaftaran Siswa
              </h3>
              <span className="text-xs text-slate-500 font-medium">Rekapitulasi Kesiswaan</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Gender */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Komposisi Gender Siswa</span>
                <div className="space-y-2">
                  {demo.gender?.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name === 'L' ? 'Laki-Laki' : g.name === 'P' ? 'Perempuan' : g.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{g.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Program */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Distribusi Program Belajar</span>
                <div className="space-y-2">
                  {demo.program?.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{p.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Jalur Pendaftaran */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Jalur Pendaftaran</span>
                <div className="space-y-2">
                  {demo.jalur?.map((j: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{j.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{j.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Gelombang */}
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs rounded-2xl p-4">
                <span className="text-xs font-extrabold uppercase text-slate-500 block mb-3">Gelombang Masuk</span>
                <div className="space-y-2">
                  {demo.gelombang?.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                      <span className="font-black text-slate-900 dark:text-white">{g.count} Siswa</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Urgent System Announcement Popup */}
        <UrgentAnnouncementPopup announcements={systemAnnouncements} />
      </div>
    )
  }

  const currentLinks = getRoleLinks(
    role,
    subRole,
    subRole2,
    subRole3,
    (session?.user as any)?.subRole4,
    (session?.user as any)?.subRole5
  ).filter(link => link.href !== '/dashboard')

  const fin = execStats?.keuangan || {}
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount || 0)

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-3.5 sm:p-4 lg:p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden">
        <div className="relative z-10 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.2 rounded-full font-bold border border-indigo-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
              {isSuperadminRole ? 'Superadmin' : 'Dashboard'}
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9.5px] px-1.5 py-0">
              Real-time
            </Badge>
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
            {clock.greeting}, {(session?.user as any)?.name || 'Superadmin'}
          </h1>
          <p className="text-slate-300 text-[11px] font-medium">
            {isSuperadminRole ? 'Monitoring sistem, port, dan sesi pengguna aktif.' : 'Sistem Informasi Manajemen Terpadu SIMASMUH.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          {/* Tombol Khusus Kepala Sekolah: Tanda Tangan Digital (E-Sign) & Toggle Statistika */}
          {isKepalaSekolah && (
            <>
              <Button
                size="sm"
                onClick={() => setShowSignaturePad(true)}
                className="h-8 sm:h-8.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-[11px] shadow-sm gap-1.5 border border-amber-400/40"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Tanda Tangan (E-Sign)</span>
                {((execStats?.persuratan?.pendingDispensasi || 0) + (execStats?.persuratan?.pendingSuratKeluar || 0) + (execStats?.persuratan?.pendingDisposisi || 0)) > 0 && (
                  <Badge className="h-4.5 px-1.5 bg-white text-orange-700 font-mono font-black text-[9px] rounded-full ml-0.5">
                    {(execStats?.persuratan?.pendingDispensasi || 0) + (execStats?.persuratan?.pendingSuratKeluar || 0) + (execStats?.persuratan?.pendingDisposisi || 0)}
                  </Badge>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExecutiveStats(!showExecutiveStats)}
                className={`h-8 sm:h-8.5 rounded-xl font-extrabold text-[11px] gap-1.5 backdrop-blur-md transition-all ${
                  showExecutiveStats
                    ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
                <span>{showExecutiveStats ? 'Tutup Statistika' : 'Statistika Sekolah'}</span>
              </Button>
            </>
          )}

          <span className="px-2.5 py-1 rounded-xl bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 text-white font-bold text-[11px] uppercase tracking-wider shadow-inner flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {(role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA' || subRole === 'ADMIN_TU' || subRole === 'BAU') ? 'Tata Usaha' : isKepalaSekolah ? 'Kepala Sekolah' : role} {subRole && subRole !== 'ADMIN_TU' && subRole !== 'BAU' && subRole !== 'KEPALA_SEKOLAH' ? `• ${subRole}` : ''}
          </span>
        </div>
      </div>

      {/* JADWAL SHOLAT & KHGT MUHAMMADIYAH REALTIME BANNER */}
      <PrayerTimesWidget variant="banner" />

      {/* Panel Detail Statistika Eksekutif (Khusus Kepala Sekolah - Muncul saat tombol Statistika ditekan) */}
      {isKepalaSekolah && showExecutiveStats && (
        <ExecutiveStatsPanel
          execStats={execStats}
          studentsCount={students?.length || 0}
          classesCount={classes?.length || 0}
          totalPegawai={totalPegawai}
          onClose={() => setShowExecutiveStats(false)}
        />
      )}

      {/* Kartu Statistika Keuangan (Khusus Staff Keuangan Khusus/Supervisor Keuangan) */}
      {isKeuanganAll && !isKepalaSekolah && role !== 'SUPERADMIN' && role !== 'ADMIN_IT' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Kas Bersih</span>
            <span className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5 block">
              {formatCurrency(fin.saldoKasSekolah ?? 0)}
            </span>
          </Card>
          <Card className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pemasukan Lunas</span>
            <span className="text-lg sm:text-xl font-black text-blue-600 mt-0.5 block">
              {formatCurrency(fin.totalPemasukanLunas ?? 0)}
            </span>
          </Card>
          <Card className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Piutang Siswa</span>
            <span className="text-lg sm:text-xl font-black text-amber-600 mt-0.5 block">
              {formatCurrency(fin.totalPiutangSiswa ?? 0)}
            </span>
          </Card>
          <Card className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pengeluaran</span>
            <span className="text-lg sm:text-xl font-black text-rose-600 mt-0.5 block">
              {formatCurrency(fin.totalPengeluaran ?? 0)}
            </span>
          </Card>
        </div>
      )}

      {/* 3-AREA GENERAL DASHBOARD LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* AREA KIRI: MY ACCOUNT & INFORMASI PENGUMUMAN SISTEM */}
        <div className="md:col-span-1 xl:col-span-3 space-y-4 sm:space-y-5">
          <UserAccountCard
            role={role}
            subRole={subRole}
            profileAvatarUrl={(session?.user as any)?.avatarUrl}
          />

          {/* Widget Antrean E-Sign & Persuratan Khusus Kepala Sekolah */}
          {isKepalaSekolah && (
            <Card className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <PenTool className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Antrean E-Sign Pimpinan
                    </h4>
                    <span className="text-[10px] text-slate-500">Perlu Pengesahan</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSignaturePad(true)}
                  className="h-6 px-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg"
                >
                  Canvas TTD
                </Button>
              </div>

              <div className="space-y-1.5 text-xs">
                <Link
                  href="/presensi/dispensasi"
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:border-amber-400 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Dispensasi Siswa/Guru
                  </span>
                  <Badge className={`${(execStats?.persuratan?.pendingDispensasi || 0) > 0 ? 'bg-rose-500' : 'bg-emerald-600'} text-white text-[9.5px] px-1.5 py-0`}>
                    {(execStats?.persuratan?.pendingDispensasi || 0) > 0 ? `${execStats?.persuratan?.pendingDispensasi} Menunggu` : 'Nihil'}
                  </Badge>
                </Link>

                <Link
                  href="/fitur/persuratan?tab=surat-masuk"
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:border-amber-400 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Disposisi Surat Masuk
                  </span>
                  <Badge className={`${(execStats?.persuratan?.pendingDisposisi || 0) > 0 ? 'bg-purple-600' : 'bg-emerald-600'} text-white text-[9.5px] px-1.5 py-0`}>
                    {(execStats?.persuratan?.pendingDisposisi || 0) > 0 ? `${execStats?.persuratan?.pendingDisposisi} Disposisi` : 'Selesai'}
                  </Badge>
                </Link>

                <Link
                  href="/fitur/persuratan?tab=surat-keluar"
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 hover:border-amber-400 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Surat Keluar / SK Kepsek
                  </span>
                  <Badge className={`${(execStats?.persuratan?.pendingSuratKeluar || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-600'} text-white text-[9.5px] px-1.5 py-0`}>
                    {(execStats?.persuratan?.pendingSuratKeluar || 0) > 0 ? `${execStats?.persuratan?.pendingSuratKeluar} TTD` : 'Lengkap'}
                  </Badge>
                </Link>
              </div>
            </Card>
          )}

          <SystemInfoWidget announcements={systemAnnouncements} limit={3} />
        </div>

        {/* AREA TENGAH: TOMBOL AKSES CEPAT */}
        <div className="md:col-span-2 xl:col-span-6 space-y-4 sm:space-y-5 order-first md:order-none">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                  Akses Cepat
                </h3>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
                {currentLinks.length} Modul
              </span>
            </div>
            <CenterQuickAccessGrid links={currentLinks} role={role} />
          </div>

          {/* Log Absensi Harian Pegawai / Guru */}
          {(role === 'GURU' || role === 'KARYAWAN' || role === 'PEGAWAI' || role === 'STAFF') && (
            <div>
              {renderAttendanceLog(false)}
            </div>
          )}
        </div>

        {/* AREA KANAN: DAFTAR BERITA / ARTIKEL & KALENDER KEGIATAN (Sejajar dengan Side Kiri) */}
        <div className="md:col-span-1 xl:col-span-3 space-y-4 sm:space-y-5">
          <NewsArticleListWidget announcements={announcements} limit={4} />
          <ActivityCalendarWidget announcements={announcements} title="Kalender Kegiatan" />
        </div>
      </div>

      {/* KARTU SINKRONISASI TANGGAL & WAKTU SERVER (UTC+7) */}
      {isSuperadminRole && (
        <Card className="border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xs p-4 sm:p-5 border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Sinkronisasi Tanggal & Waktu Server SIMASMUH
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Terkalibrasi Aktif
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Standar zona waktu server <strong>UTC+7 (WIB / Asia/Jakarta)</strong> mengunci konsistensi presensi, log, dan jadwal di seluruh aplikasi.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Clock Display & Sync Button */}
            <div className="flex items-center justify-between sm:justify-end gap-3 bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-blue-100 dark:border-slate-700/80 shadow-2xs shrink-0">
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-mono leading-none">
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
                    title: 'Waktu Berhasil Dikalibrasi!',
                    text: `Waktu sistem telah disinkronkan langsung dengan server endpoint (${clock.latency} ms).`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                  })
                }}
                disabled={clock.isSyncing}
                className="rounded-xl border-blue-200 hover:bg-blue-50 text-blue-700 dark:text-blue-300 dark:border-blue-800 font-bold gap-1.5 text-xs h-8 px-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${clock.isSyncing ? 'animate-spin' : ''}`} />
                <span>{clock.isSyncing ? 'Sinkron...' : 'Kalibrasi'}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* KARTU 1: RUNTIME & MONITORING SISTEM RINGKAS */}
      {isSuperadminRole && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs border">
            {/* Header Ringkas Runtime Monitoring */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs shrink-0">
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
                    Status Uptime, Latensi, RAM, Port, dan Kapasitas Sistem
                  </p>
                </div>
              </div>

              {/* Action Tools: Speed Test & Manual Refresh */}
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

            {/* Grid 4 Metrik Kunci Ringkas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
              {/* 1. Uptime System (Tanpa Downtime) */}
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

              {/* 2. Latensi (Informasi Singkat Padat) */}
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

              {/* 3. Info RAM (Heap Used & Free / Total RAM) */}
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
                  Free: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{supervisorData?.performance?.freeSystemMemoryGb ?? 0} GB</strong> / Total: {supervisorData?.performance?.totalSystemMemoryGb ?? 0} GB
                </div>
              </div>

              {/* 4. Koneksi Pengguna (Sesi Aktif & Total Pengguna) */}
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

            {/* Sub-grid: Status Port 4 Layanan SIMASMUH + Bench Jaringan Ringkas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* Status Port Layanan (Info Port + Latensi jika online, Badge Offline jika offline) */}
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

            {/* Load Sistem & Waiting Room Ringkas */}
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

          {/* KARTU 2: SESI PENGGUNA LIVE LOG (TERPISAH) */}
          <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs border">
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

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
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
                  {(supervisorData?.taskManager?.lastActiveSessions || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-500">
                        Belum ada catatan riwayat sesi aktif
                      </td>
                    </tr>
                  ) : (
                    (supervisorData?.taskManager?.lastActiveSessions || []).slice(0, 6).map((s: any, idx: number) => (
                      <tr key={s.userId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
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
        </div>
      )}

      {/* POP-UP MODAL: LIHAT RINCIAN SELURUH SESI & PERANGKAT PENGGUNA */}
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

      {/* POP-UP MODAL: LIHAT SEMUA SESI PENGGUNA TERKONEKSI (SUPERVISOR ALL LIVE SESSIONS) */}
      {showAllSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border-slate-700 text-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header Modal */}
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
                    Pengawasan seluruh sesi login pengguna aktif & riwayat sesi sistem SIMASMUH
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

            {/* Footer Modal */}
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

      {/* Kartu Statistika Populasi (Khusus Admin TU / BAU) */}
      {(role === 'ADMIN_TU' || role === 'BAU' || role === 'TATA_USAHA' || subRole === 'ADMIN_TU' || subRole === 'BAU') && (
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {adminStats.map((stat, i) => (
            <Card key={i} className="group relative border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs hover:shadow-xl dark:hover:border-slate-700 transition-all duration-300 overflow-hidden hover:-translate-y-1 flex flex-col justify-between rounded-2xl p-4 sm:p-5">
              <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${stat.glow} rounded-full blur-2xl pointer-events-none opacity-80 group-hover:scale-125 transition-transform duration-500`}></div>
              <div className="flex items-start justify-between gap-2 relative z-10">
                <span className="text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-snug">
                  {stat.title}
                </span>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl shrink-0 flex items-center justify-center ${stat.bg} border ${stat.border} shadow-2xs group-hover:scale-110 transition-transform duration-300 backdrop-blur-md`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="relative z-10 mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Urgent System Announcement Popup */}
      <UrgentAnnouncementPopup announcements={systemAnnouncements} />

      {/* Dialog Canvas Tanda Tangan Digital (E-Sign) Pimpinan / Kepala Sekolah */}
      <SignaturePadDialog
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        userName={(session?.user as any)?.name || 'Kepala Sekolah'}
        userRole={role}
        pendingCounts={{
          dispensasi: execStats?.persuratan?.pendingDispensasi || 0,
          disposisi: execStats?.persuratan?.pendingDisposisi || 0,
          suratKeluar: execStats?.persuratan?.pendingSuratKeluar || 0
        }}
      />

      {/* Selesai konten dashboard utama */}
    </div>
  )
}

