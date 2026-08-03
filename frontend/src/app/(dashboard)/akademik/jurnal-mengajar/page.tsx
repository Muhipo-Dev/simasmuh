'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { format } from 'date-fns'
import { SortableTableHead, useSorting } from "@/components/SortableTableHead"
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function JurnalMengajarPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    material: '',
    notes: '',
    scheduleId: '',
    teacherId: ''
  })

  const { data: journals, isLoading } = useQuery<any[]>({
    queryKey: ['teaching-journals'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teaching-journals')
      if (!res.ok) throw new Error('Gagal memuat jurnal mengajar')
      return res.json()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedJournal: any) => {
      const { id, ...payload } = updatedJournal
      const res = await authenticatedFetch(`/api-backend/teaching-journals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-journals'] })
      setOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/teaching-journals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus jurnal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-journals'] })
    }
  })

  const handleOpenEditDialog = (item: any) => {
    setFormData({ 
      id: item.id, 
      date: new Date(item.date).toISOString().split('T')[0], 
      material: item.material || '', 
      notes: item.notes || '', 
      scheduleId: item.scheduleId || '', 
      teacherId: item.teacherId || '' 
    })
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus jurnal ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      ...formData,
      date: new Date(formData.date).toISOString()
    })
  }

  const { sortConfig, handleSort, sortedItems: sortedJournals } = useSorting(journals || [])
  const searchedJournals = filterDataBySearch(sortedJournals, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Rekap Jurnal Mengajar</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar jurnal mengajar yang telah Anda isi.</p>
        </div>
        <Link href="/akademik/jurnal-mengajar/tambah">
          <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-xs">
            <Plus className="w-4 h-4 mr-2" />
            Isi Jurnal Mengajar
          </Button>
        </Link>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Ubah Jurnal Mengajar</DialogTitle>
              <DialogDescription>
                Perbarui rincian materi yang diajarkan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Materi Pembelajaran</Label>
                <Input value={formData.material} onChange={e => setFormData({...formData, material: e.target.value})} placeholder="Topik materi yang diajarkan..." required />
              </div>
              <div className="space-y-2">
                <Label>Catatan Khusus (Opsional)</Label>
                <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Catatan tambahan selama KBM..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 font-bold">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Riwayat Jurnal Mengajar</CardTitle>
            <CardDescription>Menampilkan riwayat jurnal mengajar terbaru Anda.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari jurnal (materi/kelas)..."
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="pl-6 w-[80px]">No</TableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="date">Tanggal</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="schedule.class.name">Kelas</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="material">Materi Pembelajaran</SortableTableHead>
                <SortableTableHead sortConfig={sortConfig} onSort={handleSort} sortKey="notes">Catatan</SortableTableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                    {searchQuery ? 'Tidak ada jurnal yang sesuai dengan pencarian.' : 'Belum ada data jurnal mengajar.'}
                  </TableCell>
                </TableRow>
              ) : (
                searchedJournals.map((jurnal, index) => (
                  <TableRow key={jurnal.id}>
                    <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">
                      {format(new Date(jurnal.date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {jurnal.schedule?.class?.name || 'Kelas Terhapus'}
                      </span>
                    </TableCell>
                    <TableCell className="truncate max-w-[200px] font-medium text-slate-900 dark:text-white">{jurnal.material}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300 italic">{jurnal.notes || '-'}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(jurnal)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(jurnal.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
