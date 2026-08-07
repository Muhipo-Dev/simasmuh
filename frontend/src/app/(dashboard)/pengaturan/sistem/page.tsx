'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Building2, CreditCard, ImageIcon, CalendarDays, Sparkles, Pencil, Trash2, Percent } from 'lucide-react'
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengaturan Sekolah</h1>
        <p className="text-slate-500 mt-1">Kelola informasi dasar sekolah dan rekening untuk pembayaran.</p>
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
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Sekolah</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
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

              {/* Section Pengaturan Default Harga Biaya Tagihan Umum (DPP, UKA, UKS) */}
              <div className="border-t border-slate-200 pt-6 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Pengaturan Default Harga Biaya Tagihan Umum</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nominal default ini akan otomatis mengisi form saat membuat tagihan baru (DPP, UKA, UKS).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultDpp" className="font-bold text-slate-700 dark:text-slate-200">Default Biaya DPP (Rp)</Label>
                    <Input 
                      id="defaultDpp" 
                      type="number"
                      value={formData.defaultDpp}
                      onChange={(e) => setFormData({...formData, defaultDpp: Number(e.target.value)})}
                      placeholder="Contoh: 1500000"
                      className="bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultUka" className="font-bold text-slate-700 dark:text-slate-200">Default Biaya UKA (Rp)</Label>
                    <Input 
                      id="defaultUka" 
                      type="number"
                      value={formData.defaultUka}
                      onChange={(e) => setFormData({...formData, defaultUka: Number(e.target.value)})}
                      placeholder="Contoh: 500000"
                      className="bg-white dark:bg-slate-900 font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultUks" className="font-bold text-slate-700 dark:text-slate-200">Default Biaya UKS (Rp)</Label>
                    <Input 
                      id="defaultUks" 
                      type="number"
                      value={formData.defaultUks}
                      onChange={(e) => setFormData({...formData, defaultUks: Number(e.target.value)})}
                      placeholder="Contoh: 100000"
                      className="bg-white dark:bg-slate-900 font-semibold"
                    />
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

        {/* Section Pengaturan Program Sekolah */}
        <ProgramSettingsSection />
      </div>
    </div>
  )
}

type ProgramConfig = {
  id: string
  code: string
  name: string
  defaultSpp: number
  defaultDiscount: number
  description?: string | null
}

