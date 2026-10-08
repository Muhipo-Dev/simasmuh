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
  Sparkles,
  Phone,
  CalendarDays,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  KeyRound
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { compressImageFile } from '@/utils/imageCompressor'
import { SystemRuntimeSupervisor } from '@/components/settings/SystemRuntimeSupervisor'

type Setting = {
  id: string
  schoolName: string
  address: string
  phone: string | null
  email: string | null
  logoUrl: string | null
  backgroundUrl?: string | null
  studentCardTemplateUrl?: string | null
  publicDomainUrl?: string | null
  googleClientId?: string | null
  googleClientSecret?: string | null
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

  const [formData, setFormData] = useState({
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    backgroundUrl: '',
    studentCardTemplateUrl: '',
    publicDomainUrl: 'https://simasmuh.razagopo.my.id',
    googleClientId: '935196029927-ii64fis1cd7gjgcj92jvpl5bmv9m0ql0.apps.googleusercontent.com',
    googleClientSecret: '',
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
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logoUrl: settings.logoUrl || '',
        backgroundUrl: settings.backgroundUrl || '',
        studentCardTemplateUrl: settings.studentCardTemplateUrl || '',
        publicDomainUrl: settings.publicDomainUrl || 'https://simasmuh.razagopo.my.id',
        googleClientId: settings.googleClientId || '',
        googleClientSecret: settings.googleClientSecret || '',
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

      let studentCardTemplateUrl = updatedSettings.studentCardTemplateUrl;
      if (studentCardTemplateUrl && studentCardTemplateUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: studentCardTemplateUrl, folder: 'card_templates' })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah template kartu pelajar');
        const uploadData = await uploadRes.json();
        studentCardTemplateUrl = uploadData.url;
      }

      const payload = { ...updatedSettings, logoUrl, backgroundUrl, studentCardTemplateUrl };
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
        text: `Pengaturan identitas sekolah, template kartu pelajar, dan background master berhasil diperbarui.`,
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

  const handleStudentCardTemplateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1200, quality: 0.9 })
      setFormData(prev => ({ ...prev, studentCardTemplateUrl: compressed.dataUrl }))
    } catch (err) {
      console.error('Gagal memproses template kartu pelajar:', err)
      Swal.fire('Gagal', 'Terjadi kesalahan saat memproses template kartu pelajar.', 'error')
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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
            Pengaturan Sistem
          </span>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Konfigurasi Sekolah & Sistem
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Identitas sekolah, kuota login pengguna, dan konfigurasi operasional SIMASMUH.
          </p>
        </div>

        {/* Switch Waiting Room Manual di Bar Header Grup Pengaturan Sistem */}
        <HeaderWaitingRoomSwitch />
      </div>

      {/* Supervisor Runtime, Live Sync Clock, & Sesi Pengguna */}
      <SystemRuntimeSupervisor isSuperadminRole={true} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengaturan Waiting Room & Kuota Login (Superadmin & Admin IT) */}
        <div className="lg:col-span-2">
          <WaitingRoomConfigCard />
        </div>

        {/* Pengaturan Sekolah */}
        <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Identitas Sekolah & Desain Kartu Pelajar
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">
                Informasi identitas, logo resmi, wallpaper, dan template background kartu pelajar siswa.
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

                <div className="space-y-2 p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cardTemplate" className="font-bold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Template Desain Kartu Pelajar (Master Template)
                    </Label>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Cetak Mandiri Siswa</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    {formData.studentCardTemplateUrl ? (
                      <div className="relative w-24 h-15 rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 shrink-0 shadow-xs">
                        <img 
                          src={formData.studentCardTemplateUrl.startsWith('/uploads') ? `/api-backend${formData.studentCardTemplateUrl}` : formData.studentCardTemplateUrl} 
                          alt="Preview Template Kartu" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="relative w-24 h-15 rounded-lg overflow-hidden border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-slate-800/50 flex flex-col items-center justify-center p-2 text-center shrink-0">
                        <span className="text-[10px] text-indigo-500 font-bold">Template Standar SIMASMUH</span>
                      </div>
                    )}
                    <Input 
                      id="cardTemplate" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleStudentCardTemplateChange}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    Template desain ini akan otomatis dipakai siswa di Profil Siswa untuk menggabungkan foto & mencetak kartu pelajar secara mandiri.
                  </p>
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
                    <Label htmlFor="email">Email Resmi Sekolah & Helpdesk</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Contoh: info@sekolah.sch.id"
                    />
                    <p className="text-[11px] text-slate-500">Tampil otomatis pada kotak bantuan login dan dokumen resmi.</p>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="helpdeskPhone" className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                      Nomor Telepon Helpdesk & Bantuan Login
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
                    Nomor kontak ini khusus untuk menerima panggilan/pesan kendala login dan bantuan teknis dari pengguna.
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

        {/* Pengaturan Domain Publik & Google OAuth Terpusat */}
        <PublicDomainOAuthConfigCard
          publicDomainUrl={formData.publicDomainUrl || 'https://simasmuh.razagopo.my.id'}
          googleClientId={formData.googleClientId || ''}
          googleClientSecret={formData.googleClientSecret || ''}
          onSave={async (domainConfig) => {
            await mutation.mutateAsync({
              ...formData,
              publicDomainUrl: domainConfig.publicDomainUrl,
              googleClientId: domainConfig.googleClientId,
              googleClientSecret: domainConfig.googleClientSecret,
            })
          }}
          isSaving={mutation.isPending}
        />
      </div>
    </div>
  )
}

