'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileCheck, Search, Filter, Eye, CheckCircle2, XCircle, Clock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Download, RefreshCw, CheckSquare, Square, AlertCircle, FileText,
  User, Calendar, CreditCard, Layers, ExternalLink, ArrowUpDown,
  Sparkles, Check, X, ShieldAlert, MessageSquare, Image as ImageIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import Swal from 'sweetalert2'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

// ============================================================
// TYPES & HELPERS
// ============================================================
type PaymentProofItem = {
  id: string
  studentId: string
  tagihanId: string | null
  amount: number
  proofUrl: string
  fileHash?: string
  status: 'MENUNGGU_VERIFIKASI' | 'DIVERIFIKASI' | 'DITOLAK'
  notes?: string | null
  createdAt: string
  updatedAt?: string
  student?: {
    id: string
    name: string
    nis: string
    nisn: string
    class?: { name: string } | null
    user?: { id: string; name: string } | null
  }
  tagihan?: {
    id: string
    type: string
    amount: number
    amountPaid?: number
    month?: number | null
    year?: number | null
    status?: 'BELUM_LUNAS' | 'ANGSURAN' | 'LUNAS'
    notes?: string | null
  } | null
  verifiedUser?: {
    id: string
    name: string
  } | null
}

const MONTH_NAMES: Record<number, string> = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
  5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
  9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  SPP: 'SPP (Bulanan)',
  DPP: 'DPP (Gedung)',
  UIS: 'UIS (Infaq)',
  UKA: 'UKA (Akademik)',
  UKS: 'UKS (Kegiatan)',
  SERAGAM: 'Seragam',
  LKS: 'Buku & LKS',
  INFAQ: 'Infaq',
  AKADEMIK: 'Akademik',
  SEKOLAH: 'Sekolah'
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PaymentProofVerificationPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MENUNGGU_VERIFIKASI' | 'DIVERIFIKASI' | 'DITOLAK'>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  // Selection states (Rule 16)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal / Preview states
  const [previewProof, setPreviewProof] = useState<PaymentProofItem | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    proof: PaymentProofItem | null
    type: 'DIVERIFIKASI' | 'DITOLAK'
    notes: string
  }>({
    isOpen: false,
    proof: null,
    type: 'DIVERIFIKASI',
    notes: ''
  })

  // Bulk Action dialog state
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    isOpen: boolean
    type: 'DIVERIFIKASI' | 'DITOLAK'
    notes: string
  }>({
    isOpen: false,
    type: 'DIVERIFIKASI',
    notes: ''
  })

  // Fetch Payment Proofs (100% Real Data Supabase/Backend)
  const { data: rawProofs = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payment-proofs', statusFilter],
    queryFn: async () => {
      const url = statusFilter && statusFilter !== 'ALL'
        ? `/api-backend/payment-proofs?status=${statusFilter}`
        : '/api-backend/payment-proofs'
      const response = await authenticatedQuery(url).catch(() => [])
      return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
    },
    staleTime: 10000,
    refetchOnWindowFocus: false,
  })

  const paymentProofs: PaymentProofItem[] = useMemo(() => {
    return Array.isArray(rawProofs) ? rawProofs : []
  }, [rawProofs])

  // Summary counts
  const stats = useMemo(() => {
    const total = paymentProofs.length
    const pending = paymentProofs.filter(p => p.status === 'MENUNGGU_VERIFIKASI').length
    const verified = paymentProofs.filter(p => p.status === 'DIVERIFIKASI').length
    const rejected = paymentProofs.filter(p => p.status === 'DITOLAK').length
    const totalAmount = paymentProofs.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    const verifiedAmount = paymentProofs
      .filter(p => p.status === 'DIVERIFIKASI')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0)

    return { total, pending, verified, rejected, totalAmount, verifiedAmount }
  }, [paymentProofs])

  // Filtered proofs
  const filteredProofs = useMemo(() => {
    return paymentProofs.filter((item) => {
      // Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      // Type Filter
      if (typeFilter !== 'ALL') {
        const itemType = item.tagihan?.type || 'LAINNYA'
        if (itemType !== typeFilter) return false
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const studentName = (item.student?.name || '').toLowerCase()
        const nis = (item.student?.nis || '').toLowerCase()
        const nisn = (item.student?.nisn || '').toLowerCase()
        const className = (item.student?.class?.name || '').toLowerCase()
        const notes = (item.notes || '').toLowerCase()
        const tagihanType = (item.tagihan?.type || '').toLowerCase()
        const id = (item.id || '').toLowerCase()

        return (
          studentName.includes(q) ||
          nis.includes(q) ||
          nisn.includes(q) ||
          className.includes(q) ||
          notes.includes(q) ||
          tagihanType.includes(q) ||
          id.includes(q)
        )
      }

      return true
    })
  }, [paymentProofs, statusFilter, typeFilter, searchTerm])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProofs.length / pageSize))
  const paginatedProofs = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filteredProofs.slice(startIdx, startIdx + pageSize)
  }, [filteredProofs, currentPage, pageSize])

  // Reset page & selection when filter changes
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [searchTerm, statusFilter, typeFilter, pageSize])

  // Row selection handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedProofs.map(p => p.id)
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])))
    } else {
      const pageIds = new Set(paginatedProofs.map(p => p.id))
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)))
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const isAllPageSelected = paginatedProofs.length > 0 && paginatedProofs.every(p => selectedIds.includes(p.id))
  const isSomePageSelected = paginatedProofs.some(p => selectedIds.includes(p.id)) && !isAllPageSelected

  // Mutation for single verification
  const verifyMutation = useMutation({
    mutationFn: async ({ paymentProofId, status, notes }: { paymentProofId: string; status: 'DIVERIFIKASI' | 'DITOLAK'; notes: string }) => {
      const res = await authenticatedFetch(`/api-backend/payment-proofs/${paymentProofId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => 'Gagal memverifikasi bukti pembayaran')
        throw new Error(err)
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-proofs'] })
      queryClient.invalidateQueries({ queryKey: ['finance-students'] })
      queryClient.invalidateQueries({ queryKey: ['student-tagihan'] })
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] })
      queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
      queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })

      const isApproved = variables.status === 'DIVERIFIKASI'
      Swal.fire({
        title: isApproved ? 'Diverifikasi!' : 'Ditolak!',
        text: `Bukti pembayaran telah berhasil ${isApproved ? 'disetujui & dicatat ke sistem kasir' : 'ditolak'}.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      })

      setActionDialog({ isOpen: false, proof: null, type: 'DIVERIFIKASI', notes: '' })
      if (previewProof?.id === variables.paymentProofId) {
        setPreviewProof(null)
      }
    },
    onError: (err: any) => {
      Swal.fire({
        title: 'Gagal!',
        text: err?.message || 'Terjadi kesalahan saat memproses verifikasi.',
        icon: 'error',
      })
    }
  })

  // Open confirmation modal for verification / rejection
  const openActionModal = (proof: PaymentProofItem, type: 'DIVERIFIKASI' | 'DITOLAK') => {
    setActionDialog({
      isOpen: true,
      proof,
      type,
      notes: type === 'DIVERIFIKASI'
        ? 'Bukti pembayaran valid dan telah diverifikasi.'
        : 'Bukti transfer tidak terbaca / nominal tidak sesuai.'
    })
  }

  // Handle submit single action
  const handleConfirmAction = () => {
    if (!actionDialog.proof) return
    verifyMutation.mutate({
      paymentProofId: actionDialog.proof.id,
      status: actionDialog.type,
      notes: actionDialog.notes.trim(),
    })
  }

  // Handle bulk action
  const handleBulkAction = async () => {
    const selectedProofs = paymentProofs.filter(p => selectedIds.includes(p.id) && p.status === 'MENUNGGU_VERIFIKASI')
    if (selectedProofs.length === 0) {
      Swal.fire({
        title: 'Perhatian',
        text: 'Tidak ada bukti berstatus "Menunggu Verifikasi" pada item yang dipilih.',
        icon: 'warning',
      })
      return
    }

    setBulkActionDialog({
      isOpen: true,
      type: 'DIVERIFIKASI',
      notes: 'Verifikasi massal bukti pembayaran diterima.'
    })
  }

  const executeBulkAction = async () => {
    const targetProofs = paymentProofs.filter(p => selectedIds.includes(p.id) && p.status === 'MENUNGGU_VERIFIKASI')
    const type = bulkActionDialog.type
    const notes = bulkActionDialog.notes.trim()

    setBulkActionDialog({ isOpen: false, type: 'DIVERIFIKASI', notes: '' })

    let successCount = 0
    let failCount = 0

    Swal.fire({
      title: 'Memproses...',
      text: `Sedang memverifikasi ${targetProofs.length} bukti pembayaran...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    for (const proof of targetProofs) {
      try {
        const res = await authenticatedFetch(`/api-backend/payment-proofs/${proof.id}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: type, notes }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    queryClient.invalidateQueries({ queryKey: ['payment-proofs'] })
    queryClient.invalidateQueries({ queryKey: ['finance-students'] })
    queryClient.invalidateQueries({ queryKey: ['student-tagihan'] })
    queryClient.invalidateQueries({ queryKey: ['finance-stats'] })
    queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
    queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })
    setSelectedIds([])

    Swal.fire({
      title: 'Selesai!',
      text: `${successCount} bukti berhasil diproses${failCount > 0 ? `, ${failCount} gagal` : ''}.`,
      icon: successCount > 0 ? 'success' : 'error',
    })
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header Halaman (Rule 9 & Rule 19: Ringkas, Tanpa AI-slop) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Verifikasi Bukti Pembayaran Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit riwayat pengunggahan bukti bayar siswa, validasi transfer tagihan penuh maupun angsuran secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 text-xs gap-1.5 font-medium border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Ringkasan Statistik Riil (Rule 13: 100% Real Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Pengajuan</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
            <p className="text-[10px] text-slate-400">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Menunggu Verifikasi</p>
            <p className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{stats.pending}</p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Perlu tindakan</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Diverifikasi</p>
            <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.verified}</p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">{formatCurrency(stats.verifiedAmount)}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Ditolak</p>
            <p className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">{stats.rejected}</p>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Tidak valid</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Card Kontainer Tabel & Kontrol (Rule 14, 15, 16) */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        {/* Searchbar & Filter Bersebelahan (Rule 16 STRICT) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Sisi Kiri: Searchbar & Filter Bersebelahan */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Searchbar */}
              <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari siswa, NIS, kelas, ID bukti..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Status */}
              <div className="w-[150px] shrink-0">
                <Select
                  value={statusFilter}
                  onValueChange={(val: any) => setStatusFilter(val || 'ALL')}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Status Bukti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="MENUNGGU_VERIFIKASI">Menunggu</SelectItem>
                    <SelectItem value="DIVERIFIKASI">Diverifikasi</SelectItem>
                    <SelectItem value="DITOLAK">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Jenis Tagihan */}
              <div className="w-[140px] shrink-0">
                <Select
                  value={typeFilter}
                  onValueChange={(val: any) => setTypeFilter(val || 'ALL')}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Jenis Tagihan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Pos</SelectItem>
                    <SelectItem value="SPP">SPP</SelectItem>
                    <SelectItem value="DPP">DPP</SelectItem>
                    <SelectItem value="UIS">UIS</SelectItem>
                    <SelectItem value="UKA">UKA</SelectItem>
                    <SelectItem value="UKS">UKS</SelectItem>
                    <SelectItem value="SERAGAM">Seragam</SelectItem>
                    <SelectItem value="LKS">Buku / LKS</SelectItem>
                    <SelectItem value="INFAQ">Infaq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sisi Kanan: Bulk Action Bar saat ada baris terseleksi (Rule 16) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 animate-in fade-in">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  {selectedIds.length} Terpilih
                </span>
                <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-800" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleBulkAction}
                  className="h-7 px-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Verifikasi Terpilih
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                  className="h-7 px-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Batal
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabel Data Presisi (Rule 14, 15, 16) */}
        <div className="relative overflow-x-auto">
          <Table className="w-full text-left text-xs border-collapse">
            <TableHeader className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <TableRow className="hover:bg-transparent">
                {/* Checkbox Seleksi Header (Rule 16) */}
                <TableHead className="w-10 px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomePageSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="w-12 px-2 py-2.5 text-center font-bold">No</TableHead>
                <TableHead className="w-36 px-3 py-2.5 font-bold">Waktu Upload</TableHead>
                <TableHead className="min-w-[200px] px-3 py-2.5 font-bold">Siswa & Kelas</TableHead>
                <TableHead className="min-w-[180px] px-3 py-2.5 font-bold">Pos Tagihan</TableHead>
                <TableHead className="w-36 px-3 py-2.5 text-right font-bold">Nominal Bayar</TableHead>
                <TableHead className="w-28 px-3 py-2.5 text-center font-bold">Status</TableHead>
                <TableHead className="w-28 px-3 py-2.5 text-center font-bold">Berkas</TableHead>
                <TableHead className="w-36 px-3 py-2.5 text-center font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <p className="text-xs text-slate-500 font-medium">Memuat data bukti bayar siswa...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProofs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-slate-500 dark:text-slate-400">
                      <FileText className="w-10 h-10 opacity-30 text-slate-400" />
                      <p className="text-xs font-semibold">Belum ada riwayat bukti pembayaran</p>
                      <p className="text-[11px] text-slate-400">
                        {searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                          ? 'Tidak ada data yang sesuai dengan filter pencarian.'
                          : 'Siswa yang mengunggah struk/bukti bayar akan tercatat secara otomatis di sini.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProofs.map((item, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1
                  const isSelected = selectedIds.includes(item.id)
                  const tagihan = item.tagihan
                  const student = item.student
                  const isPending = item.status === 'MENUNGGU_VERIFIKASI'
                  const isVerified = item.status === 'DIVERIFIKASI'
                  const isRejected = item.status === 'DITOLAK'

                  // Kalkulasi status bayar (Penuh atau Angsuran)
                  const isAngsuran = tagihan?.status === 'ANGSURAN' || (tagihan && item.amount < tagihan.amount)

                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox Kolom (Rule 16) */}
                      <TableCell className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </TableCell>

                      {/* Nomor Urut */}
                      <TableCell className="px-2 py-2.5 text-center text-slate-500 font-medium">
                        {rowNumber}
                      </TableCell>

                      {/* Waktu Upload */}
                      <TableCell className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(item.createdAt)}</span>
                        </div>
                      </TableCell>

                      {/* Siswa & Kelas */}
                      <TableCell className="px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate" title={student?.name || 'Siswa'}>
                            {student?.name || 'Siswa Tanpa Nama'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Kelas {student?.class?.name || '-'}
                            </span>
                            <span>•</span>
                            <span>NIS: {student?.nis || '-'}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Pos Tagihan & Rincian */}
                      <TableCell className="px-3 py-2.5">
                        <div className="min-w-0">
                          {tagihan ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                                  {tagihan.type}
                                </Badge>
                                {tagihan.month && tagihan.year ? (
                                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                    {MONTH_NAMES[tagihan.month] || tagihan.month} {tagihan.year}
                                  </span>
                                ) : tagihan.year ? (
                                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                    Tahun {tagihan.year}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span>Tagihan: {formatCurrency(tagihan.amount)}</span>
                                <span>•</span>
                                <span className={`font-semibold ${isAngsuran ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {isAngsuran ? 'Angsuran' : 'Penuh'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Pembayaran Umum / Mandiri</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Nominal Bayar */}
                      <TableCell className="px-3 py-2.5 text-right whitespace-nowrap">
                        <p className="font-extrabold text-slate-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </p>
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px] ml-auto" title={item.notes}>
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </TableCell>

                      {/* Status Verifikasi Badge */}
                      <TableCell className="px-3 py-2.5 text-center whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Menunggu
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Diverifikasi
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Ditolak
                          </span>
                        )}
                      </TableCell>

                      {/* Tombol Lihat Bukti Berkas */}
                      <TableCell className="px-3 py-2.5 text-center whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewProof(item)}
                          className="h-7 px-2.5 text-[11px] font-medium gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Bukti
                        </Button>
                      </TableCell>

                      {/* Tombol Aksi Verifikasi / Tolak */}
                      <TableCell className="px-3 py-2.5 text-center whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => openActionModal(item, 'DIVERIFIKASI')}
                              disabled={verifyMutation.isPending}
                              className="h-7 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              title="Setujui dan Verifikasi"
                            >
                              <Check className="w-3.5 h-3.5 mr-0.5" />
                              Verifikasi
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openActionModal(item, 'DITOLAK')}
                              disabled={verifyMutation.isPending}
                              className="h-7 px-2 text-[11px] font-bold shadow-xs"
                              title="Tolak Bukti"
                            >
                              <X className="w-3.5 h-3.5 mr-0.5" />
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {item.verifiedUser ? `Oleh: ${item.verifiedUser.name.split(' ')[0]}` : 'Selesai'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar (Rule 15, 18) */}
        <div className="p-3 sm:px-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan <span className="font-semibold text-slate-900 dark:text-white">
              {filteredProofs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span> – <span className="font-semibold text-slate-900 dark:text-white">
              {Math.min(currentPage * pageSize, filteredProofs.length)}
            </span> dari <span className="font-semibold text-slate-900 dark:text-white">{filteredProofs.length}</span> data
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Awal"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title="Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Akhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* MODAL PREVIEW BUKTI BAYAR LENGKAP */}
      <Dialog open={!!previewProof} onOpenChange={() => setPreviewProof(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Eye className="w-5 h-5 text-emerald-600" />
              Detail & Bukti Pembayaran Siswa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ID Berkas: <span className="font-mono text-slate-700 dark:text-slate-300">{previewProof?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {previewProof && (
            <div className="p-4 sm:p-5 space-y-4">
              {/* Informasi Siswa & Tagihan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Nama Peserta Didik</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {previewProof.student?.name || '-'}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Kelas: <strong className="text-slate-700 dark:text-slate-300">{previewProof.student?.class?.name || '-'}</strong> | NIS: {previewProof.student?.nis || '-'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400 font-medium">Nominal Transfer & Pos Tagihan</p>
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                    {formatCurrency(previewProof.amount)}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    {previewProof.tagihan?.type ? `${previewProof.tagihan.type} (${previewProof.amount < (previewProof.tagihan?.amount || 0) ? 'Angsuran' : 'Penuh'})` : 'Pembayaran Mandiri'}
                  </p>
                </div>
              </div>

              {/* Tampilan Gambar / Preview Berkas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    Lampiran Struk / Bukti Transfer
                  </span>
                  {previewProof.proofUrl && (
                    <a
                      href={previewProof.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium"
                    >
                      Buka Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-2 flex items-center justify-center min-h-[240px] max-h-[400px] overflow-hidden">
                  {previewProof.proofUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewProof.proofUrl}
                      alt="Bukti Transfer Pembayaran"
                      className="max-h-[380px] w-auto max-w-full object-contain rounded-lg shadow-xs"
                      onError={(e) => {
                        // Fallback jika bukan image atau error
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs py-8">
                      <AlertCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      URL berkas tidak tersedia
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan Siswa & Audit */}
              {previewProof.notes && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Catatan Siswa:
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">&ldquo;{previewProof.notes}&rdquo;</p>
                </div>
              )}

              {previewProof.verifiedUser && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  Diverifikasi oleh: <strong className="text-slate-600 dark:text-slate-300">{previewProof.verifiedUser.name}</strong>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewProof(null)}
              className="text-xs"
            >
              Tutup
            </Button>

            {previewProof?.status === 'MENUNGGU_VERIFIKASI' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const p = previewProof
                    setPreviewProof(null)
                    openActionModal(p, 'DITOLAK')
                  }}
                  className="text-xs font-bold"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Tolak
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const p = previewProof
                    setPreviewProof(null)
                    openActionModal(p, 'DIVERIFIKASI')
                  }}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Verifikasi
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI AKSI (VERIFIKASI / TOLAK) */}
      <Dialog open={actionDialog.isOpen} onOpenChange={(open) => {
        if (!open) setActionDialog({ isOpen: false, proof: null, type: 'DIVERIFIKASI', notes: '' })
      }}>
        <DialogContent className="max-w-md border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              {actionDialog.type === 'DIVERIFIKASI' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Konfirmasi Verifikasi Bukti
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Konfirmasi Penolakan Bukti
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Siswa: <strong>{actionDialog.proof?.student?.name}</strong> | Nominal: <strong>{formatCurrency(actionDialog.proof?.amount || 0)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {actionDialog.type === 'DIVERIFIKASI'
                ? 'Dengan memverifikasi, pembayaran akan otomatis dicatat ke riwayat tagihan siswa dan saldo kas penerimaan sekolah bertambah.'
                : 'Bukti pembayaran akan ditandai ditolak dan siswa akan diminta mengunggah ulang bukti transfer yang sah.'}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Verifikator / Petugas:
              </label>
              <Textarea
                value={actionDialog.notes}
                onChange={(e) => setActionDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Masukkan catatan verifikasi..."
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionDialog({ isOpen: false, proof: null, type: 'DIVERIFIKASI', notes: '' })}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAction}
              disabled={verifyMutation.isPending}
              className={`text-xs font-bold ${
                actionDialog.type === 'DIVERIFIKASI'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {verifyMutation.isPending ? 'Memproses...' : actionDialog.type === 'DIVERIFIKASI' ? 'Ya, Verifikasi' : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL KONFIRMASI BULK ACTION */}
      <Dialog open={bulkActionDialog.isOpen} onOpenChange={(open) => {
        if (!open) setBulkActionDialog({ isOpen: false, type: 'DIVERIFIKASI', notes: '' })
      }}>
        <DialogContent className="max-w-md border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Verifikasi Massal ({selectedIds.length} Data)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Menyetujui dan memverifikasi seluruh bukti transfer berstatus menunggu yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Petugas:
              </label>
              <Textarea
                value={bulkActionDialog.notes}
                onChange={(e) => setBulkActionDialog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Catatan verifikasi massal..."
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionDialog({ isOpen: false, type: 'DIVERIFIKASI', notes: '' })}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={executeBulkAction}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Eksekusi Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
