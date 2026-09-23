'use client'

import { useState, useMemo, useEffect, createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'
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
  ShieldAlert, ShieldCheck, Lock, CheckSquare, Square, HeartHandshake, RefreshCw, Send, FileSpreadsheet, Check, Info
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { confirmDelete } from '@/lib/swal-helper'
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
  beasiswaPercentage?: number
  beasiswaReason?: string | null
  beasiswaSeragamPct?: number
  beasiswaSppPct?: number
  beasiswaDppPct?: number
}

type StudentDetail = {
  id: string; name: string; nisn: string; nis: string
  className: string; gender: string; tagihans: Tagihan[]
  class: { name: string }
  program?: string | null
  beasiswaPercentage?: number
  beasiswaReason?: string | null
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
  { value: 'SPP', label: 'SPP', desc: 'Sumbangan Pembinaan Pendidikan (Bulanan)' },
  { value: 'DPP', label: 'DPP', desc: 'Dana Pengembangan Pendidikan (Tahunan)' },
  { value: 'UIS', label: 'UIS', desc: 'Uang Infaq Sekolah' },
  { value: 'UKA', label: 'UKA', desc: 'Uang Kegiatan Akademik (UTS/UAS/Outdoor/UTBK)' },
  { value: 'UKS', label: 'UKS', desc: 'Uang Kegiatan Sekolah (OSIS/PHBI/Asuransi/Wisuda)' },
  { value: 'SERAGAM', label: 'Seragam', desc: 'Biaya Seragam Sekolah (Khusus Kelas X)' },
  { value: 'LKS', label: 'LKS', desc: 'Biaya Buku & Lembar Kerja Siswa' },
  { value: 'INFAQ', label: 'Infaq', desc: 'Uang Infaq Sekolah (Legacy/Sukarela)' },
]

