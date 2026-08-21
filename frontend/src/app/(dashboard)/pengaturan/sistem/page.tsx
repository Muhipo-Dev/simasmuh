'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  CreditCard, 
  Save, 
  Upload, 
  Loader2, 
  DollarSign, 
  Landmark,
  Layers,
  Sparkles,
  Phone,
  MessageSquare,
  CalendarDays,
  Clock,
  Globe,
  Server,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Wifi
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { compressImageFile } from '@/utils/imageCompressor'
import { useRealtimeServerClock } from '@/lib/time-sync'

type Setting = {
  id: string
  schoolName: string
  address: string
  phone: string | null
  email: string | null
  logoUrl: string | null
  backgroundUrl?: string | null
  principalName: string | null
  principalNip: string | null
  academicYear: string | null
  semester: string | null
  helpdeskPhone?: string | null
  defaultDpp?: number | null
  defaultUka?: number | null
  defaultUks?: number | null
  timezone?: string | null
  serverLocation?: string | null
}

type BankAccount = {
  bankName: string
  bankNumber: string
  bankOwner: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const clock = useRealtimeServerClock(30000) // Sinkronisasi setiap 30 detik

  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    backgroundUrl: '',
    principalName: '',
    principalNip: '',
    helpdeskPhone: '088293733330',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    defaultDpp: 0,
    defaultUka: 0,
    defaultUks: 0,
    timezone: 'Asia/Jakarta',
    serverLocation: 'Ponorogo, Jawa Timur',
  })

  const [bankData, setBankData] = useState({
    bankName: '',
    bankNumber: '',
    bankOwner: ''
  })

  const [isEditingServerMeta, setIsEditingServerMeta] = useState(false)

  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: settings, isLoading } = useQuery<Setting>({
    queryKey: ['settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  const { data: bankAccount, isLoading: loadingBank } = useQuery<BankAccount>({
    queryKey: ['bank-account'],
    queryFn: () => authenticatedQuery('/api-backend/settings/bank-account')
  })

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        schoolName: settings.schoolName || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logoUrl: settings.logoUrl || '',
        backgroundUrl: settings.backgroundUrl || '',
        principalName: settings.principalName || '',
        principalNip: settings.principalNip || '',
        helpdeskPhone: settings.helpdeskPhone || '088293733330',
        academicYear: settings.academicYear || '2026/2027',
        semester: settings.semester || 'Ganjil',
        defaultDpp: settings.defaultDpp || 0,
        defaultUka: settings.defaultUka || 0,
        defaultUks: settings.defaultUks || 0,
        timezone: settings.timezone || 'Asia/Jakarta',
        serverLocation: settings.serverLocation || 'Ponorogo, Jawa Timur',
      })
    }
  }, [settings])

  useEffect(() => {
    if (bankAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBankData({
        bankName: bankAccount.bankName || '',
        bankNumber: bankAccount.bankNumber || '',
        bankOwner: bankAccount.bankOwner || ''
      })
    }
  }, [bankAccount])

  const mutation = useMutation({
    mutationFn: async (updatedSettings: typeof formData) => {
      let logoUrl = updatedSettings.logoUrl;
      if (logoUrl && logoUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: logoUrl })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah logo');
        const uploadData = await uploadRes.json();
        logoUrl = uploadData.url;
      }

      let backgroundUrl = updatedSettings.backgroundUrl;
      if (backgroundUrl && backgroundUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: backgroundUrl })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah wallpaper background master');
        const uploadData = await uploadRes.json();
        backgroundUrl = uploadData.url;
      }

      const payload = { ...updatedSettings, logoUrl, backgroundUrl };
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      queryClient.invalidateQueries({ queryKey: ['navbar-public-settings'] })
      Swal.fire({
        title: 'Berhasil Disimpan!',
        text: `Pengaturan identitas sekolah, logo, dan background master berhasil diperbarui ke seluruh aplikasi.`,
        icon: 'success',
      })
    },
    onError: (err: any) => {
      Swal.fire('Error!', err.message || 'Gagal menyimpan pengaturan', 'error')
    }
  })

  const bankMutation = useMutation({
    mutationFn: async (updatedBank: typeof bankData) => {
      const res = await authenticatedFetch('/api-backend/settings/bank-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBank)
      })
      if (!res.ok) throw new Error('Gagal menyimpan rekening')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] })
      Swal.fire({
        title: 'Berhasil!',
        text: 'Informasi rekening bank berhasil disimpan',
        icon: 'success'
      })
    },
    onError: () => {
      Swal.fire({
        title: 'Error!',
        text: 'Gagal menyimpan informasi rekening bank',
        icon: 'error'
      })
    }
  })

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 })
      setFormData(prev => ({ ...prev, logoUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal mengompres logo:', err)
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengompres logo.', 'error')
    }
  }

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.82 })
      setFormData(prev => ({ ...prev, backgroundUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal mengompres background master:', err)
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengompres background master.', 'error')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    bankMutation.mutate(bankData)
  }

  if (isLoading || loadingBank) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          Memuat pengaturan...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pengaturan Sistem & Sekolah</h1>
          <p className="text-slate-500 mt-1">Kelola informasi dasar sekolah, rekening pembayaran, dan sinkronisasi waktu server.</p>
        </div>
      </div>

      {/* Card Sinkronisasi Tanggal & Waktu Server (UTC+7 / Jakarta / Bangkok) */}
      <Card className="border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Sinkronisasi Tanggal & Waktu Server SIMASMUH
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Terkalibrasi Aktif
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Standar zona waktu server <strong>UTC+7 (WIB / Asia/Jakarta / Bangkok)</strong> mengunci konsistensi presensi, log, dan keuangan di manapun server diinstal.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white">Zona Waktu Aktif</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{formData.timezone || clock.timezone} ({clock.utcOffset})</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingServerMeta(true)}
                    className="h-6 px-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg shrink-0"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white">Lokasi Instalasi Server</div>
                      <div className="text-[11px] text-slate-500 truncate">{formData.serverLocation || clock.serverLocation}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingServerMeta(true)}
                    className="h-6 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg shrink-0"
                  >
                    Edit
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <Wifi className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Latensi Endpoint Akses Web
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{clock.latency} ms</span>
                      <span className="text-[10px] text-slate-400">({typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Clock Display & Sync Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-blue-100 dark:border-slate-700/80 shadow-xs shrink-0">
              <div className="text-center sm:text-right">
                <div className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                  {clock.timeString} <span className="text-xs font-sans font-semibold text-slate-500">{formData.timezone === 'Asia/Makassar' ? 'WITA' : formData.timezone === 'Asia/Jayapura' ? 'WIT' : 'WIB'}</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {clock.dateString}
                </div>
                <div className="text-[10px] text-slate-400">
                  {clock.lastSyncTime ? `Sinkron terakhir: ${clock.lastSyncTime.toLocaleTimeString('id-ID')}` : 'Sinkronisasi otomatis'}
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
                className="rounded-xl border-blue-200 hover:bg-blue-50 text-blue-700 dark:text-blue-300 dark:border-blue-800 font-bold gap-2 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${clock.isSyncing ? 'animate-spin' : ''}`} />
                {clock.isSyncing ? 'Sinkronisasi...' : 'Kalibrasi Sekarang'}
              </Button>
            </div>
          </div>

          {/* Modal / Dialog Edit Konfigurasi Zona Waktu & Lokasi Instalasi */}
          {isEditingServerMeta && (
            <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-900/60 flex flex-col md:flex-row md:items-end gap-3 bg-white/90 dark:bg-slate-800/80 p-4 rounded-xl border animate-in fade-in zoom-in-95">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="timezoneSelect" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Pilih Zona Waktu Server
                </Label>
                <select
                  id="timezoneSelect"
                  value={formData.timezone || 'Asia/Jakarta'}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asia/Jakarta">WIB - Asia/Jakarta (UTC+07:00)</option>
                  <option value="Asia/Pontianak">WIB - Asia/Pontianak (UTC+07:00)</option>
                  <option value="Asia/Makassar">WITA - Asia/Makassar (UTC+08:00)</option>
                  <option value="Asia/Jayapura">WIT - Asia/Jayapura (UTC+09:00)</option>
                  <option value="Asia/Bangkok">ICT - Asia/Bangkok (UTC+07:00)</option>
                  <option value="UTC">UTC - Coordinated Universal Time (UTC+00:00)</option>
                </select>
              </div>

              <div className="flex-1 space-y-1.5">
                <Label htmlFor="serverLocationInput" className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Lokasi Instalasi Server
                </Label>
                <Input
                  id="serverLocationInput"
                  value={formData.serverLocation || ''}
                  onChange={(e) => setFormData({ ...formData, serverLocation: e.target.value })}
                  placeholder="Contoh: Ponorogo, Jawa Timur / Cloud Data Center"
                  className="h-9 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    mutation.mutate(formData)
                    setIsEditingServerMeta(false)
                    setTimeout(() => clock.reSync(), 400)
                  }}
                  disabled={mutation.isPending}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Simpan Perubahan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingServerMeta(false)}
                  className="h-9 px-3 text-xs rounded-lg"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengaturan Sekolah */}
        <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Identitas Sekolah
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                Informasi identitas, logo resmi, dan wallpaper latar belakang sistem.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo Sekolah & Sistem (Terkompres Otomatis)</Label>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl && (
                      <img 
                        src={formData.logoUrl} 
                        alt="Preview Logo" 
                        className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-slate-50 shrink-0" 
                      />
                    )}
                    <Input 
                      id="logo" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoChange}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Logo ini digunakan pada navbar, favicon browser, dan dokumen resmi.</p>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <Label htmlFor="backgroundMaster" className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Wallpaper Background Master
                  </Label>
                  <div className="flex items-center gap-4 mt-2">
                    {formData.backgroundUrl ? (
                      <div className="relative w-20 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
                        <img 
                          src={formData.backgroundUrl} 
                          alt="Preview Background Master" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="relative w-20 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
                        <img 
                          src="/muhipo-log.jpg" 
                          alt="Default Background Master" 
                          className="w-full h-full object-cover opacity-70" 
                        />
                      </div>
                    )}
                    <Input 
                      id="backgroundMaster" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleBackgroundChange}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Wallpaper latar belakang yang diselaraskan di seluruh halaman aplikasi.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">Nama Sekolah</Label>
                  <Input 
                    id="schoolName" 
                    value={formData.schoolName}
                    onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon Kantor</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="Contoh: (0352) 481428"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Sekolah</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Contoh: info@sekolah.sch.id"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="helpdeskPhone" className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                      Nomor WhatsApp Helpdesk & Bantuan Login
                    </Label>
                    <span className="text-[11px] text-slate-500">Tampil di halaman login & kontak bantuan</span>
                  </div>
                  <Input 
                    id="helpdeskPhone" 
                    value={formData.helpdeskPhone}
                    onChange={(e) => setFormData({...formData, helpdeskPhone: e.target.value})}
                    placeholder="Contoh: 088293733330"
                    className="bg-white dark:bg-slate-900 font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nomor WhatsApp ini khusus untuk menerima pesan kendala login / bantuan dari pengguna, terpisah dari gateway nomor pengirim notifikasi.
                  </p>
                </div>
              </div>

              {/* Tahun Pelajaran & Semester Utama (Acuan Serentak Seluruh Aplikasi) */}
              <div className="border-t border-slate-200 pt-6 bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tahun Pelajaran & Semester Utama</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pengaturan tunggal ini menjadi acuan serentak di seluruh data aplikasi.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3" />
                    Aktif: {formData.academicYear} ({formData.semester})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear" className="font-bold text-slate-700 dark:text-slate-200">Tahun Pelajaran Utama *</Label>
                    <Input 
                      id="academicYear" 
                      value={formData.academicYear}
                      onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                      placeholder="Contoh: 2026/2027"
                      required 
                      className="bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester" className="font-bold text-slate-700 dark:text-slate-200">Semester Utama *</Label>
                    <select
                      id="semester"
                      value={formData.semester}
                      onChange={(e) => setFormData({...formData, semester: e.target.value})}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Ganjil" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Ganjil (Semester 1)</option>
                      <option value="Genap" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Genap (Semester 2)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium leading-none mb-4">Informasi Kepala Sekolah</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principalName">Nama Kepala Sekolah</Label>
                    <Input 
                      id="principalName" 
                      value={formData.principalName}
                      onChange={(e) => setFormData({...formData, principalName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principalNip">NIP Kepala Sekolah</Label>
                    <Input 
                      id="principalNip" 
                      value={formData.principalNip}
                      onChange={(e) => setFormData({...formData, principalNip: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
              <Button type="submit" disabled={mutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-sm">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Identitas Sekolah
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Pengaturan Bank */}
        <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleBankSubmit}>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Informasi Rekening Sekolah
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                Informasi rekening untuk pembayaran siswa. Data ini akan ditampilkan pada popup tagihan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nama Bank *</Label>
                  <Input 
                    id="bankName"
                    value={bankData.bankName}
                    onChange={(e) => setBankData({...bankData, bankName: e.target.value})}
                    placeholder="Contoh: Bank BCA"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankNumber">Nomor Rekening *</Label>
                  <Input 
                    id="bankNumber"
                    value={bankData.bankNumber}
                    onChange={(e) => setBankData({...bankData, bankNumber: e.target.value})}
                    placeholder="Contoh: 1234567890"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankOwner">Nama Pemilik Rekening *</Label>
                  <Input 
                    id="bankOwner"
                    value={bankData.bankOwner}
                    onChange={(e) => setBankData({...bankData, bankOwner: e.target.value})}
                    placeholder="Contoh: YAYASAN SEKOLAH ABC"
                    required
                  />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Preview Informasi Bank</h4>
                <div className="text-sm space-y-1 text-green-700">
                  <p><strong>Bank:</strong> {bankData.bankName || 'Belum diisi'}</p>
                  <p><strong>No. Rekening:</strong> {bankData.bankNumber || 'Belum diisi'}</p>
                  <p><strong>Atas Nama:</strong> {bankData.bankOwner || 'Belum diisi'}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Penting:</p>
                    <ul className="space-y-1">
                      <li>• Pastikan informasi rekening sudah benar sebelum disimpan</li>
                      <li>• Data ini akan ditampilkan kepada siswa dan orang tua</li>
                      <li>• Hanya admin IT dan superadmin yang dapat mengubah informasi ini</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
              <Button 
                type="submit" 
                disabled={bankMutation.isPending || !bankData.bankName || !bankData.bankNumber || !bankData.bankOwner}
                className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl shadow-sm"
              >
                {bankMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Informasi Bank
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

