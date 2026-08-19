'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Bell, BellRing, Smartphone, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Send, Server, ShieldCheck, Settings, Users, MessageSquare, History, 
  Search, RotateCcw, Trash2, ArrowUpRight, Check, Sparkles, PhoneCall, ExternalLink, Activity
} from 'lucide-react'
import { toast } from 'sonner'
import Swal from 'sweetalert2'

import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface GatewayStatus {
  online: boolean
  status: string
  connectedPhone?: string | null
  user?: {
    id?: string
    name?: string
  } | null
  hasQr?: boolean
  config?: {
    whatsappSenderNumber?: string
    whatsappApiUrl?: string
    whatsappApiKey?: string
    schoolName?: string
  }
}

interface WhatsAppLog {
  id: string
  recipientPhone: string
  recipientName?: string | null
  recipientRole?: string | null
  category: string
  title?: string | null
  message: string
  status: string
  responseMessage?: string | null
  createdAt: string
}

export default function KelolaNotifikasiPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'broadcast' | 'test' | 'logs'>('overview')
  
  // States
  const [statusLoading, setStatusLoading] = useState(true)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null)
  
  // Config state
  const [senderNumber, setSenderNumber] = useState('088293733330')
  const [apiUrl, setApiUrl] = useState('http://localhost:3002/api/send')
  const [apiKey, setApiKey] = useState('simasmuh_wa_secret_2026')
  const [savingConfig, setSavingConfig] = useState(false)

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState<'SEMUA' | 'GURU' | 'SISWA' | 'ORANG_TUA' | 'PEGAWAI'>('SEMUA')
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)

  // Test state
  const [testPhone, setTestPhone] = useState('')
  const [testName, setTestName] = useState('')
  const [testTemplate, setTestTemplate] = useState('CUSTOM')
  const [testMessage, setTestMessage] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Logs state
  const [logs, setLogs] = useState<WhatsAppLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [logsLoading, setLogsLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Fetch Gateway Status
  const fetchGatewayStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await authenticatedFetch('/api-backend/whatsapp/status')
      if (res.ok) {
        const data = await res.json()
        setGatewayStatus(data)
        if (data.config) {
          if (data.config.whatsappSenderNumber) setSenderNumber(data.config.whatsappSenderNumber)
          if (data.config.whatsappApiUrl) setApiUrl(data.config.whatsappApiUrl)
          if (data.config.whatsappApiKey) setApiKey(data.config.whatsappApiKey)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStatusLoading(false)
    }
  }

  // Fetch Logs
  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '50')
      if (filterCategory !== 'ALL') params.append('category', filterCategory)
      if (filterStatus !== 'ALL') params.append('status', filterStatus)

      const res = await authenticatedFetch(`/api-backend/whatsapp/logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalLogs(data.total || 0)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchGatewayStatus()
    fetchLogs()
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, filterCategory, filterStatus])

  // Save Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const res = await authenticatedFetch('/api-backend/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappSenderNumber: senderNumber,
          whatsappApiUrl: apiUrl,
          whatsappApiKey: apiKey,
        }),
      })
      if (res.ok) {
        toast.success('Pengaturan WhatsApp berhasil disimpan!')
        fetchGatewayStatus()
      } else {
        toast.error('Gagal menyimpan pengaturan WhatsApp')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan')
    } finally {
      setSavingConfig(false)
    }
  }

  // Send Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Judul dan isi pesan broadcast wajib diisi')
      return
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Kirim Broadcast',
      text: `Kirim notifikasi massal via WhatsApp ke target [${broadcastTarget}]?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Kirim Sekarang',
      cancelButtonText: 'Batal',
    })

    if (!confirm.isConfirmed) return

    setBroadcasting(true)
    try {
      const res = await authenticatedFetch('/api-backend/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: broadcastTarget,
          title: broadcastTitle,
          message: broadcastMessage,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        Swal.fire({
          title: 'Broadcast Berhasil Dikirim!',
          text: `Total Sasaran: ${data.totalTarget} | Berhasil: ${data.successCount} | Gagal/Simulasi: ${data.failCount}`,
          icon: 'success',
        })
        setBroadcastTitle('')
        setBroadcastMessage('')
        fetchLogs()
      } else {
        toast.error(data?.message || 'Gagal mengirim broadcast')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan')
    } finally {
      setBroadcasting(false)
    }
  }

  // Test Template Selection
  const handleSelectTemplate = (val: string) => {
    setTestTemplate(val)
    if (val === 'PRESENSI_MASUK') {
      setTestMessage('✅ PRESENSI MASUK TERCATAT: Siswa Ahmad Fauzi (Kelas X-A) telah hadir di SMA Muhammadiyah 1 Ponorogo pada pukul 06:45 WIB.')
    } else if (val === 'PRESENSI_PULANG') {
      setTestMessage('🏠 PRESENSI PULANG: Siswa Ahmad Fauzi (Kelas X-A) telah melakukan presensi pulang sekolah pada pukul 14:15 WIB.')
    } else if (val === 'TAGIHAN_SPP') {
      setTestMessage('💳 INFORMASI TAGIHAN: Tagihan SPP Bulan Maret 2026 sebesar Rp 350.000 atas nama Ahmad Fauzi telah diterbitkan.')
    } else if (val === 'PEMBAYARAN_LUNAS') {
      setTestMessage('✅ VERIFIKASI LUNAS: Pembayaran Tagihan SPP sebesar Rp 350.000 telah diverifikasi oleh Bendahara Sekolah. Terima kasih.')
    } else {
      setTestMessage('Ini adalah pesan uji coba pengiriman notifikasi WhatsApp dari Sistem SIMASMUH.')
    }
  }

  // Send Test Message
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testPhone) {
      toast.error('Nomor WhatsApp penerima wajib diisi')
      return
    }

    setSendingTest(true)
    try {
      const res = await authenticatedFetch('/api-backend/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          recipientName: testName || 'Pengguna Uji Coba',
          message: testMessage || 'Uji coba notifikasi WhatsApp SIMASMUH.',
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Notifikasi terkirim ke ${testPhone}!`)
        fetchLogs()
      } else {
        toast.warning(data.message || 'Pesan selesai diproses (simulasi/gateway mode)')
        fetchLogs()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan pengiriman')
    } finally {
      setSendingTest(false)
    }
  }

  // Retry Log
  const handleRetryLog = async (id: string) => {
    setRetryingId(id)
    try {
      const res = await authenticatedFetch(`/api-backend/whatsapp/retry/${id}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Pesan WhatsApp berhasil dikirim ulang!')
        fetchLogs()
      } else {
        toast.info(data.message || 'Kirim ulang diproses')
        fetchLogs()
      }
    } catch (err: any) {
      toast.error('Gagal mengirim ulang pesan')
    } finally {
      setRetryingId(null)
    }
  }

  // Clear Logs
  const handleClearLogs = async () => {
    const confirm = await Swal.fire({
      title: 'Hapus Riwayat Log?',
      text: 'Semua catatan log pengiriman WhatsApp akan dibersihkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Bersihkan',
      cancelButtonText: 'Batal',
    })
    if (!confirm.isConfirmed) return

    try {
      const res = await authenticatedFetch('/api-backend/whatsapp/logs/clear', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Log notifikasi berhasil dibersihkan!')
        fetchLogs()
      }
    } catch (e) {
      toast.error('Gagal membersihkan log')
    }
  }

  const isConnected = gatewayStatus?.online && gatewayStatus?.status === 'CONNECTED'
  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (l.recipientPhone && l.recipientPhone.includes(q)) ||
      (l.recipientName && l.recipientName.toLowerCase().includes(q)) ||
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.message && l.message.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
              <BellRing className="w-3.5 h-3.5" />
              Pusat Kendali Notifikasi Terpusat
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kelola Notifikasi & WhatsApp Gateway
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Konfigurasi, pantau, dan kirimkan notifikasi ganda (WhatsApp & In-App) otomatis untuk presensi, tagihan, pembayaran, dan siaran pengumuman.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchGatewayStatus}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium backdrop-blur-md border border-white/20 transition active:scale-95 shadow"
            >
              <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
              Segarkan Status
            </button>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-bold transition active:scale-95 shadow-lg"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Buka Gateway QR
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Status Strip */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2.5 bg-black/15 px-3.5 py-2 rounded-xl backdrop-blur-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <span className="text-white/70 block">Status Koneksi Gateway</span>
              <span className="font-bold text-white text-sm">
                {isConnected ? '🟢 TERHUBUNG AKTIF' : gatewayStatus?.online ? '🟡 MENUNGGU SCAN QR' : '🔴 TERPUTUS'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-black/15 px-3.5 py-2 rounded-xl backdrop-blur-sm">
            <PhoneCall className="w-4 h-4 text-emerald-300" />
            <div>
              <span className="text-white/70 block">Nomor Pengirim Resmi</span>
              <span className="font-bold text-white text-sm">
                {gatewayStatus?.connectedPhone || senderNumber || '088293733330'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-black/15 px-3.5 py-2 rounded-xl backdrop-blur-sm">
            <Activity className="w-4 h-4 text-cyan-300" />
            <div>
              <span className="text-white/70 block">Total Log Tercatat</span>
              <span className="font-bold text-white text-sm">{totalLogs} Pesan Notifikasi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {[
          { id: 'overview', label: 'Dashboard & Ringkasan', icon: Activity },
          { id: 'config', label: 'Pengaturan Saluran', icon: Settings },
          { id: 'broadcast', label: 'Kirim Siaran Massal', icon: Send },
          { id: 'test', label: 'Uji Coba Kirim', icon: Smartphone },
          { id: 'logs', label: 'Riwayat Log Pesan', icon: History },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'logs' && totalLogs > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  {totalLogs}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gateway Server</span>
                <span className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600'}`}>
                  <Server className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {isConnected ? 'Connected' : 'Scan Required'}
                </span>
                <span className="text-xs text-gray-500 block mt-1">Port :3002 (Self-Hosted)</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nomor Pengirim</span>
                <span className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600">
                  <Smartphone className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {gatewayStatus?.connectedPhone || '088293733330'}
                </span>
                <span className="text-xs text-gray-500 block mt-1">Akun WhatsApp Bisnis/Resmi</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notifikasi Berhasil</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {logs.filter(l => l.status === 'SENT').length}
                </span>
                <span className="text-xs text-emerald-600 block mt-1">Terkirim ke WhatsApp</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notifikasi Sistem</span>
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">In-App & WA</span>
                <span className="text-xs text-blue-600 block mt-1">Dual-Channel Aktif</span>
              </div>
            </div>
          </div>

          {/* Saluran Notifikasi Terpadu */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-emerald-600" />
              Saluran Notifikasi Otomatis Terintegrasi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: 'Presensi QR & Face AI',
                  desc: 'Kirim notifikasi waktu masuk, pulang, atau izin siswa & guru ke orang tua secara otomatis.',
                  icon: '⏱️',
                  status: 'AKTIF (Dual Channel)',
                },
                {
                  title: 'Tagihan Keuangan Sekolah',
                  desc: 'Penerbitan tagihan SPP, DPP, Seragam, & jatuh tempo langsung terkirim ke WhatsApp wali murid.',
                  icon: '💳',
                  status: 'AKTIF (Dual Channel)',
                },
                {
                  title: 'Verifikasi Pembayaran',
                  desc: 'Notifikasi konfirmasi saat bukti bayar berhasil disetujui atau memerlukan perbaikan.',
                  icon: '💰',
                  status: 'AKTIF (Dual Channel)',
                },
                {
                  title: 'Siaran Berita & Pengumuman',
                  desc: 'Pengumuman resmi sekolah dan agenda kegiatan disiarkan langsung ke akun pengguna & nomor WhatsApp.',
                  icon: '📢',
                  status: 'AKTIF (Dual Channel)',
                },
                {
                  title: 'Izin Keluar & Kehadiran',
                  desc: 'Notifikasi persetujuan perizinan keluar lingkungan sekolah secara realtime.',
                  icon: '🚪',
                  status: 'AKTIF (Dual Channel)',
                },
                {
                  title: 'Audit & Log Notifikasi',
                  desc: 'Pencatatan riwayat setiap pesan WhatsApp beserta status respons dan opsi kirim ulang.',
                  icon: '📋',
                  status: 'AKTIF',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIG */}
      {activeTab === 'config' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Konfigurasi WhatsApp Gateway Server
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Atur endpoint API WhatsApp dan nomor resmi yang digunakan untuk mengirim pesan.
            </p>

            <form onSubmit={handleSaveConfig} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Pengirim
                </label>
                <div className="relative">
                  <PhoneCall className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="088293733330"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Nomor ini harus sesuai dengan nomor WhatsApp yang di-scan pada gateway.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  URL Endpoint WhatsApp Gateway
                </label>
                <div className="relative">
                  <Server className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://localhost:3002/api/send"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  API Key / Secret Token Gateway
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="simasmuh_wa_secret_2026"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {savingConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST */}
      {activeTab === 'broadcast' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Pusat Pengiriman Siaran Notifikasi (WhatsApp Broadcast)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Kirimkan pengumuman, instruksi darurat, atau informasi penting secara massal ke nomor WhatsApp sasaran.
            </p>

            <form onSubmit={handleSendBroadcast} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Sasaran / Target Penerima
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'SEMUA', label: 'Semua Pengguna' },
                    { id: 'GURU', label: 'Seluruh Guru' },
                    { id: 'SISWA', label: 'Seluruh Siswa' },
                    { id: 'ORANG_TUA', label: 'Orang Tua / Wali' },
                    { id: 'PEGAWAI', label: 'Karyawan / Pegawai' },
                  ].map((target) => (
                    <button
                      type="button"
                      key={target.id}
                      onClick={() => setBroadcastTarget(target.id as any)}
                      className={`p-3 rounded-xl text-xs font-bold border transition text-center ${
                        broadcastTarget === target.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Contoh: Pemberitahuan Libur Awal Ramadhan 1447 H"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Isi Pesan Siaran
                </label>
                <textarea
                  rows={5}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Tuliskan isi pesan pengumuman resmi di sini..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {broadcasting ? 'Mengirim Siaran...' : 'Kirim Siaran WhatsApp Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: TEST */}
      {activeTab === 'test' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Uji Coba Pengiriman Notifikasi WhatsApp (Sandbox)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gunakan formulir ini untuk menguji apakah pesan WhatsApp berhasil sampai ke nomor tertentu.
            </p>

            <form onSubmit={handleSendTest} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp Tujuan
                  </label>
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Nama Penerima (Opsional)
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Contoh: Bpk. Siswanto"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Gunakan Contoh Template
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'CUSTOM', label: 'Teks Bebas' },
                    { id: 'PRESENSI_MASUK', label: 'Presensi Masuk' },
                    { id: 'PRESENSI_PULANG', label: 'Presensi Pulang' },
                    { id: 'TAGIHAN_SPP', label: 'Tagihan SPP' },
                    { id: 'PEMBAYARAN_LUNAS', label: 'Bukti Bayar Lunas' },
                  ].map((tpl) => (
                    <button
                      type="button"
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        testTemplate === tpl.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Isi Pesan Uji Coba
                </label>
                <textarea
                  rows={4}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Ketik isi pesan uji coba..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sendingTest ? 'Mengirim Uji Coba...' : 'Kirim Pesan Uji Coba'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Riwayat Pengiriman Notifikasi WhatsApp
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Total {totalLogs} catatan pesan terkirim dari seluruh modul sistem.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                disabled={logsLoading}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 text-xs font-semibold transition"
                title="Segarkan Log"
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleClearLogs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold hover:bg-rose-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Bersihkan Log
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari penerima, nomor, atau pesan..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="PRESENSI">Presensi</option>
              <option value="TAGIHAN">Tagihan</option>
              <option value="PEMBAYARAN">Pembayaran</option>
              <option value="INFORMASI">Informasi / Berita</option>
              <option value="SISTEM">Sistem</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="SENT">Berhasil (SENT)</option>
              <option value="SIMULATED">Simulasi / Dev</option>
              <option value="FAILED">Gagal (FAILED)</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/70 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Nomor WhatsApp</th>
                  <th className="py-3 px-4">Pesan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {logsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Memuat riwayat log notifikasi...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Belum ada catatan log pengiriman WhatsApp.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {log.recipientName || '-'}
                        {log.recipientRole && (
                          <span className="block text-[10px] text-gray-500 font-normal">{log.recipientRole}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700 dark:text-gray-300">
                        {log.recipientPhone}
                      </td>
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="truncate text-gray-800 dark:text-gray-200" title={log.message}>
                          {log.title ? `[${log.title}] ` : ''}{log.message}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Terkirim
                          </span>
                        ) : log.status === 'SIMULATED' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                            <Sparkles className="w-3.5 h-3.5" />
                            Simulasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            Gagal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRetryLog(log.id)}
                          disabled={retryingId === log.id}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 transition"
                          title="Kirim Ulang Pesan"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${retryingId === log.id ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
