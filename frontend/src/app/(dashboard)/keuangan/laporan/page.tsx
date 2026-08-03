'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Wallet, CheckCircle2, Clock, Loader2, TrendingUp, GraduationCap, BookOpen,
  Building2, Users2, Calendar, AlertCircle, Receipt, Upload
} from 'lucide-react'
import PaymentBillingPopup from '@/components/student/PaymentBillingPopup'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const PAYMENT_TYPES = [
  { value: 'SPP', label: 'SPP', icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', desc: 'Sumbangan Pembinaan Pendidikan' },
  { value: 'DPP', label: 'DPP', icon: Building2, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', desc: 'Dana Pengembangan Pendidikan' },
  { value: 'INFAQ', label: 'Infaq Sekolah', icon: Users2, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', desc: 'Uang Infaq Sekolah' },
  { value: 'AKADEMIK', label: 'Kegiatan Akademik', icon: GraduationCap, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', desc: 'Uang Kegiatan Akademik' },
  { value: 'SEKOLAH', label: 'Kegiatan Sekolah', icon: Calendar, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', desc: 'Uang Kegiatan Sekolah' },
]

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

type Tagihan = {
  id: string; type: string; amount: number
  month: number | null; year: number | null
  dueDate: string | null; status: 'BELUM_LUNAS' | 'LUNAS'
  paidDate: string | null; notes: string | null; createdAt: string
}

type StudentDetail = {
  id: string; name: string; nisn: string; nis: string
  gender: string; class: { name: string }; tagihans: Tagihan[]
}

// ============================================================
// SPP Status Grid
// ============================================================
function SppStatusGrid({ tagihans, year }: { tagihans: Tagihan[]; year: number }) {
  const sppTagihans = tagihans.filter(t => t.type === 'SPP' && t.year === year)

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Status SPP Tahun {year}
        </CardTitle>
        <CardDescription>Status tagihan SPP per bulan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS.map((name, idx) => {
            const month = idx + 1
            const tagihan = sppTagihans.find(t => t.month === month)
            const isLunas = tagihan?.status === 'LUNAS'
            const isBelum = tagihan?.status === 'BELUM_LUNAS'

            return (
              <div key={month} className={`p-3 rounded-xl border text-center transition-all ${
                isLunas ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                : isBelum ? 'bg-red-50 border-red-200'
                : 'bg-slate-50 border-slate-200'
              }`}>
                {isLunas
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  : isBelum
                  ? <AlertCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
                  : <Clock className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                }
                <p className={`text-xs font-semibold ${isLunas ? 'text-emerald-700' : isBelum ? 'text-red-600' : 'text-slate-400'}`}>
                  {name.substring(0, 3)}
                </p>
                {isLunas && tagihan && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{currency(tagihan.amount)}</p>
                )}
                {isBelum && tagihan && (
                  <p className="text-[10px] text-red-500 font-medium mt-0.5">Tagihan</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lunas ({sppTagihans.filter(t => t.status === 'LUNAS').length} bln)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Ada tagihan ({sppTagihans.filter(t => t.status === 'BELUM_LUNAS').length} bln)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            <span>Belum ada data ({12 - sppTagihans.length} bln)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function StudentFinancePage() {
  const { data: session } = useSession()
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false)
  const [selectedTagihanId, setSelectedTagihanId] = useState<string | undefined>()
  const userId = (session?.user as any)?.id
  const currentYear = new Date().getFullYear()

  const authenticatedQuery = useAuthenticatedQuery()

  const { data: student, isLoading } = useQuery<StudentDetail>({
    queryKey: ['my-all-tagihan'],
    queryFn: () => authenticatedQuery('/api-backend/finance/my-all-tagihan'),
    enabled: !!userId
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Memuat tagihan...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Wallet className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Data keuangan tidak ditemukan.</p>
      </div>
    )
  }

  const tagihans = student.tagihans ?? []
  const belumLunas = tagihans.filter(t => t.status === 'BELUM_LUNAS')
  const sudahLunas = tagihans.filter(t => t.status === 'LUNAS')
  const totalTagihan = tagihans.reduce((s, t) => s + t.amount, 0)
  const totalLunas = sudahLunas.reduce((s, t) => s + t.amount, 0)
  const totalBelumLunas = belumLunas.reduce((s, t) => s + t.amount, 0)

  // Group belum lunas by type
  const belumLunasPerType = PAYMENT_TYPES.map(t => ({
    ...t,
    items: belumLunas.filter(b => b.type === t.value),
    total: belumLunas.filter(b => b.type === t.value).reduce((s, b) => s + b.amount, 0),
  })).filter(t => t.items.length > 0)

  const sudahLunasPerType = PAYMENT_TYPES.map(t => ({
    ...t,
    items: sudahLunas.filter(b => b.type === t.value),
    total: sudahLunas.filter(b => b.type === t.value).reduce((s, b) => s + b.amount, 0),
  })).filter(t => t.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          Tagihan Saya
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <p className="text-slate-500 ml-0.5">{student.name} · Kelas {student.class?.name}</p>
          <Button 
            onClick={() => setIsPaymentPopupOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Bukti Pembayaran
          </Button>
        </div>
      </div>

      <PaymentBillingPopup 
        open={isPaymentPopupOpen}
        onClose={() => {
          setIsPaymentPopupOpen(false)
          setSelectedTagihanId(undefined)
        }}
        initialTagihanId={selectedTagihanId}
      />

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-200" />
            <span className="text-blue-100 font-medium text-sm">Ringkasan Keuangan</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-blue-200 text-xs font-medium">Total Tagihan</p>
              <p className="font-extrabold text-lg sm:text-xl mt-0.5 tracking-tight truncate">{currency(totalTagihan)}</p>
              <p className="text-blue-300 text-xs">{tagihans.length} item</p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-4 min-w-0">
              <p className="text-emerald-200 text-xs font-medium">Sudah Lunas</p>
              <p className="font-extrabold text-lg sm:text-xl mt-0.5 text-emerald-200 tracking-tight truncate">{currency(totalLunas)}</p>
              <p className="text-emerald-300 text-xs">{sudahLunas.length} item</p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-4 min-w-0">
              <p className="text-red-200 text-xs font-medium">Belum Lunas</p>
              <p className="font-extrabold text-lg sm:text-xl mt-0.5 text-red-200 tracking-tight truncate">{currency(totalBelumLunas)}</p>
              <p className="text-red-300 text-xs">{belumLunas.length} item</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tagihan Belum Lunas - Alert */}
      {belumLunas.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              Tagihan Belum Lunas ({belumLunas.length} item)
            </CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400 font-medium">
              Segera lakukan pembayaran. Total: <strong className="font-extrabold">{currency(totalBelumLunas)}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {belumLunas.map(t => {
              const typeInfo = PAYMENT_TYPES.find(p => p.value === t.type)
              const isOverdue = t.dueDate && new Date(t.dueDate) < new Date()
              return (
                <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900/80 gap-3 ${isOverdue ? 'border-red-300 dark:border-red-800' : 'border-red-100 dark:border-slate-800'}`}>
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeInfo?.bg} shrink-0 mt-0.5 sm:mt-0`}>
                      {typeInfo && <typeInfo.icon className={`w-4 h-4 ${typeInfo.text}`} />}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${typeInfo?.badge}`}>{t.type}</span>
                        {t.month && t.year && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{MONTHS[t.month - 1]} {t.year}</span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 rounded font-bold">LEWAT JATUH TEMPO</span>
                        )}
                      </div>
                      {t.dueDate && (
                        <p className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                          Jatuh tempo: {formatDateShort(t.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-red-700 dark:text-red-300 text-base sm:text-lg">{currency(t.amount)}</span>
                    <Button 
                      size="sm"
                      className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs"
                      onClick={() => {
                        setSelectedTagihanId(t.id)
                        setIsPaymentPopupOpen(true)
                      }}
                    >
                      Bayar Sekarang
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* SPP Grid */}
      <SppStatusGrid tagihans={tagihans} year={currentYear} />

      {/* Riwayat Lunas */}
      {sudahLunasPerType.map(t => {
        const Icon = t.icon
        return (
          <Card key={t.value} className={`border ${t.border} shadow-sm`}>
            <CardHeader className={`${t.bg} rounded-t-xl pb-3`}>
              <CardTitle className={`text-base flex items-center gap-2 ${t.text}`}>
                <Icon className="w-4 h-4" />
                {t.label}
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${t.badge}`}>
                  {t.items.length} lunas
                </span>
              </CardTitle>
              <CardDescription className={`${t.text} opacity-70`}>{t.desc}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {t.items.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800">{currency(p.amount)}</span>
                      {p.month && p.year && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${t.badge}`}>
                          {MONTHS[p.month - 1]} {p.year}
                        </span>
                      )}
                    </div>
                    {p.paidDate && (
                      <p className="text-xs text-emerald-500 ml-6 mt-0.5">Dibayar: {formatDate(p.paidDate)}</p>
                    )}
                    {p.notes && <p className="text-xs text-slate-400 ml-6 mt-0.5 italic">"{p.notes}"</p>}
                  </div>
                </div>
              ))}
              <div className={`flex justify-between items-center pt-2 font-bold ${t.text}`}>
                <span>Total {t.label}</span>
                <span>{currency(t.total)}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {tagihans.length === 0 && (
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada tagihan yang diterbitkan.</p>
            <p className="text-slate-400 text-sm mt-1">Hubungi pihak keuangan sekolah untuk informasi lebih lanjut.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
