'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, CreditCard, Sparkles, Pencil, Trash2, Percent, Calculator, Info, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type Setting = {
  id: string
  schoolName: string
  address: string
  defaultDpp?: number | null
  defaultUka?: number | null
  defaultUks?: number | null
}

type ProgramConfig = {
  id: string
  code: string
  name: string
  defaultSpp: number
  defaultDiscount: number
  description?: string | null
}

const currencyFormat = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0)
}

export default function FinanceSettingsPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  // State for Default General Fees (DPP, UKA, UKS)
  const [feeForm, setFeeForm] = useState({
    defaultDpp: 0,
    defaultUka: 0,
    defaultUks: 0,
  })

  // State for Program Config CRUD
  const [editingProgram, setEditingProgram] = useState<ProgramConfig | null>(null)
  const [isCreatingProgram, setIsCreatingProgram] = useState(false)
  const [progForm, setProgForm] = useState({
    code: '',
    name: '',
    defaultSpp: 300000,
    defaultDiscount: 0,
    description: ''
  })

  // Fetch Settings for DPP/UKA/UKS
  const { data: settings, isLoading: loadingSettings } = useQuery<Setting>({
    queryKey: ['settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  // Fetch Program Configs
  const { data: programConfigs, isLoading: loadingPrograms } = useQuery<ProgramConfig[]>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs')
  })

  useEffect(() => {
    if (settings) {
      setFeeForm({
        defaultDpp: settings.defaultDpp || 0,
        defaultUka: settings.defaultUka || 0,
        defaultUks: settings.defaultUks || 0,
      })
    }
  }, [settings])

  // Mutation to save Default Fees (DPP, UKA, UKS)
  const feeMutation = useMutation({
    mutationFn: async (updatedFees: typeof feeForm) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFees)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan pengaturan biaya default')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      Swal.fire({
        title: 'Berhasil Disimpan!',
        text: 'Default biaya tagihan umum (DPP, UKA, UKS) berhasil diperbarui dan disinkronkan untuk pembuatan tagihan baru.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat menyimpan pengaturan biaya.', 'error')
    }
  })

  // Program Config Mutations
  const createProgramMutation = useMutation({
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
      setIsCreatingProgram(false)
      setProgForm({ code: '', name: '', defaultSpp: 300000, defaultDiscount: 0, description: '' })
      Swal.fire({ title: 'Berhasil!', text: 'Program baru berhasil ditambahkan.', icon: 'success', timer: 1500, showConfirmButton: false })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal menambah program', 'error')
    }
  })

  const updateProgramMutation = useMutation({
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

  const deleteProgramMutation = useMutation({
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

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    feeMutation.mutate(feeForm)
  }

  const handleStartEditProgram = (prog: ProgramConfig) => {
    setEditingProgram(prog)
    setProgForm({
      code: prog.code,
      name: prog.name,
      defaultSpp: prog.defaultSpp,
      defaultDiscount: prog.defaultDiscount,
      description: prog.description || ''
    })
  }

  const handleDeleteProgram = (prog: ProgramConfig) => {
    Swal.fire({
      title: `Hapus Program ${prog.name}?`,
      text: 'Program akan dihapus dari sistem pengaturan keuangan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus'
    }).then((res) => {
      if (res.isConfirmed) {
        deleteProgramMutation.mutate(prog.id)
      }
    })
  }

  if (loadingSettings || loadingPrograms) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
          Memuat pengaturan keuangan...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Akses Bagian Keuangan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Pengaturan Biaya & Diskon</h1>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Kelola nominal default biaya tagihan umum (DPP, UKA, UKS) serta tarif SPP default dan besaran persentase diskon berdasarkan program siswa.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10 shrink-0">
            <Calculator className="w-8 h-8 text-emerald-300" />
            <div className="text-xs">
              <p className="font-bold text-white">Otomatisasi Tagihan</p>
              <p className="text-emerald-200">Terintegrasi dengan Pembuatan Tagihan Siswa</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* Card 1: Default General Fees (DPP, UKA, UKS) */}
        <Card className="border-emerald-200 dark:border-slate-800 shadow-sm">
          <form onSubmit={handleFeeSubmit}>
            <CardHeader className="bg-emerald-50/70 dark:bg-slate-800/80 border-b border-emerald-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-lg">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Nominal Default Biaya Tagihan Umum (DPP, UKA, UKS)
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300 font-medium text-xs sm:text-sm">
                Nominal default ini akan otomatis terisi saat Bagian Keuangan membuat tagihan umum baru bagi siswa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Default DPP */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="defaultDpp" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      Default Biaya DPP
                    </Label>
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md">
                      DPP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Dana Pengembangan Akademik</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <Input 
                      id="defaultDpp" 
                      type="number"
                      value={feeForm.defaultDpp}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultDpp: Number(e.target.value) })}
                      placeholder="1500000"
                      className="pl-9 bg-white dark:bg-slate-950 font-bold text-base"
                    />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    = {currencyFormat(feeForm.defaultDpp)}
                  </p>
                </div>

                {/* Default UKA */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="defaultUka" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      Default Biaya UKA
                    </Label>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                      UKA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Uang Kegiatan Akademik</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <Input 
                      id="defaultUka" 
                      type="number"
                      value={feeForm.defaultUka}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUka: Number(e.target.value) })}
                      placeholder="500000"
                      className="pl-9 bg-white dark:bg-slate-950 font-bold text-base"
                    />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    = {currencyFormat(feeForm.defaultUka)}
                  </p>
                </div>

                {/* Default UKS */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="defaultUks" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      Default Biaya UKS
                    </Label>
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded-md">
                      UKS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Uang Kegiatan Siswa</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <Input 
                      id="defaultUks" 
                      type="number"
                      value={feeForm.defaultUks}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUks: Number(e.target.value) })}
                      placeholder="100000"
                      className="pl-9 bg-white dark:bg-slate-950 font-bold text-base"
                    />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    = {currencyFormat(feeForm.defaultUks)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 font-medium">
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
                Catatan: Mengubah nominal default ini tidak merubah tagihan yang sudah terbit sebelumnya, tetapi akan langsung berlaku untuk tagihan baru yang dibuat setelahnya.
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 justify-end">
              <Button type="submit" disabled={feeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {feeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Nominal Default (DPP, UKA, UKS)
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card 2: Program Tariff & Discount Settings */}
        <Card className="border-purple-200 dark:border-slate-800 shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-t-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">Pengaturan Tariff & Diskon Default Berdasarkan Program</CardTitle>
                  <CardDescription className="text-purple-100 text-xs sm:text-sm">
                    Atur besaran Default SPP (Rp) dan Default Diskon (%) untuk setiap program siswa (Kader, Tahfidz, Reguler, dll).
                  </CardDescription>
                </div>
              </div>
              {!isCreatingProgram && !editingProgram && (
                <Button
                  onClick={() => {
                    setIsCreatingProgram(true)
                    setProgForm({ code: '', name: '', defaultSpp: 300000, defaultDiscount: 0, description: '' })
                  }}
                  className="bg-white text-purple-900 hover:bg-purple-50 font-bold shadow-sm self-start sm:self-auto"
                >
                  + Tambah Program Baru
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Form Tambah/Edit Program */}
            {(isCreatingProgram || editingProgram) && (
              <div className="mb-6 p-5 border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl space-y-4">
                <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  {isCreatingProgram ? 'Tambah Program Baru' : `Edit Program: ${editingProgram?.name}`}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="progName" className="font-semibold text-slate-700 dark:text-slate-200">Nama Program *</Label>
                    <Input
                      id="progName"
                      placeholder="Contoh: Kader / Tahfidz"
                      value={progForm.name}
                      onChange={(e) => {
                        const nameVal = e.target.value
                        const codeVal = isCreatingProgram ? nameVal.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim() : progForm.code
                        setProgForm({ ...progForm, name: nameVal, code: codeVal })
                      }}
                      className="bg-white dark:bg-slate-950 font-semibold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="progSpp" className="font-semibold text-slate-700 dark:text-slate-200">Default SPP (Rp) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                      <Input
                        id="progSpp"
                        type="number"
                        placeholder="300000"
                        value={progForm.defaultSpp}
                        onChange={(e) => setProgForm({ ...progForm, defaultSpp: Number(e.target.value) })}
                        className="pl-9 bg-white dark:bg-slate-950 font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="progDiscount" className="font-semibold text-slate-700 dark:text-slate-200">Default Diskon (%) *</Label>
                    <div className="relative">
                      <Input
                        id="progDiscount"
                        type="number"
                        placeholder="50"
                        min={0}
                        max={100}
                        value={progForm.defaultDiscount}
                        onChange={(e) => setProgForm({ ...progForm, defaultDiscount: Number(e.target.value) })}
                        className="bg-white dark:bg-slate-950 font-semibold pr-8"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="progDesc" className="font-semibold text-slate-700 dark:text-slate-200">Keterangan / Deskripsi Program</Label>
                  <Input
                    id="progDesc"
                    placeholder="Catatan tambahan mengenai program ini..."
                    value={progForm.description}
                    onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingProgram(false)
                      setEditingProgram(null)
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    disabled={createProgramMutation.isPending || updateProgramMutation.isPending || !progForm.name}
                    onClick={() => {
                      if (isCreatingProgram) {
                        createProgramMutation.mutate(progForm)
                      } else if (editingProgram) {
                        updateProgramMutation.mutate({ id: editingProgram.id, data: progForm })
                      }
                    }}
                    className="bg-purple-700 hover:bg-purple-800 text-white font-bold"
                  >
                    {createProgramMutation.isPending || updateProgramMutation.isPending ? (
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
            {loadingPrograms ? (
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
                            {currencyFormat(prog.defaultSpp)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {prog.defaultDiscount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-xs">
                                <Percent className="w-3 h-3" />
                                Diskon {prog.defaultDiscount}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Tanpa Diskon</span>
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
                                onClick={() => handleStartEditProgram(prog)}
                                className="h-8 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProgram(prog)}
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
                        <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                          Belum ada konfigurasi program. Klik tombol Tambah Program Baru di atas untuk membuat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
