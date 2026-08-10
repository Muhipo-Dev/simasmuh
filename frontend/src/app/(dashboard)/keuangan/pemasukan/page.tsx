'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Wallet, Users, BarChart3, Building2, Search, Pencil, Trash2,
  Loader2, PlusCircle, CheckCircle2, TrendingUp, X, Download,
  AlertTriangle, RotateCcw, Receipt, Clock, ChevronDown, ChevronUp, Layers, Percent, Sparkles,
  ShieldAlert, Lock, CheckSquare, Square, HeartHandshake, RefreshCw, Send, FileSpreadsheet, Check
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import PaymentProofVerificationPage from '../verifikasi-pembayaran/page'

// ============================================================
// TYPES
// ============================================================
type Tagihan = {
  id: string; studentId: string; type: string; amount: number
  amountPaid?: number; month: number | null; year: number | null; dueDate: string | null
  status: 'BELUM_LUNAS' | 'ANGSURAN' | 'LUNAS'; paidDate: string | null
  notes: string | null; createdAt: string
  payments?: { id: string; amount: number; paymentDate: string; notes?: string }[]
}

type StudentSummary = {
  id: string; nisn: string; nis: string; name: string
  gender: string; className: string; totalTagihan: number
  totalLunas: number; sisaTagihan?: number; belumLunasCount: number
  sppLunasCount: number; tagihanCount: number
  program?: string | null
  gelombang?: string | null
  jalurPendaftaran?: string | null
  discountPercentage?: number
  discountReason?: string | null
  beasiswaSeragamPct?: number
  beasiswaSppPct?: number
  beasiswaDppPct?: number
}

type StudentDetail = {
  id: string; name: string; nisn: string; nis: string
  className: string; gender: string; tagihans: Tagihan[]
  class: { name: string }
  program?: string | null
  discountPercentage?: number
  discountReason?: string | null
}

type Rekap = {
  year: number; month: number | null
  yearly: { type: string; total: number; count: number }[]
  monthly: { type: string; total: number; count: number }[]
  unpaid: { type: string; total: number; count: number }[]
  monthlyTrend: { month: number; total: number }[]
}

type ClassItem = { id: string; name: string; gradeLevel: number }

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

const PAYMENT_TYPES = [
  { value: 'SPP', label: 'SPP', desc: 'Sumbangan Pembinaan Pendidikan' },
  { value: 'DPP', label: 'DPP', desc: 'Dana Pengembangan Akademik' },
  { value: 'UKA', label: 'UKA', desc: 'Uang Kegiatan Akademik' },
  { value: 'UKS', label: 'UKS', desc: 'Uang Kegiatan Siswa' },
  { value: 'INFAQ', label: 'Infaq', desc: 'Uang Infaq Sekolah (Sukarela)' },
]

