'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Wallet, Receipt, Search, PlusCircle, Trash2, Loader2, Calendar
} from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { TableSearch } from '@/components/TableSearch'
import { TableSelectionBar, TableCheckboxHeader, TableCheckboxCell } from '@/components/TableSelectionBar'
import Swal from 'sweetalert2'
import { confirmDelete } from '@/lib/swal-helper'

const CATEGORIES = [
  'UMUM', 'OPERASIONAL', 'GAJI', 'FASILITAS', 'ACARA', 'LAINNYA'
]

const currency = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]
const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
  { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]

export default function KeuanganKeluarPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const userSubRole = (session?.user as any)?.subRole || ''
  const isKepalaSekolah = userRole === 'KEPALA_SEKOLAH' || userSubRole === 'KEPALA_SEKOLAH'
  const [year, setYear] = useState<string>(currentYear.toString())
  const [month, setMonth] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const { data: pengeluarans = [], isLoading } = useQuery<any[]>({
    queryKey: ['pengeluaran', year, month],
    queryFn: () => authenticatedQuery(`/api-backend/finance/pengeluaran?year=${year}${month !== 'all' ? `&month=${month}` : ''}`),
  })

  const filtered = useMemo(() => {
    return pengeluarans.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [pengeluarans, search, categoryFilter])

  const totalPengeluaran = filtered.reduce((acc, curr) => acc + curr.amount, 0)

  // Selection handlers
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map(item => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  // Form State
  const [form, setForm] = useState({ title: '', description: '', amount: '', category: 'UMUM', date: '' })

  const createMutation = useMutation({
    mutationFn: (data: any) => authenticatedFetch('/api-backend/finance/pengeluaran', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
      setModalOpen(false)
      setForm({ title: '', description: '', amount: '', category: 'UMUM', date: '' })
      Swal.fire('Berhasil', 'Data pengeluaran berhasil dicatat', 'success')
    },
    onError: (err: any) => Swal.fire('Error', err.message || 'Gagal menyimpan data', 'error')
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authenticatedFetch(`/api-backend/finance/pengeluaran/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
      setSelectedIds(prev => prev.filter(item => item !== deleteTargetId))
      Swal.fire('Terhapus', 'Data pengeluaran berhasil dihapus', 'success')
    },
    onError: (err: any) => Swal.fire('Error', err.message || 'Gagal menghapus data', 'error')
  })

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setDeleteTargetId(id)
    confirmDelete({
      title: 'Hapus data?',
      text: "Data pengeluaran ini akan dihapus permanen!",
      onConfirm: () => deleteMutation.mutateAsync(id)
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const confirm = await Swal.fire({
      title: `Hapus ${selectedIds.length} pengeluaran terpilih?`,
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus Semua',
      cancelButtonText: 'Batal'
    })

    if (confirm.isConfirmed) {
      try {
        await Promise.all(
          selectedIds.map(id => authenticatedFetch(`/api-backend/finance/pengeluaran/${id}`, { method: 'DELETE' }))
        )
        queryClient.invalidateQueries({ queryKey: ['pengeluaran'] })
        setSelectedIds([])
        Swal.fire('Berhasil', `${selectedIds.length} data pengeluaran berhasil dihapus`, 'success')
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Gagal menghapus beberapa data', 'error')
      }
    }
  }

  const activeFiltersCount = (month !== 'all' ? 1 : 0) + (year !== currentYear.toString() ? 1 : 0) + (categoryFilter !== 'all' ? 1 : 0)

  const handleResetFilters = () => {
    setMonth('all')
    setYear(currentYear.toString())
    setCategoryFilter('all')
    setSearch('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center shadow-xs shrink-0">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            Pengeluaran Kas
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Pencatatan dan rekapitulasi arus kas keluar sekolah</p>
        </div>
        {!isKepalaSekolah && (
          <Button onClick={() => setModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs rounded-xl gap-2 w-full sm:w-auto text-xs h-9">
            <PlusCircle className="w-4 h-4" /> Catat Pengeluaran
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-rose-100 shadow-sm bg-rose-50/50 md:col-span-1 rounded-2xl">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl text-rose-600">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-600/80">Total Pengeluaran (Filter)</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">{currency(totalPengeluaran)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs md:col-span-2 rounded-2xl">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> transaksi pengeluaran.
            </div>

            <TableSearch
              value={search}
              onChange={setSearch}
              placeholder="Cari pengeluaran (judul/kategori)..."
              activeFiltersCount={activeFiltersCount}
              onResetFilters={handleResetFilters}
              filters={
                <div className="space-y-3 py-1 text-xs">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kategori Pengeluaran</Label>
                    <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl">
                        <SelectValue placeholder="Semua Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Bulan</Label>
                      <Select value={month} onValueChange={v => v && setMonth(v)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tahun</Label>
                      <Select value={year} onValueChange={v => v && setYear(v)}>
                        <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      <TableSelectionBar
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
        onClearSelection={() => setSelectedIds([])}
        onSelectAll={() => setSelectedIds(filtered.map(i => i.id))}
        onDeleteSelected={!isKepalaSekolah ? handleBulkDelete : undefined}
        deleteLabel={`Hapus (${selectedIds.length})`}
      />

      <Card className="border-slate-200 dark:border-slate-800 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Riwayat Pengeluaran Kas</CardTitle>
            <CardDescription className="text-xs">Daftar transaksi kas keluar yang telah diverifikasi.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full min-w-[750px] text-xs">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                <TableRow>
                  {!isKepalaSekolah && (
                    <TableHead className="w-10 text-center pl-4">
                      <TableCheckboxHeader
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[120px] px-3 py-3">Tanggal</TableHead>
                  <TableHead className="min-w-[200px] px-3 py-3">Kategori & Judul</TableHead>
                  <TableHead className="min-w-[220px] px-3 py-3">Keterangan</TableHead>
                  <TableHead className="text-right w-[140px] px-3 py-3">Nominal</TableHead>
                  <TableHead className="text-center w-[90px] px-3 py-3">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={isKepalaSekolah ? 5 : 6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={isKepalaSekolah ? 5 : 6} className="h-32 text-center text-slate-500 text-xs">Belum ada data pengeluaran yang sesuai.</TableCell></TableRow>
                ) : (
                  filtered.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    return (
                      <TableRow key={item.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 transition-colors ${isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                        {!isKepalaSekolah && (
                          <TableCell className="text-center pl-4">
                            <TableCheckboxCell
                              checked={isSelected}
                              onChange={(checked) => handleSelectRow(item.id, checked)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-slate-600 dark:text-slate-300 px-3 py-2.5 whitespace-nowrap">{formatDate(item.date)}</TableCell>
                        <TableCell className="px-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-900/60 w-max px-2 py-0.5 rounded-md mb-1">{item.category}</span>
                            <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">{item.title}</span>
                            <span className="text-[10px] text-slate-500">Oleh: {item.user?.name || 'Staf Keuangan'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-400 text-xs max-w-[280px] truncate px-3 py-2.5" title={item.description || ''}>
                          {item.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm px-3 py-2.5 whitespace-nowrap">{currency(item.amount)}</TableCell>
                        <TableCell className="text-center px-3 py-2.5">
                          {!isKepalaSekolah ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950 rounded-lg" onClick={() => handleDelete(item.id)} title="Hapus Pengeluaran">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Read-Only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Catat Pengeluaran Baru</DialogTitle>
            <CardDescription className="text-xs">Masukkan detail pengeluaran kas sekolah secara lengkap.</CardDescription>
          </DialogHeader>
          <div className="grid gap-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Judul Pengeluaran *</Label>
              <Input placeholder="Contoh: Beli ATK Kantor & Kertas HVS" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9 text-xs rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kategori *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v ?? CATEGORIES[0] })}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nominal (Rp) *</Label>
                <Input type="number" placeholder="500000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="h-9 text-xs rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-9 text-xs rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Keterangan Tambahan</Label>
              <Textarea placeholder="Keterangan opsional atau nomor kwitansi nota..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="text-xs rounded-xl" rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl text-xs font-bold h-9">Batal</Button>
            <Button onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount) })} disabled={!form.title || !form.amount || !form.date || createMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-9">
              {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Simpan Pengeluaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
