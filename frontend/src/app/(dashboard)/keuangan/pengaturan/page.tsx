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
        text: 'Default biaya tagihan (DPP, UKA, UKS, Infaq Tahunan, Seragam) berhasil diperbarui.',
        icon: 'success',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat menyimpan pengaturan biaya.', 'error')
    }
  })

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
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Pengaturan Biaya & Beasiswa Keuangan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Pengaturan Biaya & Beasiswa
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Atur acuan nominal default biaya umum sekolah (DPP, UKA, UKS, Infaq Tahunan, Seragam). Beasiswa dikelola langsung per siswa di Data Siswa berdasarkan Jalur Pendaftaran.
            </p>
          </div>

          <div className="flex items-center gap-3.5 bg-white/10 dark:bg-slate-800/40 p-4 rounded-2xl backdrop-blur-md border border-white/15 shrink-0 shadow-inner">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Calculator className="w-6 h-6 text-indigo-300" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white tracking-wide">Beasiswa Berbasis Jalur</p>
              <p className="text-indigo-200/90 text-[11px] mt-0.5">Non-Mandiri: Seragam, SPP, DPP | Mandiri: SPP, DPP</p>
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
                    Nominal Default Biaya Sekolah (DPP, UKA, UKS, Infaq Tahunan, Seragam)
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Nominal default ini menjadi acuan biaya acuan pembuatan tagihan dan potongan beasiswa siswa.
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
                      placeholder="1500000"
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
                      placeholder="2000000"
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

                {/* Default Infaq Tahunan */}
                <div className="group space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950 rounded-lg text-emerald-600 dark:text-emerald-300">
                        <Users className="w-4 h-4" />
                      </div>
                      <Label htmlFor="defaultInfaq" className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Default Infaq Tahunan
                      </Label>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                      Infaq
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sumbangan Infaq Tahunan Siswa</p>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                    <Input 
                      id="defaultInfaq" 
                      type="number"
                      value={feeForm.defaultInfaq || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, defaultInfaq: Number(e.target.value) })}
                      placeholder="300000"
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
                      placeholder="500000"
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
                      placeholder="100000"
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

              {/* Note Alert */}
              <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/60 text-xs sm:text-sm text-blue-900 dark:text-blue-300">
                <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  <strong className="font-bold">Informasi Sistem Beasiswa:</strong> Pengaturan Beasiswa (persentase potongan Seragam, SPP, & DPP) dapat diatur per siswa di menu <strong>Master Data Siswa &rarr; Tombol (%) Beasiswa Keuangan</strong>. Siswa Jalur Mandiri mendapatkan Beasiswa SPP & DPP, sedangkan seluruh Jalur Non-Mandiri (Kader, Prestasi, Bidikmisi, dll) mendapatkan Beasiswa Seragam, SPP, & DPP.
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
                Simpan Nominal Default Biaya
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
