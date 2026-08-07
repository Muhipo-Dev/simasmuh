'use client'

import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Loader2, Save, CreditCard, Sparkles, Pencil, Trash2, Percent, 
  Calculator, Info, ShieldCheck, Plus, Building2, 
  GraduationCap, Users
} from 'lucide-react'
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
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        deleteProgramMutation.mutate(prog.id)
      }
    })
  }

  if (loadingSettings || loadingPrograms) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium tracking-wide">Memuat pengaturan keuangan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header Banner - Sleek Modern Dark Gradient with Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Akses Bagian Keuangan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Pengaturan Biaya & Diskon
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Kelola nominal default biaya tagihan umum (DPP, UKA, UKS) serta tarif SPP default dan besaran persentase diskon berdasarkan program siswa secara terpusat.
            </p>
          </div>

          <div className="flex items-center gap-3.5 bg-white/10 dark:bg-slate-800/40 p-4 rounded-2xl backdrop-blur-md border border-white/15 shrink-0 shadow-inner">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Calculator className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white tracking-wide">Otomatisasi Tagihan</p>
              <p className="text-indigo-200/90 text-[11px] mt-0.5">Terintegrasi dengan Pembuatan Tagihan Siswa</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8">
        {/* Card 1: Default General Fees (DPP, UKA, UKS) */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <form onSubmit={handleFeeSubmit}>
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
                    Nominal Default Biaya Tagihan Umum (DPP, UKA, UKS)
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Nominal default ini akan otomatis terisi saat Bagian Keuangan membuat tagihan umum baru bagi siswa.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Default DPP */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-950 rounded-lg text-purple-600 dark:text-purple-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultDpp" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya DPP
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 rounded-full">
                      DPP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dana Pengembangan Akademik</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 select-none">Rp</span>
                    <Input 
                      id="defaultDpp" 
                      type="number"
                      value={feeForm.defaultDpp || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultDpp: Number(e.target.value) })}
                      placeholder="1500000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-purple-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-purple-700 dark:text-purple-400 font-extrabold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-900">
                      {currencyFormat(feeForm.defaultDpp)}
                    </span>
                  </div>
                </div>

                {/* Default UKA */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-300">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultUka" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya UKA
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                      UKA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uang Kegiatan Akademik</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 select-none">Rp</span>
                    <Input 
                      id="defaultUka" 
                      type="number"
                      value={feeForm.defaultUka || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUka: Number(e.target.value) })}
                      placeholder="500000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                      {currencyFormat(feeForm.defaultUka)}
                    </span>
                  </div>
                </div>

                {/* Default UKS */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700/60 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-teal-100 dark:bg-teal-950 rounded-lg text-teal-600 dark:text-teal-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultUks" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya UKS
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full">
                      UKS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uang Kegiatan Siswa</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 select-none">Rp</span>
                    <Input 
                      id="defaultUks" 
                      type="number"
                      value={feeForm.defaultUks || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUks: Number(e.target.value) })}
                      placeholder="100000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-teal-700 dark:text-teal-400 font-extrabold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-100 dark:border-teal-900">
                      {currencyFormat(feeForm.defaultUks)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note Alert */}
              <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/60 text-xs sm:text-sm text-blue-900 dark:text-blue-300">
                <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  <strong className="font-bold">Catatan:</strong> Mengubah nominal default ini tidak mengubah tagihan yang sudah terbit sebelumnya, tetapi akan langsung berlaku secara otomatis untuk pembuatan tagihan baru berikutnya.
                </p>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex justify-end">
              <Button 
                type="submit" 
                disabled={feeMutation.isPending} 
                className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {feeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Nominal Default (DPP, UKA, UKS)
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card 2: Program Tariff & Discount Settings */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 text-purple-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-extrabold text-white">
                    Pengaturan Tarif & Diskon Default Berdasarkan Program
                  </CardTitle>
                  <CardDescription className="text-purple-200/90 text-xs sm:text-sm mt-0.5">
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
                  className="w-full sm:w-auto h-10 bg-white text-purple-950 hover:bg-purple-50 font-bold rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Program Baru
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Form Tambah/Edit Program */}
            {(isCreatingProgram || editingProgram) && (
              <div className="p-5 sm:p-6 border-2 border-purple-200/80 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/30 rounded-2xl space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200/60 dark:border-purple-900/40">
                  <h4 className="font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-2 text-base">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    {isCreatingProgram ? 'Tambah Program Baru' : `Edit Program: ${editingProgram?.name}`}
                  </h4>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold bg-purple-100 dark:bg-purple-900/50 px-2.5 py-0.5 rounded-full">
                    {isCreatingProgram ? 'Mode Tambah' : 'Mode Edit'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="progName" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Nama Program <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="progName"
                      placeholder="Contoh: Kader / Tahfidz"
                      value={progForm.name}
                      onChange={(e) => {
                        const nameVal = e.target.value
                        const codeVal = isCreatingProgram ? nameVal.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim() : progForm.code
                        setProgForm({ ...progForm, name: nameVal, code: codeVal })
                      }}
                      className="h-10 bg-white dark:bg-slate-950 font-semibold rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="progSpp" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Default SPP (Rp) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                      <Input
                        id="progSpp"
                        type="number"
                        placeholder="300000"
                        value={progForm.defaultSpp || ''}
                        onChange={(e) => setProgForm({ ...progForm, defaultSpp: Number(e.target.value) })}
                        className="pl-9 h-10 bg-white dark:bg-slate-950 font-semibold rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="progDiscount" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                      Default Diskon (%) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="progDiscount"
                        type="number"
                        placeholder="50"
                        min={0}
                        max={100}
                        value={progForm.defaultDiscount || ''}
                        onChange={(e) => setProgForm({ ...progForm, defaultDiscount: Number(e.target.value) })}
                        className="h-10 bg-white dark:bg-slate-950 font-semibold pr-8 rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="progDesc" className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                    Keterangan / Deskripsi Program
                  </Label>
                  <Input
                    id="progDesc"
                    placeholder="Catatan tambahan mengenai program ini..."
                    value={progForm.description}
                    onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
                    className="h-10 bg-white dark:bg-slate-950 rounded-xl text-sm"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingProgram(false)
                      setEditingProgram(null)
                    }}
                    className="h-10 rounded-xl font-semibold border-slate-300 dark:border-slate-700"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    disabled={createProgramMutation.isPending || updateProgramMutation.isPending || !progForm.name}
                    onClick={() => {
                      if (isCreatingProgram) {
                        createProgramMutation.mutate(progForm)
                      } else if (editingProgram) {
                        updateProgramMutation.mutate({ id: editingProgram.id, data: progForm })
                      }
                    }}
                    className="h-10 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md"
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
                <span className="text-slate-600 font-medium text-sm">Memuat data program...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950">
                <table className="w-full text-sm text-left border-collapse min-w-[650px]">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">NO</th>
                      <th className="px-5 py-3.5">NAMA PROGRAM</th>
                      <th className="px-5 py-3.5 text-right">DEFAULT SPP</th>
                      <th className="px-5 py-3.5 text-center">DEFAULT DISKON</th>
                      <th className="px-5 py-3.5">KETERANGAN</th>
                      <th className="px-5 py-3.5 text-center w-36">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {programConfigs && programConfigs.length > 0 ? (
                      programConfigs.map((prog, idx) => (
                        <tr key={prog.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors">
                          <td className="px-4 py-4 font-semibold text-slate-400 text-center text-xs">{idx + 1}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-purple-900 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-xl text-xs tracking-wide shadow-xs">
                                {prog.name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">({prog.code})</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white text-right font-mono">
                            {currencyFormat(prog.defaultSpp)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {prog.defaultDiscount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full text-xs">
                                <Percent className="w-3 h-3" />
                                Diskon {prog.defaultDiscount}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Tanpa Diskon</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-[220px] truncate">
                            {prog.description || <span className="italic text-slate-400">Tidak ada keterangan</span>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEditProgram(prog)}
                                className="h-8 px-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProgram(prog)}
                                className="h-8 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl"
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
                        <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                          Belum ada konfigurasi program. Klik tombol <strong className="text-slate-700 dark:text-slate-300">Tambah Program Baru</strong> di atas untuk membuat.
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
