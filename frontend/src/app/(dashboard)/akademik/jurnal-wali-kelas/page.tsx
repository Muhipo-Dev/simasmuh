'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2, User, Users, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

export default function HomeroomJournalsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const userRolesList = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean)
  const isSuperAdmin = userRolesList.some(r => ['SUPERADMIN', 'ADMIN_IT', 'ADMIN'].includes(r))
  const isWaliKelas = userRolesList.includes('WALI_KELAS') || userRolesList.includes('GURU')

  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    actionTaken: '',
    teacherId: '',
    studentName: ''
  })

  // 1. Data Jurnal
  const { data: journals, isLoading } = useQuery<any[]>({
    queryKey: ['homeroom-journals', userId],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/homeroom-journals')
      if (!res.ok) throw new Error('Gagal memuat data jurnal wali kelas')
      return res.json()
    }
  })

  // 2. Data Guru
  const { data: teachers } = useQuery<any[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      return res.json()
    }
  })

  // 3. Data Kelas & Siswa
  const { data: classes } = useQuery<any[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      return res.json()
    }
  })

  const { data: allStudents } = useQuery<any[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      return res.json()
    }
  })

  // Cari Guru & Kelas Perwalian yang terhubung dengan Akun yang Login
  const currentTeacher = teachers?.find((t: any) => 
    t.userId === userId || 
    t.id === user?.teacherProfile?.id ||
    t.id === user?.teacherId ||
    t.user?.id === userId || 
    (t.user?.email && user?.email && t.user?.email === user?.email) ||
    (t.user?.username && user?.username && t.user?.username === user?.username) ||
    (t.user?.name && user?.name && t.user?.name.trim().toLowerCase() === user?.name.trim().toLowerCase())
  )

  const myHomeroomClass = classes?.find((c: any) => 
    (currentTeacher?.id && c.homeroomTeacherId === currentTeacher.id) ||
    c.homeroomTeacher?.userId === userId ||
    c.homeroomTeacher?.user?.id === userId ||
    (c.homeroomTeacher?.user?.email && user?.email && c.homeroomTeacher?.user?.email === user?.email) ||
    (c.homeroomTeacher?.user?.name && user?.name && c.homeroomTeacher?.user?.name.trim().toLowerCase() === user?.name.trim().toLowerCase())
  )

  // Kelas yang sedang aktif untuk form (jika superadmin memilih guru lain, gunakan kelas guru tersebut)
  const selectedTeacher = formData.teacherId ? teachers?.find((t: any) => t.id === formData.teacherId) : currentTeacher
  const activeHomeroomClass = myHomeroomClass || classes?.find((c: any) => 
    (selectedTeacher?.id && c.homeroomTeacherId === selectedTeacher.id) ||
    c.homeroomTeacher?.userId === selectedTeacher?.userId ||
    c.homeroomTeacher?.user?.id === selectedTeacher?.userId
  )

  // Filter siswa: jika wali kelas / ada kelas perwalian aktif, tampilkan siswa di kelas perwaliannya
  const availableStudents = (allStudents || []).filter((s: any) => {
    if (activeHomeroomClass) return s.classId === activeHomeroomClass.id
    if (isSuperAdmin && !myHomeroomClass) return true
    return true
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
      const { id, ...payload } = updatedJournal
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
    const initialTeacherId = currentTeacher?.id || (myHomeroomClass?.homeroomTeacherId) || (teachers && teachers.length > 0 ? teachers[0].id : '')
    setFormData({
      id: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      actionTaken: '',
      teacherId: initialTeacherId,
      studentName: ''
    })
    setOpen(true)
  }

  const handleOpenEditDialog = (item: any) => {
    setIsEdit(true)
    setFormData({ 
      id: item.id, 
      date: new Date(item.date).toISOString().split('T')[0], 
      notes: item.notes || '', 
      actionTaken: item.actionTaken || '', 
      teacherId: item.teacherId || '',
      studentName: ''
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', date: new Date().toISOString().split('T')[0], notes: '', actionTaken: '', teacherId: '', studentName: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus data jurnal wali kelas ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Jika ada siswa yang dipilih dan belum ada di notes, sertakan identitas siswa
    let finalNotes = formData.notes
    if (formData.studentName && !formData.notes.startsWith(`[${formData.studentName}]`)) {
      finalNotes = `[${formData.studentName}] ${formData.notes}`
    }

    const payload = {
      teacherId: formData.teacherId || currentTeacher?.id || teachers?.[0]?.id,
      notes: finalNotes,
      actionTaken: formData.actionTaken,
      date: new Date(formData.date).toISOString()
    }

    if (isEdit) {
      updateMutation.mutate({ id: formData.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Filter jurnal milik wali kelas yang login jika bukan superadmin
  const displayedJournals = (journals || []).filter((j: any) => {
    if (isSuperAdmin) return true
    if (currentTeacher?.id) return j.teacherId === currentTeacher.id
    if (user?.teacherProfile?.id) return j.teacherId === user.teacherProfile.id
    return true
  })

  const searchedJournals = filterDataBySearch(displayedJournals, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Jurnal Wali Kelas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Catatan kejadian, bimbingan, dan pembinaan siswa {myHomeroomClass ? `kelas ${myHomeroomClass.name}` : 'oleh Wali Kelas'}.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tulis Jurnal Wali
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{isEdit ? 'Ubah Jurnal Wali Kelas' : 'Tulis Jurnal Wali Kelas'}</DialogTitle>
                  <DialogDescription>
                    {isEdit ? 'Perbarui catatan kejadian atau bimbingan.' : 'Masukkan catatan bimbingan atau kejadian untuk siswa di kelas perwalian Anda.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Info Wali Kelas & Kelas Terhubung */}
                  {activeHomeroomClass ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-blue-900 dark:text-blue-200">
                          Kelas Perwalian: <span className="font-bold underline">{activeHomeroomClass.name}</span>
                        </span>
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 font-medium">
                        {activeHomeroomClass.homeroomTeacher?.user?.name || selectedTeacher?.user?.name || currentTeacher?.user?.name || user?.name}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Tanggal</Label>
                      <Input 
                        type="date" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        required 
                      />
                    </div>

                    {/* Jika Superadmin/tidak terdeteksi, pilih wali kelas. Jika Wali Kelas, otomatis terpasang */}
                    {isSuperAdmin && !myHomeroomClass ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Wali Kelas</Label>
                        <Select 
                          value={formData.teacherId} 
                          onValueChange={(v) => setFormData({...formData, teacherId: v || ''})} 
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Wali Kelas">
                              {teachers?.find(t => t.id === formData.teacherId)?.user?.name || 'Pilih Wali Kelas'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {teachers?.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.user?.name || t.nip}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Wali Kelas Pengampu</Label>
                        <Input 
                          disabled 
                          value={activeHomeroomClass?.homeroomTeacher?.user?.name || currentTeacher?.user?.name || user?.name || 'Wali Kelas'} 
                          className="bg-slate-100 dark:bg-slate-800 font-medium cursor-not-allowed text-xs" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Dropdown Pilih Siswa Kelas */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Pilih Siswa (Kelas Perwalian)</span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        {availableStudents.length} Siswa Terdaftar
                      </span>
                    </Label>
                    <Select 
                      value={formData.studentName} 
                      onValueChange={(v) => setFormData({ ...formData, studentName: v || '' })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-- Pilih Siswa Terkait (Opsional / Spesifik Siswa) --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {availableStudents.map((s: any) => (
                          <SelectItem key={s.id} value={`${s.name} (${s.nis || s.nisn || s.class?.name})`}>
                            {s.name} - {s.nis ? `NIS: ${s.nis}` : (s.class?.name || 'Siswa')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Catatan Kejadian / Bimbingan</Label>
                    <Input 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
                      placeholder="Masukkan catatan bimbingan / kejadian..." 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tindak Lanjut (Opsional)</Label>
                    <Input 
                      value={formData.actionTaken} 
                      onChange={e => setFormData({...formData, actionTaken: e.target.value})} 
                      placeholder="Tindakan yang telah diambil..." 
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600">
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Simpan Jurnal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold dark:text-slate-100">Daftar Catatan Wali Kelas</CardTitle>
            <CardDescription className="dark:text-slate-400 text-xs">
              Log pembinaan dan evaluasi berkala siswa perwalian.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari catatan / siswa / tindak lanjut..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
              <TableRow>
                <TableHead className="w-[120px] pl-6 text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold">Wali Kelas</TableHead>
                <TableHead className="text-xs font-semibold">Catatan Kejadian / Bimbingan</TableHead>
                <TableHead className="text-xs font-semibold">Tindak Lanjut</TableHead>
                <TableHead className="text-right pr-6 text-xs font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-6 h-6 border-blue-600 text-blue-600 animate-spin mb-2" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : searchedJournals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500 dark:text-slate-400">
                    {searchQuery ? 'Tidak ada catatan yang sesuai dengan pencarian.' : 'Belum ada jurnal wali kelas.'}
                  </TableCell>
                </TableRow>
              ) : (
                searchedJournals.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <TableCell className="pl-6 font-medium text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-200 text-xs">
                      {item.teacher?.user?.name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-800 dark:text-slate-200 max-w-md">
                      {item.notes}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                      {item.actionTaken || '-'}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenEditDialog(item)} 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)} 
                          disabled={deleteMutation.isPending} 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

