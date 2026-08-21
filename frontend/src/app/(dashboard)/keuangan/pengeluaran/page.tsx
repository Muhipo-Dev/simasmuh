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
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const { data: pengeluarans = [], isLoading } = useQuery<any[]>({
    queryKey: ['pengeluaran', year, month],
    queryFn: () => authenticatedQuery(`/api-backend/finance/pengeluaran?year=${year}${month !== 'all' ? `&month=${month}` : ''}`),
  })

  const filtered = useMemo(() => {
    return pengeluarans.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) || 
      p.category.toLowerCase().includes(search.toLowerCase())
    )
  }, [pengeluarans, search])

  const totalPengeluaran = filtered.reduce((acc, curr) => acc + curr.amount, 0)

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
      Swal.fire('Terhapus', 'Data pengeluaran berhasil dihapus', 'success')
    },
    onError: (err: any) => Swal.fire('Error', err.message || 'Gagal menghapus data', 'error')
  })

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Hapus data?',
      text: "Data pengeluaran ini akan dihapus permanen!",
      onConfirm: () => deleteMutation.mutateAsync(id)
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Keuangan Keluar</h1>
          <p className="text-slate-500 mt-1">Kelola data pengeluaran dan arus kas keluar sekolah</p>
        </div>
        {!isKepalaSekolah ? (
          <Button onClick={() => setModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
            <PlusCircle className="w-4 h-4" /> Catat Pengeluaran
          </Button>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center gap-1.5">
            🔍 Mode Supervisi (Read-Only)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-rose-100 shadow-sm bg-rose-50/50 md:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-rose-100 rounded-full">
                <Receipt className="w-8 h-8 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-600/80">Total Pengeluaran (Filter)</p>
                <h3 className="text-2xl font-bold text-rose-700">{currency(totalPengeluaran)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 h-full items-end">
              <div className="space-y-1.5 flex-1 w-full">
                <Label className="text-xs text-slate-500 font-semibold uppercase">Pencarian</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Cari judul, kategori..." className="pl-9 bg-slate-50/50" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5 w-full sm:w-[150px]">
                <Label className="text-xs text-slate-500 font-semibold uppercase">Bulan</Label>
                <Select value={month} onValueChange={v => v && setMonth(v)}>
                  <SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-full sm:w-[120px]">
                <Label className="text-xs text-slate-500 font-semibold uppercase">Tahun</Label>
                <Select value={year} onValueChange={v => v && setYear(v)}>
                  <SelectTrigger className="bg-slate-50/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle>Riwayat Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto max-w-full">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[120px]">Tanggal</TableHead>
                  <TableHead>Kategori & Judul</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500">Belum ada data pengeluaran</TableCell></TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-600">{formatDate(item.date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-rose-600 bg-rose-50 w-max px-2 py-0.5 rounded-md mb-1">{item.category}</span>
                          <span className="font-semibold text-slate-900">{item.title}</span>
                          <span className="text-xs text-slate-500">Oleh: {item.user?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm max-w-[250px] truncate" title={item.description || ''}>
                        {item.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600 text-base">{currency(item.amount)}</TableCell>
                      <TableCell className="text-center">
                        {!isKepalaSekolah ? (
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Read-Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Tambah Pengeluaran */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Judul Pengeluaran <span className="text-red-500">*</span></Label>
              <Input placeholder="Misal: Pembelian Spidol" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nominal (Rp) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="50000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={v => v && setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="date" className="pl-9" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <p className="text-[10px] text-slate-500">Kosongkan untuk menggunakan tanggal hari ini</p>
            </div>
            <div className="space-y-2">
              <Label>Keterangan (Opsional)</Label>
              <Textarea placeholder="Keterangan tambahan..." rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={!form.title || !form.amount || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
