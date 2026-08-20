'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Building2, CreditCard, ImageIcon, CalendarDays, Sparkles, Pencil, Trash2, Percent, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { compressImageFile } from '@/utils/imageCompressor'

type Setting = {
  id: string
  schoolName: string
  address: string
  phone: string | null
  email: string | null
  logoUrl: string | null
  principalName: string | null
  principalNip: string | null
  academicYear: string | null
  semester: string | null
  helpdeskPhone?: string | null
  defaultDpp?: number | null
  defaultUka?: number | null
  defaultUks?: number | null
}

type BankAccount = {
  bankName: string
  bankNumber: string
  bankOwner: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    principalName: '',
    principalNip: '',
    helpdeskPhone: '088293733330',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    defaultDpp: 0,
    defaultUka: 0,
    defaultUks: 0,
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
        schoolName: settings.schoolName || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logoUrl: settings.logoUrl || '',
        principalName: settings.principalName || '',
        principalNip: settings.principalNip || '',
        helpdeskPhone: settings.helpdeskPhone || '088293733330',
        academicYear: settings.academicYear || '2026/2027',
        semester: settings.semester || 'Ganjil',
        defaultDpp: settings.defaultDpp || 0,
        defaultUka: settings.defaultUka || 0,
        defaultUks: settings.defaultUks || 0,
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

      const payload = { ...updatedSettings, logoUrl };
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
      Swal.fire({
        title: 'Berhasil Disimpan!',
        text: `Tahun Pelajaran Utama diatur ke ${formData.academicYear} (${formData.semester}). Seluruh data sistem akan otomatis mengacu pada tahun ajaran ini.`,
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: () => {
      Swal.fire('Informasi', 'Gagal menyimpan pengaturan', 'info')
    }
  })

  const bankMutation = useMutation({
    mutationFn: async (updatedBank: typeof bankData) => {
      const res = await authenticatedFetch('/api-backend/settings/bank-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBank)
      })
      if (!res.ok) throw new Error('Gagal menyimpan info bank')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-account'] })
      Swal.fire({
        title: 'Berhasil!',
        text: 'Informasi rekening bank berhasil disimpan',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pengaturan Sekolah</h1>
          <p className="text-slate-500 mt-1">Kelola informasi dasar sekolah, rekening pembayaran, dan log sistem.</p>
        </div>
        <Link href="/pengaturan/log-sistem">
          <Button variant="outline" className="border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold shadow-sm">
            <Database className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
            Penyimpanan Log Sistem (Supabase)
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengaturan Sekolah */}
        <Card className="shadow-sm border-slate-200">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Identitas Sekolah
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">Informasi ini akan ditampilkan pada kop surat dan laporan.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo Sekolah (Terkompres Otomatis)</Label>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl && (
                      <img 
                        src={formData.logoUrl} 
                        alt="Preview Logo" 
                        className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-slate-50" 
                      />
                    )}
                    <Input 
                      id="logo" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoChange}
                      className="bg-white"
                    />
                  </div>
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

              {/* Info Banner Pengalihan Pengaturan Biaya Ke Keuangan */}
              <div className="border-t border-slate-200 pt-6 bg-purple-50/60 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-2">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-bold text-sm text-purple-900 dark:text-purple-200">Pengaturan Biaya & Diskon Dikelola Keuangan</p>
                    <p className="mt-1">
                      Pengaturan default nominal tagihan umum (DPP, UKA, UKS) dan tarif SPP & diskon default berdasarkan program siswa sepenuhnya diatur oleh akun <strong>Bagian Keuangan</strong> di menu <strong>Keuangan &rarr; Pengaturan Biaya & Diskon</strong>.
                    </p>
                    <p className="mt-1 font-semibold text-purple-800 dark:text-purple-300">
                      Superadmin hanya perlu memberikan label program (Kader, Tahfidz, Reguler, dll) pada akun siswa di menu Master Data Siswa.
                    </p>
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
            <CardFooter className="bg-slate-50 border-t border-slate-100">
              <Button type="submit" disabled={mutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Identitas Sekolah
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Pengaturan Bank */}
        <Card className="shadow-sm border-slate-200">
          <form onSubmit={handleBankSubmit}>
            <CardHeader className="bg-emerald-50/80 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Informasi Rekening Sekolah
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300 font-medium">
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
            <CardFooter className="bg-green-50 border-t border-green-100">
              <Button 
                type="submit" 
                disabled={bankMutation.isPending || !bankData.bankName || !bankData.bankNumber || !bankData.bankOwner}
                className="w-full bg-green-600 hover:bg-green-700"
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