function PublicDomainOAuthConfigCard({
  publicDomainUrl,
  googleClientId,
  googleClientSecret,
  onSave,
  isSaving,
}: {
  publicDomainUrl: string
  googleClientId: string
  googleClientSecret: string
  onSave: (data: { publicDomainUrl: string; googleClientId: string; googleClientSecret: string }) => Promise<void>
  isSaving: boolean
}) {
  const [domain, setDomain] = useState(publicDomainUrl)
  const [clientId, setClientId] = useState(googleClientId)
  const [clientSecret, setClientSecret] = useState(googleClientSecret)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const [currentClientOrigin, setCurrentClientOrigin] = useState('')

  useEffect(() => {
    setDomain(publicDomainUrl)
    setClientId(googleClientId)
    setClientSecret(googleClientSecret)
    if (typeof window !== 'undefined') {
      setCurrentClientOrigin(window.location.origin)
    }
  }, [publicDomainUrl, googleClientId, googleClientSecret])

  const cleanOrigin = (domain || currentClientOrigin || 'https://simasmuh.razagopo.my.id').replace(/\/+$/, '')
  const redirectUri = `${cleanOrigin}/api/auth/callback/google`
  const activeClientRedirectUri = currentClientOrigin ? `${currentClientOrigin.replace(/\/+$/, '')}/api/auth/callback/google` : ''

  const copyToClipboard = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      publicDomainUrl: domain.trim(),
      googleClientId: clientId.trim(),
      googleClientSecret: clientSecret.trim(),
    })
  }

  return (
    <Card className="shadow-xs border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl rounded-2xl overflow-hidden md:col-span-2">
      <form onSubmit={handleSubmit}>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Domain Publik & Integrasi Google OAuth Terpusat
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
                Kelola alamat domain publik resmi, URL callback sistem, dan kredensial Google OAuth tanpa menyentuh file server.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tersinkronisasi Otomatis
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Domain Publik Utama */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="publicDomain" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Domain Publik Utama Sistem (Production / Tunnel)
              </Label>
              <span className="text-[11px] text-slate-500">Gunakan protokol https:// atau http://</span>
            </div>
            <Input
              id="publicDomain"
              type="url"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Contoh: https://simasmuh.smamuhipo.sch.id"
              required
              className="font-mono text-sm h-11 bg-white dark:bg-slate-900"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Domain ini dipakai secara terpusat untuk tautan verifikasi tanda tangan digital, tautan bukti pembayaran, serta rute resmi pengiriman email notifikasi.
            </p>
          </div>

          {/* Quick Copy Snippets untuk Google Cloud Console */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                Kebutuhan Konfigurasi di Google Cloud Console
              </h4>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Buka Google Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Authorized Origins */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>1. Authorized JavaScript Origins</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cleanOrigin, 'origin')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === 'origin' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'origin' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200/70 dark:border-slate-800/70" title={cleanOrigin}>
                  {cleanOrigin}
                </div>
              </div>

              {/* Authorized Redirect URIs */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>2. Authorized Redirect URIs</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(redirectUri, 'redirect')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 font-semibold"
                  >
                    {copiedKey === 'redirect' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'redirect' ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200/70 dark:border-slate-800/70" title={redirectUri}>
                  {redirectUri}
                </div>
              </div>
            </div>

            {/* Jika sedang diakses melalui IP Server / Domain Alternatif */}
            {currentClientOrigin && currentClientOrigin !== cleanOrigin && (
              <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/70">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Host / Alamat Akses Client Aktif ({currentClientOrigin})</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeClientRedirectUri, 'clientRedirect')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    {copiedKey === 'clientRedirect' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'clientRedirect' ? 'Tersalin' : 'Salin Redirect URI Akses Aktif'}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded border border-slate-200 dark:border-slate-800 truncate" title={activeClientRedirectUri}>
                  {activeClientRedirectUri}
                </div>
              </div>
            )}
          </div>

          {/* Kredensial Google OAuth */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="googleClientId" className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Google Client ID
              </Label>
              <Input
                id="googleClientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Contoh: 935196029927-xxxx.apps.googleusercontent.com"
                className="font-mono text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleClientSecret" className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Google Client Secret
              </Label>
              <Input
                id="googleClientSecret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-sm text-white"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Konfigurasi Domain & Google OAuth
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function HeaderWaitingRoomSwitch() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['waiting-room-metrics'],
    queryFn: () => authenticatedQuery('/api-backend/waiting-room/metrics'),
    refetchInterval: 3000,
  })

  const forceEnabled = metrics?.forceEnabled || false
  const activeUsers = metrics?.activeUsers || 0
  const maxCapacity = metrics?.maxCapacity || 1000
  const isCritical = metrics?.isTrafficCritical || false

  const toggleMutation = useMutation({
    mutationFn: async (nextForce: boolean) => {
      const res = await authenticatedFetch('/api-backend/waiting-room/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceEnabled: nextForce }),
      })
      if (!res.ok) throw new Error('Gagal mengubah mode waiting room')
      return res.json()
    },
    onSuccess: (data, nextForce) => {
      queryClient.setQueryData(['waiting-room-metrics'], data)
      queryClient.invalidateQueries({ queryKey: ['waiting-room-metrics'] })
      Swal.fire({
        title: nextForce ? 'Waiting Room Manual Diaktifkan!' : 'Mode Otomatis Aktif!',
        text: nextForce
          ? 'Seluruh trafik login baru kini dialihkan ke ruang tunggu antrean.'
          : 'Waiting room kini otomatis berjalan saat beban server ≥ 80% atau kuota penuh.',
        icon: nextForce ? 'warning' : 'success',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50/90 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">
            Waiting Room Manual:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              forceEnabled
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 animate-pulse'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${forceEnabled ? 'bg-rose-600' : 'bg-emerald-600'}`} />
            {forceEnabled ? 'MANUAL AKTIF' : 'OTOMATIS'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {activeUsers}/{maxCapacity} login aktif • {metrics?.queuedUsers || 0} antre
        </span>
      </div>

      {/* Switch Button */}
      <button
        type="button"
        disabled={toggleMutation.isPending || isLoading}
        onClick={() => toggleMutation.mutate(!forceEnabled)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          forceEnabled
            ? 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-sm shadow-pink-300'
            : 'bg-slate-300 dark:bg-slate-700'
        }`}
        title={forceEnabled ? 'Klik untuk matikan mode manual' : 'Klik untuk aktifkan mode manual'}
      >
        <span className="sr-only">Toggle Waiting Room Manual</span>
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            forceEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {toggleMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-pink-600" />
          ) : forceEnabled ? (
            <span className="w-2 h-2 rounded-full bg-rose-600" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          )}
        </span>
      </button>
    </div>
  )
}

function WaitingRoomConfigCard() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: metrics, isLoading, isRefetching } = useQuery({
    queryKey: ['waiting-room-metrics'],
    queryFn: () => authenticatedQuery('/api-backend/waiting-room/metrics'),
    refetchInterval: 3000, // Real-time poll setiap 3 detik
  })

  const [capacity, setCapacity] = useState<number>(1000)
  const [forceEnabled, setForceEnabled] = useState<boolean>(false)
  const [cpuThreshold, setCpuThreshold] = useState<number>(80)
  const [ramThreshold, setRamThreshold] = useState<number>(80)
  const [maxRps, setMaxRps] = useState<number>(250)

  useEffect(() => {
    if (metrics) {
      if (typeof metrics.maxCapacity === 'number') setCapacity(metrics.maxCapacity)
      if (typeof metrics.forceEnabled === 'boolean') setForceEnabled(metrics.forceEnabled)
      if (typeof metrics.cpuThreshold === 'number') setCpuThreshold(metrics.cpuThreshold)
      if (typeof metrics.ramThreshold === 'number') setRamThreshold(metrics.ramThreshold)
      if (typeof metrics.rpsThreshold === 'number') setMaxRps(metrics.rpsThreshold)
    }
  }, [metrics])

  const saveConfigMutation = useMutation({
    mutationFn: async (payload: {
      maxCapacity: number
      forceEnabled: boolean
      cpuThreshold: number
      ramThreshold: number
      maxRps: number
    }) => {
      const res = await authenticatedFetch('/api-backend/waiting-room/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal memperbarui konfigurasi waiting room')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['waiting-room-metrics'], data)
      queryClient.invalidateQueries({ queryKey: ['waiting-room-metrics'] })
      Swal.fire({
        title: 'Konfigurasi Disimpan!',
        text: `Kapasitas kuota login disetel ke ${capacity} orang. Mode Waiting Room: ${
          forceEnabled ? 'MANUAL AKTIF (Siaga Penuh)' : 'OTOMATIS (Beban Server ≥ 80%)'
        }.`,
        icon: 'success',
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal!', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/waiting-room/admin/clear-queue', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Gagal mengosongkan antrean')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waiting-room-metrics'] })
      Swal.fire({
        title: 'Antrean Dikosongkan!',
        text: `Sebanyak ${data.clearedCount || 0} pengguna antrean telah di-reset.`,
        icon: 'success',
      })
    },
  })

  const resetSessionsMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/waiting-room/admin/reset-sessions', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Gagal mereset sesi')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waiting-room-metrics'] })
      Swal.fire({
        title: 'Sesi Aktif Direset!',
        text: `Sebanyak ${data.resetCount || 0} slot sesi aktif telah dibersihkan.`,
        icon: 'success',
      })
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveConfigMutation.mutate({
      maxCapacity: Number(capacity) || 1000,
      forceEnabled,
      cpuThreshold: Number(cpuThreshold) || 80,
      ramThreshold: Number(ramThreshold) || 80,
      maxRps: Number(maxRps) || 250,
    })
  }

  const activeUsers = metrics?.activeUsers || 0
  const maxCap = metrics?.maxCapacity || capacity || 1000
  const queuedUsers = metrics?.queuedUsers || 0
  const isCritical = metrics?.isTrafficCritical || false
  const cpuPercent = metrics?.cpuPercent || 0
  const ramPercent = metrics?.ramPercent || 0

  return (
    <Card className="shadow-xs border-pink-200/80 dark:border-pink-900/40 bg-gradient-to-br from-pink-50/40 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 backdrop-blur-xl rounded-2xl overflow-hidden">
      <form onSubmit={handleSave}>
        <CardHeader className="border-b border-pink-100 dark:border-slate-800/80 p-5 sm:p-6 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-600 text-white shadow-xs">
                  Superadmin & Admin IT
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isCritical 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse' 
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                  {isCritical ? 'Waiting Room Aktif Menahan Trafik' : 'Sistem Normal (Kapasitas Terjaga)'}
                </span>
              </div>
              <CardTitle className="text-slate-900 dark:text-white font-extrabold text-base sm:text-lg flex items-center gap-2">
                Kontrol Manual Waiting Room & Kuota Login
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs">
                Atur batasan berapa orang yang dapat login bersamaan ke aplikasi SIMASMUH serta aktivasi antrean sistem.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Live Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center justify-between">
                <span>Pengguna Aktif</span>
                <span className="text-[10px] text-pink-600 font-bold">{Math.round((activeUsers / maxCap) * 100)}%</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {activeUsers} <span className="text-xs font-normal text-slate-400">/ {maxCap} kuota</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className="bg-pink-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (activeUsers / maxCap) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Antrean Waiting Room
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
                {queuedUsers} <span className="text-xs font-normal text-slate-400">orang</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {queuedUsers > 0 ? 'Sedang menunggu giliran' : 'Tidak ada antrean pending'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center justify-between">
                <span>Beban CPU Server</span>
                <span className={`text-[10px] font-bold ${cpuPercent >= cpuThreshold ? 'text-rose-600' : 'text-slate-500'}`}>
                  Limit {cpuThreshold}%
                </span>
              </div>
              <div className={`text-xl sm:text-2xl font-black ${cpuPercent >= cpuThreshold ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                {cpuPercent}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${cpuPercent >= cpuThreshold ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(100, cpuPercent)}%` }} 
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center justify-between">
                <span>Beban RAM Server</span>
                <span className={`text-[10px] font-bold ${ramPercent >= ramThreshold ? 'text-rose-600' : 'text-slate-500'}`}>
                  Limit {ramThreshold}%
                </span>
              </div>
              <div className={`text-xl sm:text-2xl font-black ${ramPercent >= ramThreshold ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                {ramPercent}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${ramPercent >= ramThreshold ? 'bg-rose-500' : 'bg-blue-500'}`} 
                  style={{ width: `${Math.min(100, ramPercent)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Form Pengaturan Kapasitas & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Kuota Pengguna Login */}
            <div className="space-y-2 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <Label htmlFor="maxCapacity" className="font-bold text-slate-900 dark:text-white text-xs">
                  Batas Maksimal Pengguna Login Bersamaan *
                </Label>
                <span className="text-[10px] font-bold text-pink-600 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-full">
                  Kapasitas: {capacity} Pengguna
                </span>
              </div>
              <Input
                id="maxCapacity"
                type="number"
                min={1}
                max={50000}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="Contoh: 100"
                className="bg-white dark:bg-slate-900 font-bold text-base"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Ketika jumlah pengguna aktif melebihi batas ini, pengguna berikutnya akan diarahkan ke antrean secara tertib.
              </p>
            </div>

            {/* Switch Mode Operasional Waiting Room */}
            <div className="space-y-2 p-4 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <Label htmlFor="forceEnabledSelect" className="font-bold text-slate-900 dark:text-white text-xs">
                  Aktivasi Manual Antrean Sistem
                </Label>
                <button
                  type="button"
                  onClick={() => setForceEnabled(!forceEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    forceEnabled ? 'bg-pink-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      forceEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                forceEnabled 
                  ? 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900' 
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}>
                <span>{forceEnabled ? '🚨 Mode Manual: Aktif Penuh' : '🛡️ Mode Otomatis: Aktif Saat Beban Server ≥ 80%'}</span>
                <span className="text-[10px] font-mono">{forceEnabled ? 'MANUAL' : 'OTOMATIS'}</span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {forceEnabled 
                  ? 'Mode Manual: Mengaktifkan antrean secara langsung untuk menahan seluruh lalu lintas login baru.' 
                  : 'Mode Otomatis: Antrean aktif secara cerdas saat pemakaian CPU/RAM server mencapai 80% atau kuota login terpenuhi.'}
              </p>
            </div>

            {/* Ambang Batas CPU & RAM */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
              <Label className="font-bold text-slate-900 dark:text-white text-xs">
                Ambang Batas Otomatis Beban CPU (%)
              </Label>
              <Input
                type="number"
                min={10}
                max={100}
                value={cpuThreshold}
                onChange={(e) => setCpuThreshold(parseInt(e.target.value) || 80)}
                className="bg-white dark:bg-slate-900 font-semibold"
              />
              <p className="text-[10px] text-slate-400">Default: 80% (Aktif jika CPU server menyentuh angka ini)</p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
              <Label className="font-bold text-slate-900 dark:text-white text-xs">
                Ambang Batas Otomatis Beban RAM (%)
              </Label>
              <Input
                type="number"
                min={10}
                max={100}
                value={ramThreshold}
                onChange={(e) => setRamThreshold(parseInt(e.target.value) || 80)}
                className="bg-white dark:bg-slate-900 font-semibold"
              />
              <p className="text-[10px] text-slate-400">Default: 80% (Aktif jika memori RAM server menyentuh angka ini)</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/80 dark:bg-slate-800/60 border-t border-pink-100 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearQueueMutation.mutate()}
              disabled={clearQueueMutation.isPending || queuedUsers === 0}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              {clearQueueMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Kosongkan Antrean
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => resetSessionsMutation.mutate()}
              disabled={resetSessionsMutation.isPending || activeUsers === 0}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 rounded-xl border-rose-200 hover:bg-rose-50"
            >
              {resetSessionsMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Reset Sesi Aktif
            </Button>
          </div>

          <Button
            type="submit"
            disabled={saveConfigMutation.isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 font-bold rounded-xl shadow-xs"
          >
            {saveConfigMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Konfigurasi Waiting Room
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}



