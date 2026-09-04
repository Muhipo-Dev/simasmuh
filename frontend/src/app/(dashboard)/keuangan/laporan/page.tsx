'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Wallet, CheckCircle2, Clock, Loader2, TrendingUp, GraduationCap, BookOpen,
  Building2, Users2, Calendar, AlertCircle, Receipt, Upload, Percent, Sparkles,
  Copy, CreditCard, ArrowUpRight, ArrowDownRight, DollarSign, Printer, Download,
  Layers, FileSpreadsheet, ShieldCheck, Users, Banknote, HelpCircle, Eye
} from 'lucide-react'
import Swal from 'sweetalert2'
import PaymentBillingPopup from '@/components/student/PaymentBillingPopup'
import { Button } from '@/components/ui/button'
import { useState, useRef } from 'react'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

// ============================================================
// CONSTANTS & HELPERS
// ============================================================
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const PAYMENT_TYPES = [
  { value: 'SPP', label: 'SPP', icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', desc: 'Sumbangan Pembinaan Pendidikan' },
  { value: 'DPP', label: 'DPP', icon: Building2, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', desc: 'Dana Pengembangan Akademik' },
  { value: 'UKA', label: 'UKA', icon: GraduationCap, bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', desc: 'Uang Kegiatan Akademik' },
  { value: 'UKS', label: 'UKS', icon: Users2, bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', badge: 'bg-teal-100 text-teal-700', desc: 'Uang Kegiatan Siswa' },
  { value: 'INFAQ', label: 'Infaq Sekolah', icon: Receipt, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', desc: 'Uang Infaq Sekolah' },
]

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const formatProgramName = (code?: string | null) => {
  if (!code) return 'Reguler'
  const c = code.toLowerCase()
  if (c === 'mic') return 'Muhipo Internasional'
  if (c === 'tahfidz') return 'Tahfidz'
  if (c === 'olahraga') return 'Olahraga'
  if (c === 'kader') return 'Kader'
  if (c === 'inklusi') return 'Inklusi'
  if (c === 'enterpreneur' || c === 'entrepreneur') return 'Entrepreneur'
  if (c === 'seni budaya') return 'Seni Budaya'
  if (c === 'soshum saintek') return 'Soshum Saintek'
  return code.charAt(0).toUpperCase() + code.slice(1)
}

const parseDiscountInfo = (notes: string | null) => {
  if (!notes) return null
  const beasiswaMatch = notes.match(/BEASISWA_INFO:\s*(\{.*?\})/)
  if (beasiswaMatch) {
    try {
      const parsed = JSON.parse(beasiswaMatch[1])
      return {
        beasiswaPercentage: parsed.beasiswaPercentage,
        beasiswaAmount: parsed.beasiswaAmount,
        originalAmount: parsed.originalAmount,
        reason: parsed.reason
      }
    } catch {}
  }
  const match = notes.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    return {
      beasiswaPercentage: parsed.discountPercentage,
      beasiswaAmount: parsed.discountAmount,
      originalAmount: parsed.originalAmount,
      reason: parsed.reason
    }
  } catch {
    return null
  }
}

type Tagihan = {
  id: string; type: string; amount: number; amountPaid?: number
  month: number | null; year: number | null
  dueDate: string | null; status: 'BELUM_LUNAS' | 'LUNAS' | 'ANGSURAN'
  paidDate: string | null; notes: string | null; createdAt: string
}

type StudentDetail = {
  id: string; name: string; nisn: string; nis: string
  gender: string; program?: string | null; virtualAccount?: string | null
  beasiswaPercentage?: number; beasiswaReason?: string | null
  class: { name: string }; tagihans: Tagihan[]
}

const copyTextToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  Swal.fire({
    title: 'Disalin!',
    text: `Kode VA ${text} berhasil disalin`,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
  })
}

// ============================================================
// SPP Status Grid Component
// ============================================================
function SppStatusGrid({ tagihans, year }: { tagihans: Tagihan[]; year: number }) {
  const sppTagihans = tagihans.filter(t => t.type === 'SPP' && t.year === year)

  return (
    <Card className="border-blue-100 dark:border-slate-800 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                isLunas ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : isBelum ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'
              }`}>
                {isLunas
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                  : isBelum
                  ? <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mx-auto mb-1" />
                  : <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                }
                <p className={`text-xs font-semibold ${isLunas ? 'text-emerald-700 dark:text-emerald-300' : isBelum ? 'text-red-600 dark:text-red-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  {name.substring(0, 3)}
                </p>
                {isLunas && tagihan && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{currency(tagihan.amount)}</p>
                )}
                {isBelum && tagihan && (
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-0.5">Tagihan</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
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
// STUDENT FINANCE VIEW (Tagihan Saya)
// ============================================================
function StudentFinanceView({ student }: { student: StudentDetail }) {
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false)
  const [selectedTagihanId, setSelectedTagihanId] = useState<string | undefined>()
  const currentYear = new Date().getFullYear()

  const tagihans = student.tagihans ?? []
  const belumLunas = tagihans.filter(t => t.status === 'BELUM_LUNAS' || t.status === 'ANGSURAN')
  const sudahLunas = tagihans.filter(t => t.status === 'LUNAS')
  const totalTagihan = tagihans.reduce((s, t) => s + t.amount, 0)
  const totalLunas = sudahLunas.reduce((s, t) => s + t.amount, 0)
  const totalBelumLunas = belumLunas.reduce((s, t) => s + Math.max(0, t.amount - (t.amountPaid || 0)), 0)

  const sudahLunasPerType = PAYMENT_TYPES.map(t => ({
    ...t,
    items: sudahLunas.filter(b => b.type === t.value),
    total: sudahLunas.filter(b => b.type === t.value).reduce((s, b) => s + b.amount, 0),
  })).filter(t => t.items.length > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          Tagihan Saya
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300 font-medium">{student.name} · Kelas {student.class?.name}</span>
            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Program {formatProgramName(student.program)}
            </span>
            {student.beasiswaPercentage && student.beasiswaPercentage > 0 ? (
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Beasiswa {student.beasiswaPercentage}%
              </span>
            ) : null}
          </div>
          <Button 
            onClick={() => setIsPaymentPopupOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white shadow-xs flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Bukti Pembayaran
          </Button>
        </div>
      </div>

      {/* Card Informasi Program & Diskon Siswa */}
      <Card className="border border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs border border-indigo-100 dark:border-indigo-900">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Program Siswa
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {formatProgramName(student.program)}
                </h3>
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Aktif
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-100 dark:bg-slate-800"></div>

          <div className="flex items-center gap-3.5 flex-1">
            <div className={`w-11 h-11 rounded-2xl ${student.beasiswaPercentage && student.beasiswaPercentage > 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'} flex items-center justify-center shrink-0 shadow-2xs`}>
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Informasi Beasiswa / Potongan
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {student.beasiswaPercentage && student.beasiswaPercentage > 0 ? (
                  <>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Beasiswa {student.beasiswaPercentage}%
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {student.beasiswaReason || 'Potongan Khusus Siswa'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Tidak ada beasiswa khusus (0% - Tarif Normal)
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual Account BNI Siswa Card */}
      {student.virtualAccount && (
        <Card className="border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-700/60 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Virtual Account Siswa
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold bg-orange-500 text-white rounded-md">
                    BANK BNI
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-mono font-black tracking-widest text-emerald-100">
                    {student.virtualAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(student.virtualAccount || '')}
                    className="p-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 rounded-lg border border-emerald-600/50 transition-all active:scale-95"
                    title="Salin Nomor Virtual Account BNI"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Gunakan nomor Virtual Account BNI ini untuk pembayaran via ATM, Mobile Banking, atau Internet Banking.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsPaymentPopupOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md shrink-0 w-full sm:w-auto"
            >
              Bayar Via VA / Transfer
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Tagihan Belum Lunas */}
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
              const discInfo = parseDiscountInfo(t.notes)
              const hasDiscount = discInfo || (student.beasiswaPercentage && student.beasiswaPercentage > 0 && t.type === 'SPP')
              const discPct = discInfo?.beasiswaPercentage || student.beasiswaPercentage || 0

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
                        {hasDiscount && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Beasiswa {discPct}% {discInfo?.beasiswaAmount ? `(-${currency(discInfo.beasiswaAmount)})` : ''}
                          </span>
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
                    <span className="font-extrabold text-red-700 dark:text-red-300 text-base sm:text-lg">
                      {t.amountPaid && t.amountPaid > 0 ? (
                        <div className="text-right">
                          <span className="text-xs line-through text-slate-400 block font-normal">{currency(t.amount)}</span>
                          <span className="text-xs text-slate-500 font-bold block">Sisa Bayar:</span>
                          <span>{currency(t.amount - t.amountPaid)}</span>
                        </div>
                      ) : (
                        currency(t.amount)
                      )}
                    </span>
                    <Button 
                      size="sm"
                      className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs"
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
          <Card key={t.value} className={`border ${t.border} shadow-2xs`}>
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
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{currency(p.amount)}</span>
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
        <Card className="border-dashed border-slate-200 dark:border-slate-800">
          <CardContent className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Belum ada tagihan yang diterbitkan.</p>
            <p className="text-slate-400 text-sm mt-1">Hubungi pihak keuangan sekolah untuk informasi lebih lanjut.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// EXECUTIVE SCHOOL FINANCIAL REPORT VIEW (Kepala Sekolah & Management)
// ============================================================
function SchoolExecutiveFinancialReportView() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(0) // 0 = Semua bulan
  const [activeTab, setActiveTab] = useState<'overview' | 'pemasukan' | 'pengeluaran' | 'penggajian'>('overview')

  const authenticatedQuery = useAuthenticatedQuery()

  // 1. Rekap Pemasukan & Piutang Tagihan
  const { data: rekapData, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['executive-finance-rekap', selectedYear, selectedMonth],
    queryFn: () => authenticatedQuery(`/api-backend/finance/rekap?year=${selectedYear}${selectedMonth ? `&month=${selectedMonth}` : ''}`),
  })

  // 2. Pengeluaran Operasional
  const { data: pengeluaranData, isLoading: isLoadingPengeluaran } = useQuery<any[]>({
    queryKey: ['executive-finance-pengeluaran', selectedYear, selectedMonth],
    queryFn: () => authenticatedQuery(`/api-backend/finance/pengeluaran?year=${selectedYear}${selectedMonth ? `&month=${selectedMonth}` : ''}`),
  })

  // 3. Rekap Penggajian Guru & Pegawai
  const { data: payrollData, isLoading: isLoadingPayroll } = useQuery<any[]>({
    queryKey: ['executive-finance-payroll', selectedYear, selectedMonth || currentMonth],
    queryFn: () => authenticatedQuery(`/api-backend/finance/payroll-summary?year=${selectedYear}&month=${selectedMonth || currentMonth}`),
  })

  const isLoading = isLoadingRekap || isLoadingPengeluaran || isLoadingPayroll

  // Computations
  const yearlyPaid = rekapData?.yearlyPaid || []
  const monthlyPaid = rekapData?.monthlyPaid || []
  const activePaid = selectedMonth > 0 ? monthlyPaid : yearlyPaid

  const totalPemasukan = activePaid.reduce((s: number, p: any) => s + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0)), 0)
  const totalPengeluaran = (pengeluaranData || []).reduce((s: number, e: any) => s + (e.amount || 0), 0)
  const totalPayroll = (payrollData || []).reduce((s: number, p: any) => s + (p.totalNetSalary || 0), 0)

  const totalPengeluaranDanPayroll = totalPengeluaran + totalPayroll
  const netCashFlow = totalPemasukan - totalPengeluaranDanPayroll

  const yearlyUnpaid = rekapData?.yearlyUnpaid || []
  const totalPiutang = yearlyUnpaid.reduce((s: number, p: any) => s + Math.max(0, p.amount - (p.amountPaid || 0)), 0)

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Header Eksekutif */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Executive Panel
            </span>
            <span className="text-xs text-slate-300 font-medium">SIMASMUH Financial Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-blue-400 shrink-0" />
            Laporan Keuangan Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Rekapitulasi komprehensif seluruh arus kas sekolah meliputi Keuangan Masuk, Keuangan Keluar Operasional, dan Penggajian Guru/Tendik.
          </p>
        </div>

        {/* Filter & Print Action */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-bold text-xs p-1.5 focus:outline-hidden"
            >
              {[2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">Th. {y}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-bold text-xs p-1.5 focus:outline-hidden border-l border-slate-700"
            >
              <option value={0} className="bg-slate-900 text-white">Semua Bulan (Setahun)</option>
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1} className="bg-slate-900 text-white">{m}</option>
              ))}
            </select>
          </div>

          <Button
            onClick={handlePrintReport}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs flex items-center gap-2 rounded-xl h-9"
          >
            <Printer className="w-4 h-4" />
            Cetak Rekap Resmi
          </Button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pemasukan */}
        <Card className="border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 shadow-xs rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-700 dark:text-emerald-300">
            <ArrowUpRight className="w-20 h-20 -mr-4 -mt-4" />
          </div>
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Keuangan Masuk
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Pemasukan Kas
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency(totalPemasukan)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                SPP, DPP, Infaq & Penerimaan Kas Sekolah
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pengeluaran Operasional */}
        <Card className="border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/50 dark:from-rose-950/30 dark:via-slate-900 dark:to-pink-950/20 shadow-xs rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-rose-700 dark:text-rose-300">
            <ArrowDownRight className="w-20 h-20 -mr-4 -mt-4" />
          </div>
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-rose-600" /> Keuangan Keluar
              </span>
              <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                {pengeluaranData?.length || 0} Trx Kas
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency(totalPengeluaran)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Biaya Operasional, Inventaris & LPJ Sekolah
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Penggajian */}
        <Card className="border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/50 dark:from-purple-950/30 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-purple-700 dark:text-purple-300">
            <Banknote className="w-20 h-20 -mr-4 -mt-4" />
          </div>
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-purple-600" /> Total Penggajian
              </span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                {payrollData?.length || 0} Pegawai
              </span>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {currency(totalPayroll)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gaji Pokok, Tunjangan & Bonus Presensi Guru/Staff
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Net Cash Flow (Surplus / Defisit) */}
        <Card className={`border shadow-xs rounded-2xl relative overflow-hidden ${
          netCashFlow >= 0 
            ? 'border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/90 via-white to-cyan-50/50 dark:from-blue-950/30 dark:via-slate-900 dark:to-cyan-950/20'
            : 'border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-orange-950/20'
        }`}>
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                <DollarSign className="w-4 h-4" /> Saldo Arus Kas Net
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                netCashFlow >= 0 
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {netCashFlow >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
              </span>
            </div>
            <div>
              <p className={`text-2xl sm:text-3xl font-black tracking-tight ${netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-600 dark:text-amber-400'}`}>
                {currency(netCashFlow)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pemasukan - (Pengeluaran + Penggajian)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Overview & Arus Kas
        </button>
        <button
          onClick={() => setActiveTab('pemasukan')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all shrink-0 ${
            activeTab === 'pemasukan'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" /> Keuangan Masuk ({currency(totalPemasukan)})
        </button>
        <button
          onClick={() => setActiveTab('pengeluaran')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all shrink-0 ${
            activeTab === 'pengeluaran'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" /> Keuangan Keluar ({currency(totalPengeluaran)})
        </button>
        <button
          onClick={() => setActiveTab('penggajian')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all shrink-0 ${
            activeTab === 'penggajian'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4" /> Penggajian Pegawai ({currency(totalPayroll)})
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Comparison Progress Breakdown */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Perbandingan Arus Kas Sekolah {selectedYear} {selectedMonth ? `(${MONTHS[selectedMonth - 1]})` : '(Setahun)'}</span>
                <span className="text-xs font-bold text-slate-500">Net: {currency(netCashFlow)}</span>
              </CardTitle>
              <CardDescription>
                Rasio pemasukan vs beban operasional dan beban gaji pegawai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Visual Multi-Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Pemasukan vs Beban Keluar Total</span>
                  <span>Total Beban: {currency(totalPengeluaranDanPayroll)}</span>
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (totalPemasukan / Math.max(1, totalPemasukan + totalPengeluaranDanPayroll)) * 100)}%` }}
                    title={`Pemasukan: ${currency(totalPemasukan)}`}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (totalPengeluaran / Math.max(1, totalPemasukan + totalPengeluaranDanPayroll)) * 100)}%` }}
                    title={`Pengeluaran Operasional: ${currency(totalPengeluaran)}`}
                  />
                  <div 
                    className="bg-purple-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (totalPayroll / Math.max(1, totalPemasukan + totalPengeluaranDanPayroll)) * 100)}%` }}
                    title={`Penggajian: ${currency(totalPayroll)}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-xs bg-emerald-500" />
                    <span>Pemasukan ({currency(totalPemasukan)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-xs bg-rose-500" />
                    <span>Pengeluaran Operasional ({currency(totalPengeluaran)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-xs bg-purple-500" />
                    <span>Penggajian Guru/Staff ({currency(totalPayroll)})</span>
                  </div>
                </div>
              </div>

              {/* Detail Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Piutang Tagihan Siswa</span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">{currency(totalPiutang)}</p>
                  <p className="text-[10px] text-slate-400">Total tagihan siswa belum terbayar</p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Beban Operasional Ratio</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {totalPemasukan > 0 ? `${((totalPengeluaran / totalPemasukan) * 100).toFixed(1)}%` : '0%'}
                  </p>
                  <p className="text-[10px] text-slate-400">Persentase pengeluaran terhadap kas masuk</p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Beban Penggajian Ratio</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    {totalPemasukan > 0 ? `${((totalPayroll / totalPemasukan) * 100).toFixed(1)}%` : '0%'}
                  </p>
                  <p className="text-[10px] text-slate-400">Persentase gaji terhadap kas masuk</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend Table */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Tren Arus Keuangan Masuk Bulanan Tahun {selectedYear}
              </CardTitle>
              <CardDescription>Rekapitulasi penerimaan tagihan per bulan dalam 12 bulan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Bulan</th>
                      <th className="p-2.5 text-right">Pemasukan SPP & Tagihan</th>
                      <th className="p-2.5 text-center">Status Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {(rekapData?.monthlyTrend || []).map((m: any) => (
                      <tr key={m.month} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {MONTHS[m.month - 1]}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                          {currency(m.total)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            m.total > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {m.total > 0 ? 'Ada Penerimaan' : 'Belum Terisi'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 2: KEuangan MASUK */}
      {activeTab === 'pemasukan' && (
        <Card className="border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              Rincian Keuangan Masuk (Penerimaan Kas)
            </CardTitle>
            <CardDescription>Breakdown penerimaan berdasarkan jenis tagihan siswa & donasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYMENT_TYPES.map((t) => {
                const filtered = activePaid.filter((p: any) => p.type?.toUpperCase() === t.value)
                const total = filtered.reduce((s: number, p: any) => s + (p.amountPaid || (p.status === 'LUNAS' ? p.amount : 0)), 0)
                const unpaid = yearlyUnpaid.filter((p: any) => p.type?.toUpperCase() === t.value)
                const totalUnpaid = unpaid.reduce((s: number, p: any) => s + Math.max(0, p.amount - (p.amountPaid || 0)), 0)

                const Icon = t.icon
                return (
                  <div key={t.value} className={`p-4 rounded-xl border ${t.border} ${t.bg} space-y-2 shadow-2xs`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${t.badge} flex items-center gap-1`}>
                        <Icon className="w-3.5 h-3.5" /> {t.label}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{filtered.length} Lunas</span>
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-900">{currency(total)}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{t.desc}</p>
                    </div>
                    {totalUnpaid > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 text-xs text-amber-700 font-semibold flex justify-between">
                        <span>Piutang Belum Lunas:</span>
                        <span>{currency(totalUnpaid)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 3: KEUANGAN KELUAR */}
      {activeTab === 'pengeluaran' && (
        <Card className="border border-rose-200/80 dark:border-rose-900/50 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-rose-600" />
              Rincian Keuangan Keluar (Pengeluaran Operasional)
            </CardTitle>
            <CardDescription>Daftar entri pengeluaran kas sekolah untuk kegiatan dan inventaris</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPengeluaran ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              </div>
            ) : !pengeluaranData || pengeluaranData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ArrowDownRight className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-medium text-sm">Belum ada catatan pengeluaran kas pada periode ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Tanggal</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Keterangan / Keperluan</th>
                      <th className="p-2.5 text-right rounded-r-lg">Nominal Pengeluaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {pengeluaranData.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-semibold text-slate-600 dark:text-slate-400">
                          {formatDateShort(e.date || e.createdAt)}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                            {e.category || 'OPERASIONAL'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-900 dark:text-white font-bold">
                          {e.description || '-'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-rose-600 dark:text-rose-400">
                          {currency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT 4: PENGGAJIAN */}
      {activeTab === 'penggajian' && (
        <Card className="border border-purple-200/80 dark:border-purple-900/50 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-purple-600" />
              Rincian Penggajian Guru & Pegawai (Payroll)
            </CardTitle>
            <CardDescription>Rekapitulasi penggajian pegawai & pendidik untuk periode {selectedMonth ? MONTHS[selectedMonth - 1] : MONTHS[currentMonth - 1]} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPayroll ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : !payrollData || payrollData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Banknote className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-medium text-sm">Data penggajian tidak ditemukan pada periode ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Nama Pegawai / Guru</th>
                      <th className="p-2.5">Peran / Jabatan</th>
                      <th className="p-2.5 text-right">Gaji Pokok</th>
                      <th className="p-2.5 text-right">Tunjangan & Bonus</th>
                      <th className="p-2.5 text-right rounded-r-lg">Gaji Bersih Diterima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {payrollData.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400">NIP: {p.nip || '-'}</p>
                        </td>
                        <td className="p-2.5">
                          <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            {p.roles || p.role}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                          {currency(p.baseSalary)}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          +{currency((p.roleAllowance || 0) + (p.attendanceBonus || 0))}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-purple-700 dark:text-purple-300">
                          {currency(p.totalNetSalary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PRINT-FRIENDLY HIDDEN SECTION */}
      <div className="hidden print:block print:p-8 space-y-6 text-black">
        <div className="text-center border-b-2 border-black pb-4 space-y-1">
          <h2 className="text-xl font-black uppercase">SMA MUHAMMADIYAH 1 PONOROGO</h2>
          <p className="text-xs font-semibold">Jl. Gajah Mada No. 23 Ponorogo, Jawa Timur · SIMASMUH Official</p>
          <h3 className="text-base font-bold underline mt-2 uppercase">LAPORAN REKAPITULASI KEUANGAN SEKOLAH</h3>
          <p className="text-xs font-medium">Periode: {selectedMonth ? MONTHS[selectedMonth - 1] : 'Keseluruhan Tahun'} {selectedYear}</p>
        </div>

        <div className="space-y-2 text-xs">
          <table className="w-full border-collapse border border-black text-left">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-2 font-bold">Kategori Ringkasan</th>
                <th className="border border-black p-2 text-right font-bold">Jumlah Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2">Total Keuangan Masuk (Pemasukan Kas)</td>
                <td className="border border-black p-2 text-right font-bold">{currency(totalPemasukan)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2">Total Keuangan Keluar (Pengeluaran Operasional)</td>
                <td className="border border-black p-2 text-right font-bold">{currency(totalPengeluaran)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2">Total Beban Penggajian Pegawai & Guru</td>
                <td className="border border-black p-2 text-right font-bold">{currency(totalPayroll)}</td>
              </tr>
              <tr className="bg-slate-100 font-extrabold">
                <td className="border border-black p-2">Saldo Arus Kas Net (Surplus / Defisit)</td>
                <td className="border border-black p-2 text-right">{currency(netCashFlow)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between pt-12 text-xs text-center">
          <div>
            <p className="mb-16">Mengetahui,<br /><strong>Kepala Sekolah</strong></p>
            <p className="font-bold underline">M. SYARIF MANAN, S.Pd.</p>
          </div>
          <div>
            <p className="mb-16">Ponorogo, {new Date().toLocaleDateString('id-ID')}<br /><strong>Bendahara Sekolah</strong></p>
            <p className="font-bold underline">BENDAHARA SIMASMUH</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE COMPONENT WITH ROLE ROUTING & MULTI-STUDENT SUPPORT
// ============================================================
export default function FinanceReportPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const roles = [
    (session?.user as any)?.role,
    (session?.user as any)?.subRole,
    (session?.user as any)?.subRole2,
    (session?.user as any)?.subRole3,
    (session?.user as any)?.subRole4,
    (session?.user as any)?.subRole5,
  ].filter(Boolean)

  const isStaffOrManagement = roles.some(r =>
    ['KEPALA_SEKOLAH', 'SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'KEUANGAN_ALL', 'KEUANGAN_MASUK', 'KEUANGAN_KELUAR', 'TATA_USAHA'].includes(r)
  )

  const isParent = roles.includes('WALI_MURID')

  const authenticatedQuery = useAuthenticatedQuery()

  // Query daftar siswa jika login sebagai Wali Murid
  const { data: parentStudents = [] } = useQuery<any[]>({
    queryKey: ['parent-my-students'],
    queryFn: () => authenticatedQuery('/api-backend/parents/my-students'),
    enabled: !!userId && isParent,
  })

  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const currentSelectedStudentId = isParent && parentStudents.length > 0
    ? (parentStudents[selectedStudentIdx]?.id || parentStudents[0]?.id)
    : undefined

  const { data: student, isLoading } = useQuery<StudentDetail>({
    queryKey: ['my-all-tagihan', currentSelectedStudentId],
    queryFn: () => authenticatedQuery(`/api-backend/finance/my-all-tagihan${currentSelectedStudentId ? `?studentId=${currentSelectedStudentId}` : ''}`),
    enabled: !!userId && !isStaffOrManagement && (!isParent || parentStudents.length > 0 || !!userId)
  })

  if (isStaffOrManagement) {
    return <SchoolExecutiveFinancialReportView />
  }

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
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <Wallet className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Data keuangan tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector Siswa Khusus Wali Murid jika memiliki lebih dari 1 siswa */}
      {isParent && parentStudents.length > 1 && (
        <div className="bg-gradient-to-r from-indigo-800 via-purple-800 to-slate-900 p-4 sm:p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/10">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-300" />
              Pilih Siswa yang Diwalikan
            </h3>
            <p className="text-indigo-100 text-xs mt-0.5">
              Lihat dan pantau riwayat tagihan SPP & pembiayaan sekolah masing-masing siswa
            </p>
          </div>
          <div className="relative">
            <select
              value={selectedStudentIdx}
              onChange={(e) => setSelectedStudentIdx(parseInt(e.target.value, 10))}
              aria-label="Pilih Siswa"
              className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold text-xs h-9 px-3 py-1 pr-8 rounded-xl border border-indigo-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
            >
              {parentStudents.map((st: any, idx: number) => (
                <option key={st.id || idx} value={idx}>
                  {st.name} ({st.className})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <StudentFinanceView student={student} />
    </div>
  )
}
