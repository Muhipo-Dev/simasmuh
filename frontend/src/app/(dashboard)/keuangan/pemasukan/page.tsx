'use client'

import { useState, useMemo, useEffect, createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input, PasswordInput } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Wallet, Users, BarChart3, Building2, Search, Pencil, Trash2,
  Loader2, PlusCircle, CheckCircle2, TrendingUp, X, Download,
  AlertTriangle, RotateCcw, Receipt, Clock, ChevronDown, ChevronUp, Layers, Percent, Sparkles,
  ShieldAlert, ShieldCheck, Lock, CheckSquare, Square, HeartHandshake, RefreshCw, Send, FileSpreadsheet, Check, Info,
  CreditCard, FileCheck, Printer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { confirmDelete } from '@/lib/swal-helper'
import PaymentProofVerificationPage from '../verifikasi-pembayaran/page'
import ExamCardPrintDialog from '@/components/finance/ExamCardPrintDialog'
import SklPrintDialog from '@/components/finance/SklPrintDialog'
import SingleReceiptPrintModal from '@/components/finance/SingleReceiptPrintModal'

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
  isActive?: boolean
  studentStatus?: string
  statusDetail?: string
  bioData?: string | null
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
  isActive?: boolean
  studentStatus?: string
  statusDetail?: string
  bioData?: string | null
  program?: string | null
  beasiswaPercentage?: number
  beasiswaReason?: string | null
}