const TYPE_COLORS: Record<string, string> = {
  SPP: 'bg-blue-50 text-blue-700 border border-blue-200',
  DPP: 'bg-purple-50 text-purple-700 border border-purple-200',
  UIS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  UKA: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  UKS: 'bg-teal-50 text-teal-700 border border-teal-200',
  SERAGAM: 'bg-amber-50 text-amber-700 border border-amber-200',
  LKS: 'bg-sky-50 text-sky-700 border border-sky-200',
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
// CONTEXT ROLE (untuk proteksi CRUD Kepala Sekolah)
// ============================================================
const KeuanganRoleContext = createContext({ isKepalaSekolah: false })
const useKeuanganRole = () => useContext(KeuanganRoleContext)

// ============================================================
// CONFIRM DIALOG
// ============================================================
function ConfirmDialog({ open, onClose, onConfirm, loading, title, description }: {
  open: boolean; onClose: () => void; onConfirm: () => void
  loading?: boolean; title: string; description: string
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm w-[92vw] p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-base sm:text-lg font-black">
              <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md border border-white/20">
                <AlertTriangle className="w-5 h-5 text-rose-100" />
              </div>
              {title}
            </DialogTitle>
            <DialogDescription className="text-rose-100 text-xs mt-1">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-5 flex gap-2.5 justify-end bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-11 px-5 rounded-xl font-bold border-slate-300 dark:border-slate-700">
            Batal
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold h-11 px-5 rounded-xl shadow-md gap-2" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Hapus
          </Button>
        </div>
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
  const { data: publicSettings } = useQuery<{ defaultDpp?: number; defaultUka?: number; defaultUks?: number; defaultInfaq?: number; defaultSeragam?: number }>({
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
    if (typeVal === 'DPP') return publicSettings?.defaultDpp || 3000000
    if (typeVal === 'UIS' || typeVal === 'INFAQ') return publicSettings?.defaultInfaq || 200000
    if (typeVal === 'UKA') return publicSettings?.defaultUka || 1200000
    if (typeVal === 'UKS') return publicSettings?.defaultUks || 900000
    if (typeVal === 'SERAGAM') return publicSettings?.defaultSeragam || 1300000
    if (typeVal === 'LKS') return 0
    return 0
  }

  // Get effective default discount percentage for student
  const effectiveDefaultDiscount = useMemo(() => {
    return student?.beasiswaPercentage || studentProgConfig?.defaultDiscount || 0
  }, [student?.beasiswaPercentage, studentProgConfig?.defaultDiscount])

  const handleSelectType = (typeVal: string) => {
    setShowCustomDiscount(false)
    let autoAmount = form.amount
    let autoDiscountPct = 0
    let autoDiscountReason = ''

    const def = getDefaultAmountForType(typeVal)
    if (def > 0) autoAmount = def.toString()

    if (effectiveDefaultDiscount > 0) {
      autoDiscountPct = effectiveDefaultDiscount
      autoDiscountReason = student?.beasiswaReason || `Diskon Default Program/Siswa (${effectiveDefaultDiscount}%)`
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
      beasiswaPercentage: finalDiscountPct,
      beasiswaReason: form.discountReason || null,
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
      const res = await authenticatedFetch(`/api-backend/finance/beasiswa/${discountTagihanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beasiswaPercentage: discountPercentage, reason: discountReason }),
      })
      if (!res.ok) throw new Error('Gagal memberikan beasiswa')
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
      const res = await authenticatedFetch(`/api-backend/finance/beasiswa/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus beasiswa')
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

  const startEdit = (t: Tagihan) => {
    const dInfo = parseDiscountInfo(t.notes)
    setForm({
      type: t.type,
      amount: dInfo?.originalAmount ? dInfo.originalAmount.toString() : t.amount.toString(),
      month: (t.month ?? new Date().getMonth() + 1).toString(),
      year: (t.year ?? currentYear).toString(),
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      notes: t.notes 
        ? t.notes
            .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
            .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
            .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
            .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
            .trim() 
        : '',
      discountPercentage: dInfo?.beasiswaPercentage || 0,
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
        <DialogContent showCloseButton={false} className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          {/* Header Banner Modern */}
          <div className="shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 sm:p-6 text-white shadow-md relative">
            {/* Custom Close Button inside dark header */}
            <button
              onClick={() => { onClose(); resetForm() }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 rounded-xl w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all focus:outline-none z-10"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Tutup</span>
            </button>

            <DialogHeader className="space-y-1 pb-4 border-b border-white/10 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 sm:pr-12">
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
                    {(student?.beasiswaPercentage || studentProgConfig?.defaultDiscount) ? (
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg self-start sm:self-auto">
                        Diskon: {student?.beasiswaPercentage || studentProgConfig?.defaultDiscount}%
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
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-0.5 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada tagihan yang sesuai filter.
              </div>
            ) : filtered.map(t => {
              const paid = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)
              const remaining = Math.max(0, t.amount - paid)
              const pct = Math.min(100, Math.round((paid / t.amount) * 100))

              const dInfo = parseDiscountInfo(t.notes)
              const cleanNotesText = t.notes
                ? t.notes
                    .replace(/\s*\|\s*BEASISWA_INFO:\s*\{.*?\}/g, '')
                    .replace(/^BEASISWA_INFO:\s*\{.*?\}/g, '')
                    .replace(/\s*\|\s*DISCOUNT_INFO:\s*\{.*?\}/g, '')
                    .replace(/^DISCOUNT_INFO:\s*\{.*?\}/g, '')
                    .trim()
                : ''

              return (
                <div key={t.id} className="p-4 bg-slate-50/80 dark:bg-slate-950/70 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-600'}`}>{t.type}</span>
                        {t.status === 'LUNAS' ? (
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> LUNAS</span>
                        ) : t.status === 'ANGSURAN' ? (
                          <span className="text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ANGSURAN ({pct}%)</span>
                        ) : (
                          <span className="text-xs font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> BELUM LUNAS</span>
                        )}
                        {t.month && t.year && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{currency(t.amount)}</span>
                        {dInfo?.originalAmount && dInfo.originalAmount > t.amount && (
                          <span className="text-xs text-slate-400 line-through font-semibold">
                            {currency(dInfo.originalAmount)}
                          </span>
                        )}
                      </div>

                      {/* Beasiswa Badge */}
                      {dInfo && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Beasiswa {dInfo.beasiswaPercentage}% ({dInfo.reason || 'Beasiswa Default Siswa'})
                          </span>
                        </div>
                      )}

                      {/* Progress Angsuran */}
                      {t.status !== 'LUNAS' && paid > 0 && (
                        <div className="mt-2.5 space-y-1 bg-amber-500/10 p-2.5 rounded-xl border border-amber-300/40">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">Terbayar: <strong className="text-emerald-600 dark:text-emerald-400">{currency(paid)}</strong></span>
                            <span className="text-slate-600 dark:text-slate-400">Sisa: <strong className="text-rose-600 dark:text-rose-400">{currency(remaining)}</strong></span>
                          </div>
                          <div className="w-full h-2 bg-amber-200/60 dark:bg-amber-950 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}

                      {t.status === 'LUNAS' && t.paidDate && (
                        <p className="text-xs text-emerald-600 font-bold mt-1">Lunas Pada: {formatDate(t.paidDate)}</p>
                      )}
                      {cleanNotesText && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate italic">{cleanNotesText}</p>}
                    </div>

                    <div className="flex sm:flex-col gap-1.5 shrink-0 justify-end items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                      {/* Lunasi / Angsur / Batal */}
                      {t.status !== 'LUNAS' ? (
                        <button onClick={() => openPayDialog(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-colors shadow-xs">
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" /> {t.status === 'ANGSURAN' ? 'Angsur / Lunasi' : 'Bayar Kasir'}
                        </button>
                      ) : (
                        <button onClick={() => batalLunasiMut.mutate(t.id)} disabled={batalLunasiMut.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 transition-colors">
                          {batalLunasiMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Batal Lunas
                        </button>
                      )}
                      <div className="flex gap-1 justify-end">
                        {/* Set Diskon Button */}
                        {t.status === 'BELUM_LUNAS' && (
                          <button onClick={() => openDiscountModal(t.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="Set Diskon">
                            <TrendingUp className="w-4 h-4" />
                          </button>
                        )}
                        {parseDiscountInfo(t.notes) && (
                          <button onClick={() => removeDiscountMut.mutate(t.id)} disabled={removeDiscountMut.isPending}
                            className="p-2 rounded-xl text-amber-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Hapus Diskon">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => startEdit(t)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                          <Trash2 className="w-4 h-4" />
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
        <DialogContent className="max-w-md w-[95vw] p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-black">
                <Receipt className="w-5 h-5 text-emerald-200" /> Pembayaran / Angsuran Kasir
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                {payTargetTagihan?.type} — {student?.name}
              </DialogDescription>
            </DialogHeader>
          </div>

          {payTargetTagihan && (() => {
            const paid = payTargetTagihan.amountPaid || (payTargetTagihan.status === 'LUNAS' ? payTargetTagihan.amount : 0)
            const remaining = Math.max(0, payTargetTagihan.amount - paid)
            const isInfaq = payTargetTagihan.type.toLowerCase() === 'infaq'

            return (
              <div className="p-5 sm:p-6 space-y-4 text-slate-800 dark:text-slate-100">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Total Tagihan Awal:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{currency(payTargetTagihan.amount)}</span>
                  </div>
                  {paid > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Sudah Terbayar:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{currency(paid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-black text-slate-800 dark:text-slate-200">Sisa Tagihan:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 text-base">{currency(remaining)}</span>
                  </div>
                </div>

                {/* Warning if Infaq */}
                {isInfaq && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Aturan Infaq:</strong> Tagihan Infaq <u>TIDAK BISA</u> diangsur. Pembayaran harus lunas sekaligus ({currency(remaining)}).
                    </div>
                  </div>
                )}

                {/* Option Mode */}
                <div>
                  <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">Pilihan Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPayMode('LUNAS'); setPayAmountInput(remaining.toString()); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                        payMode === 'LUNAS'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      Lunas ({currency(remaining)})
                    </button>
                    <button
                      type="button"
                      disabled={isInfaq}
                      onClick={() => { setPayMode('ANGSURAN'); setPayAmountInput(''); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                        isInfaq
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : payMode === 'ANGSURAN'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      Cicil / Angsur
                    </button>
                  </div>
                </div>

                {/* Input Nominal */}
                <div className="space-y-1">
                  <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Nominal Dibayar (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="Masukkan nominal..."
                    value={payAmountInput}
                    disabled={payMode === 'LUNAS' || isInfaq}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    className="bg-white dark:bg-slate-950 font-black text-slate-900 dark:text-white h-11 rounded-xl text-sm"
                  />
                  {payMode === 'ANGSURAN' && !isInfaq && payAmountInput && (
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      Sisa setelah angsuran ini: <strong className="text-rose-600">{currency(Math.max(0, remaining - (parseFloat(payAmountInput) || 0)))}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Catatan Kasir (Opsional)</Label>
                  <Input
                    placeholder="Misal: Angsuran ke-1 Kasir Tunai"
                    value={payNotesInput}
                    onChange={(e) => setPayNotesInput(e.target.value)}
                    className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" onClick={closePayDialog} className="flex-1 h-11 rounded-xl font-bold">Batal</Button>
                  <Button
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md"
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
                    Simpan Pembayaran
                  </Button>
                </div>
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
        <DialogContent className="max-w-sm w-[95vw] p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white text-lg font-black">
                <TrendingUp className="w-5 h-5 text-amber-200" /> Set Diskon Tagihan
              </DialogTitle>
              <DialogDescription className="text-amber-100 text-xs mt-0.5">
                Terapkan potongan diskon / beasiswa khusus tagihan.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">Persentase Diskon</Label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercentage(pct as 25 | 50 | 75 | 100)}
                    className={`py-2 rounded-xl text-xs font-black border transition-all ${
                      discountPercentage === pct
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Alasan (Opsional)</Label>
              <Input
                placeholder="Misal: Beasiswa prestasi"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl font-medium"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setShowDiscountModal(false)} className="flex-1 h-10 rounded-xl font-bold">Batal</Button>
              <Button
                className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md"
                disabled={discountMut.isPending}
                onClick={() => discountMut.mutate()}
              >
                {discountMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Terapkan Diskon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// MODAL RILIS TAGIHAN 1 TAHUN KEDEPAN (MASSAL / PER KELAS / PER SISWA)
// ============================================================
function ReleaseYearlyModal({
  open, onClose, classes }: {
  open: boolean; onClose: () => void; classes: ClassItem[]
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const qc = useQueryClient()
  
  const [scope, setScope] = useState<'CLASS' | 'GRADE' | 'ALL'>('CLASS')
  const [classId, setClassId] = useState(classes?.[0]?.id || '')
  const [gradeLevel, setGradeLevel] = useState<number>(10)
  const [startYear, setStartYear] = useState<number>(currentYear)
  const [customAcademicYear, setCustomAcademicYear] = useState<string>(`${currentYear}/${currentYear + 1}`)
  const [isManualAcademicYear, setIsManualAcademicYear] = useState<boolean>(false)
  const [sppStartMonth, setSppStartMonth] = useState<number>(7) // Default Juli
  const [sppStartYear, setSppStartYear] = useState<number>(currentYear)
  const [notes, setNotes] = useState('')

  // Component toggles & custom overrides
  const [includeSpp, setIncludeSpp] = useState(true)
  const [sppMonthly, setSppMonthly] = useState<number>(300000)

  const [includeDpp, setIncludeDpp] = useState(true)
  const [dppAmount, setDppAmount] = useState<number>(3000000)

  const [includeUis, setIncludeUis] = useState(true)
  const [uisAmount, setUisAmount] = useState<number>(200000)

  const [includeUka, setIncludeUka] = useState(true)
  const [ukaAmount, setUkaAmount] = useState<number>(1200000)

  const [includeUks, setIncludeUks] = useState(true)
  const [uksAmount, setUksAmount] = useState<number>(900000)

  const [includeSeragam, setIncludeSeragam] = useState(false)
  const [seragamGender, setSeragamGender] = useState<'PUTRA' | 'PUTRI' | 'ALL'>('ALL')
  const [seragamPutraAmount, setSeragamPutraAmount] = useState<number>(1300000)
  const [seragamPutriAmount, setSeragamPutriAmount] = useState<number>(1575000)

  const [includeLks, setIncludeLks] = useState(false)
  const [lksAmount, setLksAmount] = useState<number>(0)
  const [lksPeriod, setLksPeriod] = useState<'SEMESTER_1' | 'SEMESTER_2' | 'TAHUNAN'>('TAHUNAN')

  // State untuk Otorisasi Override Tagihan Duplikat
  const [allowOverride, setAllowOverride] = useState(false)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overridePassword, setOverridePassword] = useState('')
  const [overrideError, setOverrideError] = useState('')

  // State untuk Reset Rilis Tagihan Tahunan dengan verifikasi password
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetOnlyUnpaid, setResetOnlyUnpaid] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    if (classes && classes.length > 0 && !classId) {
      setClassId(classes[0].id)
    }
  }, [classes, classId])

  // Sinkronisasi tahun awal SPP dan teks tahun ajaran saat startYear berubah (jika mode otomatis aktif)
  useEffect(() => {
    setSppStartYear(startYear)
    if (!isManualAcademicYear) {
      setCustomAcademicYear(`${startYear}/${startYear + 1}`)
    }
  }, [startYear, isManualAcademicYear])

  // Sinkronisasi default komponen biaya berdasarkan tingkat kelas
  useEffect(() => {
    if (gradeLevel === 10) {
      setDppAmount(3000000)
      setUksAmount(900000)
      setIncludeSeragam(true)
      setUkaAmount(1200000)
      setUisAmount(150000)
    } else if (gradeLevel === 11) {
      setDppAmount(0)
      setIncludeSeragam(false)
      setUksAmount(900000)
      setUkaAmount(1200000)
      setUisAmount(150000)
    } else if (gradeLevel === 12) {
      setIncludeSeragam(false)
      setDppAmount(0)
      setUkaAmount(2125000)
      setUksAmount(1500000)
      setUisAmount(100000)
    }
  }, [gradeLevel])

  const releaseMut = useMutation({
    mutationFn: async (opts?: { override?: boolean; password?: string }) => {
      const isOverrideActive = opts?.override ?? allowOverride
      const authPass = opts?.password ?? overridePassword

      const payload = {
        academicYear: customAcademicYear || `${startYear}/${startYear + 1}`,
        targetScope: scope === 'CLASS' ? 'CLASS' : scope === 'GRADE' ? 'GRADE' : 'ALL',
        classId: scope === 'CLASS' ? classId : undefined,
        gradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        yearStart: Number(startYear),
        sppStartMonth: Number(sppStartMonth),
        sppStartYear: Number(sppStartYear),
        customSppMonthly: includeSpp ? sppMonthly : 0,
        customDpp: includeDpp ? dppAmount : 0,
        customUis: includeUis ? uisAmount : 0,
        customUka: includeUka ? ukaAmount : 0,
        customUks: includeUks ? uksAmount : 0,
        customSeragam: includeSeragam ? (seragamGender === 'PUTRI' ? seragamPutriAmount : seragamPutraAmount) : 0,
        customLks: includeLks ? lksAmount : 0,
        lksType: lksPeriod === 'TAHUNAN' ? 'SETAHUN' : 'SEMESTER',
        itemsSelection: {
          spp: includeSpp,
          dpp: includeDpp,
          uis: includeUis,
          uka: includeUka,
          uks: includeUks,
          seragam: includeSeragam,
          lks: includeLks,
        },
        allowOverrideDuplicates: isOverrideActive,
        authorizationPassword: isOverrideActive ? authPass : undefined,
      }

      const res = await authenticatedFetch('/api-backend/finance/tagihan/release-yearly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Gagal merilis paket tagihan tahunan')
      }
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      qc.invalidateQueries({ queryKey: ['finance-rekap'] })
      setOverrideModalOpen(false)
      setOverridePassword('')
      setOverrideError('')
      
      const isDuplicatedDetected = data.duplicatesDetected > 0
      Swal.fire({
        title: isDuplicatedDetected ? 'Rilis Selesai (Proteksi Aktif)' : 'Berhasil Rilis Tagihan 1 Tahun!',
        text: data.message || `Berhasil memproses tagihan tahun ajaran siswa.`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
      onClose()
    },
    onError: (err: any) => {
      if (overrideModalOpen) {
        setOverrideError(err.message || 'Password otorisasi salah atau gagal')
      } else {
        Swal.fire('Gagal Merilis Tagihan', err.message || 'Terjadi kesalahan sistem', 'error')
      }
    },
  })

  // Mutasi Reset Rilis Tagihan Tahunan
  const resetYearlyMut = useMutation({
    mutationFn: async () => {
      const payload = {
        scope,
        classId: scope === 'CLASS' ? classId : undefined,
        gradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        startYear,
        password: resetPassword,
        onlyUnpaid: resetOnlyUnpaid,
      }

      const res = await authenticatedFetch('/api-backend/finance/tagihan/reset-yearly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Password otorisasi salah atau gagal mereset rilis tagihan')
      }
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      qc.invalidateQueries({ queryKey: ['finance-rekap'] })
      setResetModalOpen(false)
      setResetPassword('')
      setResetError('')
      Swal.fire({
        title: 'Reset Tagihan Berhasil!',
        text: data.message || `Berhasil mereset tagihan tahunan siswa.`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
      onClose()
    },
    onError: (err: any) => {
      setResetError(err.message || 'Password otorisasi tidak valid')
    },
  })

  // Total estimasi per siswa
  const totalPerTahun = useMemo(() => {
    let tot = 0
    if (includeSpp) tot += (sppMonthly * 12)
    if (includeDpp) tot += dppAmount
    if (includeUis) tot += uisAmount
    if (includeUka) tot += ukaAmount
    if (includeUks) tot += uksAmount
    if (includeSeragam) tot += seragamPutraAmount // Estimasi default putra
    if (includeLks) tot += lksAmount
    return tot
  }, [includeSpp, sppMonthly, includeDpp, dppAmount, includeUis, uisAmount, includeUka, ukaAmount, includeUks, uksAmount, includeSeragam, seragamPutraAmount, includeLks, lksAmount])

  // Label rentang SPP 12 Bulan yang akan dirilis
  const sppRangePreview = useMemo(() => {
    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    let endM = (sppStartMonth + 11) % 12
    if (endM === 0) endM = 12
    const endY = sppStartYear + Math.floor((sppStartMonth + 11 - 1) / 12)
    return `${monthNames[sppStartMonth]} ${sppStartYear} - ${monthNames[endM]} ${endY}`
  }, [sppStartMonth, sppStartYear])

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-5 sm:p-6 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg sm:text-xl font-extrabold">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Layers className="w-5 h-5 text-blue-200" />
              </div>
              Rilis Tagihan 1 Tahun ({sppRangePreview})
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-xs sm:text-sm mt-1">
              Rilis tagihan 12 bulan SPP ({sppRangePreview}), DPP tahunan, UIS, UKA, UKS, Seragam, & LKS ({customAcademicYear ? `TA ${customAcademicYear}` : `Tahun ${startYear}`}).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar text-slate-800 dark:text-slate-100">
          {/* Target & Scope */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Sasaran & Periode Tagihan
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Cakupan Target: Hanya Per Kelas atau Per Angkatan */}
              <div className="flex flex-col justify-between">
                <div className="h-5 flex items-center mb-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Cakupan Sasaran</Label>
                </div>
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl">
                    <SelectValue>
                      {scope === 'CLASS' ? 'Per Kelas Spesifik' : 'Per Angkatan / Tingkat'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">Per Kelas Spesifik</SelectItem>
                    <SelectItem value="GRADE">Per Angkatan / Tingkat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pilihan Kelas / Angkatan */}
              {scope === 'CLASS' ? (
                <div className="flex flex-col justify-between">
                  <div className="h-5 flex items-center mb-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Kelas</Label>
                  </div>
                  <Select value={classId} onValueChange={(v) => { if (v) setClassId(v) }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl">
                      <SelectValue placeholder="Pilih kelas...">
                        {classes.find(c => c.id === classId)?.name || 'Pilih kelas...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col justify-between">
                  <div className="h-5 flex items-center mb-1.5">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tingkat / Angkatan</Label>
                  </div>
                  <Select value={gradeLevel.toString()} onValueChange={(v) => { if (v) setGradeLevel(parseInt(v)) }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl">
                      <SelectValue>
                        {gradeLevel === 10 ? 'Kelas 10 (Fase E)' : gradeLevel === 11 ? 'Kelas 11 (Fase F)' : 'Kelas 12 (Tingkat Akhir)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Kelas 10 (Fase E)</SelectItem>
                      <SelectItem value="11">Kelas 11 (Fase F)</SelectItem>
                      <SelectItem value="12">Kelas 12 (Tingkat Akhir)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bulan & Tahun Awal Mulai Tagihan */}
              <div className="flex flex-col justify-between">
                <div className="h-5 flex items-center mb-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Bulan Awal Mulai</Label>
                </div>
                <Select value={sppStartMonth.toString()} onValueChange={(v) => setSppStartMonth(Number(v))}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl">
                    <SelectValue>
                      {[
                        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli (Awal TA)', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                      ][sppStartMonth] || `Bulan ${sppStartMonth}`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Januari</SelectItem>
                    <SelectItem value="2">Februari</SelectItem>
                    <SelectItem value="3">Maret</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">Mei</SelectItem>
                    <SelectItem value="6">Juni</SelectItem>
                    <SelectItem value="7">Juli (Awal TA)</SelectItem>
                    <SelectItem value="8">Agustus</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">Oktober</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">Desember</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tahun Ajaran / Periode */}
              <div className="flex flex-col justify-between">
                <div className="h-5 flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tahun Ajaran / Awal</Label>
                  <button
                    type="button"
                    onClick={() => setIsManualAcademicYear(!isManualAcademicYear)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isManualAcademicYear ? 'Pilih Tahun' : 'Ketik Manual'}
                  </button>
                </div>
                {isManualAcademicYear ? (
                  <Input
                    type="text"
                    value={customAcademicYear}
                    onChange={(e) => setCustomAcademicYear(e.target.value)}
                    placeholder="Misal: 2026/2027"
                    className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl"
                  />
                ) : (
                  <Select value={startYear.toString()} onValueChange={(v) => {
                    if (v) {
                      const y = parseInt(v)
                      setStartYear(y)
                      setCustomAcademicYear(`${y}/${y + 1}`)
                    }
                  }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-bold text-xs h-11 rounded-xl">
                      <SelectValue>
                        {`${startYear} / ${startYear + 1}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 9 }, (_, i) => currentYear - 3 + i).map((yr) => (
                        <SelectItem key={yr} value={yr.toString()}>{yr} / {yr + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Banner Periode Terpilih */}
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Rentang Paket 12 Bulan: <strong className="font-extrabold text-blue-700 dark:text-blue-300">{sppRangePreview}</strong>
              </span>
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                Tahun Ajaran: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{customAcademicYear || `${startYear}/${startYear + 1}`}</span>
              </span>
            </div>
          </div>

          {/* Rincian Komponen Biaya 1 Tahun */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                2. Komponen & Tarif Biaya Resmi 1 Tahun
              </Label>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Total Estimasi Paket: {currency(totalPerTahun)} / siswa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* SPP Bulanan x 12 */}
              <div className={`p-4 rounded-2xl border transition-all space-y-3 ${includeSpp ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-blue-900 dark:text-blue-300">
                    <input type="checkbox" checked={includeSpp} onChange={(e) => setIncludeSpp(e.target.checked)} className="rounded text-blue-600" />
                    SPP (12 Bulan Sekaligus)
                  </label>
                  <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Bulanan</span>
                </div>
                
                <div>
                  <span className="text-[10px] font-bold text-slate-500 mb-1 block">Tarif Per Bulan (Default)</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <Input
                      type="number"
                      disabled={!includeSpp}
                      value={sppMonthly || ''}
                      onChange={(e) => setSppMonthly(Number(e.target.value))}
                      className="pl-8 h-9 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100 dark:border-blue-900/60">
                  <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 leading-tight">
                    Periode: <strong className="font-bold">{sppRangePreview}</strong> (12 Bulan = {currency(sppMonthly * 12)})
                  </p>
                </div>
              </div>

              {/* DPP Tahunan */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeDpp ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-purple-900 dark:text-purple-300">
                    <input type="checkbox" checked={includeDpp} onChange={(e) => setIncludeDpp(e.target.checked)} className="rounded text-purple-600" />
                    DPP (Dana Pengembangan)
                  </label>
                  <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Setahun</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeDpp}
                    value={dppAmount || ''}
                    onChange={(e) => setDppAmount(Number(e.target.value))}
                    className="pl-8 h-10 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Wajib tuntas dalam 1 tahun ajaran.</p>
              </div>

              {/* UIS (Infaq Sekolah) */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeUis ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-emerald-900 dark:text-emerald-300">
                    <input type="checkbox" checked={includeUis} onChange={(e) => setIncludeUis(e.target.checked)} className="rounded text-emerald-600" />
                    UIS (Uang Infaq Sekolah)
                  </label>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Setahun</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUis}
                    value={uisAmount || ''}
                    onChange={(e) => setUisAmount(Number(e.target.value))}
                    className="pl-8 h-10 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Infaq sarana & prasarana sekolah.</p>
              </div>

              {/* UKA (Kegiatan Akademik) */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeUka ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-indigo-900 dark:text-indigo-300">
                    <input type="checkbox" checked={includeUka} onChange={(e) => setIncludeUka(e.target.checked)} className="rounded text-indigo-600" />
                    UKA (Kegiatan Akademik)
                  </label>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">UTS/UAS/Outdoor</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUka}
                    value={ukaAmount || ''}
                    onChange={(e) => setUkaAmount(Number(e.target.value))}
                    className="pl-8 h-10 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500">UTS, UAS, Outdoor, Fortasi, HW, UTBK.</p>
              </div>

              {/* UKS (Kegiatan Sekolah) */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeUks ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-teal-900 dark:text-teal-300">
                    <input type="checkbox" checked={includeUks} onChange={(e) => setIncludeUks(e.target.checked)} className="rounded text-teal-600" />
                    UKS (Kegiatan Sekolah)
                  </label>
                  <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded">OSIS/PHBI/Wisuda</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUks}
                    value={uksAmount || ''}
                    onChange={(e) => setUksAmount(Number(e.target.value))}
                    className="pl-8 h-10 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500">OSIS, PHBI, Asuransi, Kalender, Wisuda.</p>
              </div>

              {/* Seragam (Khusus Kls 10) */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeSeragam ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-amber-900 dark:text-amber-300">
                    <input type="checkbox" checked={includeSeragam} onChange={(e) => setIncludeSeragam(e.target.checked)} className="rounded text-amber-600" />
                    Seragam (Khusus Kelas X)
                  </label>
                  <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Paket Masuk</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">Putra (Rp)</span>
                    <Input
                      type="number"
                      disabled={!includeSeragam}
                      value={seragamPutraAmount || ''}
                      onChange={(e) => setSeragamPutraAmount(Number(e.target.value))}
                      className="h-9 text-xs font-bold bg-white dark:bg-slate-950 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">Putri (Rp)</span>
                    <Input
                      type="number"
                      disabled={!includeSeragam}
                      value={seragamPutriAmount || ''}
                      onChange={(e) => setSeragamPutriAmount(Number(e.target.value))}
                      className="h-9 text-xs font-bold bg-white dark:bg-slate-950 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* LKS / Buku */}
              <div className={`p-4 rounded-2xl border transition-all space-y-2 ${includeLks ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-sky-900 dark:text-sky-300">
                    <input type="checkbox" checked={includeLks} onChange={(e) => setIncludeLks(e.target.checked)} className="rounded text-sky-600" />
                    LKS & Buku Modul
                  </label>
                  <span className="text-[10px] font-black bg-sky-100 text-sky-800 px-2 py-0.5 rounded">Fleksibel</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeLks}
                    value={lksAmount || ''}
                    placeholder="Nominal LKS..."
                    onChange={(e) => setLksAmount(Number(e.target.value))}
                    className="pl-8 h-10 text-xs font-bold bg-white dark:bg-slate-950 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <Select disabled={!includeLks} value={lksPeriod} onValueChange={(v: any) => setLksPeriod(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 h-8 text-[11px] font-bold rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TAHUNAN">Setahun Penuh</SelectItem>
                      <SelectItem value="SEMESTER_1">Semester Ganjil</SelectItem>
                      <SelectItem value="SEMESTER_2">Semester Genap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Catatan & Proteksi Duplikasi */}
          <div className="space-y-3">
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-extrabold text-blue-950 dark:text-blue-100">Proteksi Anti-Duplikasi Otomatis Aktif</p>
                <p className="leading-relaxed text-[11px] text-blue-800 dark:text-blue-300">
                  Sistem otomatis mendeteksi tagihan yang sudah ada sebelumnya. Tagihan yang sudah terbit atau lunas <strong>tidak akan diduplikasi/ditimpa</strong> dan langsung dilewati (skip).
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Catatan Rilis (Opsional)</Label>
              <Input
                placeholder="Misal: Rilis Tagihan Resmi Ajaran 2025/2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setResetModalOpen(true); setResetPassword(''); setResetError(''); }}
            className="h-11 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl font-extrabold gap-2 text-xs"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            Reset Rilis Tagihan Tahunan
          </Button>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <Button variant="outline" onClick={onClose} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOverrideModalOpen(true); setOverridePassword(''); setOverrideError(''); }}
              className="h-11 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl font-extrabold gap-2 text-xs"
            >
              <Lock className="w-4 h-4 text-amber-600" />
              Otorisasi Perbarui Duplikat
            </Button>
            <Button
              className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md gap-2"
              disabled={releaseMut.isPending}
              onClick={() => releaseMut.mutate({ override: false })}
            >
              {releaseMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Rilis Tagihan 1 Tahun Sekarang
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* MODAL OTORISASI PERBARUI DUPLIKAT TAGIHAN */}
    <Dialog open={overrideModalOpen} onOpenChange={(v) => { if (!v) { setOverrideModalOpen(false); setOverridePassword(''); setOverrideError(''); } }}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 p-6 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-extrabold">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Lock className="w-5 h-5 text-amber-200" />
              </div>
              Otorisasi Pembaruan Tagihan Duplikat
            </DialogTitle>
            <DialogDescription className="text-amber-100 text-xs mt-1">
              Perbarui tagihan yang sudah ada sebelumnya dengan tarif baru (khusus tagihan yang belum lunas).
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); releaseMut.mutate({ override: true, password: overridePassword }); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Ketentuan Otorisasi Pembaruan
              </p>
              <p className="leading-relaxed">
                Tindakan ini akan <strong>menyesuaikan nominal tarif baru</strong> pada tagihan siswa yang terdeteksi duplikat, namun <u>tagihan yang sudah LUNAS tetap dilindungi</u> dan tidak akan diubah.
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
                  placeholder="Masukkan password akun keuangan Anda..."
                  value={overridePassword}
                  onChange={(e) => { setOverridePassword(e.target.value); setOverrideError(''); }}
                  className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              {overrideError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">{overrideError}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setOverrideModalOpen(false)} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={releaseMut.isPending || !overridePassword}
              className="h-11 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md gap-2"
            >
              {releaseMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Setujui & Perbarui Tagihan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* MODAL OTORISASI RESET RILIS TAGIHAN TAHUNAN */}
    <Dialog open={resetModalOpen} onOpenChange={(v) => { if (!v) { setResetModalOpen(false); setResetPassword(''); setResetError(''); } }}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 bg-gradient-to-r from-rose-700 via-red-700 to-rose-900 p-6 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-lg font-extrabold">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <ShieldAlert className="w-5 h-5 text-rose-200" />
              </div>
              Otorisasi Reset Rilis Tagihan Tahunan
            </DialogTitle>
            <DialogDescription className="text-rose-100 text-xs mt-1">
              Hapus seluruh tagihan 1 tahun ajaran ({startYear}/{startYear + 1}) sesuai sasaran yang dipilih.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); resetYearlyMut.mutate(); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5 text-sm text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                Sasaran Reset Tagihan
              </p>
              <p className="leading-relaxed">
                Tindakan ini akan menghapus tagihan tahun ajaran <strong>{startYear}/{startYear + 1}</strong> untuk:{' '}
                <strong>
                  {scope === 'CLASS'
                    ? `Kelas ${classes.find(c => c.id === classId)?.name || classId}`
                    : scope === 'GRADE'
                    ? `Tingkat / Angkatan Kelas ${gradeLevel}`
                    : 'Seluruh Siswa Aktif'}
                </strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="resetOnlyUnpaid"
                checked={resetOnlyUnpaid}
                onChange={(e) => setResetOnlyUnpaid(e.target.checked)}
                className="rounded text-rose-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="resetOnlyUnpaid" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                Hanya reset tagihan yang <u>BELUM LUNAS</u> (Lindungi tagihan yang sudah lunas).
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Password Akun Keuangan <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Masukkan password akun keuangan Anda..."
                  value={resetPassword}
                  onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
                  className="pl-9 h-11 bg-white dark:bg-slate-950 font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              {resetError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">{resetError}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setResetModalOpen(false)} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={resetYearlyMut.isPending || !resetPassword}
              className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md gap-2"
            >
              {resetYearlyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Konfirmasi & Reset Tagihan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}

// ============================================================
// MANUAL CASH PAYMENT MODAL (Pembayaran Tunai Kasir Keuangan)
// ============================================================
function ManualCashPaymentModal({
  open, onClose, students, classes = [] }: {
  open: boolean; onClose: () => void; students: StudentSummary[]; classes?: ClassItem[]
}) {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const qc = useQueryClient()

  // Filter States
  const [studentSearch, setStudentSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterStatusTunggakan, setFilterStatusTunggakan] = useState<'ALL' | 'HANYA_TUNGGAKAN' | 'LUNAS'>('ALL')

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

  // Ekstrak Program Unik dari Data Siswa
  const uniquePrograms = useMemo(() => {
    const list = students.map(s => s.program).filter(Boolean) as string[]
    return [...new Set(list)].sort()
  }, [students])

  // Ekstrak Kelas Unik dari Data Siswa / Classes
  const uniqueClasses = useMemo(() => {
    if (classes && classes.length > 0) {
      return classes.map(c => c.name).sort()
    }
    const list = students.map(s => s.className).filter(Boolean)
    return [...new Set(list)].sort()
  }, [students, classes])

  const filteredStudents = useMemo(() => {
    let res = students

    // Filter Kelas
    if (filterKelas) {
      res = res.filter(s => s.className === filterKelas)
    }

    // Filter Program
    if (filterProgram) {
      res = res.filter(s => s.program?.toLowerCase() === filterProgram.toLowerCase())
    }

    // Filter Status Tunggakan
    if (filterStatusTunggakan === 'HANYA_TUNGGAKAN') {
      res = res.filter(s => s.belumLunasCount > 0 || (s.totalTagihan - s.totalLunas) > 0)
    } else if (filterStatusTunggakan === 'LUNAS') {
      res = res.filter(s => s.belumLunasCount === 0 && (s.totalTagihan - s.totalLunas) <= 0)
    }

    // Search query
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim()
      res = res.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.nisn.includes(q) ||
        s.nis.includes(q) ||
        s.className.toLowerCase().includes(q)
      )
    }

    return res
  }, [students, studentSearch, filterKelas, filterProgram, filterStatusTunggakan])

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
        payload.beasiswaPercentage = cashDiscountPct
        payload.beasiswaReason = cashDiscountReason || 'Beasiswa Kasir Keuangan'
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
      qc.invalidateQueries({ queryKey: ['student-tagihan'] })
      qc.invalidateQueries({ queryKey: ['student-tagihan-cash'] })
      qc.invalidateQueries({ queryKey: ['finance-rekap'] })
      qc.invalidateQueries({ queryKey: ['quarterly-rekap'] })
      qc.invalidateQueries({ queryKey: ['payment-proofs'] })
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

  const resetAllFilters = () => {
    setStudentSearch('')
    setFilterKelas('')
    setFilterProgram('')
    setFilterStatusTunggakan('ALL')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-[96vw] md:max-w-3xl lg:max-w-4xl w-full max-h-[92vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Fixed Header Banner */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700 p-4 sm:p-5 text-white shadow-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white text-base sm:text-lg font-black">
              <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
              </div>
              Input Pembayaran Tunai (Kasir Keuangan)
            </DialogTitle>
            <DialogDescription className="text-emerald-100 text-[11px] sm:text-xs mt-0.5">
              Pencatatan langsung pembayaran tunai siswa di loket kasir keuangan.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar text-slate-800 dark:text-slate-100">
          {/* STEP 1: PENCARIAN & FILTER SISWA */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                1. Pilih Siswa Pembayar
              </Label>
              {(filterKelas || filterProgram || filterStatusTunggakan !== 'ALL' || studentSearch) && !selectedStudent && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filter
                </button>
              )}
            </div>
            
            {selectedStudent ? (
              <div className="bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${selectedStudent.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{selectedStudent.name}</p>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-black border border-emerald-200 dark:border-emerald-800">
                        {selectedStudent.className}
                      </span>
                      {selectedStudent.program && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[11px] font-black border border-blue-200 dark:border-blue-800">
                          {selectedStudent.program}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      NISN: {selectedStudent.nisn} · NIS: {selectedStudent.nis}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Sisa Tagihan</p>
                    <p className="font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                      {currency(selectedStudent.totalTagihan - selectedStudent.totalLunas)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedStudentId(''); setStudentSearch(''); setSelectedTagihanId(''); setCashAmount(''); setCashDiscountPct(0); }} 
                    className="text-xs font-bold h-8 sm:h-9 rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shrink-0"
                  >
                    Ganti Siswa
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Search Bar & Multi Filter Bar - Highlighted & Clean */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  {/* Highlighted Search Bar */}
                  <div className="relative sm:col-span-12 md:col-span-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <Input
                      placeholder="Ketik nama / NISN / NIS siswa..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 h-9 bg-white dark:bg-slate-950 font-bold text-xs rounded-xl border-emerald-400/80 dark:border-emerald-500/80 ring-2 ring-emerald-500/15 focus-visible:ring-emerald-500 focus-visible:border-emerald-600 shadow-xs"
                    />
                  </div>

                  {/* Filter Kelas */}
                  <div className="sm:col-span-4 md:col-span-3">
                    <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(!v || v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-950 font-semibold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Semua Kelas">
                          {filterKelas ? `Kelas ${filterKelas}` : 'Semua Kelas'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {uniqueClasses.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter Program */}
                  <div className="sm:col-span-4 md:col-span-2">
                    <Select value={filterProgram || 'all'} onValueChange={(v) => setFilterProgram(!v || v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-950 font-semibold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Semua Program">
                          {filterProgram ? filterProgram : 'Semua Program'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Program</SelectItem>
                        {uniquePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter Status Tagihan */}
                  <div className="sm:col-span-4 md:col-span-2">
                    <Select value={filterStatusTunggakan} onValueChange={(v: any) => setFilterStatusTunggakan(v)}>
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-950 font-semibold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Status Tagihan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="HANYA_TUNGGAKAN">Menunggak</SelectItem>
                        <SelectItem value="LUNAS">Lunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* List Siswa Terfilter */}
                <div className="max-h-56 sm:max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950 shadow-inner custom-scrollbar">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 font-medium">
                      Tidak ada siswa yang sesuai dengan filter atau kata kunci pencarian.
                    </div>
                  ) : (
                    filteredStudents.slice(0, 40).map(s => {
                      const sisa = s.totalTagihan - s.totalLunas
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id)
                            setSelectedTagihanId('')
                            setCashAmount('')
                            setCashDiscountPct(0)
                          }}
                          className="w-full text-left p-2 sm:p-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors flex items-center justify-between group gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {s.nisn} · <span className="font-semibold text-slate-600 dark:text-slate-300">{s.className}</span> {s.program ? `· ${s.program}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sisa > 0 ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {sisa > 0 ? currency(sisa) : 'Lunas'}
                            </span>
                          </div>
                        </button>
                      )
                    })
                  )}
                  {filteredStudents.length > 40 && (
                    <div className="p-1.5 text-center text-[10px] text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900">
                      Menampilkan 40 dari {filteredStudents.length} siswa. Gunakan kolom pencarian / filter untuk mempersempit.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PILIH TAGIHAN SISWA */}
          {selectedStudentId && (
            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                2. Pilih Tagihan Yang Ingin Dibayar
              </Label>
              {activeTagihans.length === 0 ? (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Siswa ini tidak memiliki tagihan aktif / seluruh tagihan telah lunas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeTagihans.map(t => {
                    const paid = t.amountPaid || 0
                    const remaining = Math.max(0, t.amount - paid)
                    const isSelected = t.id === selectedTagihanId
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTagihan(t.id)}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-700'}`}>
                              {t.type}
                            </span>
                            {t.month && t.year && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                                {MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${t.status === 'ANGSURAN' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {t.status === 'ANGSURAN' ? 'Angsuran' : 'Belum Lunas'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">Sisa Tagihan</p>
                            <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{currency(remaining)}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
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
              <div className="space-y-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <Label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    3. Rincian & Opsi Pembayaran Kasir
                  </Label>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {selectedTagihan.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Terapkan Diskon Kasir */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block flex items-center gap-1">
                      <Percent className="w-3 h-3 text-amber-600" /> Diskon Tunai Kasir
                    </Label>
                    <Select value={cashDiscountPct.toString()} onValueChange={(v) => handleDiscountChange(parseInt(v || '0', 10))}>
                      <SelectTrigger className="bg-white dark:bg-slate-950 h-10 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800">
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
                        className="bg-white dark:bg-slate-950 text-xs h-9 mt-1 rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    )}
                  </div>

                  {/* Nominal Bayar Input & Shortcut */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                      Nominal Dibayar (Rp)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                      <Input
                        type="number"
                        disabled={isInfaq}
                        placeholder="Masukkan nominal..."
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="pl-8.5 h-10 bg-white dark:bg-slate-950 font-black text-slate-900 dark:text-white rounded-xl border-slate-200 dark:border-slate-800 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {/* Shortcut Buttons */}
                    {!isInfaq && (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setCashAmount(remainingBeforePay.toString())}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200"
                        >
                          Lunas ({currency(remainingBeforePay)})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashAmount(Math.round(remainingBeforePay / 2).toString())}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200"
                        >
                          50% ({currency(Math.round(remainingBeforePay / 2))})
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* PRATINJAU KUITANSI / TRANSACTION BREAKDOWN CARD */}
                <div className="bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/60 p-3.5 sm:p-4 rounded-xl space-y-2 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
                  <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400">
                    Pratinjau Kalkulasi Kuitansi
                  </p>

                  <div className="space-y-1 pt-0.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Tagihan Awal:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{currency(origAmount)}</span>
                    </div>

                    {paid > 0 && (
                      <div className="flex justify-between text-blue-700 dark:text-blue-400">
                        <span>Sudah Diangsur:</span>
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

                    <div className="flex justify-between font-black text-emerald-700 dark:text-emerald-400 text-sm pt-0.5">
                      <span>Nominal Bayar Tunai:</span>
                      <span>{currency(payInputVal)}</span>
                    </div>

                    <div className="flex justify-between items-center font-black text-xs sm:text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-slate-800 dark:text-slate-200">Status Transaksi:</span>
                      {remainingAfterPay === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> LUNAS SEKALIGUS
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ANGSURAN (Kurang: {currency(remainingAfterPay)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Catatan / Kuitansi */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Catatan / Nomor Kuitansi (Opsional)
                  </Label>
                  <Input
                    placeholder="Misal: KWT-KASIR/#1024 - Tunai Kasir Keuangan"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            )
          })()}
        </div>

        {/* Fixed Sticky Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl font-semibold border-slate-300 dark:border-slate-700 text-xs">
            Batal
          </Button>
          <Button
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md gap-2 text-xs"
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
  const { isKepalaSekolah } = useKeuanganRole()
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

  // Beasiswa Dialog States in Keuangan
  const [beasiswaTargetStudent, setBeasiswaTargetStudent] = useState<StudentSummary | null>(null)
  const [isBeasiswaDialogOpen, setIsBeasiswaDialogOpen] = useState(false)
  const [beasiswaSeragamVal, setBeasiswaSeragamVal] = useState<number>(0)
  const [beasiswaSppVal, setBeasiswaSppVal] = useState<number>(0)
  const [beasiswaDppVal, setBeasiswaDppVal] = useState<number>(0)
  const [beasiswaReason, setBeasiswaReason] = useState<string>('')

  useEffect(() => {
    const handleOpenBeasiswa = (e: any) => {
      const std = e.detail
      if (std) {
        setBeasiswaTargetStudent(std)
        setBeasiswaReason(std.beasiswaReason || '')
        setBeasiswaSeragamVal(std.beasiswaSeragamPct || 0)
        setBeasiswaSppVal(std.beasiswaSppPct || 0)
        setBeasiswaDppVal(std.beasiswaDppPct || 0)
        setIsBeasiswaDialogOpen(true)
      }
    }
    window.addEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
    return () => window.removeEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
  }, [])

  const updateBeasiswaMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch(`/api-backend/students/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui beasiswa keuangan siswa')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      if (selectedStudent) {
        qc.invalidateQueries({ queryKey: ['student-tagihan', selectedStudent.id] })
      }
      setIsBeasiswaDialogOpen(false)
      Swal.fire({
        title: 'Beasiswa Berhasil Diperbarui!',
        text: 'Persentase beasiswa keuangan siswa berhasil disimpan.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan beasiswa.',
        icon: 'error',
      })
    }
  })

  const { data: students = [], isLoading } = useQuery<StudentSummary[]>({
    queryKey: ['finance-students'],
    queryFn: () => authenticatedQuery('/api-backend/finance/students'),
    refetchInterval: 5000,
  })

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => authenticatedQuery('/api-backend/classes'),
    staleTime: 60000,
  })

  const { data: detailData } = useQuery<StudentDetail>({
    queryKey: ['student-tagihan', selectedStudent?.id],
    queryFn: () => authenticatedQuery(`/api-backend/finance/students/${selectedStudent!.id}/tagihan`),
    enabled: !!selectedStudent?.id,
    refetchInterval: 5000,
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

  // Perhitungan Ringkasan Cepat
  const stats = useMemo(() => {
    const totalSiswa = filtered.length
    const totalTunggakan = filtered.reduce((sum, s) => sum + ((s.sisaTagihan && s.sisaTagihan > 0) ? s.sisaTagihan : Math.max(0, s.totalTagihan - s.totalLunas)), 0)
    const siswaLunas = filtered.filter(s => s.belumLunasCount === 0).length
    const siswaMenunggak = filtered.filter(s => s.belumLunasCount > 0).length
    return { totalSiswa, totalTunggakan, siswaLunas, siswaMenunggak }
  }, [filtered])

  return (
    <div className="space-y-3">
      {/* Quick Summary Metric Cards - Compact & Clean Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {!isKepalaSekolah ? (
          <button
            onClick={() => setCashModalOpen(true)}
            className="group text-left bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-500/80 p-2.5 sm:p-3 rounded-xl shadow-xs transition-all duration-150 hover:shadow cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Kasir Pembayaran</span>
              <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                <Wallet className="w-3 h-3" />
              </div>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm sm:text-base font-black text-white">Kasir Tunai</span>
              <span className="text-[10px] font-bold text-emerald-200 group-hover:underline">Buka Loket &rarr;</span>
            </div>
          </button>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.totalSiswa} <span className="text-[11px] font-normal text-slate-400">Siswa</span></p>
          </div>
        )}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Bebas Tunggakan</span>
          <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.siswaLunas} <span className="text-[11px] font-normal text-emerald-600/70">Lunas</span></p>
        </div>
        <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Ada Tagihan</span>
          <p className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-400 mt-0.5">{stats.siswaMenunggak} <span className="text-[11px] font-normal text-rose-600/70">Siswa</span></p>
        </div>
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Total Sisa Tagihan</span>
          <p className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-300 mt-0.5 truncate">{currency(stats.totalTunggakan)}</p>
        </div>
      </div>

      {/* Toolbar / Search & Actions Filter (Responsive Wrap on Zoom) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Cari siswa/kelas..."
              className="pl-7.5 h-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(!v || v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[115px] sm:w-[130px] h-8 font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg shrink-0">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {uniqueKelas.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {!isKepalaSekolah && (
            <>
              <Button onClick={() => setMassalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-8 px-2.5 text-xs font-bold rounded-lg shadow-xs">
                <Layers className="w-3.5 h-3.5" /> Rilis 1 Th
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (filtered.length === 0) {
                    Swal.fire('Info', 'Tidak ada siswa yang sesuai filter saat ini untuk di-reset.', 'info');
                    return;
                  }
                  openResetModal(filtered.map(s => s.id));
                }}
                disabled={filtered.length === 0}
                className="border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-8 px-2.5 text-xs font-bold rounded-lg shadow-xs gap-1"
                title={filterKelas ? `Reset Tagihan untuk Kelas ${filterKelas} (${filtered.length} Siswa)` : `Reset Tagihan Seluruh Siswa Terfilter (${filtered.length} Siswa)`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                {filterKelas ? `Reset ${filterKelas}` : search ? `Reset (${filtered.length})` : 'Reset Semua'}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportRekapKelas}
            className="border-indigo-200 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 h-8 px-2 text-xs font-bold rounded-lg"
            title="Eksport Excel Rekap Keuangan Per Kelas">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 h-8 px-2 text-xs font-bold rounded-lg"
            title="Export Seluruh Data">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Floating / Top Action Bar When Students Are Selected */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200 dark:border-rose-900/60 p-2 rounded-xl flex flex-wrap items-center justify-between gap-1.5 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
              {selectedStudentIds.length} Terpilih
            </span>
            {filterKelas && (
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                (Kelas {filterKelas})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => openResetModal(selectedStudentIds)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1 h-7.5 px-2.5 rounded-lg shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ({selectedStudentIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedStudentIds([])}
              className="text-xs h-7.5 px-2 rounded-lg border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-100/50"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0 overflow-x-auto max-w-full">
          <div className="overflow-x-auto">
            <Table className="w-full text-xs">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-bold text-[11px]">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {!isKepalaSekolah && (
                    <TableHead className="w-7 text-center px-1 py-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-0.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                        title={isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                      >
                        {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="w-8 text-center py-1.5 px-1 whitespace-nowrap">No</TableHead>
                  <TableHead className="py-1.5 px-2 max-w-[200px] whitespace-nowrap">Nama Siswa</TableHead>
                  <TableHead className="w-24 text-center py-1.5 px-1 whitespace-nowrap">Status</TableHead>
                  <TableHead className="w-20 text-center py-1.5 px-1 whitespace-nowrap">SPP</TableHead>
                  <TableHead className="w-28 text-right py-1.5 px-2 whitespace-nowrap">Sisa Tagihan</TableHead>
                  <TableHead className="w-24 text-center py-1.5 px-1 whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={!isKepalaSekolah ? 7 : 6} className="text-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 mx-auto mb-1" />
                      <p className="text-slate-500 text-[11px]">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={!isKepalaSekolah ? 7 : 6} className="text-center py-8 text-slate-400 text-xs font-medium">
                      {search || filterKelas ? 'Tidak ada siswa yang sesuai kriteria filter.' : 'Belum ada data siswa.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((s, i) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <TableRow key={s.id} className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/50'}`}>
                      {!isKepalaSekolah && (
                        <TableCell className="text-center px-1 py-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSelectStudent(s.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="text-center text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap">{i + 1}</TableCell>
                      <TableCell className="py-1 px-2 max-w-[200px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate" title={s.name}>{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono leading-tight truncate">NISN: {s.nisn} · <span className="font-semibold text-slate-600 dark:text-slate-300">{s.className}</span></p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1 px-1 whitespace-nowrap">
                        {s.belumLunasCount > 0
                          ? <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 border border-red-200 inline-block whitespace-nowrap">{s.belumLunasCount} Tagihan</span>
                          : <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 whitespace-nowrap"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS</span>
                        }
                      </TableCell>
                      <TableCell className="text-center py-1 px-1 whitespace-nowrap">
                        <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] inline-block whitespace-nowrap ${s.sppLunasCount >= 12 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : s.sppLunasCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                          {s.sppLunasCount}/12 Bln
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900 dark:text-white text-xs py-1 px-2 whitespace-nowrap">
                        {s.sisaTagihan !== undefined && s.sisaTagihan > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">{currency(s.sisaTagihan)}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Rp 0 (Lunas)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1 px-1 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-center items-center gap-1">
                          <Button size="sm" variant="outline"
                            className="border-blue-200 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-[10px] gap-1 h-6 px-1.5 rounded-md font-bold"
                            onClick={() => openModal(s)}>
                            <Receipt className="w-3 h-3" /> {isKepalaSekolah ? 'Detail' : 'Kelola'}
                          </Button>
                          {!isKepalaSekolah && (
                            <Button size="sm" variant="outline"
                              title="Reset Tagihan Siswa (Otorisasi Password)"
                              className="border-rose-200 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 text-xs h-6 w-6 p-0 rounded-md"
                              onClick={() => openResetModal([s.id])}>
                              <RotateCcw className="w-2.5 h-2.5" />
                            </Button>
                          )}
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

      {/* BEASISWA DIALOG KEUANGAN */}
      <Dialog open={isBeasiswaDialogOpen} onOpenChange={setIsBeasiswaDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="shrink-0 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 p-5 sm:p-6 text-white shadow-sm">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-3 text-white text-lg sm:text-xl font-extrabold">
                <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20">
                  <Percent className="w-5 h-5 text-amber-100" />
                </div>
                Pengaturan Beasiswa Keuangan
              </DialogTitle>
              <DialogDescription className="text-amber-100 text-xs sm:text-sm font-medium">
                Atur alokasi persentase beasiswa untuk Seragam, SPP, & DPP.
              </DialogDescription>
            </DialogHeader>
          </div>

          {beasiswaTargetStudent && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 custom-scrollbar">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5 shadow-xs">
                <p className="font-extrabold text-base text-slate-900 dark:text-slate-100">{beasiswaTargetStudent.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold px-2.5 py-1 rounded-lg">
                    Kelas: {beasiswaTargetStudent.className}
                  </span>
                  <span className={`font-extrabold px-2.5 py-1 rounded-lg ${
                    beasiswaTargetStudent.jalurPendaftaran === 'Mandiri'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  }`}>
                    Jalur: {beasiswaTargetStudent.jalurPendaftaran || 'Mandiri'}
                  </span>
                </div>
              </div>

              {/* Rincian Beasiswa Per Item */}
              <div className="space-y-4 bg-amber-50/60 dark:bg-amber-950/30 p-4 sm:p-5 rounded-2xl border border-amber-200/90 dark:border-amber-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-amber-200/70 pb-3">
                  <p className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Alokasi Beasiswa (%) Per Item:
                  </p>
                  <span className="text-xs font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/80 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 self-start sm:self-auto">
                    {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? 'Seragam, SPP & DPP' : 'Hanya SPP & DPP'}
                  </span>
                </div>

                {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? (
                  <div className="space-y-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-amber-200/70 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <Label className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Beasiswa Seragam (%)
                      </Label>
                      <span className="font-extrabold text-amber-700 dark:text-amber-400">
                        Potongan: {beasiswaSeragamVal}% ({currency(2000000 * ((beasiswaSeragamVal || 0) / 100))})
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaSeragamVal || ''}
                        onChange={(e) => setBeasiswaSeragamVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-sm h-11 pr-9 font-bold rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">%</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Bayar Netto: <strong className="text-emerald-600 font-bold">{currency(2000000 * (1 - (beasiswaSeragamVal || 0) / 100))}</strong> (Default Rp 2.000.000)</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium bg-amber-100/50 dark:bg-slate-950 p-3.5 rounded-xl border border-amber-200 dark:border-slate-800 flex items-center gap-2.5">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Jalur Mandiri tidak berhak mendapat Beasiswa Seragam. (Berhak untuk SPP & DPP).</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-amber-200/70 dark:border-slate-800 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Beasiswa SPP (%)
                      </Label>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {beasiswaSppVal}%
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaSppVal || ''}
                        onChange={(e) => setBeasiswaSppVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-sm h-11 pr-9 font-bold rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-amber-200/70 dark:border-slate-800 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                        Beasiswa DPP (%)
                      </Label>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                        {beasiswaDppVal}%
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaDppVal || ''}
                        onChange={(e) => setBeasiswaDppVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-sm h-11 pr-9 font-bold rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Alasan / Catatan Beasiswa</Label>
                <Input
                  placeholder="Misal: Beasiswa Kader Persyarikatan / Prestasi / Bidikmisi"
                  value={beasiswaReason}
                  onChange={(e) => setBeasiswaReason(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-sm h-11 rounded-xl font-medium border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          )}

          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsBeasiswaDialogOpen(false)} className="h-11 rounded-xl font-semibold border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="button"
              className="h-11 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md gap-2"
              onClick={() => {
                if (!beasiswaTargetStudent) return
                updateBeasiswaMutation.mutate({
                  id: beasiswaTargetStudent.id,
                  beasiswaSeragamPct: beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? beasiswaSeragamVal : 0,
                  beasiswaSppPct: beasiswaSppVal,
                  beasiswaDppPct: beasiswaDppVal,
                  beasiswaPercentage: beasiswaSppVal,
                  beasiswaReason: beasiswaReason,
                })
              }}
              disabled={updateBeasiswaMutation.isPending}
            >
              {updateBeasiswaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
              Simpan Beasiswa Keuangan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TagihanModal student={detailData ?? null} open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedStudent(null) }}
        onResetStudent={(id) => openResetModal([id])} />
      <ReleaseYearlyModal open={massalOpen} onClose={() => setMassalOpen(false)} classes={classes} />
      <ManualCashPaymentModal open={cashModalOpen} onClose={() => setCashModalOpen(false)} students={students} />
    </div>
  )
}

// ============================================================
// TAB: REKAPITULASI
// ============================================================
function TabRekap() {
  const authenticatedFetch = useAuthenticatedFetch();
  const authenticatedQuery = useAuthenticatedQuery();
  const years = YEARS
  const [rekapMode, setRekapMode] = useState<'GENERAL' | 'TRIWULAN'>('GENERAL')
  const [year, setYear] = useState(currentYear.toString())
  const [month, setMonth] = useState('')

  // Triwulan states
  const [triwulanClassId, setTriwulanClassId] = useState('')
  const [quarter, setQuarter] = useState<'1' | '2' | '3' | '4'>('1')

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => authenticatedQuery('/api-backend/classes'),
  })

  useEffect(() => {
    if (classes.length > 0 && !triwulanClassId) {
      setTriwulanClassId(classes[0].id)
    }
  }, [classes, triwulanClassId])

  const { data: rekap, isLoading } = useQuery<Rekap>({
    queryKey: ['finance-rekap', year, month],
    queryFn: async () => {
      const q = month ? `year=${year}&month=${month}` : `year=${year}`
      const res = await authenticatedFetch(`/api-backend/finance/rekap?${q}`)
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi')
      return res.json()
    },
    enabled: rekapMode === 'GENERAL',
    refetchInterval: 5000,
  })

  const { data: quarterlyData, isLoading: loadingQuarterly } = useQuery<any>({
    queryKey: ['quarterly-rekap', triwulanClassId, year, quarter],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/finance/rekap-quarterly?classId=${triwulanClassId}&year=${year}&quarter=${quarter}`)
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi triwulan')
      return res.json()
    },
    enabled: rekapMode === 'TRIWULAN' && !!triwulanClassId,
    refetchInterval: 5000,
  })

  const handleExportTriwulanExcel = async () => {
    if (!triwulanClassId) return
    try {
      const res = await authenticatedFetch(`/api-backend/finance/export-rekap-triwulan?classId=${triwulanClassId}&year=${year}&quarter=${quarter}`)
      if (!res.ok) throw new Error('Gagal mengunduh file rekap triwulan')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap_triwulan_Q${quarter}_${quarterlyData?.class?.name || 'kelas'}_${year}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      Swal.fire('Gagal Ekspor', err.message || 'Terjadi kesalahan sistem saat ekspor', 'error')
    }
  }

  const totalYearly = rekap?.yearly.reduce((s, t) => s + t.total, 0) ?? 0
  const totalMonthly = rekap?.monthly.reduce((s, t) => s + t.total, 0) ?? 0
  const totalUnpaid = rekap?.unpaid.reduce((s, t) => s + t.total, 0) ?? 0
  const maxTrend = Math.max(...(rekap?.monthlyTrend.map(t => t.total) ?? [1]), 1)

  return (
    <div className="space-y-6">
      {/* Sub Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRekapMode('GENERAL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              rekapMode === 'GENERAL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Ringkasan Tahunan & Bulanan
          </button>
          <button
            type="button"
            onClick={() => setRekapMode('TRIWULAN')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              rekapMode === 'TRIWULAN'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Rekap Triwulan (3 Bulan Sekali) Per Kelas
          </button>
        </div>

        {rekapMode === 'TRIWULAN' && (
          <Button
            onClick={handleExportTriwulanExcel}
            disabled={!quarterlyData || loadingQuarterly}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-10 rounded-xl gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" /> Export Excel Triwulan
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={year} onValueChange={(v) => setYear(v ?? year)}>
          <SelectTrigger className="w-[110px] bg-white dark:bg-slate-950 font-bold text-xs h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>

        {rekapMode === 'GENERAL' ? (
          <>
            <Select value={month || 'all'} onValueChange={(v) => setMonth(!v || v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-slate-950 font-bold text-xs h-10 rounded-xl"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {month && (
              <Button variant="ghost" size="sm" onClick={() => setMonth('')} className="text-slate-500 gap-1 h-10 rounded-xl">
                <X className="w-3 h-3" /> Reset
              </Button>
            )}
          </>
        ) : (
          <>
            <Select value={triwulanClassId} onValueChange={(v) => { if (v) setTriwulanClassId(v) }}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950 font-bold text-xs h-10 rounded-xl">
                <SelectValue placeholder="Pilih Kelas...">
                  {classes.find(c => c.id === triwulanClassId)?.name || 'Pilih Kelas...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={quarter} onValueChange={(v: any) => setQuarter(v)}>
              <SelectTrigger className="w-[200px] bg-white dark:bg-slate-950 font-bold text-xs h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Triwulan 1 (Juli - Sep)</SelectItem>
                <SelectItem value="2">Triwulan 2 (Okt - Des)</SelectItem>
                <SelectItem value="3">Triwulan 3 (Jan - Mar)</SelectItem>
                <SelectItem value="4">Triwulan 4 (Apr - Jun)</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {rekapMode === 'TRIWULAN' ? (
        loadingQuarterly ? (
          <div className="text-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Memuat rekap triwulan kelas...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header Informasi Kelas & Wali Kelas */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-900 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest block">Laporan Rekapitulasi Triwulan</span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  Kelas {quarterlyData?.class?.name || '-'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Wali Kelas: <strong className="text-white">{quarterlyData?.class?.homeroomTeacher || 'Belum Ditentukan'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
                  <p className="text-[11px] text-slate-300 font-semibold">Total Lunas Triwulan</p>
                  <p className="text-base sm:text-lg font-black text-emerald-300">
                    {currency(quarterlyData?.summary?.totalLunas || 0)}
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
                  <p className="text-[11px] text-slate-300 font-semibold">Sisa Tunggakan</p>
                  <p className="text-base sm:text-lg font-black text-rose-300">
                    {currency(quarterlyData?.summary?.totalSisa || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabel Detail Siswa Triwulan */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
              <CardContent className="p-0 overflow-x-auto max-w-full">
                <Table>
                  <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-extrabold text-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center whitespace-nowrap">No</TableHead>
                      <TableHead className="whitespace-nowrap">Nama Siswa</TableHead>
                      <TableHead className="whitespace-nowrap">NISN / NIS</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Tagihan Triwulan</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Terbayar (Lunas)</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Sisa Tunggakan</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status Triwulan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!quarterlyData?.students || quarterlyData.students.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                          Tidak ada data siswa / tagihan untuk triwulan ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      quarterlyData.students.map((st: any, idx: number) => {
                        const isLunas = st.sisa === 0 && st.totalTagihan > 0
                        return (
                          <TableRow key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="text-center text-slate-400 font-medium text-xs whitespace-nowrap">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{st.name}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{st.nisn} / {st.nis}</TableCell>
                            <TableCell className="text-right font-semibold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">{currency(st.totalTagihan)}</TableCell>
                            <TableCell className="text-right font-extrabold text-emerald-600 text-xs whitespace-nowrap">{currency(st.totalLunas)}</TableCell>
                            <TableCell className="text-right font-extrabold text-rose-600 text-xs whitespace-nowrap">{currency(st.sisa)}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                              {isLunas ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300">
                                  LUNAS
                                </span>
                              ) : st.totalLunas > 0 ? (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black border border-amber-300">
                                  ANGSURAN
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-300">
                                  BELUM BAYAR
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )
      ) : isLoading ? (
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
// MAIN PAGE
// ============================================================
const TABS = [
  { id: 'tagihan', label: 'Tagihan Siswa', icon: Receipt },
  { id: 'verifikasi', label: 'Verifikasi Pembayaran', icon: CheckCircle2 },
  { id: 'rekap', label: 'Rekapitulasi', icon: BarChart3 },
]

export default function KeuanganMasukPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const userSubRole = (session?.user as any)?.subRole || ''
  const userSubRole2 = (session?.user as any)?.subRole2 || ''
  const userSubRole3 = (session?.user as any)?.subRole3 || ''
  const isKepalaSekolah = [userRole, userSubRole, userSubRole2, userSubRole3].includes('KEPALA_SEKOLAH')
  const [activeTab, setActiveTab] = useState('tagihan')

  return (
    <KeuanganRoleContext.Provider value={{ isKepalaSekolah }}>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Keuangan Masuk
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Tagihan, verifikasi pembayaran, & rekapitulasi</p>
          </div>
        </div>

        {/* Tab Navigation Compact Pill Style */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 gap-1 overflow-x-auto self-start sm:self-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${isActive ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}>
                <Icon className="w-3.5 h-3.5" />
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
      </div>
    </div>
    </KeuanganRoleContext.Provider>
  )
}