function ProgramSettingsSection() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [editingProgram, setEditingProgram] = useState<ProgramConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [progForm, setProgForm] = useState({
    code: '',
    name: '',
    defaultSpp: 0,
    defaultDiscount: 0,
    description: ''
  })

  const { data: programConfigs, isLoading } = useQuery<ProgramConfig[]>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs')
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof progForm) => {
      const res = await authenticatedFetch('/api-backend/settings/program-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Gagal menambah program')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      setIsCreating(false)
      setProgForm({ code: '', name: '', defaultSpp: 0, defaultDiscount: 0, description: '' })
      Swal.fire({ title: 'Berhasil!', text: 'Program baru berhasil ditambahkan.', icon: 'success', timer: 1500, showConfirmButton: false })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menambah program', 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof progForm> }) => {
      const res = await authenticatedFetch(`/api-backend/settings/program-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Gagal memperbarui program')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      setEditingProgram(null)
      Swal.fire({ title: 'Berhasil!', text: 'Pengaturan program berhasil diperbarui.', icon: 'success', timer: 1500, showConfirmButton: false })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal memperbarui program', 'error')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/settings/program-configs/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus program')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      Swal.fire({ title: 'Berhasil!', text: 'Program berhasil dihapus.', icon: 'success', timer: 1500, showConfirmButton: false })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menghapus program', 'error')
    }
  })

  const handleStartEdit = (prog: ProgramConfig) => {
    setEditingProgram(prog)
    setProgForm({
      code: prog.code,
      name: prog.name,
      defaultSpp: prog.defaultSpp,
      defaultDiscount: prog.defaultDiscount,
      description: prog.description || ''
    })
  }

  const handleDelete = (prog: ProgramConfig) => {
    Swal.fire({
      title: `Hapus Program ${prog.name}?`,
      text: 'Program akan dihapus dari sistem pengaturan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(prog.id)
      }
    })
  }

  return (
    <Card className="md:col-span-2 border-purple-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">Pengaturan Program Sekolah & Tariff Default</CardTitle>
              <CardDescription className="text-purple-100">
                Kelola daftar nama Program Sekolah, Default SPP, dan Default Diskon yang dapat diatur secara umum oleh Superadmin.
              </CardDescription>
            </div>
          </div>
          {!isCreating && !editingProgram && (
            <Button
              onClick={() => {
                setIsCreating(true)
                setProgForm({ code: '', name: '', defaultSpp: 300000, defaultDiscount: 0, description: '' })
              }}
              className="bg-white text-purple-800 hover:bg-purple-50 font-semibold shadow-sm"
            >
              + Tambah Program
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Form Tambah/Edit */}
        {(isCreating || editingProgram) && (
          <div className="mb-6 p-5 border-2 border-purple-200 bg-purple-50/50 rounded-xl space-y-4">
            <h4 className="font-bold text-purple-900 flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              {isCreating ? 'Tambah Program Baru' : `Edit Program: ${editingProgram?.name}`}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="progName" className="font-semibold text-slate-700">Nama Program *</Label>
                <Input
                  id="progName"
                  placeholder="Contoh: Kader / Tahfidz"
                  value={progForm.name}
                  onChange={(e) => {
                    const nameVal = e.target.value
                    const codeVal = isCreating ? nameVal.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim() : progForm.code
                    setProgForm({ ...progForm, name: nameVal, code: codeVal })
                  }}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="progSpp" className="font-semibold text-slate-700">Default SPP (Rp) *</Label>
                <Input
                  id="progSpp"
                  type="number"
                  placeholder="300000"
                  value={progForm.defaultSpp}
                  onChange={(e) => setProgForm({ ...progForm, defaultSpp: Number(e.target.value) })}
                  className="bg-white"
                />
              </div>
              <div>
                <Label htmlFor="progDiscount" className="font-semibold text-slate-700">Default Diskon (%) *</Label>
                <Input
                  id="progDiscount"
                  type="number"
                  placeholder="50"
                  min={0}
                  max={100}
                  value={progForm.defaultDiscount}
                  onChange={(e) => setProgForm({ ...progForm, defaultDiscount: Number(e.target.value) })}
                  className="bg-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="progDesc" className="font-semibold text-slate-700">Keterangan / Deskripsi</Label>
              <Input
                id="progDesc"
                placeholder="Catatan tambahan mengenai program..."
                value={progForm.description}
                onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
                className="bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setEditingProgram(null)
                }}
              >
                Batal
              </Button>
              <Button
                disabled={createMutation.isPending || updateMutation.isPending || !progForm.name}
                onClick={() => {
                  if (isCreating) {
                    createMutation.mutate(progForm)
                  } else if (editingProgram) {
                    updateMutation.mutate({ id: editingProgram.id, data: progForm })
                  }
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan Program
              </Button>
            </div>
          </div>
        )}

        {/* Tabel Data Program */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mr-2" />
            <span className="text-slate-600 font-medium">Memuat data program...</span>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">NO</th>
                  <th className="px-5 py-4">NAMA PROGRAM</th>
                  <th className="px-5 py-4 text-right">DEFAULT SPP</th>
                  <th className="px-5 py-4 text-center">DEFAULT DISKON</th>
                  <th className="px-5 py-4">KETERANGAN</th>
                  <th className="px-5 py-4 text-center w-36">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {programConfigs && programConfigs.length > 0 ? (
                  programConfigs.map((prog, idx) => (
                    <tr key={prog.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-400 text-center">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-900 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-lg text-xs tracking-wide">
                            {prog.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">({prog.code})</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white text-right">
                        Rp {prog.defaultSpp.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {prog.defaultDiscount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-xs">
                            <Percent className="w-3 h-3" />
                            {prog.defaultDiscount}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-xs">
                        {prog.description || <span className="italic text-slate-400">Tidak ada keterangan</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(prog)}
                            className="h-8 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(prog)}
                            className="h-8 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      Belum ada data program diset. Silakan klik tombol <strong>+ Tambah Program</strong> untuk menambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5 shadow-sm">
          <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">💡</span>
          <div>
            <strong className="text-purple-900 dark:text-purple-200 font-semibold block mb-0.5">Fleksibilitas Pengaturan Program & Keuangan:</strong>
            <span>
              Pengaturan <strong>Default SPP</strong> & <strong>Default Diskon</strong> ini berfungsi sebagai template harga awal bagi Superadmin. Superadmin tetap dapat meng-custom harga diskon maupun label program secara independen per siswa/kelas pada halaman <strong>Data Tabel Siswa</strong>.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

