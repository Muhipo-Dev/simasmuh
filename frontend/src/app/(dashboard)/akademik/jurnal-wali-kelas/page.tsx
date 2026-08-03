'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function HomeroomJournalsPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    actionTaken: '',
    teacherId: ''
  })

  const { data: journals, isLoading } = useQuery<any[]>({
    queryKey: ['homeroom-journals'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/homeroom-journals')
      if (!res.ok) throw new Error('Gagal memuat data jurnal wali kelas')
      return res.json()
    }
  })

  const { data: teachers } = useQuery<any[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newJournal: any) => {
      const res = await authenticatedFetch('/api-backend/homeroom-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJournal)
      })
      if (!res.ok) throw new Error('Gagal menambah jurnal wali kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeroom-journals'] })
      handleCloseDialog()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedJournal: any) => {
      const { id, ...payload } = updatedJournal;
      const res = await authenticatedFetch(`/api-backend/homeroom-journals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui jurnal wali kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeroom-journals'] })
      handleCloseDialog()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/homeroom-journals/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus jurnal wali kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeroom-journals'] })
    }
  })

  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({ id: '', date: new Date().toISOString().split('T')[0], notes: '', actionTaken: '', teacherId: '' })
    setOpen(true)
  }

  const handleOpenEditDialog = (item: any) => {
    setIsEdit(true)
    setFormData({ 
      id: item.id, 
      date: new Date(item.date).toISOString().split('T')[0], 
      notes: item.notes || '', 
      actionTaken: item.actionTaken || '', 
      teacherId: item.teacherId || '' 
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', date: new Date().toISOString().split('T')[0], notes: '', actionTaken: '', teacherId: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus data jurnal wali kelas ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      date: new Date(formData.date).toISOString()
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jurnal Wali Kelas</h1>
          <p className="text-slate-500 mt-1">Catatan kejadian, bimbingan, dan pembinaan siswa oleh Wali Kelas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            Cetak PDF
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tulis Jurnal Wali
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{isEdit ? 'Ubah Jurnal Wali Kelas' : 'Tulis Jurnal Wali Kelas'}</DialogTitle>
                  <DialogDescription>
                    {isEdit ? 'Perbarui catatan kejadian atau bimbingan.' : 'Masukkan catatan bimbingan atau kejadian untuk kelas perwalian Anda.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Wali Kelas</Label>
                    <Select value={formData.teacherId} onValueChange={(v) => setFormData({...formData, teacherId: v || ''})} required>
                      <SelectTrigger><SelectValue placeholder="Pilih Wali Kelas" /></SelectTrigger>
                      <SelectContent>
                        {teachers?.map(t => <SelectItem key={t.id} value={t.id}>{t.user?.name || t.nip}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan Kejadian / Bimbingan</Label>
                    <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Deskripsikan catatan..." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tindak Lanjut (Opsional)</Label>
                    <Input value={formData.actionTaken} onChange={e => setFormData({...formData, actionTaken: e.target.value})} placeholder="Tindakan yang telah diambil..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600">
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Simpan
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Daftar Catatan Wali Kelas</CardTitle>
            <CardDescription>Menampilkan log bimbingan dan kejadian terkait kelas perwalian.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari catatan/tindak lanjut..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px] pl-6">Tanggal</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead>Catatan Kejadian</TableHead>
                <TableHead>Tindak Lanjut</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filterDataBySearch(journals, searchQuery)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    {searchQuery ? 'Tidak ada catatan yang sesuai dengan pencarian.' : 'Belum ada jurnal wali kelas.'}
                  </TableCell>
                </TableRow>
              ) : (
                filterDataBySearch(journals, searchQuery)?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-slate-500">
                      {new Date(item.date).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">{item.teacher?.user?.name || '-'}</TableCell>
                    <TableCell>{item.notes}</TableCell>
                    <TableCell className="text-slate-600">{item.actionTaken || '-'}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
