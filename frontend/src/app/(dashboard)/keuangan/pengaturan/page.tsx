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

  // State for Default General Fees (DPP, UKA, UKS, Infaq, Seragam)
  const [feeForm, setFeeForm] = useState({
    defaultDpp: 0,
    defaultUka: 0,
    defaultUks: 0,
    defaultInfaq: 0,
    defaultSeragam: 2000000,
  })

  // Fetch Settings
  const { data: settings, isLoading: loadingSettings } = useQuery<Setting & { defaultInfaq?: number; defaultSeragam?: number }>({
    queryKey: ['settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  useEffect(() => {
    if (settings) {
      setFeeForm({
        defaultDpp: settings.defaultDpp || 0,
        defaultUka: settings.defaultUka || 0,
        defaultUks: settings.defaultUks || 0,
        defaultInfaq: (settings as any).defaultInfaq || 0,
        defaultSeragam: (settings as any).defaultSeragam || 2000000,
      })
    }
  }, [settings])

  // Mutation to save Default Fees
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
        text: 'Default biaya umum (DPP, UKA, UKS, Infaq Tahunan, Seragam) berhasil diperbarui.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat menyimpan pengaturan biaya.', 'error')
    }
  })

  // Fetch Program Configs (Default SPP & Beasiswa per Program)
  const { data: programConfigs, isLoading: loadingPrograms } = useQuery<ProgramConfig[]>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs')
  })

  // State for Editing/Adding Program Config
  const [editingProgram, setEditingProgram] = useState<ProgramConfig | null>(null)
  const [isCreatingProgram, setIsCreatingProgram] = useState(false)
  const [programForm, setProgramForm] = useState({
    code: '',
    name: '',
    defaultSpp: 300000,
    defaultBeasiswa: 0,
    description: '',
  })

  const saveProgramMutation = useMutation({
    mutationFn: async () => {
      if (editingProgram) {
        const res = await authenticatedFetch(`/api-backend/settings/program-configs/${editingProgram.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: programForm.name,
            defaultSpp: Number(programForm.defaultSpp),
            defaultBeasiswa: Number(programForm.defaultBeasiswa),
            description: programForm.description,
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || 'Gagal memperbarui pengaturan program')
        }
        return res.json()
      } else {
        const res = await authenticatedFetch('/api-backend/settings/program-configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: programForm.code.trim().toLowerCase(),
            name: programForm.name,
            defaultSpp: Number(programForm.defaultSpp),
            defaultBeasiswa: Number(programForm.defaultBeasiswa),
            description: programForm.description,
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || 'Gagal menambahkan pengaturan program baru')
        }
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      setEditingProgram(null)
      setIsCreatingProgram(false)
      Swal.fire({
        title: 'Berhasil!',
        text: 'Pengaturan nominal default program berhasil disimpan dan langsung aktif untuk rilis tagihan otomatis.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/settings/program-configs/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menghapus program')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      Swal.fire('Berhasil Dihapus', 'Program berhasil dihapus dari sistem.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const openEditModal = (prog: ProgramConfig) => {
    setEditingProgram(prog)
    setIsCreatingProgram(false)
    setProgramForm({
      code: prog.code,
      name: prog.name,
      defaultSpp: prog.defaultSpp || 0,
      defaultBeasiswa: (prog as any).defaultBeasiswa || (prog as any).defaultDiscount || 0,
      description: prog.description || '',
    })
  }

  const openCreateModal = () => {
    setEditingProgram(null)
    setIsCreatingProgram(true)
    setProgramForm({
      code: '',
      name: '',
      defaultSpp: 350000,
      defaultBeasiswa: 0,
      description: '',
    })
  }

  const handleDeleteProgram = (prog: ProgramConfig) => {
    Swal.fire({
      title: `Hapus Program ${prog.name}?`,
      text: 'Program ini akan dihapus dari daftar pengaturan biaya default.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteProgramMutation.mutate(prog.id)
      }
    })
  }

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    feeMutation.mutate(feeForm)
  }

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm font-medium tracking-wide">Memuat pengaturan biaya & beasiswa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Pengaturan Biaya & Diskon Keuangan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Pengaturan Biaya & Diskon
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Atur nominal acuan default biaya umum dan nominal khusus per program/jalur kelas (AI, Tahfidz, SAINSOS, Olahraga, MIC, dll) yang diterapkan otomatis saat pembuatan atau rilis 1 tahun tagihan.
            </p>
          </div>

          <div className="flex items-center gap-3.5 bg-white/10 dark:bg-slate-800/40 p-4 rounded-2xl backdrop-blur-md border border-white/15 shrink-0 shadow-inner">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Calculator className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white tracking-wide">Otomatis & Adaptif</p>
              <p className="text-indigo-200/90 text-[11px] mt-0.5">Sesuai program siswa saat rilis masal tagihan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:gap-8">
        {/* Card 1: Default General Fees (DPP, UKA, UKS, Infaq Tahunan, Seragam) */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <form onSubmit={handleFeeSubmit}>
            <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
                    1. Nominal Default Biaya Umum Sekolah (DPP, UKA, UKS, UIS, Seragam)
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Nominal acuan default untuk seluruh komponen tagihan reguler sekolah.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Default DPP */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-950 rounded-lg text-purple-600 dark:text-purple-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultDpp" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya DPP
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-full">
                      DPP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dana Pengembangan Akademik</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultDpp" 
                      type="number"
                      value={feeForm.defaultDpp || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultDpp: Number(e.target.value) })}
                      placeholder="3000000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-purple-700 dark:text-purple-400 font-extrabold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                      {currencyFormat(feeForm.defaultDpp)}
                    </span>
                  </div>
                </div>

                {/* Default Seragam */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-100 dark:bg-amber-950 rounded-lg text-amber-600 dark:text-amber-300">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultSeragam" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya Seragam
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                      Seragam
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Seragam & Paket Perlengkapan</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultSeragam" 
                      type="number"
                      value={feeForm.defaultSeragam || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultSeragam: Number(e.target.value) })}
                      placeholder="1450000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-extrabold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                      {currencyFormat(feeForm.defaultSeragam)}
                    </span>
                  </div>
                </div>

                {/* Default UIS (Uang Infaq Sekolah) */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 rounded-lg text-emerald-600 dark:text-emerald-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultInfaq" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya UIS
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      UIS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uang Infaq Sekolah Tahunan</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultInfaq" 
                      type="number"
                      value={feeForm.defaultInfaq || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultInfaq: Number(e.target.value) })}
                      placeholder="200000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      {currencyFormat(feeForm.defaultInfaq)}
                    </span>
                  </div>
                </div>

                {/* Default UKA */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-300">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultUka" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya UKA
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full">
                      UKA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uang Kegiatan Akademik</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultUka" 
                      type="number"
                      value={feeForm.defaultUka || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUka: Number(e.target.value) })}
                      placeholder="1200000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                      {currencyFormat(feeForm.defaultUka)}
                    </span>
                  </div>
                </div>

                {/* Default UKS */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-teal-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-teal-100 dark:bg-teal-950 rounded-lg text-teal-600 dark:text-teal-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultUks" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Biaya UKS
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-full">
                      UKS
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uang Kegiatan Siswa</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultUks" 
                      type="number"
                      value={feeForm.defaultUks || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultUks: Number(e.target.value) })}
                      placeholder="900000"
                      className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white text-base rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <span className="text-teal-700 dark:text-teal-400 font-extrabold bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md">
                      {currencyFormat(feeForm.defaultUks)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex justify-end">
              <Button 
                type="submit" 
                disabled={feeMutation.isPending} 
                className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {feeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Nominal Default Umum
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card 2: Program-Specific Default Fees (AI, Tahfidz, SAINSOS, Olahraga, MIC, Seni Budaya, Inklusi, Enterpreneur) */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-slate-900 dark:text-white font-extrabold text-base sm:text-lg">
                  2. Pengaturan Default Tagihan Per Program / Jalur Kelas
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                  Nominal SPP dan beasiswa default per program (AI, Tahfidz, SAINSOS, MIC, Olahraga, dll). Otomatis diterapkan saat rilis tagihan 1 tahun.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              onClick={openCreateModal}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Program Baru
            </Button>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {loadingPrograms ? (
              <div className="py-8 flex items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs font-bold">Memuat daftar program...</span>
              </div>
            ) : !programConfigs || programConfigs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">
                Belum ada data program. Klik &apos;Tambah Program Baru&apos; untuk membuat konfigurasi.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programConfigs.map((prog) => (
                  <div
                    key={prog.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            {prog.code}
                          </span>
                          <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-1">
                            {prog.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(prog)}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg"
                            title="Edit Tarif Program"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProgram(prog)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg"
                            title="Hapus Program"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {prog.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {prog.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Tarif SPP Default:</span>
                        <span className="font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                          {currencyFormat(prog.defaultSpp)} / bln
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold">Total SPP 1 Tahun:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {currencyFormat(prog.defaultSpp * 12)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Information Alert */}
            <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/60 text-xs sm:text-sm text-blue-900 dark:text-blue-300">
              <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="leading-relaxed font-medium">
                <strong className="font-bold">Otomatisasi Rilis Tagihan:</strong> Nominal default di atas menjadi acuan otomatis yang langsung dibaca oleh sistem saat petugas merilis tagihan massal 1 tahun. Jika siswa tercatat di program AI, maka tarif SPP AI yang akan digunakan; jika di kelas Tahfidz, maka tarif SPP Tahfidz yang digunakan, dan seterusnya.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Dialog Form Tambah / Edit Tarif Program */}
      {(editingProgram || isCreatingProgram) && (
        <div className="fixed inset-0 isolate z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingProgram ? 'Edit Tarif Program' : 'Tambah Program Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingProgram ? `Kode Program: ${editingProgram.code}` : 'Masukkan data identitas & tarif program'}
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveProgramMutation.mutate()
              }}
              className="space-y-4"
            >
              {isCreatingProgram && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kode Identifikasi Program (Unik)
                  </Label>
                  <Input
                    required
                    value={programForm.code}
                    onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                    placeholder="Contoh: ai, tahfidz, saintek, mic"
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap Program
                </Label>
                <Input
                  required
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  placeholder="Contoh: Artificial Intelligence (AI)"
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nominal SPP Default Per Bulan (Rp)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                  <Input
                    required
                    type="number"
                    value={programForm.defaultSpp || ''}
                    onChange={(e) => setProgramForm({ ...programForm, defaultSpp: Number(e.target.value) })}
                    placeholder="500000"
                    className="pl-9 h-10 text-xs font-bold rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-slate-400 font-medium">Estimasi 1 Tahun:</span>
                  <span className="font-extrabold text-blue-600">
                    {currencyFormat(programForm.defaultSpp * 12)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Deskripsi / Keterangan
                </Label>
                <Input
                  value={programForm.description}
                  onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                  placeholder="Keterangan singkat program..."
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingProgram(null)
                    setIsCreatingProgram(false)
                  }}
                  className="h-10 px-4 rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveProgramMutation.isPending}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {saveProgramMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Simpan Tarif Program
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
