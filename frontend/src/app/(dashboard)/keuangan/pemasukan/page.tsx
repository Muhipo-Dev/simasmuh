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
  AlertTriangle, RotateCcw, Receipt, Clock, ChevronDown, ChevronUp, Layers
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
}

type StudentDetail = {
  id: string; name: string; nisn: string; nis: string
  className: string; gender: string; tagihans: Tagihan[]
  class: { name: string }
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
  { value: 'DPP', label: 'DPP', desc: 'Dana Pengembangan Pendidikan' },
  { value: 'INFAQ', label: 'Infaq', desc: 'Uang Infaq Sekolah' },
  { value: 'AKADEMIK', label: 'Akademik', desc: 'Kegiatan Akademik' },
  { value: 'SEKOLAH', label: 'Kegiatan', desc: 'Kegiatan Sekolah' },
]

const TYPE_COLORS: Record<string, string> = {
  SPP: 'bg-blue-50 text-blue-700 border border-blue-200',
  DPP: 'bg-purple-50 text-purple-700 border border-purple-200',
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
  student, open, onClose }: {
  student: StudentDetail | null; open: boolean; onClose: () => void
}) {
  const authenticatedFetch = useAuthenticatedFetch();
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

  // State for Angsuran Modal
  const [payTargetTagihan, setPayTargetTagihan] = useState<Tagihan | null>(null)
  const [payAmountInput, setPayAmountInput] = useState('')
  const [payNotesInput, setPayNotesInput] = useState('')
  const [payMode, setPayMode] = useState<'LUNAS' | 'ANGSURAN'>('LUNAS')

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

  const resetForm = () => { setForm(defaultForm()); setEditId(null); setShowForm(false) }

  const buildPayload = () => ({
    type: form.type, amount: parseFloat(form.amount),
    month: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.month) : null,
    year: ['SPP', 'DPP'].includes(form.type) ? parseInt(form.year) : null,
    dueDate: form.dueDate || null, notes: form.notes || null,
    discountPercentage: form.discountPercentage,
    discountReason: form.discountReason || null,
  })

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
  const filtered = filterStatus === 'ALL' ? tagihans : tagihans.filter(t => t.status === filterStatus)
  const totalBelumLunas = tagihans.filter(t => t.status === 'BELUM_LUNAS').reduce((s, t) => s + t.amount, 0)
  const totalLunas = tagihans.filter(t => t.status === 'LUNAS').reduce((s, t) => s + t.amount, 0)
  const isLoading = addMut.isPending || editMut.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetForm() } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Receipt className="w-5 h-5 text-blue-600" />
              Tagihan — {student?.name}
            </DialogTitle>
            <DialogDescription>
              Kelas {student?.class?.name} · NISN {student?.nisn} · NIS {student?.nis}
            </DialogDescription>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500 font-medium">Belum Lunas</p>
              <p className="font-bold text-red-700 text-lg">{currency(totalBelumLunas)}</p>
              <p className="text-xs text-red-400">{tagihans.filter(t => t.status === 'BELUM_LUNAS').length} tagihan</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-500 font-medium">Sudah Lunas</p>
              <p className="font-bold text-emerald-700 text-lg">{currency(totalLunas)}</p>
              <p className="text-xs text-emerald-400">{tagihans.filter(t => t.status === 'LUNAS').length} tagihan</p>
            </div>
          </div>

          {/* Tambah button */}
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <PlusCircle className="w-4 h-4" /> Tambah Tagihan Baru
            </Button>
          ) : (
            <Card className="border-blue-200 bg-blue-50/40">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-blue-900">{editId ? 'Edit Tagihan' : 'Tagihan Baru'}</CardTitle>
                  <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Jenis */}
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Jenis Tagihan</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_TYPES.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${form.type === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{PAYMENT_TYPES.find(t => t.value === form.type)?.desc}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Nominal (Rp)</Label>
                    <Input type="number" placeholder="Contoh: 150000" value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700 mb-1 block">Jatuh Tempo</Label>
                    <Input type="date" value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-white" />
                  </div>
                </div>

                {['SPP', 'DPP'].includes(form.type) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-1 block">Bulan</Label>
                      <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v ?? f.month }))}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-slate-700 mb-1 block">Tahun</Label>
                      <Select value={form.year} onValueChange={(v) => setForm(f => ({ ...f, year: v ?? f.year }))}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Diskon */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <TrendingUp className="w-4 h-4 text-amber-600" /> Diskon Tagihan (Server Calculated)
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, discountPercentage: pct }))}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          form.discountPercentage === pct
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {pct === 0 ? 'Tanpa Diskon' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                  {form.discountPercentage > 0 && (
                    <Input
                      placeholder="Alasan Diskon (Misal: Beasiswa Kader / Prestasi)"
                      value={form.discountReason}
                      onChange={(e) => setForm(f => ({ ...f, discountReason: e.target.value }))}
                      className="bg-white text-xs"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-1 block">Catatan (opsional)</Label>
                  <Textarea placeholder="Catatan tambahan..." rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-white resize-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!form.amount || isLoading}
                    onClick={() => editId ? editMut.mutate() : addMut.mutate()}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editId ? 'Simpan Perubahan' : 'Buat Tagihan'}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={isLoading}>Batal</Button>
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

              return (
                <div key={t.id} className={`rounded-xl border p-3 transition-colors ${t.status === 'LUNAS' ? 'bg-emerald-50/50 border-emerald-100' : t.status === 'ANGSURAN' ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${TYPE_COLORS[t.type] || 'bg-slate-100 text-slate-600'}`}>{t.type}</span>
                        {t.status === 'LUNAS' ? (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Lunas</span>
                        ) : t.status === 'ANGSURAN' ? (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Angsuran ({pct}%)</span>
                        ) : (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Belum Lunas</span>
                        )}
                        {t.month && t.year && (
                          <span className="text-xs text-slate-500">{MONTHS.find(m => m.value === t.month!.toString())?.label} {t.year}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-bold text-slate-900 text-base">{currency(t.amount)}</span>
                        {t.dueDate && <span className="text-xs text-slate-400">Tempo: {formatDate(t.dueDate)}</span>}
                      </div>

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
                      {t.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.notes}</p>}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" /> Tagihan Massal per Kelas
          </DialogTitle>
          <DialogDescription>Buat tagihan yang sama untuk semua siswa di satu kelas sekaligus.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Pilih Kelas</Label>
            <Select value={form.classId} onValueChange={(v) => setForm(f => ({ ...f, classId: v ?? f.classId }))}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">Jenis Tagihan</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${form.type === t.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Nominal (Rp)</Label>
              <Input type="number" placeholder="150000" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-white" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-1 block">Jatuh Tempo</Label>
              <Input type="date" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-white" />
            </div>
          </div>

          {['SPP', 'DPP'].includes(form.type) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1 block">Bulan</Label>
                <Select value={form.month} onValueChange={(v) => setForm(f => ({ ...f, month: v ?? f.month }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-1 block">Tahun</Label>
                <Select value={form.year} onValueChange={(v) => setForm(f => ({ ...f, year: v ?? f.year }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white"
            disabled={!form.classId || !form.amount || mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
            Buat Tagihan Massal
          </Button>
        </DialogFooter>
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
  const authenticatedQuery = useAuthenticatedQuery()

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nama, NISN, NIS..." className="pl-9 bg-white" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterKelas || 'all'} onValueChange={(v) => setFilterKelas(!v || v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {uniqueKelas.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setMassalOpen(true)}
            className="border-purple-400 text-purple-700 hover:bg-purple-50 gap-2">
            <Layers className="w-4 h-4" /> Tagihan Massal
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 gap-1.5">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Siswa</TableHead>
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
                    <TableCell colSpan={8} className="text-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                      {search || filterKelas ? 'Tidak ditemukan.' : 'Belum ada data siswa.'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map((s, i) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="text-center text-slate-400 font-medium text-sm">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.gender === 'Laki-laki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{s.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.nisn}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">{s.className}</span>
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
                    <TableCell className="text-right font-semibold text-slate-700">
                      {s.totalTagihan > 0 ? currency(s.totalTagihan) : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {s.totalLunas > 0 ? currency(s.totalLunas) : <span className="text-slate-300 font-normal">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs gap-1.5"
                        onClick={() => openModal(s)}>
                        <Receipt className="w-3.5 h-3.5" /> Kelola
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TagihanModal student={detailData ?? null} open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedStudent(null) }} />
      <TagihanMassalModal open={massalOpen} onClose={() => setMassalOpen(false)} classes={classes} />
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
// TAB: YAYASAN (COMING SOON)
// ============================================================
function TabYayasan() {
  const authenticatedFetch = useAuthenticatedFetch();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
        <Building2 className="w-10 h-10 text-slate-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-700">Uang Masuk dari Yayasan / Persyarikatan</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">Fitur ini sedang dalam pengembangan dan akan segera tersedia.</p>
      </div>
      <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-sm font-semibold rounded-full border border-slate-200">Coming Soon</span>
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
  { id: 'yayasan', label: 'Uang Masuk Yayasan', icon: Building2 },
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
        <p className="text-slate-500 mt-1 ml-0.5">Kelola tagihan dan rekapitulasi keuangan sekolah</p>
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
                {tab.id === 'yayasan' && (
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold ml-1">SOON</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {activeTab === 'tagihan' && <TabTagihan />}
        {activeTab === 'verifikasi' && <PaymentProofVerificationPage />}
        {activeTab === 'rekap' && <TabRekap />}
        {activeTab === 'yayasan' && <TabYayasan />}
      </div>
    </div>
  )
}
