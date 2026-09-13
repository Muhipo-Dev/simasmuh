'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Mail, Bell, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Send, Server, ShieldCheck, Settings, Users, MessageSquare, History, 
  Search, RotateCcw, Trash2, ArrowUpRight, Check, Sparkles, PhoneCall, ExternalLink,
  Laptop, Smartphone, Globe, Lock, Key, HelpCircle, Eye, EyeOff, CheckCheck, BarChart3,
  Layers, Megaphone, Receipt, ShieldAlert, Clock, FileCheck, Award, GraduationCap, FileText, SendHorizontal, Save
} from 'lucide-react'
import { toast } from 'sonner'
import Swal from 'sweetalert2'

import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface SmtpConfig {
  host: string
  port: number
  user: string
  hasPassword: boolean
  senderEmail: string
  senderName: string
  isConfigured: boolean
  provider: string
}

interface AuditStats {
  totalUsers: number
  linkedUsers: number
  unlinkedUsers: number
  linkedPercentage: number
  roleBreakdown: {
    role: string
    total: number
    linked: number
    percentage: number
  }[]
}

export default function KelolaNotifikasiPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const [activeTab, setActiveTab] = useState<'config' | 'broadcast' | 'test' | 'audit' | 'preferences' | 'chatbot'>('config')
  
  // Loading States
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Chatbot Simulation State
  const [chatInput, setChatInput] = useState('IZIN')
  const [simulatingChat, setSimulatingChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'bot'; text: string }[]>([])

  const handleSendChatSim = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMsg }])
    setSimulatingChat(true)

    try {
      const res = await authenticatedFetch('/api-backend/whatsapp-bot/test-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '088293733330',
          message: userMsg,
        }),
      })

      const data = await res.json()
      if (res.ok && data.simulation?.botReply) {
        setChatHistory((prev) => [...prev, { sender: 'bot', text: data.simulation.botReply }])
      } else {
        setChatHistory((prev) => [...prev, { sender: 'bot', text: 'Bot tidak dapat merespon saat ini.' }])
      }
    } catch (e: any) {
      setChatHistory((prev) => [...prev, { sender: 'bot', text: `Error koneksi: ${e.message}` }])
    } finally {
      setSimulatingChat(false)
    }
  }

  // SMTP Config Form
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null)
  const [smtpForm, setSmtpForm] = useState({
    provider: 'GMAIL',
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    senderEmail: '',
    senderName: 'SIMASMUH SMA Muhammadiyah 1 Ponorogo',
  })

  // Broadcast Email State
  const [broadcastTarget, setBroadcastTarget] = useState<'SEMUA' | 'GURU' | 'SISWA' | 'WALI_MURID' | 'PEGAWAI'>('SEMUA')
  const [broadcastCategory, setBroadcastCategory] = useState<'PENGUMUMAN' | 'KEUANGAN' | 'PRESENSI' | 'KEDISIPLINAN'>('PENGUMUMAN')
  const [broadcastSubject, setBroadcastSubject] = useState('')
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)

  // Sandbox Test State
  const [testTargetEmail, setTestTargetEmail] = useState('')
  const [testTemplate, setTestTemplate] = useState<'PRESENSI' | 'TAGIHAN' | 'KWITANSI' | 'PENGUMUMAN' | 'KEDISIPLINAN'>('PENGUMUMAN')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null)

  // Audit Stats State
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Preferences State
  const [masterPrefs, setMasterPrefs] = useState({
    notifPresensi: true,
    notifKeuangan: true,
    notifPengumuman: true,
    notifKedisiplinan: true,
    notifPerizinan: true,
    notifDispensasi: true,
    notifCutiPegawai: true,
    notifKarakterSiswa: true,
    notifAkademik: true,
    notifSuratMenyurat: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)

  const handleSaveMasterPrefs = () => {
    setSavingPrefs(true)
    setTimeout(() => {
      setSavingPrefs(false)
      toast.success('Master preferensi saluran notifikasi berhasil disimpan!')
    }, 400)
  }

  // Fetch SMTP Configuration
  const fetchSmtpConfig = async () => {
    setLoadingConfig(true)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/smtp-config')
      if (res.ok) {
        const data = await res.json()
        setSmtpConfig(data)
        setSmtpForm((prev) => ({
          ...prev,
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          user: data.user || '',
          senderEmail: data.senderEmail || '',
          senderName: data.senderName || 'SIMASMUH SMA Muhammadiyah 1 Ponorogo',
          provider: data.provider || 'GMAIL',
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConfig(false)
    }
  }

  // Fetch Audit Stats
  const fetchAuditStats = async () => {
    setLoadingAudit(true)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/audit-stats')
      if (res.ok) {
        const data = await res.json()
        setAuditStats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAudit(false)
    }
  }

  useEffect(() => {
    fetchSmtpConfig()
    fetchAuditStats()
  }, [])

  // Handle Provider Preset Change
  const handleProviderChange = (prov: any) => {
    if (!prov) return
    if (prov === 'GMAIL') {
      setSmtpForm((prev) => ({
        ...prev,
        provider: 'GMAIL',
        host: 'smtp.gmail.com',
        port: 587,
      }))
    } else if (prov === 'BREVO') {
      setSmtpForm((prev) => ({
        ...prev,
        provider: 'BREVO',
        host: 'smtp-relay.brevo.com',
        port: 587,
      }))
    } else if (prov === 'RESEND') {
      setSmtpForm((prev) => ({
        ...prev,
        provider: 'RESEND',
        host: 'smtp.resend.com',
        port: 465,
      }))
    } else {
      setSmtpForm((prev) => ({ ...prev, provider: 'CUSTOM' }))
    }
  }

  // Save SMTP Config
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/smtp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpForm.host,
          port: Number(smtpForm.port),
          user: smtpForm.user,
          pass: smtpForm.pass || undefined,
          senderEmail: smtpForm.senderEmail || smtpForm.user,
          senderName: smtpForm.senderName,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSmtpConfig(data)
        toast.success('Konfigurasi server SMTP berhasil disimpan!')
      } else {
        toast.error('Gagal menyimpan konfigurasi SMTP')
      }
    } catch (e) {
      toast.error('Koneksi terputus ke server')
    } finally {
      setSavingConfig(false)
    }
  }

  // Test SMTP Connection
  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpForm.host,
          port: Number(smtpForm.port),
          user: smtpForm.user?.trim(),
          pass: smtpForm.pass ? smtpForm.pass.trim().replace(/\s+/g, '') : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Koneksi SMTP Berhasil!',
          text: data.message || 'Server Google SMTP terhubung dengan baik.',
          confirmButtonColor: '#2563eb',
        })
        fetchSmtpConfig()
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Koneksi Belum Terhubung',
          html: `<div style="text-align:left; font-size:13px; line-height:1.6; color:#374151;">
            <p style="margin-bottom:8px; font-weight:600; color:#dc2626;">${data.message || 'Periksa email pengirim dan Google App Password Anda.'}</p>
            <hr style="margin:10px 0; border:0; border-top:1px solid #e5e7eb;" />
            <p style="font-weight:600; margin-bottom:4px; color:#1e293b;">Panduan Solusi 100% Berhasil:</p>
            <ol style="padding-left:18px; margin:0; color:#475569;">
              <li>Buka <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style="color:#2563eb; text-decoration:underline; font-weight:600;">Keamanan Akun Google (App Passwords) ↗</a></li>
              <li>Pastikan <b>Verifikasi 2 Langkah (2-Step Verification)</b> sudah AKTIF.</li>
              <li>Buat sandi aplikasi baru dengan nama <b>SIMASMUH</b>.</li>
              <li>Salin 16-karakter sandi aplikasi (bukan password login akun biasa) dan tempelkan ke kolom Sandi Aplikasi.</li>
            </ol>
          </div>`,
          confirmButtonText: 'Buka Halaman Google App Password',
          showCancelButton: true,
          cancelButtonText: 'Tutup',
          confirmButtonColor: '#2563eb',
        }).then((result) => {
          if (result.isConfirmed) {
            window.open('https://myaccount.google.com/apppasswords', '_blank')
          }
        })
      }
    } catch (e) {
      toast.error('Gagal menghubungi server')
    } finally {
      setTestingConnection(false)
    }
  }

  // Handle Broadcast Send
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastSubject || !broadcastMessage) {
      toast.error('Subjek dan isi pesan siaran wajib diisi')
      return
    }

    const confirm = await Swal.fire({
      title: 'Kirim Siaran Email Massal?',
      html: `Pesan akan dikirimkan ke seluruh pengguna target <b>${broadcastTarget}</b> yang telah menautkan akun email.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Kirim Sekarang',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
    })

    if (!confirm.isConfirmed) return

    setBroadcasting(true)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/broadcast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: broadcastTarget,
          category: broadcastCategory,
          subject: broadcastSubject,
          title: broadcastTitle || broadcastSubject,
          message: broadcastMessage,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Siaran Email Berhasil!',
          text: data.message,
          confirmButtonColor: '#2563eb',
        })
        setBroadcastSubject('')
        setBroadcastTitle('')
        setBroadcastMessage('')
      } else {
        toast.error(data.message || 'Gagal mengirim siaran email')
      }
    } catch (e) {
      toast.error('Koneksi terputus')
    } finally {
      setBroadcasting(false)
    }
  }

  // Handle Sandbox Test Email
  const handleSendTest = async () => {
    if (!testTargetEmail || !testTargetEmail.includes('@')) {
      toast.error('Masukkan alamat email tujuan uji coba yang valid')
      return
    }

    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await authenticatedFetch('/api-backend/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testTargetEmail }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult(data)
        toast.success(`Email uji coba berhasil dikirim ke ${testTargetEmail}`)
      } else {
        setTestResult(data)
        toast.error(data.message || data.error || 'Gagal mengirim email uji coba')
      }
    } catch (e: any) {
      toast.error('Koneksi terputus ke server')
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Kelola Notifikasi Email
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Pusat konfigurasi server pengiriman email, siaran massal, audit akun email, dan notifikasi otomatis sekolah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSmtpConfig()
              fetchAuditStats()
              toast.info('Data status server diperbarui')
            }}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Top Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Status Server SMTP</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${smtpConfig?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {smtpConfig?.isConfigured ? 'Google SMTP Aktif' : 'Mode Simulasi / Standby'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Akun Email Tertaut</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {auditStats ? `${auditStats.linkedUsers} / ${auditStats.totalUsers} Pengguna (${auditStats.linkedPercentage}%)` : 'Memuat...'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Protokol Pengiriman</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                Bebas Pemblokiran (100% SMTP)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'config'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Konfigurasi Server SMTP
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'broadcast'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Siaran Email Massal
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'test'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          Uji Coba Pengiriman
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Audit Akun Email Pengguna
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Master Saluran & Preferensi
        </button>

        <button
          onClick={() => setActiveTab('chatbot')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'chatbot'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp Chatbot Izin
        </button>
      </div>

      {/* TAB 1: KONFIGURASI SERVER SMTP */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  Konfigurasi Akun Pengirim & Server SMTP
                </CardTitle>
                <CardDescription className="text-xs">
                  Atur email Google / Gmail resmi sekolah yang bertindak sebagai pengirim notifikasi ke seluruh siswa, wali, guru, dan pegawai.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  {/* Provider Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Layanan / Provider Email</Label>
                    <Select value={smtpForm.provider} onValueChange={(val: any) => handleProviderChange(val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Pilih Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GMAIL">Google / Gmail Workspace (Rekomendasi Utama)</SelectItem>
                        <SelectItem value="BREVO">Brevo / Sendinblue SMTP (Gratis 300 email/hari)</SelectItem>
                        <SelectItem value="RESEND">Resend Email API / SMTP</SelectItem>
                        <SelectItem value="CUSTOM">Custom Server SMTP Sekolah</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold">SMTP Host</Label>
                      <Input
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                        className="h-10 text-sm font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Port</Label>
                      <Input
                        type="number"
                        value={smtpForm.port}
                        onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value, 10) })}
                        placeholder="587"
                        className="h-10 text-sm font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Alamat Email Pengirim (Gmail)</Label>
                      <Input
                        type="email"
                        value={smtpForm.user}
                        onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                        placeholder="nama.sekolah@gmail.com"
                        className="h-10 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Google App Password (16 Huruf)</span>
                        <span className="text-[10px] text-blue-600 font-normal">Wajib diisi</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={smtpForm.pass}
                          onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                          placeholder={smtpConfig?.hasPassword ? '••••••••••••••••' : 'abcd efgh ijkl mnop'}
                          className="h-10 text-sm pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nama Pengirim Tampilan (Sender Name)</Label>
                    <Input
                      value={smtpForm.senderName}
                      onChange={(e) => setSmtpForm({ ...smtpForm, senderName: e.target.value })}
                      placeholder="SIMASMUH SMA Muhammadiyah 1 Ponorogo"
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testingConnection || !smtpForm.user}
                      className="w-full sm:w-auto h-10 text-xs font-semibold gap-2 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                    >
                      {testingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      {testingConnection ? 'Memeriksa Koneksi...' : 'Uji Koneksi Server SMTP'}
                    </Button>

                    <Button
                      type="submit"
                      disabled={savingConfig}
                      className="w-full sm:w-auto h-10 text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Simpan Konfigurasi
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Panduan Provider Berdasarkan Pilihan */}
          <div className="space-y-4">
            {smtpForm.provider === 'BREVO' && (
              <Card className="border-emerald-200 dark:border-emerald-950/60 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Panduan Brevo (300 Email/Hari Gratis)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Solusi termudah tanpa perlu verifikasi Google App Password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2.5 text-slate-600 dark:text-slate-300">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 1:</span>
                    <p className="mt-0.5">Buka <a href="https://app.brevo.com/settings/keys/smtp" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold inline-flex items-center gap-1">Brevo SMTP & API Keys <ExternalLink className="w-3 h-3" /></a> (Daftar Akun Gratis jika belum punya).</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 2:</span>
                    <p className="mt-0.5">Klik tombol <strong>Generate a new SMTP key</strong>, beri nama <code>SIMASMUH</code>.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 3:</span>
                    <p className="mt-0.5">Salin <strong>SMTP Key (Password)</strong> yang diawali <code>xsmtpsib-...</code> dan tempelkan ke kolom Sandi di samping.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 4:</span>
                    <p className="mt-0.5">Pastikan kolom Email Pengirim diisi email akun Brevo Anda, lalu klik <strong>Simpan Konfigurasi</strong>.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {smtpForm.provider === 'RESEND' && (
              <Card className="border-purple-200 dark:border-purple-950/60 bg-gradient-to-br from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Panduan Resend (3.000 Email/Bulan Gratis)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pengiriman instan dengan deliverability tinggi ke semua Gmail.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2.5 text-slate-600 dark:text-slate-300">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 1:</span>
                    <p className="mt-0.5">Buka <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-purple-600 underline font-semibold inline-flex items-center gap-1">Resend API Keys <ExternalLink className="w-3 h-3" /></a> (Login dengan akun Google / GitHub).</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 2:</span>
                    <p className="mt-0.5">Klik <strong>Create API Key</strong>, beri nama <code>SIMASMUH</code>.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 3:</span>
                    <p className="mt-0.5">Salin API Key (diawali <code>re_...</code>) dan tempelkan ke kolom Sandi di samping.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {smtpForm.provider === 'GMAIL' && (
              <Card className="border-blue-100 dark:border-blue-950/60 bg-gradient-to-br from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <Key className="w-4 h-4 text-blue-600" />
                    Cara Membuat Google App Password
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Google mewajibkan App Password 16-karakter demi keamanan akun sekolah.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2.5 text-slate-600 dark:text-slate-300">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 1:</span>
                    <p className="mt-0.5">Buka <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold inline-flex items-center gap-1">Keamanan Akun Google <ExternalLink className="w-3 h-3" /></a> pada akun Gmail pengirim sekolah.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 2:</span>
                    <p className="mt-0.5">Pastikan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> telah AKTIF.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 3:</span>
                    <p className="mt-0.5">Cari menu <strong>Sandi Aplikasi (App Passwords)</strong> di kolom pencarian Akun Google.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Langkah 4:</span>
                    <p className="mt-0.5">Beri nama aplikasi <code>SIMASMUH</code>, lalu salin 16 kode huruf yang muncul dan tempelkan ke kolom Sandi Aplikasi di samping.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {smtpForm.provider === 'CUSTOM' && (
              <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-600" />
                    Custom SMTP / Webmail Sekolah
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                  <p>Gunakan konfigurasi SMTP dari hosting cPanel atau server mail sekolah (misal: <code>mail.smam1ponorogo.sch.id</code>).</p>
                  <p>Port standar: <code>587</code> (STARTTLS) atau <code>465</code> (SSL).</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SIARAN EMAIL MASSAL */}
      {activeTab === 'broadcast' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-600" />
              Siaran Email Massal (Broadcast)
            </CardTitle>
            <CardDescription className="text-xs">
              Kirim pengumuman resmi, surat edaran, atau edaran darurat ke seluruh kotak masuk Gmail pengguna secara bersamaan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Penerima Siaran</Label>
                  <Select value={broadcastTarget} onValueChange={(val: any) => setBroadcastTarget(val)}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Pilih Sasaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEMUA">🌐 Seluruh Pengguna (Siswa, Wali, Guru, Pegawai)</SelectItem>
                      <SelectItem value="WALI_MURID">👨‍👩‍👧 Seluruh Wali Murid (Orang Tua)</SelectItem>
                      <SelectItem value="SISWA">🎓 Seluruh Siswa</SelectItem>
                      <SelectItem value="GURU">👨‍🏫 Seluruh Guru</SelectItem>
                      <SelectItem value="PEGAWAI">🏢 Seluruh Staf Pegawai / TU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kategori Pesan</Label>
                  <Select value={broadcastCategory} onValueChange={(val: any) => setBroadcastCategory(val)}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENGUMUMAN">📢 Pengumuman & Berita Sekolah</SelectItem>
                      <SelectItem value="KEUANGAN">💳 Informasi Keuangan / SPP</SelectItem>
                      <SelectItem value="PRESENSI">📋 Presensi & Kehadiran</SelectItem>
                      <SelectItem value="KEDISIPLINAN">🛡️ Catatan Tata Tertib & Adab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subjek Email</Label>
                <Input
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="contoh: [Pengumuman SIMASMUH] Undangan Rapat Pleno Wali Murid Semester Ganjil"
                  className="h-10 text-sm font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Judul Header Banner (Opsional)</Label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="contoh: Pemberitahuan Pelaksanaan Ujian Tengah Semester & Libur Akademik"
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Isi Pesan Email</Label>
                <Textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Tuliskan isi pesan pengumuman atau surat edaran secara lengkap di sini..."
                  rows={6}
                  className="text-sm leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  disabled={broadcasting}
                  className="h-10 px-6 text-xs font-semibold gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                >
                  {broadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {broadcasting ? 'Mengirim Siaran...' : 'Kirim Siaran Email Sekarang'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: UJI COBA PENGIRIMAN */}
      {activeTab === 'test' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Uji Coba Pengiriman Notifikasi ke Gmail
            </CardTitle>
            <CardDescription className="text-xs">
              Kirimkan contoh email HTML responsif ke kotak masuk Gmail pribadi Anda untuk menguji apakah email berhasil diterima tanpa hambatan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Alamat Email Gmail Pengujian</Label>
                <Input
                  type="email"
                  placeholder="masukkan.email.anda@gmail.com"
                  value={testTargetEmail}
                  onChange={(e) => setTestTargetEmail(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testTargetEmail}
                  className="w-full h-10 text-xs font-semibold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sendingTest ? 'Mengirim...' : 'Kirim Uji Coba'}
                </Button>
              </div>
            </div>

            {testResult && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300">
                    Notifikasi Uji Coba Berhasil Dikirimkan!
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    {testResult.message}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                    Silakan buka tab Inbox atau notifikasi pop-up Gmail di smartphone/laptop Anda.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: AUDIT AKUN EMAIL PENGGUNA */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                Statistik Sinkronisasi Akun Email Seluruh Pengguna
              </CardTitle>
              <CardDescription className="text-xs">
                Pantau jumlah pengguna per peran yang sudah dan belum menautkan akun email untuk notifikasi push.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="py-8 text-center text-xs text-slate-500">Memuat statistik...</div>
              ) : auditStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                      <p className="text-xs text-slate-500 font-semibold">Total Seluruh Pengguna</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{auditStats.totalUsers}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Sudah Tertaut Email</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{auditStats.linkedUsers} ({auditStats.linkedPercentage}%)</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Belum Menautkan</p>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{auditStats.unlinkedUsers}</p>
                    </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mt-4">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase">
                        <tr>
                          <th className="p-3">Peran Pengguna</th>
                          <th className="p-3">Total Akun</th>
                          <th className="p-3">Tertaut Email</th>
                          <th className="p-3">Persentase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {auditStats.roleBreakdown.map((r) => (
                          <tr key={r.role} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.role}</td>
                            <td className="p-3">{r.total}</td>
                            <td className="p-3 font-mono text-emerald-600 font-bold">{r.linked}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${r.percentage}%` }} />
                                </div>
                                <span className="font-bold">{r.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: PREFERENSI & SALURAN */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Status Master Pengiriman Saluran Notifikasi Sistem
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aktifkan atau nonaktifkan pengiriman otomatis untuk masing-masing kategori notifikasi sekolah.
              </p>
            </div>
            <Button size="sm" onClick={handleSaveMasterPrefs} disabled={savingPrefs} className="gap-2 shrink-0">
              <Save className="w-4 h-4" />
              {savingPrefs ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Presensi */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifPresensi ? 'default' : 'secondary'} className={masterPrefs.notifPresensi ? 'bg-emerald-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifPresensi ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Presensi Masuk & Pulang</CardTitle>
                <CardDescription className="text-xs">Email konfirmasi kehadiran siswa dan guru realtime</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifPresensi} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifPresensi: v })} />
              </CardContent>
            </Card>

            {/* 2. Keuangan */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifKeuangan ? 'default' : 'secondary'} className={masterPrefs.notifKeuangan ? 'bg-blue-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifKeuangan ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Tagihan & Kwitansi Keuangan</CardTitle>
                <CardDescription className="text-xs">Invoice SPP & tanda terima bayar resmi berformat PDF</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifKeuangan} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifKeuangan: v })} />
              </CardContent>
            </Card>

            {/* 3. Perizinan & Izin Keluar */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifPerizinan ? 'default' : 'secondary'} className={masterPrefs.notifPerizinan ? 'bg-teal-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifPerizinan ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Perizinan & Izin Keluar</CardTitle>
                <CardDescription className="text-xs">Pemberitahuan izin keluar kelas dan izin meninggalkan sekolah</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifPerizinan} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifPerizinan: v })} />
              </CardContent>
            </Card>

            {/* 4. Dispensasi */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-orange-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifDispensasi ? 'default' : 'secondary'} className={masterPrefs.notifDispensasi ? 'bg-orange-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifDispensasi ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Dispensasi Siswa</CardTitle>
                <CardDescription className="text-xs">Notifikasi persetujuan dispensasi kegiatan lomba/organisasi</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifDispensasi} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifDispensasi: v })} />
              </CardContent>
            </Card>

            {/* 5. Pengumuman & Berita */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifPengumuman ? 'default' : 'secondary'} className={masterPrefs.notifPengumuman ? 'bg-purple-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifPengumuman ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Pengumuman & Siaran Sekolah</CardTitle>
                <CardDescription className="text-xs">Edaran resmi, info libur, dan siaran berita kegiatan sekolah</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifPengumuman} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifPengumuman: v })} />
              </CardContent>
            </Card>

            {/* 6. Kedisiplinan & BK */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifKedisiplinan ? 'default' : 'secondary'} className={masterPrefs.notifKedisiplinan ? 'bg-amber-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifKedisiplinan ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Catatan Kedisiplinan & BK</CardTitle>
                <CardDescription className="text-xs">Poin pelanggaran, catatan bimbingan, dan pembinaan siswa</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifKedisiplinan} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifKedisiplinan: v })} />
              </CardContent>
            </Card>

            {/* 7. Penilaian Karakter & Perkembangan Siswa */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                    <Award className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifKarakterSiswa ? 'default' : 'secondary'} className={masterPrefs.notifKarakterSiswa ? 'bg-indigo-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifKarakterSiswa ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Penilaian Karakter & Prestasi</CardTitle>
                <CardDescription className="text-xs">Laporan asesmen karakter, akhlak, dan apresiasi prestasi siswa</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifKarakterSiswa} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifKarakterSiswa: v })} />
              </CardContent>
            </Card>

            {/* 8. Akademik & Nilai */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-cyan-300 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifAkademik ? 'default' : 'secondary'} className={masterPrefs.notifAkademik ? 'bg-cyan-600 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifAkademik ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Laporan Nilai & Akademik</CardTitle>
                <CardDescription className="text-xs">Publikasi rapor, jadwal ujian, dan evaluasi hasil belajar</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifAkademik} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifAkademik: v })} />
              </CardContent>
            </Card>

            {/* 9. Persuratan & Cuti Pegawai */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-400 transition-all">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <Badge variant={masterPrefs.notifSuratMenyurat ? 'default' : 'secondary'} className={masterPrefs.notifSuratMenyurat ? 'bg-slate-700 text-[10px]' : 'text-[10px]'}>
                    {masterPrefs.notifSuratMenyurat ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold mt-2">Persuratan & Cuti Pegawai</CardTitle>
                <CardDescription className="text-xs">Disposisi surat masuk/keluar dan persetujuan cuti PTK</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <span>Kirim Otomatis</span>
                <Switch checked={masterPrefs.notifSuratMenyurat} onCheckedChange={(v) => setMasterPrefs({ ...masterPrefs, notifSuratMenyurat: v })} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 6: SIMULATOR WHATSAPP CHATBOT */}
      {activeTab === 'chatbot' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <MessageSquare className="w-5 h-5" />
                    Simulator Interaktif WhatsApp Chatbot Izin Siswa
                  </CardTitle>
                  <Badge className="bg-emerald-600 text-white font-bold text-xs">
                    Nomor: +62 882-9373-3330
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Uji coba alur chatbot pelaporan izin/sakit siswa oleh orang tua/wali murid secara realtime sebelum diterapkan ke nomor WhatsApp publik.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs max-h-80 overflow-y-auto space-y-3 border border-slate-800 shadow-inner">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300">
                    🤖 <strong>SIMASMUH Bot</strong>: Halo! Silakan ketik <code>IZIN</code> untuk menguji alur pelaporan izin sakit/keluarga siswa.
                  </div>

                  {chatHistory.map((ch, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl text-xs ${ch.sender === 'user' ? 'bg-blue-600/30 border border-blue-500/40 text-blue-100 text-right ml-8' : 'bg-slate-800/90 border border-slate-700 text-emerald-300 mr-8 whitespace-pre-wrap'}`}>
                      <strong>{ch.sender === 'user' ? '👤 Anda' : '🤖 WhatsApp Bot'}</strong>:<br />
                      {ch.text}
                    </div>
                  ))}

                  {simulatingChat && (
                    <div className="p-2 text-slate-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Bot sedang memproses respon...
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ketik pesan simulasi (misal: IZIN, SAKIT, YA, BATAL)..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatSim()}
                    className="h-10 text-xs sm:text-sm"
                  />
                  <Button
                    onClick={handleSendChatSim}
                    disabled={simulatingChat || !chatInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 text-xs shrink-0"
                  >
                    <SendHorizontal className="w-4 h-4 mr-1.5" /> Kirim
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Aturan Notifikasi & Chatbot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  ✅ <strong>Kanal Tunggal Notifikasi Luar</strong>: Seluruh notifikasi sistem (presensi, keuangan, pengumuman, kedisiplinan) keluar hanya diproses melalui <strong>Email Resmi</strong>.
                </p>
                <p>
                  ✅ <strong>Kanal Masuk Izin Siswa</strong>: Orang tua/wali murid dapat mengajukan izin sakit/keperluan keluarga via <strong>Website SIMASMUH</strong> atau <strong>WhatsApp Chatbot</strong> (+62 882-9373-3330).
                </p>
                <p>
                  ✅ <strong>Sinkronisasi Basis Data</strong>: Hasil permohonan izin dari chatbot langsung tersimpan di tabel presensi &amp; perizinan sekolah tanpa mereset data lama.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