const getFinanceStudentStatus = (s: { isActive?: boolean; studentStatus?: string; statusDetail?: string; bioData?: string | null }) => {
  if (s.studentStatus) {
    if (s.studentStatus === 'LULUS') return { status: 'LULUS', label: s.statusDetail || 'Lulus / Alumni', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    if (s.studentStatus === 'KELUAR') return { status: 'KELUAR', label: s.statusDetail || 'Pindah / Keluar', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
    if (s.studentStatus === 'NONAKTIF' || s.isActive === false) return { status: 'NONAKTIF', label: 'Nonaktif', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800' }
    return { status: 'AKTIF', label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }
  }
  if (s.isActive === false) {
    let parsed: any = {}
    if (s.bioData) {
      try { parsed = typeof s.bioData === 'string' ? JSON.parse(s.bioData) : s.bioData } catch {}
    }
    const alasan = (parsed?.alasanMeninggalkan || '').toLowerCase()
    const tamat = (parsed?.tamatBelajar || '').toLowerCase()
    if (alasan.includes('lulus') || tamat.includes('lulus') || tamat.includes('tamat') || alasan.includes('alumni')) {
      return { status: 'LULUS', label: parsed?.tamatBelajar || 'Lulus / Alumni', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
    }
    if (alasan.includes('keluar') || alasan.includes('pindah')) {
      return { status: 'KELUAR', label: parsed?.alasanMeninggalkan || 'Pindah / Keluar', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
    }
    return { status: 'NONAKTIF', label: 'Nonaktif', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800' }
  }
  return { status: 'AKTIF', label: 'Aktif', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }
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
      <DialogContent className="max-w-sm w-[92vw] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              {title}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-4 sm:p-5 flex gap-2 justify-end bg-slate-50/60 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-10 px-4 rounded-xl font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            Batal
          </Button>
          <Button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold h-10 px-4 rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm" onClick={onConfirm} disabled={loading}>
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
  const [modalTab, setModalTab] = useState<'tagihan' | 'riwayat'>('tagihan')
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

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Payment History query for student
  const { data: studentPaymentData, isLoading: isLoadingPayments } = useQuery<{
    id: string;
    name: string;
    payments: Array<{
      id: string;
      amount: number;
      type: string;
      month: number | null;
      year: number | null;
      paymentDate: string;
      notes: string | null;
      tagihan?: {
        id: string;
        type: string;
        amount: number;
        amountPaid: number;
        status: string;
        month: number | null;
        year: number | null;
        notes: string | null;
      } | null;
    }>;
  }>({
    queryKey: ['student-payment-history-single', student?.id],
    queryFn: () => authenticatedQuery(`/api-backend/finance/students/${student?.id}/payments`),
    enabled: !!student?.id && open,
    staleTime: 5000,
  })

  // Queries for public settings and program configs to auto-fill fee amounts
  const { data: publicSettings } = useQuery<{ defaultDpp?: number; defaultUka?: number; defaultUks?: number; defaultInfaq?: number; defaultSeragam?: number }>({
    queryKey: ['public-settings'],
    queryFn: () => authenticatedQuery('/api-backend/settings/public'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  })

  const { data: programConfigs } = useQuery<Array<{ id: string; code: string; name: string; defaultSpp: number; defaultDiscount: number }>>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs'),
    staleTime: 60000,
    refetchOnWindowFocus: false,
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
        <DialogContent showCloseButton={false} className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          {/* Header Modal Clean */}
          <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
            {/* Custom Close Button */}
            <button
              onClick={() => { onClose(); resetForm() }}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 rounded-lg w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Tutup</span>
            </button>

            <DialogHeader className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8 sm:pr-12">
                <div className="space-y-1">
                  <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                      <Receipt className="w-5 h-5" />
                    </div>
                    Tagihan Siswa — {student?.name}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium flex flex-wrap items-center gap-2">
                    <span>Kelas <strong className="text-slate-700 dark:text-slate-200">{student?.class?.name}</strong> · NISN: <span className="font-mono text-slate-700 dark:text-slate-300">{student?.nisn}</span> · NIS: <span className="font-mono text-slate-700 dark:text-slate-300">{student?.nis}</span></span>
                    {student?.isActive === false ? (
                      <span className="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 inline-flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Nonaktif / Diarsipkan
                      </span>
                    ) : (
                      <span className="font-semibold text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Siswa Aktif
                      </span>
                    )}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (student) {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-beasiswa-dialog', { detail: student }));
                      }
                    }}
                    className="border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold gap-1.5 h-9 rounded-xl transition-all"
                  >
                    <Percent className="w-3.5 h-3.5" />
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
                      className="border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold gap-1.5 h-9 rounded-xl transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Tagihan Siswa
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-Tab Navigation inside TagihanModal */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTab('tagihan')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modalTab === 'tagihan'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Daftar Tagihan ({tagihans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('riwayat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    modalTab === 'riwayat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Riwayat Pembayaran & Angsuran ({studentPaymentData?.payments?.length || 0})
                </button>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
          {modalTab === 'riwayat' ? (
            <div className="space-y-4">
              {/* Riwayat Pembayaran Siswa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Dana Disetor</span>
                  <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {currency(
                      (studentPaymentData?.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Total Transaksi</span>
                  <p className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 mt-0.5">
                    {studentPaymentData?.payments?.length || 0} <span className="text-xs font-normal text-slate-500">Transaksi</span>
                  </p>
                </div>
              </div>

              {isLoadingPayments ? (
                <div className="text-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Memuat riwayat transaksi...</p>
                </div>
              ) : (studentPaymentData?.payments || []).length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Belum ada riwayat pembayaran yang tercatat untuk siswa ini.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {studentPaymentData!.payments.map((p, pIdx) => {
                    const payDateStr = new Date(p.paymentDate).toLocaleDateString('id-ID', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const isAngsuran = p.notes?.toLowerCase().includes('angsuran') || (p.tagihan && p.tagihan.status === 'ANGSURAN');
                    return (
                      <div key={p.id || pIdx} className="p-3.5 bg-slate-50/80 dark:bg-slate-950/70 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${TYPE_COLORS[p.type] || 'bg-slate-100 text-slate-700'}`}>
                              {p.type}
                            </span>
                            {p.month && p.year && (
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {MONTHS.find(m => m.value === p.month!.toString())?.label} {p.year}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isAngsuran
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300'
                            }`}>
                              {isAngsuran ? 'Angsuran / Cicilan' : 'Lunas'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {currency(p.amount)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              · {payDateStr}
                            </span>
                          </div>
                          {p.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                              {p.notes}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex sm:flex-col justify-end items-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReceiptData({
                                receiptNo: `KWT-${student?.nis || '000'}-${p.type}-${p.id.slice(0, 6)}`,
                                paymentDate: payDateStr,
                                studentName: student?.name || '',
                                studentNis: student?.nis || '',
                                studentNisn: student?.nisn || '',
                                className: student?.className || student?.class?.name || '',
                                program: student?.program || '',
                                paymentType: p.type,
                                period: p.month && p.year ? `${MONTHS.find(m => m.value === p.month!.toString())?.label} ${p.year}` : (p.year ? `Tahun ${p.year}` : '-'),
                                originalAmount: p.tagihan?.amount || p.amount,
                                discountAmount: 0,
                                discountPct: 0,
                                paidAmount: p.amount,
                                remainingAmount: p.tagihan ? Math.max(0, p.tagihan.amount - (p.tagihan.amountPaid || p.amount)) : 0,
                                status: p.tagihan?.status || (isAngsuran ? 'ANGSURAN' : 'LUNAS'),
                                cashierName: 'Kasir Keuangan',
                                notes: p.notes || 'Pembayaran Sistem Keuangan SIMASMUH',
                              });
                              setReceiptModalOpen(true);
                            }}
                            className="h-8 text-xs font-bold gap-1 rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600" /> Cetak Kwitansi
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>

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
                      {/* Kwitansi / Bukti Bayar */}
                      {(t.status === 'LUNAS' || (t.amountPaid && t.amountPaid > 0)) && (
                        <button
                          onClick={() => {
                            const dInfo = parseDiscountInfo(t.notes)
                            setReceiptData({
                              receiptNo: `KWT-${student?.nis || '000'}-${t.type}-${Date.now().toString().slice(-4)}`,
                              paymentDate: t.paidDate ? new Date(t.paidDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                              studentName: student?.name || '',
                              studentNis: student?.nis || '',
                              studentNisn: student?.nisn || '',
                              className: student?.className || '',
                              program: student?.program || '',
                              paymentType: t.type,
                              period: t.month && t.year ? `${MONTHS.find(m => m.value === t.month!.toString())?.label} ${t.year}` : (t.year ? `Tahun ${t.year}` : '-'),
                              originalAmount: dInfo?.originalAmount || t.amount,
                              discountAmount: dInfo?.beasiswaAmount || 0,
                              discountPct: dInfo?.beasiswaPercentage || 0,
                              paidAmount: t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0),
                              remainingAmount: Math.max(0, t.amount - (t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0))),
                              status: t.status,
                              cashierName: 'Kasir Keuangan',
                              notes: cleanNotesText || 'Pembayaran Sistem Keuangan SIMASMUH',
                            })
                            setReceiptModalOpen(true)
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-colors shadow-xs"
                          title="Cetak Kwitansi / Bukti Pembayaran"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" /> Cetak Kwitansi
                        </button>
                      )}

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
          </>
          )}
        </div>
      </DialogContent>
      </Dialog>

      {/* MODAL BAYAR / ANGSURAN TAGIHAN */}
      <Dialog open={!!payTargetTagihan} onOpenChange={(v) => { if (!v) closePayDialog() }}>
        <DialogContent className="max-w-md w-[95vw] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                Pembayaran / Angsuran Kasir
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
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
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Total Tagihan Awal:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currency(payTargetTagihan.amount)}</span>
                  </div>
                  {paid > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Sudah Terbayar:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{currency(paid)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Sisa Tagihan:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-base">{currency(remaining)}</span>
                  </div>
                </div>

                {/* Warning if Infaq */}
                {isInfaq && (
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Aturan Infaq:</strong> Tagihan Infaq <u>TIDAK BISA</u> diangsur. Pembayaran harus lunas sekaligus ({currency(remaining)}).
                    </div>
                  </div>
                )}

                {/* Option Mode */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Pilihan Mode Pembayaran</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPayMode('LUNAS'); setPayAmountInput(remaining.toString()); }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        payMode === 'LUNAS'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      Lunas ({currency(remaining)})
                    </button>
                    <button
                      type="button"
                      disabled={isInfaq}
                      onClick={() => { setPayMode('ANGSURAN'); setPayAmountInput(''); }}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        isInfaq
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          : payMode === 'ANGSURAN'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      Cicil / Angsur
                    </button>
                  </div>
                </div>

                {/* Input Nominal */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Nominal Dibayar (Rp)</Label>
                  <Input
                    type="number"
                    placeholder="Masukkan nominal..."
                    value={payAmountInput}
                    disabled={payMode === 'LUNAS' || isInfaq}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    className="bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white h-10 rounded-xl text-sm"
                  />
                  {payMode === 'ANGSURAN' && !isInfaq && payAmountInput && (
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Sisa setelah angsuran ini: <strong className="text-rose-600">{currency(Math.max(0, remaining - (parseFloat(payAmountInput) || 0)))}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">Catatan Kasir (Opsional)</Label>
                  <Input
                    placeholder="Misal: Angsuran ke-1 Kasir Tunai"
                    value={payNotesInput}
                    onChange={(e) => setPayNotesInput(e.target.value)}
                    className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" onClick={closePayDialog} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">Batal</Button>
                  <Button
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs text-xs sm:text-sm"
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
        <DialogContent className="max-w-sm w-[95vw] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                Set Diskon Tagihan
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Terapkan potongan diskon / beasiswa khusus tagihan.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Persentase Diskon</Label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercentage(pct as 25 | 50 | 75 | 100)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      discountPercentage === pct
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Alasan (Opsional)</Label>
              <Input
                placeholder="Misal: Beasiswa prestasi"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl font-medium"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setShowDiscountModal(false)} className="flex-1 h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">Batal</Button>
              <Button
                className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs text-xs sm:text-sm"
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

      <SingleReceiptPrintModal
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false)
          setReceiptData(null)
        }}
        data={receiptData}
      />
    </>
  )
}

// ============================================================
// MODAL RILIS TAGIHAN 1 TAHUN KEDEPAN (MASSAL / PER KELAS / PER SISWA)
// ============================================================
function ReleaseYearlyModal({
  open, onClose, classes, studentIds }: {
  open: boolean; onClose: () => void; classes: ClassItem[]; studentIds?: string[]
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const qc = useQueryClient()
  const hasPresetStudents = !!studentIds && studentIds.length > 0
  
  const [scope, setScope] = useState<'CLASS' | 'MULTI_CLASS' | 'GRADE' | 'ALL' | 'STUDENTS'>('CLASS')

  // Durasi Rilis: 1 Tahun Penuh atau 1 Semester Saja
  const [releaseDuration, setReleaseDuration] = useState<'TAHUN' | 'SEMESTER'>('TAHUN')
  const [targetSemester, setTargetSemester] = useState<1 | 2>(1) // 1 = Ganjil, 2 = Genap

  // Mode Set Tagihan dari multi-select siswa
  useEffect(() => {
    if (open) setScope(hasPresetStudents ? 'STUDENTS' : 'CLASS')
  }, [open, hasPresetStudents])
  const [classId, setClassId] = useState(classes?.[0]?.id || '')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(classes?.map(c => c.id) || [])
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

  // State untuk Reset Rilis Tagihan Tahunan / Semesteran dengan verifikasi password
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetOnlyUnpaid, setResetOnlyUnpaid] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    if (classes && classes.length > 0 && !classId) {
      setClassId(classes[0].id)
    }
  }, [classes, classId])

  // Sinkronisasi bulan awal SPP berdasarkan pilihan durasi dan target semester
  useEffect(() => {
    if (releaseDuration === 'SEMESTER') {
      if (targetSemester === 1) {
        setSppStartMonth(7) // Juli
        setSppStartYear(startYear)
      } else {
        setSppStartMonth(1) // Januari
        setSppStartYear(startYear + 1)
      }
    } else {
      setSppStartMonth(7) // Juli
      setSppStartYear(startYear)
    }
  }, [releaseDuration, targetSemester, startYear])

  // Sinkronisasi tahun awal SPP dan teks tahun ajaran saat startYear berubah (jika mode otomatis aktif)
  useEffect(() => {
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

      if (scope === 'MULTI_CLASS' && selectedClassIds.length === 0) {
        throw new Error('Pilih minimal 1 kelas yang akan diproses rilis tagihan')
      }
      if (scope === 'STUDENTS' && !hasPresetStudents) {
        throw new Error('Pilih minimal 1 siswa untuk set tagihan')
      }

      const payload = {
        academicYear: customAcademicYear || `${startYear}/${startYear + 1}`,
        targetScope: scope === 'STUDENTS' ? 'STUDENTS' : scope === 'CLASS' ? 'CLASS' : scope === 'MULTI_CLASS' ? 'MULTI_CLASS' : scope === 'GRADE' ? 'GRADE' : 'ALL',
        studentIds: scope === 'STUDENTS' ? studentIds : undefined,
        classId: scope === 'CLASS' ? classId : undefined,
        classIds: scope === 'MULTI_CLASS' ? selectedClassIds : undefined,
        gradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        yearStart: Number(startYear),
        releaseDuration,
        targetSemester: releaseDuration === 'SEMESTER' ? targetSemester : undefined,
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
        throw new Error(errJson.message || 'Gagal merilis paket tagihan')
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
        title: isDuplicatedDetected ? 'Rilis Selesai (Proteksi Aktif)' : `Berhasil Rilis Tagihan ${releaseDuration === 'SEMESTER' ? `Semester ${targetSemester === 1 ? 'Ganjil' : 'Genap'}` : '1 Tahun'}!`,
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

  // Mutasi Reset Rilis Tagihan Tahunan / Semesteran
  const resetYearlyMut = useMutation({
    mutationFn: async () => {
      const payload = {
        scope,
        classId: scope === 'CLASS' ? classId : undefined,
        classIds: scope === 'MULTI_CLASS' ? selectedClassIds : undefined,
        gradeLevel: scope === 'GRADE' ? gradeLevel : undefined,
        startYear,
        releaseDuration,
        targetSemester: releaseDuration === 'SEMESTER' ? targetSemester : undefined,
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
        text: data.message || `Berhasil mereset tagihan siswa.`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
      onClose()
    },
    onError: (err: any) => {
      setResetError(err.message || 'Password otorisasi tidak valid')
    },
  })

  const sppMonthsCount = releaseDuration === 'SEMESTER' ? 6 : 12

  // Total estimasi per siswa
  const totalPerTahun = useMemo(() => {
    let tot = 0
    if (includeSpp) tot += (sppMonthly * sppMonthsCount)
    if (includeDpp) tot += dppAmount
    if (includeUis) tot += uisAmount
    if (includeUka) tot += ukaAmount
    if (includeUks) tot += uksAmount
    if (includeSeragam) tot += seragamPutraAmount // Estimasi default putra
    if (includeLks) tot += lksAmount
    return tot
  }, [includeSpp, sppMonthly, sppMonthsCount, includeDpp, dppAmount, includeUis, uisAmount, includeUka, ukaAmount, includeUks, uksAmount, includeSeragam, seragamPutraAmount, includeLks, lksAmount])

  // Label rentang SPP (6 Bulan untuk semester, 12 Bulan untuk 1 tahun) yang akan dirilis
  const sppRangePreview = useMemo(() => {
    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const offset = sppMonthsCount - 1
    let endM = (sppStartMonth + offset) % 12
    if (endM === 0) endM = 12
    const endY = sppStartYear + Math.floor((sppStartMonth + offset - 1) / 12)
    return `${monthNames[sppStartMonth]} ${sppStartYear} - ${monthNames[endM]} ${endY}`
  }, [sppStartMonth, sppStartYear, sppMonthsCount])

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              Rilis Tagihan {releaseDuration === 'SEMESTER' ? `Semester ${targetSemester === 1 ? 'Ganjil' : 'Genap'}` : '1 Tahun'} ({sppRangePreview})
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Rilis tagihan {sppMonthsCount} bulan SPP ({sppRangePreview}), DPP, UIS, UKA, UKS, Seragam, & LKS ({customAcademicYear ? `TA ${customAcademicYear}` : `Tahun ${startYear}`}).
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar text-slate-800 dark:text-slate-100">
          {/* Target & Scope */}
          <div className="bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                1. Sasaran & Durasi Rilis Tagihan
              </Label>
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setReleaseDuration('TAHUN')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    releaseDuration === 'TAHUN'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1 Tahun Penuh (12 Bln)
                </button>
                <button
                  type="button"
                  onClick={() => setReleaseDuration('SEMESTER')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    releaseDuration === 'SEMESTER'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1 Semester (6 Bln)
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 ${releaseDuration === 'SEMESTER' ? 'lg:grid-cols-5' : (scope === 'MULTI_CLASS' ? 'lg:grid-cols-3' : 'lg:grid-cols-4')} gap-3.5`}>
              {/* Cakupan Target: Per Angkatan, Per Kelas Tunggal, atau Pilih Beberapa Kelas */}
              <div className="flex flex-col justify-between">
                <div className="h-5 flex items-center mb-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Cakupan Sasaran</Label>
                </div>
                <Select value={scope} onValueChange={(v: any) => {
                  setScope(v)
                  if (v === 'MULTI_CLASS' && selectedClassIds.length === 0 && classes?.length > 0) {
                    setSelectedClassIds(classes.map(c => c.id))
                  }
                }}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue>
                      {scope === 'STUDENTS' ? `Siswa Terpilih (${studentIds?.length || 0})` : scope === 'CLASS' ? 'Per Kelas Tunggal' : scope === 'MULTI_CLASS' ? `Pilih Kelas (${selectedClassIds.length}/${classes?.length || 0})` : 'Per Angkatan / Tingkat'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {hasPresetStudents && (
                      <SelectItem value="STUDENTS">Siswa Terpilih ({studentIds?.length})</SelectItem>
                    )}
                    <SelectItem value="CLASS">Per Kelas Tunggal</SelectItem>
                    <SelectItem value="MULTI_CLASS">Pilih Beberapa Kelas (Multi-Select)</SelectItem>
                    <SelectItem value="GRADE">Per Angkatan / Tingkat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pilihan Kelas Tunggal atau Tingkat (Bila bukan Multi-Class) */}
              {scope === 'CLASS' ? (
                <div className="flex flex-col justify-between">
                  <div className="h-5 flex items-center mb-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pilih Kelas</Label>
                  </div>
                  <Select value={classId} onValueChange={(v) => { if (v) setClassId(v) }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih kelas...">
                        {classes.find(c => c.id === classId)?.name || 'Pilih kelas...'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (scope === 'GRADE' || scope === 'STUDENTS') ? (
                <div className="flex flex-col justify-between">
                  <div className="h-5 flex items-center mb-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">{scope === 'STUDENTS' ? 'Tarif Tingkat' : 'Tingkat / Angkatan'}</Label>
                  </div>
                  <Select value={gradeLevel.toString()} onValueChange={(v) => { if (v) setGradeLevel(parseInt(v)) }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
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
              ) : null}

              {/* Pilihan Semester jika Mode Semester Aktif */}
              {releaseDuration === 'SEMESTER' && (
                <div className="flex flex-col justify-between">
                  <div className="h-5 flex items-center mb-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Pilih Semester</Label>
                  </div>
                  <Select value={targetSemester.toString()} onValueChange={(v) => setTargetSemester(Number(v) as 1 | 2)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue>
                        {targetSemester === 1 ? 'Semester 1 (Ganjil: Jul-Des)' : 'Semester 2 (Genap: Jan-Jun)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1 (Ganjil: Jul - Des)</SelectItem>
                      <SelectItem value="2">Semester 2 (Genap: Jan - Jun)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bulan & Tahun Awal Mulai Tagihan */}
              <div className="flex flex-col justify-between">
                <div className="h-5 flex items-center mb-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Bulan Awal Mulai</Label>
                </div>
                <Select value={sppStartMonth.toString()} onValueChange={(v) => setSppStartMonth(Number(v))}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
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
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tahun Ajaran / Awal</Label>
                  <button
                    type="button"
                    onClick={() => setIsManualAcademicYear(!isManualAcademicYear)}
                    className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
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
                    className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                ) : (
                  <Select value={startYear.toString()} onValueChange={(v) => {
                    if (v) {
                      const y = parseInt(v)
                      setStartYear(y)
                      setCustomAcademicYear(`${y}/${y + 1}`)
                    }
                  }}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 font-medium text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800">
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

            {/* Dedicated Expansive Area untuk Multi-Class Selection */}
            {scope === 'MULTI_CLASS' && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Pilihan Kelas Terpilih
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {selectedClassIds.length} dari {classes.length} Kelas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds(classes.map(c => c.id))}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40"
                    >
                      Pilih Semua Kelas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedClassIds([])}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:underline px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800"
                    >
                      Batal Semua
                    </button>
                  </div>
                </div>

                {/* Grid Kelas Luas & Rapi (Auto-fill responsif) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                  {classes.map(c => {
                    const isChecked = selectedClassIds.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedClassIds(prev => prev.filter(id => id !== c.id))
                          } else {
                            setSelectedClassIds(prev => [...prev, c.id])
                          }
                        }}
                        className={`text-xs px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-left ${
                          isChecked
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-semibold shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Banner Periode Terpilih */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Rentang Tagihan: <strong className="font-bold text-blue-700 dark:text-blue-300">{sppRangePreview}</strong>
              </span>
              <span className="font-medium text-slate-500 dark:text-slate-400 text-xs">
                Tahun Ajaran: <strong className="text-blue-600 dark:text-blue-400 font-bold">{customAcademicYear || `${startYear}/${startYear + 1}`}</strong>
              </span>
            </div>
          </div>

          {/* Rincian Komponen Biaya 1 Tahun */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                2. Komponen & Tarif Biaya Resmi 1 Tahun
              </Label>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Total Estimasi Paket: <strong className="font-bold">{currency(totalPerTahun)}</strong> / siswa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* SPP Bulanan (12 Bulan atau 6 Bulan Semester) */}
              <div className={`p-4 rounded-xl border transition-all space-y-3 ${
                includeSpp
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeSpp} onChange={(e) => setIncludeSpp(e.target.checked)} className="rounded text-blue-600" />
                    SPP ({sppMonthsCount} Bln {releaseDuration === 'SEMESTER' ? `Sem. ${targetSemester === 1 ? 'Ganjil' : 'Genap'}` : 'Sekaligus'})
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">Bulanan</span>
                </div>
                
                <div>
                  <span className="text-[10px] font-medium text-slate-500 mb-1 block">Tarif Per Bulan (Default)</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                    <Input
                      type="number"
                      disabled={!includeSpp}
                      value={sppMonthly || ''}
                      onChange={(e) => setSppMonthly(Number(e.target.value))}
                      className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-tight">
                    Periode: <strong className="font-semibold text-blue-600 dark:text-blue-400">{sppRangePreview}</strong> ({sppMonthsCount} Bln = {currency(sppMonthly * sppMonthsCount)})
                  </p>
                </div>
              </div>

              {/* DPP Tahunan */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeDpp
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeDpp} onChange={(e) => setIncludeDpp(e.target.checked)} className="rounded text-blue-600" />
                    DPP (Dana Pengembangan)
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">Setahun</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeDpp}
                    value={dppAmount || ''}
                    onChange={(e) => setDppAmount(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Wajib tuntas dalam 1 tahun ajaran.</p>
              </div>

              {/* UIS (Infaq Sekolah) */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeUis
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeUis} onChange={(e) => setIncludeUis(e.target.checked)} className="rounded text-blue-600" />
                    UIS (Uang Infaq Sekolah)
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">Setahun</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUis}
                    value={uisAmount || ''}
                    onChange={(e) => setUisAmount(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Infaq sarana & prasarana sekolah.</p>
              </div>

              {/* UKA (Kegiatan Akademik) */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeUka
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeUka} onChange={(e) => setIncludeUka(e.target.checked)} className="rounded text-blue-600" />
                    UKA (Kegiatan Akademik)
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">UTS/UAS/Outdoor</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUka}
                    value={ukaAmount || ''}
                    onChange={(e) => setUkaAmount(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500">UTS, UAS, Outdoor, Fortasi, HW, UTBK.</p>
              </div>

              {/* UKS (Kegiatan Sekolah) */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeUks
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeUks} onChange={(e) => setIncludeUks(e.target.checked)} className="rounded text-blue-600" />
                    UKS (Kegiatan Sekolah)
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">OSIS/PHBI/Wisuda</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeUks}
                    value={uksAmount || ''}
                    onChange={(e) => setUksAmount(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-500">OSIS, PHBI, Asuransi, Kalender, Wisuda.</p>
              </div>

              {/* Seragam (Khusus Kls 10) */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeSeragam
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeSeragam} onChange={(e) => setIncludeSeragam(e.target.checked)} className="rounded text-blue-600" />
                    Seragam (Khusus Kelas X)
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">Paket Masuk</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-[10px] font-medium text-slate-500">Putra (Rp)</span>
                    <Input
                      type="number"
                      disabled={!includeSeragam}
                      value={seragamPutraAmount || ''}
                      onChange={(e) => setSeragamPutraAmount(Number(e.target.value))}
                      className="h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-500">Putri (Rp)</span>
                    <Input
                      type="number"
                      disabled={!includeSeragam}
                      value={seragamPutriAmount || ''}
                      onChange={(e) => setSeragamPutriAmount(Number(e.target.value))}
                      className="h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* LKS / Buku */}
              <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                includeLks
                  ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-xs ring-1 ring-blue-500/20'
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-60'
              }`}>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900 dark:text-slate-100">
                    <input type="checkbox" checked={includeLks} onChange={(e) => setIncludeLks(e.target.checked)} className="rounded text-blue-600" />
                    LKS & Buku Modul
                  </label>
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">Fleksibel</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                  <Input
                    type="number"
                    disabled={!includeLks}
                    value={lksAmount || ''}
                    placeholder="Nominal LKS..."
                    onChange={(e) => setLksAmount(Number(e.target.value))}
                    className="pl-8 h-9 text-xs font-semibold bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <Select disabled={!includeLks} value={lksPeriod} onValueChange={(v: any) => setLksPeriod(v)}>
                    <SelectTrigger className="bg-white dark:bg-slate-950 h-8 text-[11px] font-medium rounded-lg border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
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
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100">Proteksi Anti-Duplikasi Otomatis Aktif</p>
                <p className="leading-relaxed text-[11px] text-slate-600 dark:text-slate-400">
                  Sistem otomatis mendeteksi tagihan yang sudah ada sebelumnya. Tagihan yang sudah terbit atau lunas <strong>tidak akan diduplikasi/ditimpa</strong> dan langsung dilewati (skip).
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Catatan Rilis (Opsional)</Label>
              <Input
                placeholder="Misal: Rilis Tagihan Resmi Ajaran 2025/2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          {scope !== 'STUDENTS' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => { setResetModalOpen(true); setResetPassword(''); setResetError(''); }}
            className="h-10 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-semibold gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            {releaseDuration === 'SEMESTER' ? `Reset Rilis Semester ${targetSemester === 1 ? 'Ganjil' : 'Genap'}` : 'Reset Rilis Tagihan Tahunan'}
          </Button>
          ) : <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Target: <strong className="text-blue-600 dark:text-blue-400">{studentIds?.length || 0} siswa</strong> terpilih</span>}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOverrideModalOpen(true); setOverridePassword(''); setOverrideError(''); }}
              className="h-10 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl font-semibold gap-1.5 text-xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Otorisasi Perbarui Duplikat
            </Button>
            <Button
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs gap-2 text-xs sm:text-sm px-4"
              disabled={releaseMut.isPending}
              onClick={() => releaseMut.mutate({ override: false })}
            >
              {releaseMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {releaseDuration === 'SEMESTER' ? `Rilis Tagihan Semester ${targetSemester === 1 ? 'Ganjil' : 'Genap'}` : 'Rilis Tagihan 1 Tahun'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* MODAL OTORISASI PERBARUI DUPLIKAT TAGIHAN */}
    <Dialog open={overrideModalOpen} onOpenChange={(v) => { if (!v) { setOverrideModalOpen(false); setOverridePassword(''); setOverrideError(''); } }}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              Otorisasi Pembaruan Tagihan Duplikat
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Perbarui tagihan yang sudah ada sebelumnya dengan tarif baru (khusus tagihan yang belum lunas).
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); releaseMut.mutate({ override: true, password: overridePassword }); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Ketentuan Otorisasi Pembaruan
              </p>
              <p className="leading-relaxed">
                Tindakan ini akan <strong>menyesuaikan nominal tarif baru</strong> pada tagihan siswa yang terdeteksi duplikat, namun <u>tagihan yang sudah LUNAS tetap dilindungi</u> dan tidak akan diubah.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Password Akun Keuangan <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                <PasswordInput
                  placeholder="Masukkan password akun keuangan Anda..."
                  value={overridePassword}
                  onChange={(e) => { setOverridePassword(e.target.value); setOverrideError(''); }}
                  className="pl-9 h-10 bg-white dark:bg-slate-950 font-medium rounded-xl border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              {overrideError && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{overrideError}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOverrideModalOpen(false)} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={releaseMut.isPending || !overridePassword}
              className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm"
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
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              Otorisasi Reset Rilis Tagihan
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Hapus seluruh tagihan 1 tahun ajaran ({startYear}/{startYear + 1}) sesuai sasaran yang dipilih.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); resetYearlyMut.mutate(); }} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-sm text-rose-800 dark:text-rose-300">
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

            <div className="flex items-center gap-2.5 p-3 bg-slate-50/70 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="resetOnlyUnpaid"
                checked={resetOnlyUnpaid}
                onChange={(e) => setResetOnlyUnpaid(e.target.checked)}
                className="rounded text-rose-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="resetOnlyUnpaid" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                Hanya reset tagihan yang <u>BELUM LUNAS</u> (Lindungi tagihan yang sudah lunas).
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Password Akun Keuangan <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                <PasswordInput
                  placeholder="Masukkan password akun keuangan Anda..."
                  value={resetPassword}
                  onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
                  className="pl-9 h-10 bg-white dark:bg-slate-950 font-medium rounded-xl border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              {resetError && (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{resetError}</p>
              )}
            </div>
          </div>

          <div className="shrink-0 p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setResetModalOpen(false)} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={resetYearlyMut.isPending || !resetPassword}
              className="h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm"
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
  const [selectedTagihanIds, setSelectedTagihanIds] = useState<string[]>([])
  
  // Per-tagihan configuration: { [tagihanId]: { payType: 'FULL' | 'ANGSURAN', amount: string, discountPct: number, discountReason: string } }
  const [tagihanConfigs, setTagihanConfigs] = useState<Record<string, {
    payType: 'FULL' | 'ANGSURAN';
    amount: string;
    discountPct: number;
    discountReason: string;
  }>>({})

  const [cashNotes, setCashNotes] = useState('Pembayaran Tunai Kasir Keuangan')

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

  // Helper untuk mendapatkan sisa tagihan asli & setelah diskon
  const getTagihanCalculations = (t: any) => {
    const config = tagihanConfigs[t.id] || { payType: 'FULL', amount: '', discountPct: 0, discountReason: '' }
    const paid = t.amountPaid || 0
    let origAmount = t.amount
    const discountMatch = t.notes?.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
    if (discountMatch) {
      try {
        const info = JSON.parse(discountMatch[1])
        origAmount = info.originalAmount || t.amount
      } catch {}
    }
    const discountAmt = config.discountPct > 0 ? Math.round(origAmount * (config.discountPct / 100)) : 0
    const finalAmount = config.discountPct > 0 ? origAmount - discountAmt : t.amount
    const remainingBeforePay = Math.max(0, finalAmount - paid)
    
    let payVal = 0
    if (config.payType === 'FULL') {
      payVal = remainingBeforePay
    } else {
      payVal = parseFloat(config.amount) || 0
    }
    const remainingAfterPay = Math.max(0, remainingBeforePay - payVal)

    return {
      origAmount,
      paid,
      discountAmt,
      discountPct: config.discountPct,
      discountReason: config.discountReason,
      finalAmount,
      remainingBeforePay,
      payVal,
      payType: config.payType,
      remainingAfterPay,
      isInfaq: t.type.toLowerCase() === 'infaq',
    }
  }

  const handleToggleTagihan = (tagihanId: string) => {
    setSelectedTagihanIds(prev => {
      const exists = prev.includes(tagihanId)
      if (exists) {
        return prev.filter(id => id !== tagihanId)
      } else {
        const t = activeTagihans.find(item => item.id === tagihanId)
        if (t && !tagihanConfigs[tagihanId]) {
          const paid = t.amountPaid || 0
          const remaining = Math.max(0, t.amount - paid)
          setTagihanConfigs(c => ({
            ...c,
            [tagihanId]: {
              payType: 'FULL',
              amount: remaining.toString(),
              discountPct: 0,
              discountReason: '',
            }
          }))
        }
        return [...prev, tagihanId]
      }
    })
  }

  const handleSelectAllTagihans = () => {
    if (selectedTagihanIds.length === activeTagihans.length) {
      setSelectedTagihanIds([])
    } else {
      const allIds = activeTagihans.map(t => t.id)
      const newConfigs = { ...tagihanConfigs }
      activeTagihans.forEach(t => {
        if (!newConfigs[t.id]) {
          const paid = t.amountPaid || 0
          const remaining = Math.max(0, t.amount - paid)
          newConfigs[t.id] = {
            payType: 'FULL',
            amount: remaining.toString(),
            discountPct: 0,
            discountReason: '',
          }
        }
      })
      setTagihanConfigs(newConfigs)
      setSelectedTagihanIds(allIds)
    }
  }

  const updateTagihanConfig = (tagihanId: string, updates: Partial<{
    payType: 'FULL' | 'ANGSURAN';
    amount: string;
    discountPct: number;
    discountReason: string;
  }>) => {
    setTagihanConfigs(prev => {
      const current = prev[tagihanId] || {
        payType: 'FULL',
        amount: '',
        discountPct: 0,
        discountReason: '',
      }
      return {
        ...prev,
        [tagihanId]: {
          ...current,
          ...updates,
        }
      }
    })
  }

  const setAllSelectedPayType = (type: 'FULL' | 'ANGSURAN') => {
    setTagihanConfigs(prev => {
      const next = { ...prev }
      selectedTagihanIds.forEach(id => {
        const t = activeTagihans.find(item => item.id === id)
        const current = next[id] || { payType: 'FULL', amount: '', discountPct: 0, discountReason: '' }
        if (t && t.type.toLowerCase() === 'infaq') {
          next[id] = { ...current, payType: 'FULL' }
          return
        }
        if (type === 'FULL') {
          const paid = t?.amountPaid || 0
          const remaining = Math.max(0, (t?.amount || 0) - paid)
          next[id] = { ...current, payType: 'FULL', amount: remaining.toString() }
        } else {
          const paid = t?.amountPaid || 0
          const remaining = Math.max(0, (t?.amount || 0) - paid)
          next[id] = { ...current, payType: 'ANGSURAN', amount: current.amount || Math.round(remaining / 2).toString() }
        }
      })
      return next
    })
  }

  // Ringkasan Total Pembayaran dari semua tagihan yang dipilih
  const totalPaymentSummary = useMemo(() => {
    let totalNominalBayar = 0
    let totalSisaAwal = 0
    let totalSisaAkhir = 0
    let isValid = selectedTagihanIds.length > 0

    selectedTagihanIds.forEach(id => {
      const t = activeTagihans.find(item => item.id === id)
      if (t) {
        const calc = getTagihanCalculations(t)
        totalNominalBayar += calc.payVal
        totalSisaAwal += calc.remainingBeforePay
        totalSisaAkhir += calc.remainingAfterPay
        if (calc.payVal <= 0 || calc.payVal > calc.remainingBeforePay) {
          isValid = false
        }
      }
    })

    return {
      count: selectedTagihanIds.length,
      totalNominalBayar,
      totalSisaAwal,
      totalSisaAkhir,
      isValid,
    }
  }, [selectedTagihanIds, tagihanConfigs, activeTagihans])

  const payMut = useMutation({
    mutationFn: async () => {
      const payments = selectedTagihanIds.map(id => {
        const t = activeTagihans.find(item => item.id === id)!
        const calc = getTagihanCalculations(t)
        const itemPayload: any = {
          tagihanId: id,
          paymentAmount: calc.payVal,
          notes: cashNotes,
        }
        if (calc.discountPct > 0) {
          itemPayload.beasiswaPercentage = calc.discountPct
          itemPayload.beasiswaReason = calc.discountReason || 'Beasiswa Kasir Keuangan'
        }
        return itemPayload
      })

      const res = await authenticatedFetch(`/api-backend/finance/tagihan/batch-lunasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments,
          globalNotes: cashNotes,
        }),
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
        title: data?.allLunas ? 'Pelunasan Multi Tagihan Berhasil!' : 'Pembayaran Berhasil Dicatat!',
        text: data?.message || 'Pembayaran tunai berhasil dicatat.',
        icon: 'success',
        confirmButtonColor: '#059669',
      })
      onClose()
      setStudentSearch('')
      setSelectedStudentId('')
      setSelectedTagihanIds([])
      setTagihanConfigs({})
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
      <DialogContent className="max-w-[96vw] md:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Fixed Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              Input Pembayaran Tunai (Kasir Keuangan)
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Pencatatan langsung multi pembayaran tunai dengan fleksibilitas bayar penuh atau mengangsur per tagihan.
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
                    onClick={() => { 
                      setSelectedStudentId(''); 
                      setStudentSearch(''); 
                      setSelectedTagihanIds([]); 
                      setTagihanConfigs({}); 
                    }} 
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
                            setSelectedTagihanIds([])
                            setTagihanConfigs({})
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

          {/* STEP 2: PILIH MULTI TAGIHAN SISWA */}
          {selectedStudentId && (
            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    2. Pilih Tagihan Yang Ingin Dibayar
                  </Label>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-full border border-emerald-300 dark:border-emerald-800">
                    {selectedTagihanIds.length} Terpilih
                  </span>
                </div>
                {activeTagihans.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllTagihans}
                      className="h-7 text-[11px] font-bold rounded-lg border-slate-300 dark:border-slate-700"
                    >
                      {selectedTagihanIds.length === activeTagihans.length ? 'Batalkan Semua' : 'Pilih Semua Tagihan'}
                    </Button>
                    {selectedTagihanIds.length > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAllSelectedPayType('FULL')}
                          className="h-7 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded-lg"
                        >
                          Set Semua Bayar Penuh
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAllSelectedPayType('ANGSURAN')}
                          className="h-7 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded-lg"
                        >
                          Set Semua Mengangsur
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

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
                    const isSelected = selectedTagihanIds.includes(t.id)
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleTagihan(t.id)}
                        className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected 
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-500 shadow-sm ring-2 ring-emerald-500/25' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer pointer-events-none"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-700'}`}>
                                  {t.type}
                                </span>
                                {t.month && t.year && (
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                                    {MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${t.status === 'ANGSURAN' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {t.status === 'ANGSURAN' ? 'Angsuran' : 'Belum Lunas'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
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

          {/* STEP 3: DETAIL RINCIAN PEMBAYARAN MULTI TAGIHAN DENGAN PILIHAN BAYAR PENUH / MENGANGSUR */}
          {selectedTagihanIds.length > 0 && (
            <div className="space-y-4 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <Label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  3. Pengaturan Pembayaran per Tagihan ({selectedTagihanIds.length} Tagihan)
                </Label>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  Total Bayar: {currency(totalPaymentSummary.totalNominalBayar)}
                </span>
              </div>

              <div className="space-y-3">
                {selectedTagihanIds.map((tagihanId, idx) => {
                  const t = activeTagihans.find(item => item.id === tagihanId)
                  if (!t) return null
                  const calc = getTagihanCalculations(t)
                  const cfg = tagihanConfigs[tagihanId] || { payType: 'FULL', amount: '', discountPct: 0, discountReason: '' }

                  return (
                    <div
                      key={tagihanId}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-700'}`}>
                              {t.type}
                            </span>
                            {t.month && t.year && (
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1.5">
                                {MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pilihan Bayar Penuh vs Mengangsur */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => {
                              updateTagihanConfig(tagihanId, {
                                payType: 'FULL',
                                amount: calc.remainingBeforePay.toString(),
                              })
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                              cfg.payType === 'FULL'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Bayar Penuh (Lunas)
                          </button>
                          <button
                            type="button"
                            disabled={calc.isInfaq}
                            onClick={() => {
                              updateTagihanConfig(tagihanId, {
                                payType: 'ANGSURAN',
                                amount: cfg.amount || Math.round(calc.remainingBeforePay / 2).toString(),
                              })
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                              calc.isInfaq 
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : cfg.payType === 'ANGSURAN'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            <Clock className="w-3 h-3" /> Mengangsur
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        {/* Diskon Kasir */}
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Percent className="w-3 h-3 text-amber-600" /> Diskon Kasir
                          </Label>
                          <Select
                            value={cfg.discountPct.toString()}
                            onValueChange={(v) => {
                              const pct = parseInt(v || '0', 10)
                              updateTagihanConfig(tagihanId, { discountPct: pct })
                            }}
                          >
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-900 h-9 font-bold text-xs rounded-xl border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Pilih diskon" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0% (Tanpa Diskon)</SelectItem>
                              <SelectItem value="25">25% Diskon</SelectItem>
                              <SelectItem value="50">50% Diskon</SelectItem>
                              <SelectItem value="75">75% Diskon</SelectItem>
                              <SelectItem value="100">100% Bebas Biaya</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Input Nominal Pembayaran */}
                        <div className="sm:col-span-5 space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                              Nominal Dibayar (Rp)
                            </Label>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Sisa: {currency(calc.remainingBeforePay)}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">Rp</span>
                            <Input
                              type="number"
                              disabled={cfg.payType === 'FULL' || calc.isInfaq}
                              value={cfg.payType === 'FULL' ? calc.remainingBeforePay.toString() : cfg.amount}
                              onChange={(e) => {
                                updateTagihanConfig(tagihanId, { amount: e.target.value })
                              }}
                              className="pl-8.5 h-9 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white rounded-xl border-slate-200 dark:border-slate-800 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        {/* Status Kalkulasi Item */}
                        <div className="sm:col-span-3 pb-1 text-right">
                          <p className="text-[10px] text-slate-400 font-medium">Status Item</p>
                          {calc.remainingAfterPay === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Lunas ({currency(calc.payVal)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400">
                              <Clock className="w-3 h-3" /> Angsuran ({currency(calc.payVal)})
                            </span>
                          )}
                        </div>
                      </div>

                      {cfg.discountPct > 0 && (
                        <Input
                          placeholder="Alasan Diskon / Beasiswa..."
                          value={cfg.discountReason}
                          onChange={(e) => updateTagihanConfig(tagihanId, { discountReason: e.target.value })}
                          className="bg-slate-50 dark:bg-slate-900 text-xs h-8 rounded-xl border-slate-200 dark:border-slate-800"
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* PRATINJAU TOTAL MULTI PEMBAYARAN KASIR */}
              <div className="bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/60 p-3.5 sm:p-4 rounded-xl space-y-2 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
                <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                  <span>Pratinjau Total Kuitansi Multi Pembayaran</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[10px]">
                    {selectedTagihanIds.length} Tagihan Terpilih
                  </span>
                </p>

                <div className="space-y-1 pt-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Sisa Tagihan Dipilih:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currency(totalPaymentSummary.totalSisaAwal)}</span>
                  </div>

                  <div className="flex justify-between font-black text-emerald-700 dark:text-emerald-400 text-sm sm:text-base pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Total Yang Akan Dibayarkan Tunai:</span>
                    <span>{currency(totalPaymentSummary.totalNominalBayar)}</span>
                  </div>

                  <div className="flex justify-between items-center font-bold text-xs pt-1">
                    <span className="text-slate-600 dark:text-slate-400">Sisa Tagihan Setelah Pembayaran Ini:</span>
                    <span className={totalPaymentSummary.totalSisaAkhir === 0 ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}>
                      {currency(totalPaymentSummary.totalSisaAkhir)} {totalPaymentSummary.totalSisaAkhir === 0 ? '(LUNAS SEMUA)' : '(MASIH ADA SISA)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan / Kuitansi Global */}
              <div className="space-y-1">
                <Label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Catatan / Nomor Kuitansi Kasir (Opsional)
                </Label>
                <Input
                  placeholder="Misal: KWT-KASIR/#1024 - Tunai Kasir Keuangan"
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Sticky Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 font-semibold w-full sm:w-auto text-center sm:text-left">
            {selectedTagihanIds.length > 0 ? (
              <span>
                <strong className="text-slate-900 dark:text-white">{selectedTagihanIds.length}</strong> tagihan dipilih · Total: <strong className="text-emerald-600 dark:text-emerald-400 font-black">{currency(totalPaymentSummary.totalNominalBayar)}</strong>
              </span>
            ) : (
              <span>Pilih satu atau beberapa tagihan untuk melanjutkan pembayaran.</span>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl font-semibold border-slate-300 dark:border-slate-700 text-xs">
              Batal
            </Button>
            <Button
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md gap-2 text-xs"
              disabled={!totalPaymentSummary.isValid || totalPaymentSummary.totalNominalBayar <= 0 || payMut.isPending}
              onClick={() => payMut.mutate()}
            >
              {payMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Simpan Pembayaran Tunai ({selectedTagihanIds.length})
            </Button>
          </div>
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
  const [examCardModalOpen, setExamCardModalOpen] = useState(false)
  const [sklModalOpen, setSklModalOpen] = useState(false)
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

  // Bulk (multi-select) Set Beasiswa & Set Tagihan
  const [bulkBeasiswaOpen, setBulkBeasiswaOpen] = useState(false)
  const [bulkSeragamPct, setBulkSeragamPct] = useState<number>(0)
  const [bulkSppPct, setBulkSppPct] = useState<number>(0)
  const [bulkDppPct, setBulkDppPct] = useState<number>(0)
  const [bulkReason, setBulkReason] = useState<string>('')
  const [bulkTagihanOpen, setBulkTagihanOpen] = useState(false)

  const openBulkBeasiswa = () => {
    setBulkSeragamPct(0); setBulkSppPct(0); setBulkDppPct(0); setBulkReason('')
    setBulkBeasiswaOpen(true)
  }

  const bulkBeasiswaMut = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/students/bulk-beasiswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          beasiswaSeragamPct: bulkSeragamPct,
          beasiswaSppPct: bulkSppPct,
          beasiswaDppPct: bulkDppPct,
          beasiswaPercentage: bulkSppPct,
          beasiswaReason: bulkReason,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Gagal mengatur beasiswa massal')
      }
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      qc.invalidateQueries({ queryKey: ['student-tagihan'] })
      setBulkBeasiswaOpen(false)
      setSelectedStudentIds([])
      Swal.fire({
        title: 'Beasiswa Diterapkan!',
        text: data.message || 'Beasiswa siswa terpilih berhasil disimpan.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

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

  const [filterActive, setFilterActive] = useState<'AKTIF' | 'ARSIP' | 'ALL'>('AKTIF')

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })
      if (!res.ok) throw new Error('Gagal memperbarui status keaktifan siswa')
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      if (selectedStudent) {
        qc.invalidateQueries({ queryKey: ['student-tagihan', selectedStudent.id] })
      }
      Swal.fire({
        title: 'Status Keaktifan Diperbarui',
        text: `Status peserta didik berhasil di-${variables.isActive ? 'aktifkan' : 'nonaktifkan'}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal mengubah status keaktifan siswa', 'error')
    }
  })

  const bulkToggleActiveMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const res = await authenticatedFetch(`/api-backend/students/bulk-toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isActive })
      })
      if (!res.ok) throw new Error('Gagal memperbarui status keaktifan siswa massal')
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['finance-students'] })
      setSelectedStudentIds([])
      Swal.fire({
        title: 'Status Keaktifan Massal Diperbarui',
        text: `${variables.ids.length} peserta didik berhasil di-${variables.isActive ? 'aktifkan' : 'nonaktifkan'}.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal', err.message || 'Gagal mengubah status keaktifan massal', 'error')
    }
  })

  // Pagination state for ultra-smooth rendering with large datasets (Optimized for 2GB RAM devices)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(15)

  const { data: students = [], isLoading } = useQuery<StudentSummary[]>({
    queryKey: ['finance-students'],
    queryFn: () => authenticatedQuery('/api-backend/finance/students'),
    staleTime: 30000,
    refetchOnWindowFocus: false,
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
    staleTime: 10000,
  })

  const activeCount = useMemo(() => students.filter(s => s.isActive !== false).length, [students])
  const archiveCount = useMemo(() => students.filter(s => s.isActive === false).length, [students])

  const filtered = useMemo(() =>
    students.filter(s =>
      (!filterKelas || s.className === filterKelas) &&
      (filterActive === 'ALL'
        ? true
        : filterActive === 'AKTIF'
        ? s.isActive !== false
        : s.isActive === false) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.nisn.includes(search) || s.nis.includes(search) ||
        s.className.toLowerCase().includes(search.toLowerCase()))
    ), [students, search, filterKelas, filterActive])

  // Reset current page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterKelas, filterActive, pageSize])

  // Paginated students slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filtered.slice(startIdx, startIdx + pageSize)
  }, [filtered, currentPage, pageSize])

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
    const data = filtered.map((s, i) => {
      const statusInfo = getFinanceStudentStatus(s)
      return {
        No: i + 1,
        Nama: s.name,
        NISN: s.nisn,
        NIS: s.nis,
        Kelas: s.className,
        'Status Keaktifan': statusInfo.label,
        'Total Tagihan (Rp)': s.totalTagihan,
        'Total Lunas (Rp)': s.totalLunas,
        'Sisa (Rp)': s.totalTagihan - s.totalLunas,
        'Belum Lunas': s.belumLunasCount,
        'SPP Lunas': `${s.sppLunasCount}/12`,
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tagihan Siswa')
    XLSX.writeFile(wb, `Tagihan_Siswa_${filterActive}.xlsx`)
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
      {/* Sub-Tab Switcher: Siswa Aktif vs Arsip Keuangan Siswa (Lulus/Alumni/Keluar/Nonaktif) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterActive('AKTIF')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterActive === 'AKTIF'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Siswa Aktif</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-black">
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterActive('ARSIP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterActive === 'ARSIP'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs ring-1 ring-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            <span>Arsip Keuangan Siswa (Lulus / Alumni / Nonaktif)</span>
            <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-full text-[10px] font-black">
              {archiveCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterActive('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterActive === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Semua Siswa</span>
            <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-black">
              {students.length}
            </span>
          </button>
        </div>

        {filterActive === 'ARSIP' && (
          <div className="text-[11px] text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 font-medium">
            💡 Seluruh riwayat tagihan, cicilan, dan pembayaran siswa lulus/alumni tetap tersimpan permanen.
          </div>
        )}
      </div>

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
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Terfilter</span>
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

      {/* Toolbar / Search & Actions Filter (Rule 16: Searchbar & Filter Bersebelahan) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[220px]">
          <div className="relative flex-1 min-w-[130px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Cari nama, NISN, NIS, kelas..."
              className="pl-7.5 h-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(!v || v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[110px] sm:w-[125px] h-8 font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg shrink-0">
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
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-8 px-2 sm:px-2.5 text-xs font-bold rounded-lg shadow-xs touch-manipulation">
                <Layers className="w-3.5 h-3.5" /> <span>Rilis Th / Sem</span>
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
                className="border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-8 px-2 sm:px-2.5 text-xs font-bold rounded-lg shadow-xs gap-1 touch-manipulation"
                title={filterKelas ? `Reset Tagihan untuk Kelas ${filterKelas} (${filtered.length} Siswa)` : `Reset Tagihan Seluruh Siswa Terfilter (${filtered.length} Siswa)`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>{filterKelas ? `Reset ${filterKelas}` : search ? `Reset (${filtered.length})` : 'Reset'}</span>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setExamCardModalOpen(true)}
            className="border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/50 h-8 px-2 sm:px-2.5 text-xs font-bold rounded-lg shadow-xs gap-1 touch-manipulation"
            title="Cetak Kartu Peserta Ujian Siswa (STS / SAS / SAT / CBT)">
            <CreditCard className="w-3.5 h-3.5 text-pink-600" /> <span>Kartu Ujian</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setSklModalOpen(true)}
            className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 h-8 px-2 sm:px-2.5 text-xs font-bold rounded-lg shadow-xs gap-1 touch-manipulation"
            title="Cetak Surat Keterangan Lulus & Bebas Keuangan (SKL)">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> <span>SKL</span>
          </Button>
          <Button variant="outline" onClick={handleExportRekapKelas}
            className="border-indigo-200 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 h-8 px-2 text-xs font-bold rounded-lg touch-manipulation"
            title="Eksport Excel Rekap Keuangan Per Kelas">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> <span>Excel</span>
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-8 px-2 text-xs font-bold rounded-lg touch-manipulation"
            title="Export Seluruh Data">
            <Download className="w-3.5 h-3.5" /> <span>Export</span>
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

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              onClick={openBulkBeasiswa}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1 h-7.5 px-2.5 rounded-lg shadow-xs"
              title="Set Beasiswa untuk siswa terpilih"
            >
              <Percent className="w-3.5 h-3.5" />
              Set Beasiswa
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkTagihanOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1 h-7.5 px-2.5 rounded-lg shadow-xs"
              title="Set Tagihan 1 tahun untuk siswa terpilih"
            >
              <Layers className="w-3.5 h-3.5" />
              Set Tagihan
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const nextIsActive = filterActive === 'ARSIP' ? true : false
                bulkToggleActiveMutation.mutate({ ids: selectedStudentIds, isActive: nextIsActive })
              }}
              disabled={bulkToggleActiveMutation.isPending}
              className={`font-bold text-xs gap-1 h-7.5 px-2.5 rounded-lg shadow-xs text-white ${filterActive === 'ARSIP' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'}`}
            >
              {filterActive === 'ARSIP' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {filterActive === 'ARSIP' ? 'Aktifkan Kembali' : 'Arsipkan Siswa'}
            </Button>
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

      {/* Table - Responsive, Compact, Smooth Horizontal Scroll with High Precision */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0 max-w-full">
          <div className="overflow-x-auto custom-scrollbar w-full">
            <Table className="w-full text-xs min-w-[720px] sm:min-w-full border-collapse">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-[11px] select-none sticky top-0 z-10">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {!isKepalaSekolah && (
                    <TableHead className="w-9 sm:w-10 text-center px-1.5 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center touch-manipulation"
                        title={isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                      >
                        {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="w-10 sm:w-12 text-center py-2 px-1 whitespace-nowrap">No</TableHead>
                  <TableHead className="py-2 px-2.5 min-w-[170px] sm:min-w-[220px]">Nama Siswa</TableHead>
                  <TableHead className="w-24 sm:w-28 text-center py-2 px-1 whitespace-nowrap">Status Siswa</TableHead>
                  <TableHead className="w-24 sm:w-28 text-center py-2 px-1 whitespace-nowrap">Status Tagihan</TableHead>
                  <TableHead className="w-20 sm:w-24 text-center py-2 px-1 whitespace-nowrap">SPP Lunas</TableHead>
                  <TableHead className="w-28 sm:w-32 text-right py-2 px-2.5 whitespace-nowrap">Sisa Tagihan</TableHead>
                  <TableHead className="w-28 sm:w-32 text-center py-2 px-1.5 whitespace-nowrap sticky right-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs shadow-[-6px_0_10px_-3px_rgba(0,0,0,0.06)] z-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={!isKepalaSekolah ? 8 : 7} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-1.5" />
                      <p className="text-slate-500 text-[11px] font-medium">Memuat data tagihan siswa...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={!isKepalaSekolah ? 8 : 7} className="text-center py-10 text-slate-400 text-xs font-medium">
                      {search || filterKelas ? 'Tidak ada data siswa yang sesuai filter saat ini.' : 'Belum ada data tagihan siswa tercatat.'}
                    </TableCell>
                  </TableRow>
                ) : paginatedStudents.map((s, idx) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1;
                  const statusInfo = getFinanceStudentStatus(s);
                  return (
                    <TableRow key={s.id} className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${isChecked ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60'}`}>
                      {!isKepalaSekolah && (
                        <TableCell className="text-center px-1.5 py-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSelectStudent(s.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center justify-center touch-manipulation"
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="text-center text-slate-400 font-medium text-[11px] px-1 py-1.5 whitespace-nowrap">{displayIndex}</TableCell>
                      <TableCell className="py-1.5 px-2.5 min-w-[170px] sm:min-w-[220px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate" title={s.name}>{s.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-tight truncate mt-0.5">
                              NISN: {s.nisn || '-'} · <span className="font-semibold text-slate-600 dark:text-slate-300">{s.className}</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1 whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border inline-flex items-center gap-1 ${statusInfo.color}`}>
                          {statusInfo.status === 'AKTIF' ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1 whitespace-nowrap">
                        {s.belumLunasCount > 0
                          ? <span className="font-bold px-2 py-0.5 rounded-full text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 inline-block whitespace-nowrap">{s.belumLunasCount} Tagihan</span>
                          : <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS</span>
                        }
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1 whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] inline-block whitespace-nowrap ${s.sppLunasCount >= 12 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900' : s.sppLunasCount > 0 ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                          {s.sppLunasCount}/12 Bln
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900 dark:text-white text-xs py-1.5 px-2.5 whitespace-nowrap">
                        {s.sisaTagihan !== undefined && s.sisaTagihan > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-extrabold">{currency(s.sisaTagihan)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rp 0 (Lunas)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1.5 whitespace-nowrap sticky right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shadow-[-6px_0_10px_-3px_rgba(0,0,0,0.06)] z-20">
                        <div className="flex justify-center items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-[11px] gap-1 h-7 px-2 rounded-lg font-bold shadow-2xs touch-manipulation"
                            onClick={() => openModal(s)}
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{isKepalaSekolah ? 'Detail' : 'Kelola'}</span>
                          </Button>
                          {!isKepalaSekolah && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title={s.isActive !== false ? 'Arsipkan / Nonaktifkan Siswa' : 'Aktifkan Siswa Kembali'}
                                className={`h-7 w-7 p-0 rounded-lg shadow-2xs touch-manipulation shrink-0 border ${
                                  s.isActive !== false
                                    ? 'border-slate-200 dark:border-slate-800 text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                }`}
                                onClick={() => {
                                  toggleActiveMutation.mutate({ id: s.id, isActive: s.isActive === false })
                                }}
                              >
                                {s.isActive !== false ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Reset Tagihan Siswa (Otorisasi Password)"
                                className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 h-7 w-7 p-0 rounded-lg shadow-2xs touch-manipulation shrink-0"
                                onClick={() => openResetModal([s.id])}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Toolbar */}
          {filtered.length > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] w-full sm:w-auto justify-between sm:justify-start">
                <span>
                  <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> dari <strong>{filtered.length}</strong> siswa
                </span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[10px] text-slate-400">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-7 px-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>

                  <span className="px-2.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RESTRICTED RESET PASSWORD AUTHORIZATION MODAL */}
      <Dialog open={resetAuthModalOpen} onOpenChange={(v) => { if (!v) closeResetAuthModal() }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                Otorisasi Reset Tagihan Siswa
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                Akses Terbatas. Diperlukan verifikasi password akun keuangan Anda.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); resetMut.mutate(); }} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-sm text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Peringatan Keamanan
                </p>
                <p className="leading-relaxed">
                  Tindakan ini akan mereset/menghapus <strong>seluruh tagihan dan riwayat pembayaran</strong> untuk <strong>{resetTargetStudentIds.length} siswa</strong> terpilih secara permanen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Password Akun Keuangan <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                  <PasswordInput
                    placeholder="Masukkan password akun Anda..."
                    value={authPassword}
                    onChange={(e) => { setAuthPassword(e.target.value); setAuthError(''); }}
                    className="pl-9 h-10 bg-white dark:bg-slate-950 font-medium rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
                {authError && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">{authError}</p>
                )}
              </div>
            </div>

            <div className="shrink-0 p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeResetAuthModal} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">
                Batal
              </Button>
              <Button type="submit" disabled={resetMut.isPending || !authPassword} className="h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm">
                {resetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Konfirmasi & Reset Tagihan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* BEASISWA DIALOG KEUANGAN */}
      <Dialog open={isBeasiswaDialogOpen} onOpenChange={setIsBeasiswaDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Percent className="w-5 h-5" />
                </div>
                Pengaturan Beasiswa Keuangan
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Atur alokasi persentase beasiswa untuk Seragam, SPP, & DPP.
              </DialogDescription>
            </DialogHeader>
          </div>

          {beasiswaTargetStudent && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 custom-scrollbar">
              <div className="bg-slate-50/70 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
                <p className="font-bold text-base text-slate-900 dark:text-slate-100">{beasiswaTargetStudent.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-semibold px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    Kelas: {beasiswaTargetStudent.className}
                  </span>
                  <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    Jalur: {beasiswaTargetStudent.jalurPendaftaran || 'Mandiri'}
                  </span>
                </div>
              </div>

              {/* Rincian Beasiswa Per Item */}
              <div className="space-y-4 bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Alokasi Beasiswa (%) Per Item:
                  </p>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? 'Seragam, SPP & DPP' : 'Hanya SPP & DPP'}
                  </span>
                </div>

                {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? (
                  <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Beasiswa Seragam (%)
                      </Label>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
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
                        className="bg-white dark:bg-slate-950 text-xs h-10 pr-9 font-semibold rounded-lg border-slate-200 dark:border-slate-800"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Bayar Netto: <strong className="text-emerald-600 font-semibold">{currency(2000000 * (1 - (beasiswaSeragamVal || 0) / 100))}</strong> (Default Rp 2.000.000)</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/50 flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Jalur Mandiri tidak berhak mendapat Beasiswa Seragam. (Berhak untuk SPP & DPP).</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Beasiswa SPP (%)
                      </Label>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
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
                        className="bg-white dark:bg-slate-950 text-xs h-10 pr-9 font-semibold rounded-lg border-slate-200 dark:border-slate-800"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        Beasiswa DPP (%)
                      </Label>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
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
                        className="bg-white dark:bg-slate-950 text-xs h-10 pr-9 font-semibold rounded-lg border-slate-200 dark:border-slate-800"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">Alasan / Catatan Beasiswa</Label>
                <Input
                  placeholder="Misal: Beasiswa Kader Persyarikatan / Prestasi / Bidikmisi"
                  value={beasiswaReason}
                  onChange={(e) => setBeasiswaReason(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs h-10 rounded-xl font-medium border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          )}

          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsBeasiswaDialogOpen(false)} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">
              Batal
            </Button>
            <Button
              type="button"
              className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm"
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
              Simpan Beasiswa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TagihanModal student={detailData ?? null} open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedStudent(null) }}
        onResetStudent={(id) => openResetModal([id])} />
      <ReleaseYearlyModal open={massalOpen} onClose={() => setMassalOpen(false)} classes={classes} />
      <ReleaseYearlyModal
        open={bulkTagihanOpen}
        onClose={() => setBulkTagihanOpen(false)}
        classes={classes}
        studentIds={bulkTagihanOpen ? selectedStudentIds : undefined}
      />

      {/* BULK SET BEASISWA DIALOG */}
      <Dialog open={bulkBeasiswaOpen} onOpenChange={setBulkBeasiswaOpen}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100 text-base sm:text-lg font-bold">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Percent className="w-5 h-5" />
                </div>
                Set Beasiswa Massal
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                Berlaku untuk {selectedStudentIds.length} siswa terpilih. Tagihan lunas tidak diubah.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); bulkBeasiswaMut.mutate() }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { label: 'Seragam (%)', val: bulkSeragamPct, set: setBulkSeragamPct },
                  { label: 'SPP (%)', val: bulkSppPct, set: setBulkSppPct },
                  { label: 'DPP (%)', val: bulkDppPct, set: setBulkDppPct },
                ] as const).map((f) => (
                  <div key={f.label} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{f.label}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={f.val || ''}
                        onChange={(e) => f.set(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="h-10 pr-8 font-semibold text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Beasiswa Seragam hanya berlaku bagi siswa non-Mandiri. Isi 0 untuk menghapus beasiswa.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Alasan / Catatan</Label>
                <Input
                  placeholder="Misal: Beasiswa Prestasi / Kader"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="shrink-0 p-4 sm:p-5 bg-slate-50/60 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBulkBeasiswaOpen(false)} className="h-10 rounded-xl font-medium border-slate-200 dark:border-slate-700">
                Batal
              </Button>
              <Button type="submit" disabled={bulkBeasiswaMut.isPending} className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs gap-1.5 text-xs sm:text-sm">
                {bulkBeasiswaMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
                Simpan ({selectedStudentIds.length})
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ManualCashPaymentModal open={cashModalOpen} onClose={() => setCashModalOpen(false)} students={students} />
      <ExamCardPrintDialog open={examCardModalOpen} onClose={() => setExamCardModalOpen(false)} classes={classes} />
      <SklPrintDialog open={sklModalOpen} onClose={() => setSklModalOpen(false)} classes={classes} />
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
    staleTime: 60000,
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
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: quarterlyData, isLoading: loadingQuarterly } = useQuery<any>({
    queryKey: ['quarterly-rekap', triwulanClassId, year, quarter],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/finance/rekap-quarterly?classId=${triwulanClassId}&year=${year}&quarter=${quarter}`)
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi triwulan')
      return res.json()
    },
    enabled: rekapMode === 'TRIWULAN' && !!triwulanClassId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
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
// TAB RIWAYAT PEMBAYARAN & ANGSURAN (Seluruh Transaksi Masuk)
// ============================================================
type PaymentTransactionItem = {
  id: string
  amount: number
  paymentDate: string
  notes: string | null
  studentId: string
  student: {
    id: string
    name: string
    nisn: string
    nis: string
    isActive?: boolean
    bioData?: string | null
    class?: { id: string; name: string }
  }
  tagihan?: {
    id: string
    type: string
    amount: number
    amountPaid: number
    status: string
    month: number | null
    year: number | null
    notes: string | null
  }
}

function TabRiwayatPembayaran() {
  const authenticatedQuery = useAuthenticatedQuery()
  const { isKepalaSekolah } = useKeuanganRole()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterStudentStatus, setFilterStudentStatus] = useState<'ALL' | 'AKTIF' | 'ARSIP'>('ALL')
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([])

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(15)

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const { data: payments = [], isLoading } = useQuery<PaymentTransactionItem[]>({
    queryKey: ['all-payments', filterType, filterStartDate, filterEndDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterType && filterType !== 'ALL') params.append('type', filterType)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      const q = params.toString() ? `?${params.toString()}` : ''
      return authenticatedQuery(`/api-backend/finance/payments${q}`)
    },
    staleTime: 20000,
    refetchOnWindowFocus: false,
  })

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const q = search.toLowerCase().trim()
      const studentName = p.student?.name || ''
      const studentNis = p.student?.nis || ''
      const studentNisn = p.student?.nisn || ''
      const className = p.student?.class?.name || ''
      const txId = p.id || ''
      const notes = p.notes || ''

      const matchesSearch = !q || (
        studentName.toLowerCase().includes(q) ||
        studentNis.includes(q) ||
        studentNisn.includes(q) ||
        className.toLowerCase().includes(q) ||
        txId.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      )

      const statusInfo = getFinanceStudentStatus(p.student)
      const matchesStudentStatus = filterStudentStatus === 'ALL'
        ? true
        : filterStudentStatus === 'AKTIF'
        ? p.student?.isActive !== false
        : p.student?.isActive === false

      return matchesSearch && matchesStudentStatus
    })
  }, [payments, search, filterStudentStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterType, filterStartDate, filterEndDate, filterStudentStatus, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedList = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filtered.slice(startIdx, startIdx + pageSize)
  }, [filtered, currentPage, pageSize])

  const isAllSelected = useMemo(() =>
    filtered.length > 0 && filtered.every(p => selectedTxIds.includes(p.id)),
    [filtered, selectedTxIds]
  )

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxIds([])
    } else {
      setSelectedTxIds(filtered.map(p => p.id))
    }
  }

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const totalNominal = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)
    const countTotal = filtered.length
    const countLunas = filtered.filter(p => p.tagihan?.status === 'LUNAS' || ((p.tagihan?.amountPaid || 0) >= (p.tagihan?.amount || 0) && (p.tagihan?.amount || 0) > 0)).length
    const countAngsuran = countTotal - countLunas
    return { totalNominal, countTotal, countLunas, countAngsuran }
  }, [filtered])

  const handleExport = () => {
    const data = filtered.map((p, i) => {
      const studentStatus = getFinanceStudentStatus(p.student)
      const t = p.tagihan
      const periodStr = t?.month
        ? `${MONTHS.find(m => m.value === t.month?.toString())?.label || t.month} ${t.year || ''}`
        : t?.year ? `Tahun ${t.year}` : '-'
      return {
        No: i + 1,
        'No. Transaksi / Kwitansi': `KW-${p.id.slice(0, 8).toUpperCase()}`,
        'Tanggal Pembayaran': new Date(p.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        'Nama Siswa': p.student?.name || '-',
        'NISN': p.student?.nisn || '-',
        'NIS': p.student?.nis || '-',
        'Kelas': p.student?.class?.name || '-',
        'Status Siswa': studentStatus.label,
        'Jenis Tagihan': t?.type || 'Tagihan',
        'Periode': periodStr,
        'Nominal Bayar (Rp)': p.amount,
        'Total Tagihan (Rp)': t?.amount || p.amount,
        'Total Terbayar (Rp)': t?.amountPaid || p.amount,
        'Status Tagihan': t?.status || 'LUNAS',
        'Catatan Kasir': p.notes || '-',
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Pembayaran')
    XLSX.writeFile(wb, `Riwayat_Transaksi_Pembayaran_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const printReceipt = (p: PaymentTransactionItem) => {
    const t = p.tagihan
    const totalAmount = t?.amount || p.amount
    const totalPaid = t?.amountPaid || p.amount
    const remaining = Math.max(0, totalAmount - totalPaid)
    const periodStr = t?.month
      ? `${MONTHS.find(m => m.value === t.month?.toString())?.label || t.month} ${t.year || ''}`
      : t?.year ? `Tahun ${t.year}` : '-'

    setReceiptData({
      receiptNo: `KW-${p.id.slice(0, 8).toUpperCase()}`,
      studentName: p.student?.name || '-',
      studentNis: p.student?.nis || '-',
      studentNisn: p.student?.nisn || '-',
      className: p.student?.class?.name || '-',
      paymentDate: p.paymentDate,
      billType: t?.type || 'Tagihan Keuangan',
      billPeriod: periodStr,
      totalBillAmount: totalAmount,
      paidAmount: p.amount,
      accumulatedPaid: totalPaid,
      remainingAmount: remaining,
      status: t?.status === 'LUNAS' || remaining <= 0 ? 'LUNAS' : 'ANGSURAN',
      notes: p.notes,
    })
    setReceiptModalOpen(true)
  }

  return (
    <div className="space-y-3">
      {/* Sub-Filter Status Siswa */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterStudentStatus('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStudentStatus === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs ring-1 ring-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Semua Riwayat Transaksi</span>
            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full text-[10px] font-black">
              {payments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStudentStatus('AKTIF')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStudentStatus === 'AKTIF'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs ring-1 ring-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transaksi Siswa Aktif</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStudentStatus('ARSIP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterStudentStatus === 'ARSIP'
                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs ring-1 ring-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Arsip Transaksi Siswa Lulus / Nonaktif</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5">
          Real-time Audit Log Kasir & Pembayaran
        </span>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Dana Masuk</span>
          <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">{currency(stats.totalNominal)}</p>
        </div>
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Total Transaksi</span>
          <p className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400 mt-0.5">{stats.countTotal} <span className="text-[11px] font-normal text-blue-600/70">Kwitansi</span></p>
        </div>
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Transaksi Lunas</span>
          <p className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-400 mt-0.5">{stats.countLunas} <span className="text-[11px] font-normal text-indigo-600/70">Tuntas</span></p>
        </div>
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-2.5 sm:p-3 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Angsuran / Cicilan</span>
          <p className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 mt-0.5">{stats.countAngsuran} <span className="text-[11px] font-normal text-amber-700/70">Transaksi</span></p>
        </div>
      </div>

      {/* Toolbar Search & Filter (Rule 16: Bersebelahan) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Cari siswa, NISN, no kwitansi, catatan..."
              className="pl-7.5 h-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <Select value={filterType} onValueChange={(v) => setFilterType(v || 'ALL')}>
            <SelectTrigger className="w-[120px] sm:w-[130px] h-8 font-bold text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg shrink-0">
              <SelectValue placeholder="Jenis Tagihan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Jenis</SelectItem>
              {PAYMENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-[125px]"
              title="Dari Tanggal"
            />
            <span className="text-[10px] text-slate-400">-</span>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-[125px]"
              title="Sampai Tanggal"
            />
            {(filterStartDate || filterEndDate || filterType !== 'ALL' || search) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearch('')
                  setFilterType('ALL')
                  setFilterStartDate('')
                  setFilterEndDate('')
                }}
                className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                title="Reset Filter"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-8 px-2.5 text-xs font-bold rounded-lg touch-manipulation gap-1"
          >
            <Download className="w-3.5 h-3.5" /> <span>Export Excel ({filtered.length})</span>
          </Button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedTxIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 p-2 rounded-xl flex flex-wrap items-center justify-between gap-1.5 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              {selectedTxIds.length} Transaksi Terpilih
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTxIds([])}
              className="text-xs h-7.5 px-2.5 rounded-lg border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100/50"
            >
              Batal Pilih
            </Button>
          </div>
        </div>
      )}

      {/* Table Log Riwayat Pembayaran */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0 max-w-full">
          <div className="overflow-x-auto custom-scrollbar w-full">
            <Table className="w-full text-xs min-w-[780px] sm:min-w-full border-collapse">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-[11px] select-none sticky top-0 z-10">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="w-9 sm:w-10 text-center px-1.5 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center touch-manipulation"
                      title={isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua Transaksi'}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-10 sm:w-12 text-center py-2 px-1 whitespace-nowrap">No</TableHead>
                  <TableHead className="w-28 sm:w-32 py-2 px-2 whitespace-nowrap">Waktu Bayar</TableHead>
                  <TableHead className="py-2 px-2.5 min-w-[160px] sm:min-w-[200px]">Nama Siswa</TableHead>
                  <TableHead className="w-24 sm:w-28 text-center py-2 px-1 whitespace-nowrap">Status Siswa</TableHead>
                  <TableHead className="w-28 sm:w-32 py-2 px-2 whitespace-nowrap">Jenis & Periode</TableHead>
                  <TableHead className="w-28 sm:w-32 text-right py-2 px-2.5 whitespace-nowrap">Nominal Bayar</TableHead>
                  <TableHead className="w-24 sm:w-28 text-center py-2 px-1 whitespace-nowrap">Status Tagihan</TableHead>
                  <TableHead className="py-2 px-2 min-w-[120px] max-w-[220px]">Catatan Kasir</TableHead>
                  <TableHead className="w-24 sm:w-28 text-center py-2 px-1.5 whitespace-nowrap sticky right-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs shadow-[-6px_0_10px_-3px_rgba(0,0,0,0.06)] z-20">Kwitansi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-1.5" />
                      <p className="text-slate-500 text-[11px] font-medium">Memuat riwayat transaksi pembayaran...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-400 text-xs font-medium">
                      {search || filterType !== 'ALL' || filterStartDate ? 'Tidak ada transaksi pembayaran yang sesuai filter.' : 'Belum ada transaksi pembayaran masuk tercatat.'}
                    </TableCell>
                  </TableRow>
                ) : paginatedList.map((p, idx) => {
                  const isChecked = selectedTxIds.includes(p.id)
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1
                  const studentStatus = getFinanceStudentStatus(p.student)
                  const t = p.tagihan
                  const isLunas = t?.status === 'LUNAS' || ((t?.amountPaid || 0) >= (t?.amount || 0) && (t?.amount || 0) > 0)
                  const periodStr = t?.month
                    ? `${MONTHS.find(m => m.value === t.month?.toString())?.label || t.month} ${t.year || ''}`
                    : t?.year ? `Th ${t.year}` : '-'

                  return (
                    <TableRow key={p.id} className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${isChecked ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60'}`}>
                      <TableCell className="text-center px-1.5 py-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleSelectTx(p.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center justify-center touch-manipulation"
                        >
                          {isChecked ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-center text-slate-400 font-medium text-[11px] px-1 py-1.5 whitespace-nowrap">{displayIndex}</TableCell>
                      <TableCell className="py-1.5 px-2 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(p.paymentDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.paymentDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 px-2.5 min-w-[160px] sm:min-w-[200px]">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight truncate" title={p.student?.name}>
                            {p.student?.name || '-'}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-tight truncate mt-0.5">
                            Kelas: <span className="font-semibold text-slate-600 dark:text-slate-300">{p.student?.class?.name || '-'}</span> · NIS: {p.student?.nis || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1 whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border inline-flex items-center gap-1 ${studentStatus.color}`}>
                          {studentStatus.status === 'AKTIF' ? <ShieldCheck className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
                          {studentStatus.label}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 px-2 whitespace-nowrap">
                        <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${TYPE_COLORS[t?.type || ''] || 'bg-slate-100 text-slate-700'}`}>
                          {t?.type || 'Pembayaran'}
                        </span>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{periodStr}</p>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-xs py-1.5 px-2.5 whitespace-nowrap">
                        {currency(p.amount)}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1 whitespace-nowrap">
                        {isLunas ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> LUNAS
                          </span>
                        ) : (
                          <span className="font-bold px-2 py-0.5 rounded-full text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3" /> Angsuran
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-2 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[200px]" title={p.notes || '-'}>
                        {p.notes || '-'}
                      </TableCell>
                      <TableCell className="text-center py-1.5 px-1.5 whitespace-nowrap sticky right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shadow-[-6px_0_10px_-3px_rgba(0,0,0,0.06)] z-20">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => printReceipt(p)}
                          className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-[11px] font-bold h-7 px-2 rounded-lg gap-1 shadow-2xs touch-manipulation"
                          title="Cetak Kwitansi Pembayaran Ini"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cetak</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Toolbar */}
          {filtered.length > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] w-full sm:w-auto justify-between sm:justify-start">
                <span>
                  <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> - <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> dari <strong>{filtered.length}</strong> transaksi
                </span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[10px] text-slate-400">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-7 px-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>

                  <span className="px-2.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    {currentPage} / {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7.5 w-7.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation disabled:opacity-40"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SingleReceiptPrintModal
        open={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false)
          setReceiptData(null)
        }}
        data={receiptData}
      />
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
const TABS = [
  { id: 'tagihan', label: 'Tagihan Siswa', icon: Receipt },
  { id: 'riwayat', label: 'Riwayat Pembayaran', icon: Clock },
  { id: 'verifikasi', label: 'Verifikasi Pembayaran', icon: CheckCircle2 },
  { id: 'rekap', label: 'Rekapitulasi', icon: BarChart3 },
]

export default function KeuanganMasukPage() {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-xs shrink-0 text-white">
              <Wallet className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                Keuangan Masuk
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Tagihan, riwayat transaksi, verifikasi & rekapitulasi</p>
            </div>
          </div>

          {/* Tab Navigation Compact Pill Style */}
          <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 gap-1 self-start md:self-auto shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all touch-manipulation cursor-pointer ${isActive ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {activeTab === 'tagihan' && <TabTagihan />}
          {activeTab === 'riwayat' && <TabRiwayatPembayaran />}
          {activeTab === 'verifikasi' && <PaymentProofVerificationPage />}
          {activeTab === 'rekap' && <TabRekap />}
        </div>
      </div>
    </KeuanganRoleContext.Provider>
  )
}

