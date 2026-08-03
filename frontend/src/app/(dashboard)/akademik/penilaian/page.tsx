'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function GradesPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    type: 'TUGAS',
    score: '',
    studentId: '',
    subjectId: '',
    semester: '1'
  })

  const { data: grades, isLoading } = useQuery<any[]>({
    queryKey: ['grades'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/grades')
      if (!res.ok) throw new Error('Gagal memuat data nilai')
      return res.json()
    }
  })

  const { data: students } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      return res.json()
    }
  })

  const { data: subjects } = useQuery<any[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newGrade: any) => {
      const res = await authenticatedFetch('/api-backend/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGrade)
      })
      if (!res.ok) throw new Error('Gagal menambah nilai')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      handleCloseDialog()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedGrade: any) => {
      const { id, ...payload } = updatedGrade;
      const res = await authenticatedFetch(`/api-backend/grades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui nilai')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
      handleCloseDialog()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/grades/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus nilai')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] })
    }
  })

  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({ id: '', type: 'TUGAS', score: '', studentId: '', subjectId: '', semester: '1' })
    setOpen(true)
  }

  const handleOpenEditDialog = (item: any) => {
    setIsEdit(true)
    setFormData({ 
      id: item.id, 
      type: item.type, 
      score: item.score?.toString() || '0', 
      studentId: item.studentId || '', 
      subjectId: item.subjectId || '', 
      semester: item.semester?.toString() || '1' 
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', type: 'TUGAS', score: '', studentId: '', subjectId: '', semester: '1' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus data nilai ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...formData,
      score: parseFloat(formData.score),
      semester: parseInt(formData.semester)
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rekap Nilai Siswa</h1>
          <p className="text-slate-500 mt-1">Kelola input nilai tugas, UTS, dan UAS siswa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            Cetak PDF
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Input Nilai
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{isEdit ? 'Ubah Data Nilai' : 'Input Nilai Baru'}</DialogTitle>
                  <DialogDescription>
                    {isEdit ? 'Ubah detail data nilai siswa di bawah ini.' : 'Masukkan nilai siswa untuk mata pelajaran tertentu.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Siswa</Label>
                    <Select value={formData.studentId} onValueChange={(v) => setFormData({...formData, studentId: v || ''})} required>
                      <SelectTrigger><SelectValue placeholder="Pilih Siswa" /></SelectTrigger>
                      <SelectContent>
                        {students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.nisn})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mata Pelajaran</Label>
                    <Select value={formData.subjectId} onValueChange={(v) => setFormData({...formData, subjectId: v || ''})} required>
                      <SelectTrigger><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
                      <SelectContent>
                        {subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jenis Ujian</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v || ''})}>
                        <SelectTrigger><SelectValue placeholder="Pilih Jenis" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TUGAS">Tugas</SelectItem>
                          <SelectItem value="UTS">UTS</SelectItem>
                          <SelectItem value="UAS">UAS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Semester</Label>
                      <Select value={formData.semester} onValueChange={(v) => setFormData({...formData, semester: v || ''})}>
                        <SelectTrigger><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Ganjil (1)</SelectItem>
                          <SelectItem value="2">Genap (2)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Skor (0-100)</Label>
                    <Input type="number" min="0" max="100" step="0.01" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} required />
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
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle>Daftar Nilai Masuk</CardTitle>
          <CardDescription>Menampilkan log nilai yang baru saja dimasukkan ke sistem.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px] pl-6">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Jenis Ujian</TableHead>
                <TableHead className="text-right">Skor</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : grades?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    Belum ada data nilai. Silakan input nilai baru.
                  </TableCell>
                </TableRow>
              ) : (
                grades?.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-900">{item.student?.name || 'Unknown'}</TableCell>
                    <TableCell>{item.subject?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {item.score}
                    </TableCell>
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