const TYPE_COLORS: Record<string, string> = {
  SPP: 'bg-blue-50 text-blue-700 border border-blue-200',
  DPP: 'bg-purple-50 text-purple-700 border border-purple-200',
  UKA: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  UKS: 'bg-teal-50 text-teal-700 border border-teal-200',
  INFAQ: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  AKADEMIK: 'bg-amber-50 text-amber-700 border border-amber-200',
  SEKOLAH: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

// ============================================================
// CONFIRM DIALOG
// ============================================================
function ConfirmDialog({ open, onClose, onConfirm, loading, title, description }: {
  open: boolean; onClose: () => void; onConfirm: () => void
  loading?: boolean; title: string; description: string
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// FORM TAGIHAN
// ============================================================
type FormState = {
  type: string; amount: string; month: string; year: string
  dueDate: string; notes: string
  discountPercentage: number; discountReason: string
}

const defaultForm = (): FormState => ({
  type: 'SPP', amount: '', month: (new Date().getMonth() + 1).toString(),
  year: currentYear.toString(), dueDate: '', notes: '',
  discountPercentage: 0, discountReason: '',
})

// ============================================================
// TAGIHAN MODAL - Detail & Kelola per siswa
// ============================================================
function TagihanModal({
  student, open, onClose, onResetStudent }: {
  student: StudentDetail | null; open: boolean; onClose: () => void; onResetStudent?: (studentId: string) => void
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const authenticatedQuery = useAuthenticatedQuery();
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(defaultForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BELUM_LUNAS' | 'ANGSURAN' | 'LUNAS'>('ALL')
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [discountTagihanId, setDiscountTagihanId] = useState<string | null>(null)
  const [discountPercentage, setDiscountPercentage] = useState<25 | 50 | 75 | 100>(25)
  const [discountReason, setDiscountReason] = useState('')
  const [showCustomDiscount, setShowCustomDiscount] = useState(false)

  // State for Angsuran Modal
  const [payTargetTagihan, setPayTargetTagihan] = useState<Tagihan | null>(null)
  const [payAmountInput, setPayAmountInput] = useState('')
  const [payNotesInput, setPayNotesInput] = useState('')
  const [payMode, setPayMode] = useState<'LUNAS' | 'ANGSURAN'>('LUNAS')

  // Queries for public settings and program configs to auto-fill fee amounts
  const { data: publicSettings } = useQuery<{ defaultDpp?: number; defaultUka?: number; defaultUks?: number }>({
    queryKey: ['public-settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings/public'),
  })

  const { data: programConfigs } = useQuery<Array<{ id: string; code: string; name: string; defaultSpp: number; defaultDiscount: number }>>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs'),
  })

  const studentProgConfig = useMemo(() => {
    if (!student?.program || !programConfigs) return null
    return programConfigs.find(p => p.code.toLowerCase() === student.program?.toLowerCase()) || null
  }, [student?.program, programConfigs])

  // Get default fee for type
  const getDefaultAmountForType = (typeVal: string): number => {
    if (typeVal === 'SPP') {
      return studentProgConfig?.defaultSpp && studentProgConfig.defaultSpp > 0 ? studentProgConfig.defaultSpp : 300000
    }
    if (typeVal === 'DPP') return publicSettings?.defaultDpp || 0
    if (typeVal === 'UKA') return publicSettings?.defaultUka || 0
    if (typeVal === 'UKS') return publicSettings?.defaultUks || 0
    return 0
  }

  // Get effective default discount percentage for student
  const effectiveDefaultDiscount = useMemo(() => {
    return student?.discountPercentage || studentProgConfig?.defaultDiscount || 0
  }, [student?.discountPercentage, studentProgConfig?.defaultDiscount])

  const handleSelectType = (typeVal: string) => {
    setShowCustomDiscount(false)
    let autoAmount = form.amount
    let autoDiscountPct = 0
    let autoDiscountReason = ''

    if (typeVal === 'SPP') {
      autoAmount = getDefaultAmountForType('SPP').toString()
    } else if (typeVal === 'DPP') {
      const def = getDefaultAmountForType('DPP')
      if (def > 0) autoAmount = def.toString()
    } else if (typeVal === 'UKA') {
      const def = getDefaultAmountForType('UKA')
      if (def > 0) autoAmount = def.toString()
    } else if (typeVal === 'UKS') {
      const def = getDefaultAmountForType('UKS')
      if (def > 0) autoAmount = def.toString()
    } else if (typeVal === 'INFAQ') {
      autoAmount = ''
    }

    if (effectiveDefaultDiscount > 0) {
      autoDiscountPct = effectiveDefaultDiscount
      autoDiscountReason = student?.discountReason || `Diskon Default Program/Siswa (${effectiveDefaultDiscount}%)`
    }

    setForm(f => ({
      ...f,
      type: typeVal,
      amount: autoAmount,
      discountPercentage: autoDiscountPct,
      discountReason: autoDiscountReason,
    }))
  }

  const openPayDialog = (t: Tagihan) => {
    const paid = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)
    const remaining = Math.max(0, t.amount - paid)
    const isInfaq = t.type.toLowerCase() === 'infaq'
    setPayTargetTagihan(t)
    setPayMode('LUNAS')
    setPayAmountInput(remaining.toString())
    setPayNotesInput('')
  }

  const closePayDialog = () => {
    setPayTargetTagihan(null)
    setPayAmountInput('')
    setPayNotesInput('')
  }

  const resetForm = () => { setForm(defaultForm()); setEditId(null); setShowForm(false); setShowCustomDiscount(false) }

  const buildPayload = () => {
    const finalAmount = form.amount && parseFloat(form.amount) > 0 
      ? parseFloat(form.amount) 
      : getDefaultAmountForType(form.type)

    const finalDiscountPct = showCustomDiscount 
      ? form.discountPercentage 
      : (effectiveDefaultDiscount > 0 ? effectiveDefaultDiscount : form.discountPercentage)

    return {
      type: form.type,
      amount: finalAmount,
      month: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.month) : null,
      year: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.year) : null,
      dueDate: null,
      notes: form.notes || null,
      discountPercentage: finalDiscountPct,
      discountReason: form.discountReason || null,
    }
  }

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(`/api-backend/finance/students/${student!.id}/tagihan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('Gagal menyimpan')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] }); qc.invalidateQueries({ queryKey: ['finance-students'] }); resetForm() },
  })

  const editMut = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(`/api-backend/finance/tagihan/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('Gagal mengupdate')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] }); qc.invalidateQueries({ queryKey: ['finance-students'] }); resetForm() },
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/finance/tagihan/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] }); qc.invalidateQueries({ queryKey: ['finance-students'] }); setDeleteId(null) },
  })

  const lunasiMut = useMutation({
    mutationFn: async ({ id, paymentAmount, notes }: { id: string; paymentAmount?: number; notes?: string }) => {
      const res = await authenticatedFetch(`/api-backend/finance/tagihan/${id}/lunasi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentAmount, notes }),
      })
      if (!res.ok) {
        const errText = await res.text()
        let errMsg = 'Gagal memproses pembayaran'
        try {
          const json = JSON.parse(errText)
          errMsg = json.message || errMsg
        } catch {}
        throw new Error(errMsg)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] })
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      closePayDialog()
    },
  })

  const batalLunasiMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/finance/tagihan/${id}/batal-lunasi`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Gagal')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] }); qc.invalidateQueries({ queryKey: ['finance-students'] }) },
  })

  const discountMut = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(`/api-backend/finance/discount/${discountTagihanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercentage, reason: discountReason }),
      })
      if (!res.ok) throw new Error('Gagal memberikan diskon')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] })
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      setShowDiscountModal(false)
      setDiscountTagihanId(null)
      setDiscountReason('')
    },
  })

  const removeDiscountMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/finance/discount/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus diskon')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-tagihan', student?.id] })
      qc.invalidateQueries({ queryKey: ['finance-students'] })
    },
  })

  const openDiscountModal = (tagihanId: string) => {
    setDiscountTagihanId(tagihanId)
    setShowDiscountModal(true)
  }

  const parseDiscountInfo = (notes: string | null) => {
    if (!notes) return null
    const match = notes.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
    if (!match) return null
    try {
      return JSON.parse(match[1])
    } catch {
      return null
    }
  }

  const startEdit = (t: Tagihan) => {
    const dInfo = parseDiscountInfo(t.notes)
    setForm({
      type: t.type,
      amount: dInfo?.originalAmount ? dInfo.originalAmount.toString() : t.amount.toString(),
      month: (t.month ?? new Date().getMonth() + 1).toString(),
      year: (t.year ?? currentYear).toString(),
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      notes: t.notes ? t.notes.replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '').replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '').trim() : '',
      discountPercentage: dInfo?.discountPercentage || 0,
      discountReason: dInfo?.reason || '',
    })
    setEditId(t.id); setShowForm(true)
  }

  const tagihans = student?.tagihans ?? []
  const lunasTagihans = tagihans.filter(t => t.status === 'LUNAS' || ((t.amountPaid || 0) >= t.amount && t.amount > 0))
  const angsuranTagihans = tagihans.filter(t => !lunasTagihans.includes(t) && (t.status === 'ANGSURAN' || (t.amountPaid || 0) > 0))
  const belumLunasTagihans = tagihans.filter(t => !lunasTagihans.includes(t) && !angsuranTagihans.includes(t))

  const filtered = filterStatus === 'ALL' 
    ? tagihans 
    : filterStatus === 'LUNAS' 
    ? lunasTagihans 
    : filterStatus === 'ANGSURAN' 
    ? angsuranTagihans 
    : belumLunasTagihans

  const totalBelumLunas = belumLunasTagihans.reduce((s, t) => s + Math.max(0, t.amount - (t.amountPaid || 0)), 0)
  const totalAngsuranPaid = angsuranTagihans.reduce((s, t) => s + (t.amountPaid || 0), 0)
  const totalAngsuranSisa = angsuranTagihans.reduce((s, t) => s + Math.max(0, t.amount - (t.amountPaid || 0)), 0)
  const totalLunas = lunasTagihans.reduce((s, t) => s + t.amount, 0)
  const isLoading = addMut.isPending || editMut.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm() } }}>
        <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          {/* Header Banner Modern */}
          <div className="shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-6 text-white shadow-md">
            <DialogHeader className="space-y-1 pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <DialogTitle className="flex items-center gap-3 text-white text-lg sm:text-xl font-black">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                      <Receipt className="w-5 h-5 text-blue-200" />
                    </div>
                    Tagihan Siswa — {student?.name}
                  </DialogTitle>
                  <DialogDescription className="text-blue-100 text-xs sm:text-sm font-medium">
                    Kelas <span className="font-extrabold text-white">{student?.class?.name}</span> · NISN: <span className="font-mono text-white">{student?.nisn}</span> · NIS: <span className="font-mono text-white">{student?.nis}</span>
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (student) {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-beasiswa-dialog', { detail: student }));
                      }
                    }}
                    className="border-amber-400/50 bg-amber-500/20 text-amber-100 hover:bg-amber-500 hover:text-white text-xs font-extrabold gap-1.5 h-9 rounded-xl backdrop-blur-sm transition-all shadow-sm"
                  >
                    <Percent className="w-3.5 h-3.5 text-amber-300" />
                    Set Beasiswa (%)
                  </Button>
                  {student && onResetStudent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onResetStudent(student.id);
                      }}
                      className="border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-600 hover:text-white text-xs font-extrabold gap-1.5 h-9 rounded-xl backdrop-blur-sm transition-all shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Tagihan Siswa
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">

          {/* Summary Cards (3 Kolom Simetris & Clean) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-1">
            {/* Card 1: Belum Dibayar */}
            <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-4 flex flex-col justify-between shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider truncate">Belum Dibayar</span>
                <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {belumLunasTagihans.length} Tagihan
                </span>
              </div>
              <p className="font-extrabold text-rose-700 dark:text-rose-300 text-lg sm:text-xl mt-2 truncate">{currency(totalBelumLunas)}</p>
            </div>

            {/* Card 2: Sedang Diangsur */}
            <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs ring-1 ring-amber-400/20 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Sedang Diangsur</span>
                </span>
                <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/70 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {angsuranTagihans.length} Tagihan
                </span>
              </div>
              <div className="mt-2">
                <p className="font-extrabold text-amber-900 dark:text-amber-200 text-lg sm:text-xl truncate">{currency(totalAngsuranSisa)}</p>
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5 truncate">
                  Sudah Dibayar: {currency(totalAngsuranPaid)}
                </p>
              </div>
            </div>

            {/* Card 3: Sudah Lunas */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl p-4 flex flex-col justify-between shadow-xs min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider truncate">Sudah Lunas</span>
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {lunasTagihans.length} Tagihan
                </span>
              </div>
              <p className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg sm:text-xl mt-2 truncate">{currency(totalLunas)}</p>
            </div>
          </div>

          {/* AREA TAGIHAN SEDANG DIANGSUR (Highlight Banner jika ada angsuran aktif) */}
          {angsuranTagihans.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  Area Tagihan Sedang Diangsur ({angsuranTagihans.length} Tagihan Aktif)
                </h4>
                <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-full border border-amber-300">
                  Total Sisa Kurang Bayar: {currency(totalAngsuranSisa)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {angsuranTagihans.map(at => {
                  const paid = at.amountPaid || 0
                  const remaining = Math.max(0, at.amount - paid)
                  const pct = Math.min(100, Math.round((paid / at.amount) * 100))
                  return (
                    <div key={at.id} className="bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 space-y-2 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${TYPE_COLORS[at.type] || 'bg-slate-100 text-slate-700'}`}>
                            {at.type}
                          </span>
                          {at.month && at.year && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                              {MONTHS.find(m => m.value === at.month!.toString())?.label} {at.year}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openPayDialog(at)}
                          className="h-8 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1 shadow-xs"
                        >
                          <Wallet className="w-3.5 h-3.5" /> Cicil Lagi
                        </Button>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Terbayar: <strong className="text-emerald-600">{currency(paid)} ({pct}%)</strong></span>
                          <span className="text-slate-500">Sisa: <strong className="text-rose-600">{currency(remaining)}</strong></span>
                        </div>
                        <div className="w-full h-2 bg-amber-100 dark:bg-amber-950 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Form Tagihan Baru / Edit */}
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md gap-2 my-1">
              <PlusCircle className="w-4 h-4" /> Tambah Tagihan Baru
            </Button>
          ) : (
            <Card className="border border-blue-200/80 dark:border-slate-800 bg-blue-50/30 dark:bg-slate-900/90 rounded-2xl shadow-sm overflow-hidden my-2">
              <CardHeader className="bg-white dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-800 py-3.5 px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  {editId ? 'Edit Tagihan' : 'Tagihan Baru'}
                </CardTitle>
                <button onClick={resetForm} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-5">
                {/* Jenis Tagihan */}
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Jenis Tagihan
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
                    {PAYMENT_TYPES.map(t => (
                      <button 
                        key={t.value} 
                        type="button"
                        onClick={() => handleSelectType(t.value)}
                        className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex items-center justify-center ${
                          form.type === t.value 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {PAYMENT_TYPES.find(t => t.value === form.type)?.desc}
                  </p>
                </div>

                {/* Banner Info Program & Diskon untuk Siswa */}
                {student?.program && (
                  <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg">
                        Program {student.program}
                      </span>
                      {studentProgConfig?.defaultSpp ? (
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Default SPP: <strong className="font-bold text-purple-950 dark:text-purple-100">Rp {studentProgConfig.defaultSpp.toLocaleString('id-ID')}</strong>
                        </span>
                      ) : null}
                    </div>
                    {(student?.discountPercentage || studentProgConfig?.defaultDiscount) ? (
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg self-start sm:self-auto">
                        Diskon: {student?.discountPercentage || studentProgConfig?.defaultDiscount}%
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium italic">Tanpa Diskon</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Nominal (Rp)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                      <Input
                        type="number"
                        placeholder={
                          getDefaultAmountForType(form.type) > 0
                            ? `Default: Rp ${getDefaultAmountForType(form.type).toLocaleString('id-ID')}`
                            : "Contoh: 150000"
                        }
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white rounded-xl border-slate-200 dark:border-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Kosongkan untuk nominal default sistem.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Tagihan Untuk Periode
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v ?? f.month }))}>
                        <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Bulan" />
                        </SelectTrigger>
                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={form.year} onValueChange={(v) => setForm(f => ({ ...f, year: v ?? f.year }))}>
                        <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Tahun" />
                        </SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section Diskon */}
                {effectiveDefaultDiscount > 0 && !showCustomDiscount ? (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                        Diskon Otomatis: {effectiveDefaultDiscount}%
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium hidden sm:inline">Mendapatkan diskon default siswa/program.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomDiscount(true)}
                      className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline shrink-0 ml-2"
                    >
                      + Diskon Tambahan
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-amber-600" /> Diskon Tagihan
                      </span>
                      {effectiveDefaultDiscount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomDiscount(false)
                            setForm(f => ({ ...f, discountPercentage: effectiveDefaultDiscount }))
                          }}
                          className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                        >
                          Gunakan Default ({effectiveDefaultDiscount}%)
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, discountPercentage: pct }))}
                          className={`h-9 rounded-xl text-xs font-extrabold border transition-all ${
                            form.discountPercentage === pct
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                          }`}
                        >
                          {pct === 0 ? 'Tanpa Diskon' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                    {form.discountPercentage > 0 && (
                      <Input
                        placeholder="Alasan Diskon (Misal: Beasiswa Kader / Prestasi / Khusus)"
                        value={form.discountReason}
                        onChange={(e) => setForm(f => ({ ...f, discountReason: e.target.value }))}
                        className="bg-white dark:bg-slate-950 h-10 text-xs rounded-xl"
                      />
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Catatan (opsional)
                  </Label>
                  <Textarea placeholder="Catatan tambahan..." rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-white dark:bg-slate-950 resize-none text-xs rounded-xl" />
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <Button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md"
                    disabled={isLoading}
                    onClick={() => editId ? editMut.mutate() : addMut.mutate()}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editId ? 'Simpan Perubahan' : 'Buat Tagihan'}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={isLoading} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {(['ALL', 'BELUM_LUNAS', 'ANGSURAN', 'LUNAS'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {s === 'ALL' ? 'Semua' : s === 'BELUM_LUNAS' ? 'Belum Lunas' : s === 'ANGSURAN' ? 'Angsuran' : 'Lunas'}
                {s !== 'ALL' && <span className="ml-1">({tagihans.filter(t => t.status === s).length})</span>}
              </button>
            ))}
          </div>

          {/* Daftar Tagihan */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada tagihan.
              </div>
            ) : filtered.map(t => {
              const paid = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)
              const remaining = Math.max(0, t.amount - paid)
              const pct = Math.min(100, Math.round((paid / t.amount) * 100))

              const dInfo = parseDiscountInfo(t.notes)
              const cleanNotesText = t.notes
                ? t.notes
                    .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
                    .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
                    .trim()
                : ''

              return (
                <div key={t.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-600'}`}>{t.type}</span>
                        {t.status === 'LUNAS' ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lunas</span>
                        ) : t.status === 'ANGSURAN' ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Angsuran ({pct}%)</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Belum Lunas</span>
                        )}
                        {t.month && t.year && (
                          <span className="text-xs text-slate-500 font-medium">{MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">{currency(t.amount)}</span>
                        {dInfo?.originalAmount && dInfo.originalAmount > t.amount && (
                          <span className="text-xs text-slate-400 line-through">
                            {currency(dInfo.originalAmount)}
                          </span>
                        )}
                      </div>

                      {/* Diskon Badge */}
                      {dInfo && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Diskon {dInfo.discountPercentage}% ({dInfo.reason || 'Diskon Default Siswa'})
                          </span>
                        </div>
                      )}

                      {/* Progress Angsuran */}
                      {t.status !== 'LUNAS' && paid > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Terbayar: <strong className="text-emerald-600">{currency(paid)}</strong></span>
                            <span>Sisa: <strong className="text-red-600">{currency(remaining)}</strong></span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}

                      {t.status === 'LUNAS' && t.paidDate && (
                        <p className="text-xs text-emerald-500 mt-0.5">Dibayar: {formatDate(t.paidDate)}</p>
                      )}
                      {cleanNotesText && <p className="text-xs text-slate-500 mt-0.5 truncate">{cleanNotesText}</p>}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Lunasi / Angsur / Batal */}
                      {t.status !== 'LUNAS' ? (
                        <button onClick={() => openPayDialog(t)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> {t.status === 'ANGSURAN' ? 'Angsur / Lunasi' : 'Bayar / Angsur'}
                        </button>
                      ) : (
                        <button onClick={() => batalLunasiMut.mutate(t.id)} disabled={batalLunasiMut.isPending}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
                          {batalLunasiMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Batal
                        </button>
                      )}
                      <div className="flex gap-1 justify-end">
                        {/* Set Diskon Button */}
                        {t.status === 'BELUM_LUNAS' && (
                          <button onClick={() => openDiscountModal(t.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Set Diskon">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {parseDiscountInfo(t.notes) && (
                          <button onClick={() => removeDiscountMut.mutate(t.id)} disabled={removeDiscountMut.isPending}
                            className="p-1.5 rounded-lg text-amber-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Diskon">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => startEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* MODAL BAYAR / ANGSURAN TAGIHAN */}
      <Dialog open={!!payTargetTagihan} onOpenChange={(v) => { if (!v) closePayDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Receipt className="w-5 h-5 text-emerald-600" /> Pembayaran / Angsuran Tagihan
            </DialogTitle>
            <DialogDescription>
              {payTargetTagihan?.type} — {student?.name}
            </DialogDescription>
          </DialogHeader>

          {payTargetTagihan && (() => {
            const paid = payTargetTagihan.amountPaid || (payTargetTagihan.status === 'LUNAS' ? payTargetTagihan.amount : 0)
            const remaining = Math.max(0, payTargetTagihan.amount - paid)
            const isInfaq = payTargetTagihan.type.toLowerCase() === 'infaq'

            return (
              <div className="space-y-4 pt-2">
                <div className="bg-slate-50 border rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Tagihan:</span>
                    <span className="font-bold text-slate-800">{currency(payTargetTagihan.amount)}</span>
                  </div>
                  {paid > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sudah Terbayar:</span>
                      <span className="font-semibold text-emerald-600">{currency(paid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-1 border-t">
                    <span className="font-semibold text-slate-700">Sisa Tagihan:</span>
                    <span className="font-bold text-red-600">{currency(remaining)}</span>
                  </div>
                </div>

                {/* Warning if Infaq */}
                {isInfaq && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Aturan Infaq:</strong> Tagihan Infaq <u>TIDAK BISA</u> diangsur. Pembayaran harus dilakukan lunas sekaligus ({currency(remaining)}).
                    </div>
                  </div>
                )}

                {/* Option Mode */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">Opsi Pembayaran</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPayMode('LUNAS'); setPayAmountInput(remaining.toString()); }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        payMode === 'LUNAS'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Lunas Sekaligus ({currency(remaining)})
                    </button>
                    <button
                      type="button"
                      disabled={isInfaq}
                      onClick={() => { setPayMode('ANGSURAN'); setPayAmountInput(''); }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        isInfaq
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : payMode === 'ANGSURAN'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      Cicil / Angsur
                    </button>
                  </div>
                </div>

                {/* Input Nominal */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 block">Nominal Pembayaran (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="Masukkan nominal..."
                    value={payAmountInput}
                    disabled={payMode === 'LUNAS' || isInfaq}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    className="bg-white"
                  />
                  {payMode === 'ANGSURAN' && !isInfaq && payAmountInput && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sisa setelah angsuran ini: <strong>{currency(Math.max(0, remaining - (parseFloat(payAmountInput) || 0)))}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Pembayaran (Opsional)</Label>
                  <Input
                    placeholder="Misal: Angsuran ke-1 / Titipan tunai"
                    value={payNotesInput}
                    onChange={(e) => setPayNotesInput(e.target.value)}
                    className="bg-white"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button variant="outline" onClick={closePayDialog}>Batal</Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!payAmountInput || parseFloat(payAmountInput) <= 0 || lunasiMut.isPending}
                    onClick={() => {
                      const amount = parseFloat(payAmountInput)
                      if (isInfaq && amount < remaining) {
                        Swal.fire('Error', 'Tagihan Infaq tidak dapat diangsur.', 'error')
                        return
                      }
                      lunasiMut.mutate({ id: payTargetTagihan.id, paymentAmount: amount, notes: payNotesInput })
                    }}
                  >
                    {lunasiMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Proses Pembayaran
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Hapus Tagihan?" description="Tagihan ini akan dihapus permanen." />

      {/* Discount Modal */}
      <Dialog open={showDiscountModal} onOpenChange={(v) => { if (!v) setShowDiscountModal(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <TrendingUp className="w-5 h-5" /> Set Diskon Tagihan
            </DialogTitle>
            <DialogDescription>Pilih persentase diskon untuk tagihan ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Persentase Diskon</Label>
              <div className="grid grid-cols-2 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercentage(pct as 25 | 50 | 75 | 100)}
                    className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                      discountPercentage === pct
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Alasan (Opsional)</Label>
              <Input
                placeholder="Misal: Beasiswa prestasi"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDiscountModal(false)}>Batal</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={discountMut.isPending}
              onClick={() => discountMut.mutate()}
            >
              {discountMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Terapkan Diskon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// TAGIHAN MASSAL MODAL
// ============================================================
function TagihanMassalModal({
  open, onClose, classes }: {
  open: boolean; onClose: () => void; classes: ClassItem[]
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState & { classId: string }>({ ...defaultForm(), classId: '' })

  const mut = useMutation({
    mutationFn: async () => {
      const endpoint = form.type === 'SPP' 
        ? '/api-backend/finance/spp/mass-input' 
        : '/api-backend/finance/tagihan/massal';
      
      const payload = form.type === 'SPP' ? {
        classId: form.classId,
        amount: parseFloat(form.amount),
        month: parseInt(form.month),
        year: parseInt(form.year),
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      } : {
        classId: form.classId, type: form.type, amount: parseFloat(form.amount),
        month: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.month) : null,
        year: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.year) : null,
        dueDate: form.dueDate || null, notes: form.notes || null,
        discountPercentage: form.discountPercentage,
        discountReason: form.discountReason || null,
      };

      const res = await authenticatedFetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal membuat tagihan massal')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance-students'] }); onClose() },
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl sm:max-w-2xl lg:max-w-3xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 bg-gradient-to-r from-purple-700 via-indigo-700 to-violet-600 p-5 sm:p-6 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg sm:text-xl font-extrabold">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Layers className="w-5 h-5 text-purple-200" />
              </div>
              Tagihan Massal per Kelas
            </DialogTitle>
            <DialogDescription className="text-purple-100 text-xs sm:text-sm mt-1">
              Buat tagihan sekaligus untuk semua siswa dalam satu kelas dengan opsi diskon otomatis.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 custom-scrollbar">
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Pilih Kelas</Label>
            <Select value={form.classId} onValueChange={(v) => setForm(f => ({ ...f, classId: v ?? f.classId }))}>
              <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-semibold rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Jenis Tagihan</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PAYMENT_TYPES.map(t => (
                <button 
                  key={t.value} 
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`h-11 px-3 rounded-xl text-xs sm:text-sm font-extrabold border transition-all flex items-center justify-center ${
                    form.type === t.value 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20' 
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {PAYMENT_TYPES.find(t => t.value === form.type)?.desc}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Nominal (Rp)</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                <Input 
                  type="number" 
                  placeholder="Bebas / Default sistem" 
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                  className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold rounded-xl border-slate-200 dark:border-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Kosongkan untuk nominal default sistem.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Tagihan Untuk Periode</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v ?? f.month }))}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Bulan" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.year} onValueChange={(v) => setForm(f => ({ ...f, year: v ?? f.year }))}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800"><SelectValue placeholder="Tahun" /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Diskon Massal */}
          <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <TrendingUp className="w-4 h-4 text-purple-600" /> Diskon Massal (Server Calculated)
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, discountPercentage: pct }))}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    form.discountPercentage === pct
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {pct === 0 ? 'Tanpa Diskon' : `${pct}%`}
                </button>
              ))}
            </div>
            {form.discountPercentage > 0 && (
              <Input
                placeholder="Alasan Diskon Massal (Misal: Program Khusus / Beasiswa)"
                value={form.discountReason}
                onChange={(e) => setForm(f => ({ ...f, discountReason: e.target.value }))}
                className="bg-white text-xs"
              />
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Catatan (opsional)</Label>
            <Textarea placeholder="Catatan..." rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-white resize-none" />
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} className="h-10 rounded-xl font-semibold border-slate-300 dark:border-slate-700">Batal</Button>
          <Button className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md gap-2"
            disabled={!form.classId || mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            Buat Tagihan Massal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// MANUAL CASH PAYMENT MODAL (Pembayaran Tunai Kasir Keuangan)
// ============================================================
function ManualCashPaymentModal({
  open, onClose, students }: {
  open: boolean; onClose: () => void; students: StudentSummary[]
}) {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const qc = useQueryClient()

  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedTagihanId, setSelectedTagihanId] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [cashNotes, setCashNotes] = useState('Pembayaran Tunai Kasir Keuangan')

  const [cashDiscountPct, setCashDiscountPct] = useState<number>(0)
  const [cashDiscountReason, setCashDiscountReason] = useState<string>('')

  const { data: studentDetail } = useQuery<StudentDetail>({
    queryKey: ['student-tagihan-cash', selectedStudentId],
    queryFn: () => authenticatedQuery(`/api-backend/finance/students/${selectedStudentId}/tagihan`),
    enabled: !!selectedStudentId,
  })

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return []
    const q = studentSearch.toLowerCase().trim()
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.nisn.includes(q) ||
      s.nis.includes(q) ||
      s.className.toLowerCase().includes(q)
    )
  }, [students, studentSearch])

  const activeTagihans = (studentDetail?.tagihans || []).filter(t => t.status !== 'LUNAS')
  const selectedTagihan = activeTagihans.find(t => t.id === selectedTagihanId)

  const handleSelectTagihan = (tagihanId: string | null) => {
    if (!tagihanId) return
    setSelectedTagihanId(tagihanId)
    setCashDiscountPct(0)
    setCashDiscountReason('')
    const t = activeTagihans.find(item => item.id === tagihanId)
    if (t) {
      const paid = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)
      const remaining = Math.max(0, t.amount - paid)
      setCashAmount(remaining.toString())
    }
  }

  const handleDiscountChange = (pct: number) => {
    setCashDiscountPct(pct)
    if (!selectedTagihan) return
    const paid = selectedTagihan.amountPaid || 0
    let orig = selectedTagihan.amount
    const discountMatch = selectedTagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
    if (discountMatch) {
      try {
        const info = JSON.parse(discountMatch[1])
        orig = info.originalAmount || selectedTagihan.amount
      } catch {}
    }
    const discountAmount = Math.round(orig * (pct / 100))
    const finalAmount = orig - discountAmount
    const newRemaining = Math.max(0, finalAmount - paid)
    setCashAmount(newRemaining.toString())
  }

  const payMut = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(cashAmount)
      const payload: any = {
        paymentAmount: amount,
        notes: cashNotes,
      }
      if (cashDiscountPct > 0) {
        payload.discountPercentage = cashDiscountPct
        payload.discountReason = cashDiscountReason || 'Diskon Kasir Keuangan'
      }

      const res = await authenticatedFetch(`/api-backend/finance/tagihan/${selectedTagihanId}/lunasi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errText = await res.text()
        let errMsg = 'Gagal menyimpan pembayaran tunai'
        try {
          const json = JSON.parse(errText)
          errMsg = json.message || errMsg
        } catch {}
        throw new Error(errMsg)
      }
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      qc.invalidateQueries({ queryKey: ['student-tagihan', selectedStudentId] })
      Swal.fire({
        title: data?.isLunas ? 'Pelunasan Berhasil!' : 'Angsuran Berhasil Dicatat!',
        text: data?.message || 'Pembayaran tunai berhasil dicatat.',
        icon: 'success',
        confirmButtonColor: '#059669',
      })
      onClose()
      setStudentSearch('')
      setSelectedStudentId('')
      setSelectedTagihanId('')
      setCashAmount('')
      setCashDiscountPct(0)
      setCashDiscountReason('')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan pembayaran', 'error')
    }
  })

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Fixed Header Banner */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700 p-5 sm:p-6 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-lg sm:text-xl font-extrabold">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Wallet className="w-5 h-5 text-emerald-200" />
              </div>
              Input Pembayaran Tunai (Kasir Keuangan)
            </DialogTitle>
            <DialogDescription className="text-emerald-100 text-xs sm:text-sm mt-1">
              Pencatatan langsung pembayaran tunai siswa di loket kasir keuangan dengan kalkulasi diskon otomatis dan pratinjau kuitansi.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          {/* STEP 1: PENCARIAN & PROFIL SISWA */}
          <div className="space-y-3">
            <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Pilih Siswa Pembayar
            </Label>
            
            {selectedStudent ? (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-extrabold shrink-0 ${selectedStudent.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-slate-900 dark:text-white text-base">{selectedStudent.name}</p>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
                        {selectedStudent.className}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      NISN: {selectedStudent.nisn} · NIS: {selectedStudent.nis}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-emerald-200/60">
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Total Sisa Tunggakan</p>
                    <p className="font-extrabold text-red-600 dark:text-red-400 text-base sm:text-lg">
                      {currency(selectedStudent.totalTagihan - selectedStudent.totalLunas)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedStudentId(''); setStudentSearch(''); setSelectedTagihanId(''); setCashAmount(''); setCashDiscountPct(0); }} 
                    className="text-xs font-extrabold h-9 rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shrink-0"
                  >
                    Ganti Siswa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Ketik nama siswa, NISN, NIS, atau nama kelas (misal: Ahmad / XII-1)..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10 h-11 bg-white dark:bg-slate-950 font-medium text-xs sm:text-sm rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Hasil Pencarian Siswa */}
                {studentSearch.trim() !== '' && (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 shadow-md">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">Tidak ada siswa yang cocok dengan &quot;{studentSearch}&quot;</div>
                    ) : (
                      filteredStudents.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id)
                            setSelectedTagihanId('')
                            setCashAmount('')
                            setCashDiscountPct(0)
                          }}
                          className="w-full text-left p-3 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{s.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">NISN: {s.nisn} • Kelas <span className="font-bold text-slate-600 dark:text-slate-300">{s.className}</span></p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-900/60 shrink-0">
                            Sisa: {currency(s.totalTagihan - s.totalLunas)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: PILIH TAGIHAN SISWA */}
          {selectedStudentId && (
            <div className="space-y-3">
              <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                2. Pilih Tagihan Yang Ingin Dibayar
              </Label>
              {activeTagihans.length === 0 ? (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Siswa ini tidak memiliki tagihan aktif / seluruh tagihan telah lunas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTagihans.map(t => {
                    const paid = t.amountPaid || 0
                    const remaining = Math.max(0, t.amount - paid)
                    const isSelected = t.id === selectedTagihanId
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTagihan(t.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-700'}`}>
                              {t.type}
                            </span>
                            {t.month && t.year && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1.5">
                                {MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}
                              </p>
                            )}
                          </div>
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${t.status === 'ANGSURAN' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {t.status === 'ANGSURAN' ? 'Angsuran' : 'Belum Lunas'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-slate-400 font-medium">Sisa Tagihan</p>
                            <p className="font-extrabold text-slate-900 dark:text-white text-base">{currency(remaining)}</p>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            Total: {currency(t.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: FORM PEMBAYARAN & PRATINJAU KUITANSI */}
          {selectedTagihan && (() => {
            const paid = selectedTagihan.amountPaid || 0
            let origAmount = selectedTagihan.amount
            const discountMatch = selectedTagihan.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
            if (discountMatch) {
              try {
                const info = JSON.parse(discountMatch[1])
                origAmount = info.originalAmount || selectedTagihan.amount
              } catch {}
            }

            const currentDiscountAmt = cashDiscountPct > 0 ? Math.round(origAmount * (cashDiscountPct / 100)) : 0
            const currentFinalAmt = cashDiscountPct > 0 ? origAmount - currentDiscountAmt : selectedTagihan.amount
            const remainingBeforePay = Math.max(0, currentFinalAmt - paid)
            const payInputVal = parseFloat(cashAmount) || 0
            const remainingAfterPay = Math.max(0, remainingBeforePay - payInputVal)
            const isInfaq = selectedTagihan.type.toLowerCase() === 'infaq'

            return (
              <div className="space-y-5 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <Label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    3. Rincian & Opsi Pembayaran Kasir
                  </Label>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedTagihan.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Terapkan Diskon Kasir */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-600" /> Diskon Tunai Kasir
                    </Label>
                    <Select value={cashDiscountPct.toString()} onValueChange={(v) => handleDiscountChange(parseInt(v || '0', 10))}>
                      <SelectTrigger className="bg-white dark:bg-slate-950 h-11 font-semibold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Pilih persentase diskon..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (Tanpa Diskon Tambahan)</SelectItem>
                        <SelectItem value="25">25% Diskon Tunai</SelectItem>
                        <SelectItem value="50">50% Diskon Tunai</SelectItem>
                        <SelectItem value="75">75% Diskon Tunai</SelectItem>
                        <SelectItem value="100">100% Bebas Biaya / Beasiswa</SelectItem>
                      </SelectContent>
                    </Select>
                    {cashDiscountPct > 0 && (
                      <Input
                        placeholder="Alasan Diskon (misal: Diskon Kasir / Beasiswa)"
                        value={cashDiscountReason}
                        onChange={(e) => setCashDiscountReason(e.target.value)}
                        className="bg-white dark:bg-slate-950 text-xs h-10 mt-1.5 rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    )}
                  </div>

                  {/* Nominal Bayar Input & Shortcut */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Nominal Dibayar (Rp)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                      <Input
                        type="number"
                        disabled={isInfaq}
                        placeholder="Masukkan nominal bayar..."
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="pl-9 h-11 bg-white dark:bg-slate-950 font-extrabold text-slate-900 dark:text-white rounded-xl border-slate-200 dark:border-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {/* Shortcut Buttons */}
                    {!isInfaq && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setCashAmount(remainingBeforePay.toString())}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200"
                        >
                          Lunas ({currency(remainingBeforePay)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashAmount(Math.round(remainingBeforePay / 2).toString())}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200"
                        >
                          50% ({currency(Math.round(remainingBeforePay / 2))})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PRATINJAU KUITANSI / TRANSACTION BREAKDOWN CARD */}
                <div className="bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/60 p-4 sm:p-5 rounded-2xl space-y-2.5 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
                  <p className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] text-emerald-700 dark:text-emerald-400">
                    Pratinjau Kalkulasi Kuitansi
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Tagihan Awal:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{currency(origAmount)}</span>
                    </div>

                    {paid > 0 && (
                      <div className="flex justify-between text-blue-700 dark:text-blue-400">
                        <span>Sudah Diangsur Sebelumnya:</span>
                        <span className="font-bold">{currency(paid)}</span>
                      </div>
                    )}

                    {cashDiscountPct > 0 && (
                      <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                        <span>Potongan Diskon ({cashDiscountPct}%):</span>
                        <span>- {currency(currentDiscountAmt)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Sisa Sebelum Bayar:</span>
                      <span>{currency(remainingBeforePay)}</span>
                    </div>

                    <div className="flex justify-between font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                      <span>Nominal Dibayar Tunai:</span>
                      <span>{currency(payInputVal)}</span>
                    </div>

                    <div className="flex justify-between items-center font-extrabold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-slate-800 dark:text-slate-200">Status Setelah Pembayaran:</span>
                      {remainingAfterPay === 0 ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS SEKALIGUS
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-black flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> ANGSURAN (Kurang Bayar: {currency(remainingAfterPay)})
                        </span>
                      )}
                    </div>

                    {remainingAfterPay > 0 && payInputVal > 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-2 mt-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-amber-800 dark:text-amber-300">Logika Angsuran Aktif</p>
                          <p className="mt-0.5">
                            Nominal pembayaran ({currency(payInputVal)}) kurang dari sisa tagihan ({currency(remainingBeforePay)}). Sistem otomatis menghitung & mencatat transaksi ini sebagai <strong>Angsuran (Sisa Kurang Bayar {currency(remainingAfterPay)})</strong>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan / Kuitansi */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Catatan / Nomor Kuitansi (Opsional)
                  </Label>
                  <Input
                    placeholder="Misal: KWT-KASIR/#1024 - Tunai Kasir Keuangan"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="bg-white dark:bg-slate-950 text-xs h-11 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            )
          })()}
        </div>

        {/* Fixed Sticky Footer */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
            Batal
          </Button>
          <Button
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md gap-2"
            disabled={!selectedTagihanId || !cashAmount || parseFloat(cashAmount) <= 0 || payMut.isPending}
            onClick={() => payMut.mutate()}
          >
            {payMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Simpan Pembayaran Tunai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// TAB: TAGIHAN SISWA
// ============================================================
function TabTagihan() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [massalOpen, setMassalOpen] = useState(false)
  const [cashModalOpen, setCashModalOpen] = useState(false)
  const authenticatedQuery = useAuthenticatedQuery()
  const qc = useQueryClient()

  // Selection & Restricted Reset States
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [resetAuthModalOpen, setResetAuthModalOpen] = useState(false)
  const [resetTargetStudentIds, setResetTargetStudentIds] = useState<string[]>([])
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const { data: students = [], isLoading } = useQuery<StudentSummary[]>({
    queryKey: ['finance-students'],
    queryFn: () => authenticatedQuery('/api-backend/finance/students'),
  })

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => authenticatedQuery('/api-backend/classes'),
  })

  const { data: detailData } = useQuery<StudentDetail>({
    queryKey: ['student-tagihan', selectedStudent?.id],
    queryFn: () => authenticatedQuery(`/api-backend/finance/students/${selectedStudent!.id}/tagihan`),
    enabled: !!selectedStudent?.id,
  })

  const filtered = useMemo(() =>
    students.filter(s =>
      (!filterKelas || s.className === filterKelas) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search) || s.nis.includes(search) ||
        s.className.toLowerCase().includes(search.toLowerCase()))
    ), [students, search, filterKelas])

  const isAllSelected = useMemo(() =>
    filtered.length > 0 && filtered.every(s => selectedStudentIds.includes(s.id)),
    [filtered, selectedStudentIds]
  )

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filtered.map(s => s.id))
    }
  }

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const openResetModal = (ids: string[]) => {
    if (ids.length === 0) return
    setResetTargetStudentIds(ids)
    setAuthPassword('')
    setAuthError('')
    setResetAuthModalOpen(true)
  }

  const closeResetAuthModal = () => {
    setResetAuthModalOpen(false)
    setResetTargetStudentIds([])
    setAuthPassword('')
    setAuthError('')
  }

  const resetMut = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/finance/students/reset-tagihan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: resetTargetStudentIds,
          password: authPassword,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Password otorisasi salah atau gagal mereset tagihan')
      }
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      if (selectedStudent) {
        qc.invalidateQueries({ queryKey: ['student-tagihan', selectedStudent.id] })
      }
      Swal.fire({
        title: 'Reset Berhasil!',
        text: data.message || 'Seluruh tagihan siswa berhasil di-reset.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
      closeResetAuthModal()
      setSelectedStudentIds([])
    },
    onError: (err: any) => {
      setAuthError(err.message || 'Password otorisasi tidak valid')
    },
  })

  const openModal = (s: StudentSummary) => { setSelectedStudent(s); setModalOpen(true) }

  const handleExport = () => {
    const data = filtered.map((s, i) => ({
      No: i + 1, Nama: s.name, NISN: s.nisn, NIS: s.nis, Kelas: s.className,
      'Total Tagihan (Rp)': s.totalTagihan, 'Total Lunas (Rp)': s.totalLunas,
      'Sisa (Rp)': s.totalTagihan - s.totalLunas,
      'Belum Lunas': s.belumLunasCount, 'SPP Lunas': `${s.sppLunasCount}/12`,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tagihan Siswa')
    XLSX.writeFile(wb, `Tagihan_Siswa.xlsx`)
  }

  const uniqueKelas = [...new Set(students.map(s => s.className))].sort()

  const handleExportRekapKelas = async () => {
    if (!filterKelas) {
      Swal.fire({
        title: 'Pilih Kelas Terlebih Dahulu',
        text: 'Silakan pilih kelas pada filter untuk mengunduh Rekap Keuangan Eksport Excel per Kelas.',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
      })
      return
    }

    const targetClass = classes.find(c => c.name === filterKelas)
    if (!targetClass) {
      Swal.fire({
        title: 'Kelas Tidak Ditemukan',
        text: 'Data ID kelas tidak ditemukan.',
        icon: 'error',
        confirmButtonColor: '#2563eb',
      })
      return
    }

    try {
      const res = await authenticatedFetch(`/api-backend/finance/export-rekap-kelas?classId=${targetClass.id}`)
      if (!res.ok) throw new Error('Gagal mengunduh rekap keuangan kelas')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap_keuangan_kelas_${filterKelas.replace(/\s+/g, '_')}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Ekspor',
        text: err.message || 'Terjadi kesalahan saat mengunduh rekap Excel.',
        icon: 'error',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-between">
        <div className="flex gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama, NISN, NIS..." className="pl-9 bg-white" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(!v || v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[140px] bg-white font-semibold"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {uniqueKelas.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button onClick={() => setCashModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
            <Wallet className="w-4 h-4" /> Pembayaran Tunai / Manual
          </Button>
          <Button variant="outline" onClick={() => setMassalOpen(true)}
            className="border-purple-400 text-purple-700 hover:bg-purple-50 gap-2">
            <Layers className="w-4 h-4" /> Tagihan Massal
          </Button>
          <Button variant="outline" onClick={handleExportRekapKelas}
            className="border-indigo-600 text-indigo-700 hover:bg-indigo-50 gap-1.5 font-bold"
            title="Eksport Excel Rekap Keuangan Per Kelas (No, Nama, Frekuensi/Bulan, SPP, Tag Kelas Non DPP, UKS, UIS/UAK, DPP)">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Rekap Excel Kelas
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 gap-1.5">
            <Download className="w-4 h-4" /> Export All
          </Button>
        </div>
      </div>

      {/* Floating / Top Action Bar When Students Are Selected */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-xs text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
              {selectedStudentIds.length} Siswa Terpilih
            </span>
            {filterKelas && (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                (Kelas: {filterKelas})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => openResetModal(selectedStudentIds)}
              className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs gap-1.5 h-9 rounded-xl shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Tagihan ({selectedStudentIds.length} Siswa)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs h-9 rounded-xl border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100/50"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0 overflow-x-auto max-w-full">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-bold">
                <TableRow>
                  <TableHead className="w-10 text-center px-3 py-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                      title={isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Gelombang</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Jalur Pendaftaran</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead className="text-center">Belum Lunas</TableHead>
                  <TableHead className="text-center">SPP Lunas</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-right">Sudah Lunas</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-16 text-slate-400">
                      {search || filterKelas ? 'Tidak ditemukan.' : 'Belum ada data siswa.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((s, i) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <TableRow key={s.id} className={`transition-colors ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                      <TableCell className="text-center px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectStudent(s.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-center text-slate-400 font-medium text-sm">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight">{s.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{s.nisn}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {s.gelombang || 'Gelombang 1'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                          {s.program ? s.program.toUpperCase() : 'REGULER'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          s.jalurPendaftaran === 'Kader' || s.jalurPendaftaran === 'Kader Persyarikatan'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : s.jalurPendaftaran === 'Prestasi' || s.jalurPendaftaran === 'Bidikmisi'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {s.jalurPendaftaran || 'Mandiri'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-800">{s.className}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.belumLunasCount > 0
                          ? <span className="font-bold px-2.5 py-1 rounded-lg text-sm bg-red-50 text-red-600 border border-red-100">{s.belumLunasCount} tagihan</span>
                          : <span className="text-emerald-600 font-semibold text-sm flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Lunas</span>
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-lg text-sm ${s.sppLunasCount >= 12 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : s.sppLunasCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                          {s.sppLunasCount}/12
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-700 dark:text-slate-200">
                        {s.totalTagihan > 0 ? currency(s.totalTagihan) : <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                        {s.totalLunas > 0 ? currency(s.totalLunas) : <span className="text-slate-300 font-normal">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <Button size="sm" variant="outline"
                            className="border-blue-300 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-xs gap-1.5 h-8 rounded-xl"
                            onClick={() => openModal(s)}>
                            <Receipt className="w-3.5 h-3.5" /> Kelola
                          </Button>
                          <Button size="sm" variant="outline"
                            title="Reset Tagihan Siswa (Otorisasi Password)"
                            className="border-rose-200 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 text-xs gap-1 h-8 rounded-xl"
                            onClick={() => openResetModal([s.id])}>
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* RESTRICTED RESET PASSWORD AUTHORIZATION MODAL */}
      <Dialog open={resetAuthModalOpen} onOpenChange={(v) => { if (!v) closeResetAuthModal() }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="shrink-0 bg-gradient-to-r from-rose-700 via-red-700 to-rose-900 p-6 text-white shadow-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-extrabold">
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                  <ShieldAlert className="w-5 h-5 text-rose-200" />
                </div>
                Otorisasi Reset Tagihan Siswa
              </DialogTitle>
              <DialogDescription className="text-rose-100 text-xs mt-1">
                Akses Terbatas. Diperlukan verifikasi password akun keuangan Anda.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); resetMut.mutate(); }} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-sm text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Peringatan Keamanan
                </p>
                <p className="leading-relaxed">
                  Tindakan ini akan mereset/menghapus <strong>seluruh tagihan dan riwayat pembayaran</strong> untuk <strong>{resetTargetStudentIds.length} siswa</strong> terpilih secara permanen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Password Akun Keuangan <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Masukkan password akun Anda..."
                    value={authPassword}
                    onChange={(e) => { setAuthPassword(e.target.value); setAuthError(''); }}
                    className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
                {authError && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">{authError}</p>
                )}
              </div>
            </div>

            <div className="shrink-0 p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={closeResetAuthModal} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
                Batal
              </Button>
              <Button type="submit" disabled={resetMut.isPending || !authPassword} className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md gap-2">
                {resetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Konfirmasi & Reset Tagihan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TagihanModal student={detailData ?? null} open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedStudent(null) }}
        onResetStudent={(id) => openResetModal([id])} />
      <TagihanMassalModal open={massalOpen} onClose={() => setMassalOpen(false)} classes={classes} />
      <ManualCashPaymentModal open={cashModalOpen} onClose={() => setCashModalOpen(false)} students={students} />
    </div>
  )
}

// ============================================================
// TAB: REKAPITULASI
// ============================================================
function TabRekap() {
  const authenticatedFetch = useAuthenticatedFetch();
  const years = YEARS
  const [year, setYear] = useState(currentYear.toString())
  const [month, setMonth] = useState('')

  const { data: rekap, isLoading } = useQuery<Rekap>({
    queryKey: ['finance-rekap', year, month],
    queryFn: async () => {
      const q = month ? `year=${year}&month=${month}` : `year=${year}`
      const res = await authenticatedFetch(`/api-backend/finance/rekap?${q}`)
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi')
      return res.json()
    },
  })

  const totalYearly = rekap?.yearly.reduce((s, t) => s + t.total, 0) ?? 0
  const totalMonthly = rekap?.monthly.reduce((s, t) => s + t.total, 0) ?? 0
  const totalUnpaid = rekap?.unpaid.reduce((s, t) => s + t.total, 0) ?? 0
  const maxTrend = Math.max(...(rekap?.monthlyTrend.map(t => t.total) ?? [1]), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={year} onValueChange={(v) => setYear(v ?? year)}>
          <SelectTrigger className="w-[110px] bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month || 'all'} onValueChange={(v) => setMonth(!v || v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bulan</SelectItem>
            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {month && (
          <Button variant="ghost" size="sm" onClick={() => setMonth('')} className="text-slate-500 gap-1">
            <X className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Memuat...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
              <CardContent className="p-5">
                <p className="text-blue-100 text-sm font-medium">Total Lunas {year}</p>
                <p className="text-2xl font-bold mt-1">{currency(totalYearly)}</p>
                <p className="text-blue-200 text-xs mt-1">{rekap?.yearly.reduce((s, t) => s + t.count, 0)} tagihan</p>
              </CardContent>
            </Card>
            {month && (
              <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 shadow-lg">
                <CardContent className="p-5">
                  <p className="text-purple-100 text-sm font-medium">Lunas {MONTHS.find(m2 => m2.value === month)?.label}</p>
                  <p className="text-2xl font-bold mt-1">{currency(totalMonthly)}</p>
                  <p className="text-purple-200 text-xs mt-1">{rekap?.monthly.reduce((s, t) => s + t.count, 0)} tagihan</p>
                </CardContent>
              </Card>
            )}
            <Card className="bg-gradient-to-br from-red-500 to-orange-500 text-white border-0 shadow-lg">
              <CardContent className="p-5">
                <p className="text-red-100 text-sm font-medium">Belum Lunas {year}</p>
                <p className="text-2xl font-bold mt-1">{currency(totalUnpaid)}</p>
                <p className="text-red-200 text-xs mt-1">{rekap?.unpaid.reduce((s, t) => s + t.count, 0)} tagihan</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Rincian per Jenis — {month ? `${MONTHS.find(m2 => m2.value === month)?.label} ` : ''}{year}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-center">Lunas (Tahun)</TableHead>
                    <TableHead className="text-right">Total Lunas</TableHead>
                    <TableHead className="text-right">Belum Lunas</TableHead>
                    {month && <TableHead className="text-right">Lunas ({MONTHS.find(m2 => m2.value === month)?.label})</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAYMENT_TYPES.map(t => {
                    const yr = rekap?.yearly.find(r => r.type === t.value)
                    const mo = rekap?.monthly.find(r => r.type === t.value)
                    const un = rekap?.unpaid.find(r => r.type === t.value)
                    return (
                      <TableRow key={t.value} className="hover:bg-slate-50">
                        <TableCell><span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${TYPE_COLORS[t.value]}`}>{t.label}</span></TableCell>
                        <TableCell className="text-sm text-slate-500">{t.desc}</TableCell>
                        <TableCell className="text-center font-semibold text-slate-700">{yr?.count ?? 0}x</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{currency(yr?.total ?? 0)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{currency(un?.total ?? 0)}</TableCell>
                        {month && <TableCell className="text-right font-bold text-purple-700">{currency(mo?.total ?? 0)}</TableCell>}
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                    <TableCell colSpan={2} className="font-bold text-slate-800">TOTAL</TableCell>
                    <TableCell className="text-center font-bold">{rekap?.yearly.reduce((s, t) => s + t.count, 0)}x</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 text-base">{currency(totalYearly)}</TableCell>
                    <TableCell className="text-right font-bold text-red-600 text-base">{currency(totalUnpaid)}</TableCell>
                    {month && <TableCell className="text-right font-bold text-purple-700 text-base">{currency(totalMonthly)}</TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Tren Pembayaran Lunas {year}
              </CardTitle>
              <CardDescription>Total tagihan terlunasi per bulan (hover untuk detail)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-40 pt-6">
                {rekap?.monthlyTrend.map(t => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative group">
                      <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 cursor-default"
                        style={{ height: `${Math.max(4, (t.total / maxTrend) * 120)}px` }} />
                      {t.total > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-semibold rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {currency(t.total)}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 leading-none">
                      {MONTHS.find(m => m.value === t.month.toString())?.label.substring(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ============================================================
// TAB: DANA BANTUAN
// ============================================================
type DanaBantuanItem = {
  id: string
  namaBantuan: string
  kategori: 'SISWA' | 'PEGAWAI' | 'OPERASIONAL' | 'UMUM'
  sumberDana: string
  nominal: number
  penerima: string | null
  tanggal: string
  status: 'DRAFT' | 'DISETUJUI' | 'TERSALURKAN'
  keterangan: string | null
  targetSync: 'KEUANGAN_KELUAR' | 'PENGGAJIAN' | 'NONE'
  isSynced: boolean
  syncedAt: string | null
  syncedReferenceId: string | null
  user?: { name: string }
}

function TabDanaBantuan() {
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DanaBantuanItem | null>(null)
  const [formState, setFormState] = useState({
    namaBantuan: '',
    sumberDana: 'Yayasan',
    kategori: 'SISWA',
    nominal: '',
    penerima: '',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'DISETUJUI',
    targetSync: 'KEUANGAN_KELUAR',
    keterangan: ''
  })

  // Sync Confirmation State
  const [syncItem, setSyncItem] = useState<DanaBantuanItem | null>(null)
  const [syncTarget, setSyncTarget] = useState<'KEUANGAN_KELUAR' | 'PENGGAJIAN'>('KEUANGAN_KELUAR')

  const { data: danaList = [], isLoading } = useQuery<DanaBantuanItem[]>({
    queryKey: ['dana-bantuan', selectedYear, selectedMonth, selectedKategori, selectedStatus],
    queryFn: () => authenticatedQuery(`/api-backend/finance/dana-bantuan?year=${selectedYear}&month=${selectedMonth}&kategori=${selectedKategori}&status=${selectedStatus}`)
  })

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formState,
        nominal: parseFloat(formState.nominal) || 0
      }
      if (editingItem) {
        return authenticatedFetch(`/api-backend/finance/dana-bantuan/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        return authenticatedFetch('/api-backend/finance/dana-bantuan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dana-bantuan'] })
      setIsFormOpen(false)
      setEditingItem(null)
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: editingItem ? 'Data bantuan berhasil diperbarui.' : 'Data bantuan baru berhasil ditambahkan.',
        timer: 2000,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan data bantuan', 'error')
    }
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authenticatedFetch(`/api-backend/finance/dana-bantuan/${id}`, {
        method: 'DELETE'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dana-bantuan'] })
      Swal.fire('Terhapus', 'Data bantuan berhasil dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menghapus data bantuan', 'error')
    }
  })

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async ({ id, targetSync }: { id: string; targetSync: string }) => {
      return authenticatedFetch(`/api-backend/finance/dana-bantuan/${id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSync })
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dana-bantuan'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      setSyncItem(null)
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Berhasil',
        text: 'Data bantuan telah berhasil tersingkron ke modul keuangan yang dituju.',
        timer: 2200,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal melakukan sinkronisasi data bantuan', 'error')
    }
  })

  const openForm = (item?: DanaBantuanItem) => {
    if (item) {
      setEditingItem(item)
      setFormState({
        namaBantuan: item.namaBantuan,
        sumberDana: item.sumberDana,
        kategori: item.kategori,
        nominal: item.nominal.toString(),
        penerima: item.penerima || '',
        tanggal: item.tanggal ? item.tanggal.split('T')[0] : new Date().toISOString().split('T')[0],
        status: item.status,
        targetSync: item.targetSync,
        keterangan: item.keterangan || ''
      })
    } else {
      setEditingItem(null)
      setFormState({
        namaBantuan: '',
        sumberDana: 'Yayasan',
        kategori: 'SISWA',
        nominal: '',
        penerima: '',
        tanggal: new Date().toISOString().split('T')[0],
        status: 'DISETUJUI',
        targetSync: 'KEUANGAN_KELUAR',
        keterangan: ''
      })
    }
    setIsFormOpen(true)
  }

  const handleDelete = (item: DanaBantuanItem) => {
    Swal.fire({
      title: 'Hapus Data Bantuan?',
      text: `Apakah Anda yakin ingin menghapus "${item.namaBantuan}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(item.id)
      }
    })
  }

  const filteredDana = useMemo(() => {
    return danaList.filter((item) => {
      const matchSearch =
        item.namaBantuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.penerima && item.penerima.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.sumberDana.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchSearch
    })
  }, [danaList, searchQuery])

  // Statistics
  const totalNominal = useMemo(() => danaList.reduce((acc, item) => acc + item.nominal, 0), [danaList])
  const totalSyncedKeuanganKeluar = useMemo(() => danaList.filter(d => d.isSynced && d.targetSync === 'KEUANGAN_KELUAR').reduce((acc, item) => acc + item.nominal, 0), [danaList])
  const totalSyncedPenggajian = useMemo(() => danaList.filter(d => d.isSynced && d.targetSync === 'PENGGAJIAN').reduce((acc, item) => acc + item.nominal, 0), [danaList])

  const handleExportExcel = () => {
    if (filteredDana.length === 0) return
    const dataToExport = filteredDana.map((item, idx) => ({
      No: idx + 1,
      'Nama Bantuan': item.namaBantuan,
      'Sumber Dana': item.sumberDana,
      Kategori: item.kategori,
      Nominal: item.nominal,
      Penerima: item.penerima || '-',
      Tanggal: formatDate(item.tanggal),
      Status: item.status,
      'Status Sinkron': item.isSynced ? `Tersinkron (${item.targetSync})` : 'Belum Sinkron',
      Keterangan: item.keterangan || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dana Bantuan')
    XLSX.writeFile(wb, `Dana_Bantuan_${selectedMonth}_${selectedYear}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total Dana Bantuan</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{currency(totalNominal)}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{danaList.length} Program / Pendataan</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <HeartHandshake className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Sinkron Keu. Keluar</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{currency(totalSyncedKeuanganKeluar)}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Disalurkan via Pengeluaran Kas</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sinkron Penggajian</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{currency(totalSyncedPenggajian)}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Insentif / Tunjangan Pegawai</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Status Sinkronisasi</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {danaList.filter(d => d.isSynced).length} / {danaList.length}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Program Telah Tersinkron</p>
            </div>
            <div className="w-12 h-12 bg-slate-700 text-white rounded-xl flex items-center justify-center shadow-md">
              <RefreshCw className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-indigo-600" />
                Tabel Pendataan Dana Bantuan
              </CardTitle>
              <CardDescription>
                Kelola pendataan bantuan yayasan/donatur dan alokasi sinkronisasi ke data Keuangan Keluar dan Penggajian.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => openForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Tambah Data Bantuan
              </Button>
              <Button variant="outline" onClick={handleExportExcel} disabled={filteredDana.length === 0} className="border-slate-300 text-slate-700">
                <Download className="w-4 h-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-200/60">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cari bantuan / penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <Select value={selectedKategori} onValueChange={(val) => { if (val) setSelectedKategori(val) }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Kategori Bantuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                <SelectItem value="SISWA">Siswa (Beasiswa/Subsidi)</SelectItem>
                <SelectItem value="PEGAWAI">Pegawai (Insentif/Gaji)</SelectItem>
                <SelectItem value="OPERASIONAL">Operasional Sekolah</SelectItem>
                <SelectItem value="UMUM">Bantuan Umum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(val) => { if (val) setSelectedStatus(val) }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                <SelectItem value="TERSALURKAN">Tersalurkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={(val) => { if (val) setSelectedMonth(val) }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Bulan" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(val) => { if (val) setSelectedYear(val) }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead>Program Bantuan & Keterangan</TableHead>
                  <TableHead>Sumber Dana</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead className="text-right">Nominal (Rp)</TableHead>
                  <TableHead>Penerima / Target</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Sinkronisasi</TableHead>
                  <TableHead className="text-right w-[140px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-600" />
                        Memuat data dana bantuan...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredDana.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                      Tidak ada data dana bantuan yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDana.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900">{item.namaBantuan}</div>
                        {item.keterangan && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.keterangan}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{item.sumberDana}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          item.kategori === 'SISWA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.kategori === 'PEGAWAI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.kategori === 'OPERASIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {item.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-indigo-700 text-base">
                        {currency(item.nominal)}
                      </TableCell>
                      <TableCell className="text-slate-800 font-medium">{item.penerima || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">{formatDate(item.tanggal)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          item.status === 'TERSALURKAN' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'DISETUJUI' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.isSynced ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            item.targetSync === 'PENGGAJIAN'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {item.targetSync === 'PENGGAJIAN' ? 'Penggajian' : 'Keu. Keluar'}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSyncItem(item)
                              setSyncTarget(item.targetSync === 'PENGGAJIAN' ? 'PENGGAJIAN' : 'KEUANGAN_KELUAR')
                            }}
                            className="text-xs h-7 px-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Sinkronkan
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openForm(item)}
                          className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(item)}
                          className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: Form Tambah / Edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <HeartHandshake className="w-5 h-5" />
              {editingItem ? 'Edit Data Dana Bantuan' : 'Input Pendataan Dana Bantuan'}
            </DialogTitle>
            <DialogDescription>
              Isikan detail bantuan dari yayasan/donatur yang nantinya dapat disinkronkan ke Keuangan Keluar dan Penggajian.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nama Program Bantuan <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Misal: Bantuan Operasional Yayasan / Subsidi SPP Siswa"
                value={formState.namaBantuan}
                onChange={(e) => setFormState({ ...formState, namaBantuan: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sumber Dana</Label>
              <Select value={formState.sumberDana} onValueChange={(val) => { if (val) setFormState({ ...formState, sumberDana: val }) }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih Sumber Dana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yayasan">Yayasan / Persyarikatan</SelectItem>
                  <SelectItem value="BOS">Pemerintah / BOS</SelectItem>
                  <SelectItem value="Donatur">Donatur / Perorangan</SelectItem>
                  <SelectItem value="CSR">CSR Perusahaan</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kategori Bantuan</Label>
              <Select value={formState.kategori} onValueChange={(val) => { if (val) setFormState({ ...formState, kategori: val }) }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SISWA">Siswa (Beasiswa / Subsidi SPP)</SelectItem>
                  <SelectItem value="PEGAWAI">Pegawai (Insentif / Tunjangan)</SelectItem>
                  <SelectItem value="OPERASIONAL">Operasional Sekolah</SelectItem>
                  <SelectItem value="UMUM">Bantuan Umum / Sosial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal Bantuan (Rp) <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                placeholder="Nominal rupiah..."
                value={formState.nominal}
                onChange={(e) => setFormState({ ...formState, nominal: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Penerima / Target Bantuan</Label>
              <Input
                placeholder="Misal: Ahmad Dani (Guru) / Kelas 10 / Sekolah"
                value={formState.penerima}
                onChange={(e) => setFormState({ ...formState, penerima: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tanggal Bantuan</Label>
              <Input
                type="date"
                value={formState.tanggal}
                onChange={(e) => setFormState({ ...formState, tanggal: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status Pendataan</Label>
              <Select value={formState.status} onValueChange={(val) => { if (val) setFormState({ ...formState, status: val }) }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="DISETUJUI">Disetujui</SelectItem>
                  <SelectItem value="TERSALURKAN">Tersalurkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Target Sinkronisasi Utama</Label>
              <Select value={formState.targetSync} onValueChange={(val) => { if (val) setFormState({ ...formState, targetSync: val }) }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih Target Sinkronisasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KEUANGAN_KELUAR">Keuangan Keluar (Pengeluaran Kas Operasional)</SelectItem>
                  <SelectItem value="PENGGAJIAN">Penggajian (Insentif / Tunjangan Bantuan Gaji)</SelectItem>
                  <SelectItem value="NONE">Belum Diisi / Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Keterangan / Kebutuhan Pendataan</Label>
              <Textarea
                rows={3}
                placeholder="Tuliskan catatan rincian kebutuhan pendataan bantuan di sini..."
                value={formState.keterangan}
                onChange={(e) => setFormState({ ...formState, keterangan: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending || !formState.namaBantuan || !formState.nominal}
              onClick={() => saveMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Simpan Perubahan' : 'Tambah Data Bantuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Confirmation Sinkronisasi */}
      <Dialog open={!!syncItem} onOpenChange={(open) => !open && setSyncItem(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
              Proses Sinkronisasi Bantuan
            </DialogTitle>
            <DialogDescription>
              Pilih modul tujuan sinkronisasi untuk mendata alokasi dana bantuan ini secara sistematis.
            </DialogDescription>
          </DialogHeader>

          {syncItem && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-sm space-y-1">
                <div className="font-bold text-slate-900">{syncItem.namaBantuan}</div>
                <div className="text-slate-600">Nominal: <strong className="text-indigo-700">{currency(syncItem.nominal)}</strong></div>
                <div className="text-slate-500 text-xs">Penerima: {syncItem.penerima || '-'} | Sumber: {syncItem.sumberDana}</div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-800">Target Modul Sinkronisasi</Label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    syncTarget === 'KEUANGAN_KELUAR' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="syncTargetRadio"
                      checked={syncTarget === 'KEUANGAN_KELUAR'}
                      onChange={() => setSyncTarget('KEUANGAN_KELUAR')}
                      className="mt-1 text-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Keuangan Keluar (Outflow / Pengeluaran)</div>
                      <div className="text-xs text-slate-500">
                        Membuat entri pengeluaran kas otomatis di menu Keuangan Keluar untuk pelaporan pertanggungjawaban.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    syncTarget === 'PENGGAJIAN' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="syncTargetRadio"
                      checked={syncTarget === 'PENGGAJIAN'}
                      onChange={() => setSyncTarget('PENGGAJIAN')}
                      className="mt-1 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Penggajian (Insentif / Tunjangan Gaji)</div>
                      <div className="text-xs text-slate-500">
                        Menghubungkan dana bantuan ke rekapitulasi estimasi penghasilan pegawai / guru penerima.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setSyncItem(null)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={syncMutation.isPending}
              onClick={() => syncItem && syncMutation.mutate({ id: syncItem.id, targetSync: syncTarget })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {syncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Jalankan Sinkronisasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
const TABS = [
  { id: 'tagihan', label: 'Tagihan Siswa', icon: Receipt },
  { id: 'verifikasi', label: 'Verifikasi Pembayaran', icon: CheckCircle2 },
  { id: 'rekap', label: 'Rekapitulasi', icon: BarChart3 },
  { id: 'dana-bantuan', label: 'Dana Bantuan', icon: HeartHandshake },
]

export default function KeuanganMasukPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [activeTab, setActiveTab] = useState('tagihan')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          Keuangan Masuk
        </h1>
        <p className="text-slate-500 mt-1 ml-0.5">Kelola tagihan, rekapitulasi, dan pendataan dana bantuan sekolah</p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${isActive ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {activeTab === 'tagihan' && <TabTagihan />}
        {activeTab === 'verifikasi' && <PaymentProofVerificationPage />}
        {activeTab === 'rekap' && <TabRekap />}
        {activeTab === 'dana-bantuan' && <TabDanaBantuan />}
      </div>
    </div>
  )
}

