'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Loader2, Pencil, Trash2, Search, Users, UserCheck, 
  Phone, Key, RefreshCw, Sparkles, AlertCircle, 
  GraduationCap, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type ConnectedStudent = {
  id: string
  nis: string
  nisn: string
  name: string
  className: string
  gradeLevel?: number
  relation?: string
}

type ParentUser = {
  id: string
  parentProfileId?: string
  name: string
  username: string
  phone: string
  email?: string
  role: string
  occupation?: string
  address?: string
  connectedStudents: ConnectedStudent[]
  primaryNis: string
  createdAt: string
}

type AvailableStudent = {
  id: string
  nis: string
  nisn: string
  name: string
  className: string
  gradeLevel?: number
  parentPhone?: string
  parentName?: string
  hasParentAccount: boolean
  linkedParents: {
    parentUserId: string
    parentName: string
    phone: string
  }[]
}

export default function WaliMuridPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    relation: 'ORANG_TUA',
    occupation: '',
    address: '',
  })

  // Delete states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [parentToDelete, setParentToDelete] = useState<ParentUser | null>(null)
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false)
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])

  // Sync Dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)

  // Fetch Parents
  const { data: parents = [], isLoading: isLoadingParents } = useQuery<ParentUser[]>({
    queryKey: ['parents'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents')
      if (!res.ok) throw new Error('Gagal memuat data wali murid')
      return res.json()
    },
  })

  // Fetch Available Students for Linking
  const { data: availableStudents = [], isLoading: isLoadingStudents } = useQuery<AvailableStudent[]>({
    queryKey: ['available-students-for-parent'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/available-students')
      if (!res.ok) throw new Error('Gagal memuat data siswa')
      return res.json()
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menambahkan akun wali murid')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      queryClient.invalidateQueries({ queryKey: ['available-students-for-parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      handleCloseDialog()
      alert('Akun wali murid berhasil dibuat!')
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menambahkan akun wali murid')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await authenticatedFetch(`/api-backend/parents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal memperbarui akun wali murid')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      queryClient.invalidateQueries({ queryKey: ['available-students-for-parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      handleCloseDialog()
      alert('Akun wali murid berhasil diperbarui!')
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal memperbarui akun wali murid')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/parents/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menghapus data')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      queryClient.invalidateQueries({ queryKey: ['available-students-for-parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setParentToDelete(null)
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menghapus data')
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await authenticatedFetch('/api-backend/parents/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menghapus data terpilih')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      queryClient.invalidateQueries({ queryKey: ['available-students-for-parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setSelectedParentIds([])
      setIsBulkDeleteMode(false)
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menghapus data terpilih')
    },
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch('/api-backend/parents/sync-from-students', {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal melakukan sinkronisasi')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parents'] })
      queryClient.invalidateQueries({ queryKey: ['available-students-for-parent'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSyncDialogOpen(false)
      alert(data.message || 'Sinkronisasi berhasil diselesaikan!')
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal melakukan sinkronisasi')
    },
  })

  // Handlers
  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({
      id: '',
      name: '',
      phone: '',
      email: '',
      password: '',
      relation: 'ORANG_TUA',
      occupation: '',
      address: '',
    })
    setSelectedStudentIds([])
    setStudentSearch('')
    setOpen(true)
  }

  const handleOpenEditDialog = (parent: ParentUser) => {
    setIsEdit(true)
    setFormData({
      id: parent.id,
      name: parent.name || '',
      phone: parent.phone || parent.username || '',
      email: parent.email || '',
      password: '',
      relation: parent.connectedStudents[0]?.relation || 'ORANG_TUA',
      occupation: parent.occupation || '',
      address: parent.address || '',
    })
    setSelectedStudentIds(parent.connectedStudents.map((s) => s.id))
    setStudentSearch('')
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setSelectedStudentIds([])
    setStudentSearch('')
  }

  const handleToggleStudent = (student: AvailableStudent) => {
    if (selectedStudentIds.includes(student.id)) {
      setSelectedStudentIds((prev) => prev.filter((id) => id !== student.id))
    } else {
      setSelectedStudentIds((prev) => [...prev, student.id])
      // Auto-fill jika nama wali masih kosong
      if (!formData.name && student.parentName) {
        setFormData((prev) => ({ ...prev, name: student.parentName || '' }))
      }
      // Auto-fill jika nomor telepon masih kosong
      if (!formData.phone && student.parentPhone && student.parentPhone !== '088293733330') {
        setFormData((prev) => ({ ...prev, phone: student.parentPhone || '' }))
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = (formData.phone || '').trim()
    if (!cleanPhone) {
      alert('Nomor WhatsApp / telepon wajib diisi untuk username dan notifikasi WhatsApp!')
      return
    }

    if (selectedStudentIds.length === 0) {
      alert('Pilih minimal satu siswa yang terhubung dengan wali murid ini!')
      return
    }

    const payload: any = {
      name: formData.name.trim() || `Wali Murid (${cleanPhone})`,
      phone: cleanPhone,
      email: formData.email.trim() || undefined,
      studentIds: selectedStudentIds,
      relation: formData.relation,
      occupation: formData.occupation || undefined,
      address: formData.address || undefined,
    }

    if (formData.password && formData.password.trim() !== '') {
      payload.password = formData.password.trim()
    }

    if (isEdit) {
      updateMutation.mutate({ id: formData.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  // Filtered Parents
  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents
    const q = searchQuery.toLowerCase()
    return parents.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q)
      const matchPhone = p.phone?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
      const matchStudents = p.connectedStudents?.some(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.nis.toLowerCase().includes(q) ||
          st.nisn?.toLowerCase().includes(q) ||
          st.className.toLowerCase().includes(q)
      )
      return matchName || matchPhone || matchStudents
    })
  }, [parents, searchQuery])

  // Filtered Students for Modal Selection
  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearch.trim()) return availableStudents.slice(0, 30)
    const q = studentSearch.toLowerCase()
    return availableStudents
      .filter(
        (st) =>
          st.name.toLowerCase().includes(q) ||
          st.nis.toLowerCase().includes(q) ||
          st.nisn?.toLowerCase().includes(q) ||
          st.className.toLowerCase().includes(q)
      )
      .slice(0, 40)
  }, [availableStudents, studentSearch])

  // Statistics
  const totalParents = parents.length
  const totalConnectedStudents = parents.reduce((acc, p) => acc + (p.connectedStudents?.length || 0), 0)
  const studentsWithParent = availableStudents.filter((s) => s.hasParentAccount).length
  const studentsWithoutParent = availableStudents.length - studentsWithParent

  const isAllSelected = filteredParents.length > 0 && filteredParents.every((p) => selectedParentIds.includes(p.id))

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedParentIds(filteredParents.map((p) => p.id))
    } else {
      setSelectedParentIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedParentIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Data Wali Murid
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola data akun orang tua / wali yang terhubung dengan siswa untuk akses sistem, notifikasi WhatsApp, dan laporan siswa.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedParentIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => {
                setIsBulkDeleteMode(true)
                setDeleteDialogOpen(true)
              }}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedParentIds.length}) Terpilih
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setSyncDialogOpen(true)}
            className="border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Sinkronkan dari Siswa
          </Button>
          <Button onClick={handleOpenAddDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Tambah Wali Murid
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-100 dark:border-indigo-950/50 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Akun Wali</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalParents}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Akun orang tua terdaftar</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl text-indigo-600 dark:text-indigo-300">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 dark:border-emerald-950/50 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Siswa Terhubung</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalConnectedStudents}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total relasi wali-siswa</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-300">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 dark:border-blue-950/50 bg-gradient-to-br from-blue-50/50 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Siswa Ber-Wali</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{studentsWithParent}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Siswa telah memiliki akun wali</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-300">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-amber-950/50 bg-gradient-to-br from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Belum Ada Akun</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{Math.max(0, studentsWithoutParent)}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Siswa belum terhubung wali</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-300">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Daftar Akun Pengguna Wali Murid</CardTitle>
              <CardDescription>
                Username login berupa No. WhatsApp aktif, dengan kata sandi default berupa NIS siswa.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari wali, no HP, NIS, siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TableHead>
                  <TableHead>Nama Wali Murid</TableHead>
                  <TableHead>No. WhatsApp / Username</TableHead>
                  <TableHead>Siswa Terhubung</TableHead>
                  <TableHead>Password Awal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingParents ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                      <p className="text-sm text-slate-500 mt-2">Memuat data wali murid...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">Belum ada data wali murid</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Gunakan tombol &quot;Tambah Wali Murid&quot; untuk menambah manual atau klik &quot;Sinkronkan dari Siswa&quot; untuk membuat otomatis.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => {
                    const isSelected = selectedParentIds.includes(parent.id)
                    return (
                      <TableRow key={parent.id} className={isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(parent.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                            {parent.name}
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                              Wali Murid
                            </Badge>
                          </div>
                          {parent.occupation && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pekerjaan: {parent.occupation}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {parent.phone || parent.username}
                            </span>
                            {parent.phone && parent.phone !== '-' && (
                              <a
                                href={`https://wa.me/${parent.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400"
                                title="Buka WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">Username Login</span>
                        </TableCell>
                        <TableCell>
                          {parent.connectedStudents && parent.connectedStudents.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {parent.connectedStudents.map((st) => (
                                <div
                                  key={st.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                                >
                                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">NIS: {st.nis}</span>
                                  <span className="text-slate-800 dark:text-slate-200 font-medium">{st.name}</span>
                                  <span className="text-slate-400">({st.className})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Belum terhubung
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs border border-amber-200 dark:border-amber-800/60">
                            <Key className="w-3 h-3" />
                            {parent.primaryNis !== '-' ? parent.primaryNis : 'Sesuai NIS Siswa'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(parent)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                              title="Edit Data Wali Murid & Relasi Siswa"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsBulkDeleteMode(false)
                                setParentToDelete(parent)
                                setDeleteDialogOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Modal Tambah / Edit Wali Murid */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Users className="w-5 h-5" />
                {isEdit ? 'Ubah Data Akun Wali Murid' : 'Tambah Akun Wali Murid Baru'}
              </DialogTitle>
              <DialogDescription>
                Hubungkan satu akun wali murid dengan satu atau beberapa siswa untuk monitoring dan notifikasi WhatsApp.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Step 1: Pilih Siswa Terhubung */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    Pilih Siswa yang Terhubung *
                  </Label>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                    {selectedStudentIds.length} Siswa Dipilih
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Satu akun wali dapat terhubung dengan 1 siswa atau lebih (misal: adik-kakak di sekolah).
                </p>

                {/* Input Pencarian Siswa */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari berdasarkan nama siswa, NIS, NISN, atau kelas..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-white dark:bg-slate-950"
                  />
                </div>

                {/* List Siswa */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 border rounded-md p-2 bg-white dark:bg-slate-950">
                  {isLoadingStudents ? (
                    <div className="text-center py-4 text-xs text-slate-500">Memuat daftar siswa...</div>
                  ) : filteredAvailableStudents.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">Siswa tidak ditemukan</div>
                  ) : (
                    filteredAvailableStudents.map((st) => {
                      const isChecked = selectedStudentIds.includes(st.id)
                      return (
                        <div
                          key={st.id}
                          onClick={() => handleToggleStudent(st)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs transition-colors ${
                            isChecked
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white mr-2">{st.name}</span>
                              <span className="text-slate-500 font-mono">NIS: {st.nis}</span>
                              <span className="text-slate-400 ml-1">({st.className})</span>
                            </div>
                          </div>
                          {st.parentName && (
                            <span className="text-[11px] text-slate-400 hidden sm:inline">
                              Orang Tua: {st.parentName}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Data Wali Murid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Nama Lengkap Wali Murid *</Label>
                  <Input
                    id="parentName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Bapak Ahmad Fauzi"
                    required
                  />
                  <p className="text-[11px] text-slate-500">Nama orang tua / wali siswa.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhone">No. WhatsApp Aktif (Username) *</Label>
                  <Input
                    id="parentPhone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    required
                  />
                  <p className="text-[11px] text-slate-500">Digunakan sebagai username login & tujuan notifikasi WA.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relation">Hubungan dengan Siswa</Label>
                  <Select
                    value={formData.relation}
                    onValueChange={(val) => setFormData({ ...formData, relation: val || 'ORANG_TUA' })}
                  >
                    <SelectTrigger id="relation">
                      <SelectValue placeholder="Pilih Hubungan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AYAH">Ayah Kandung</SelectItem>
                      <SelectItem value="IBU">Ibu Kandung</SelectItem>
                      <SelectItem value="WALI">Wali Murid</SelectItem>
                      <SelectItem value="ORANG_TUA">Orang Tua / Keluarga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Pekerjaan (Opsional)</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="Contoh: Wiraswasta / PNS / Guru"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi / Password (Opsional)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={
                    isEdit
                      ? 'Kosongkan jika tidak ingin mengubah password'
                      : 'Default otomatis menggunakan NIS siswa'
                  }
                />
                {!isEdit && (
                  <p className="text-[11px] text-slate-500">
                    Jika dikosongkan, password awal otomatis disetel sama dengan NIS siswa yang terhubung.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat Tempat Tinggal (Opsional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Contoh: Jl. Ahmad Yani No. 12, Sleman"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isEdit ? 'Simpan Perubahan' : 'Buat Akun Wali Murid'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Sinkronisasi Otomatis */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-5 h-5" />
              Sinkronisasi Akun dari Data Siswa
            </DialogTitle>
            <DialogDescription>
              Fitur ini akan secara otomatis memindai seluruh data siswa yang memiliki informasi No. WhatsApp orang tua / biodata ayah/ibu/wali, lalu membuatkan akun Wali Murid dengan kredensial:
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg text-xs space-y-2 text-slate-700 dark:text-slate-300 border border-indigo-100 dark:border-indigo-900">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>Username:</strong> Nomor WhatsApp orang tua siswa</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>Password Awal:</strong> Nomor Induk Siswa (NIS)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><strong>Nama Akun:</strong> Tersinkronisasi otomatis dari nama Ayah / Ibu / Wali di biodata siswa</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Mulai Sinkronisasi Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {isBulkDeleteMode ? 'Hapus Pengguna Terpilih' : 'Hapus Akun Wali Murid'}
            </DialogTitle>
            <DialogDescription>
              {isBulkDeleteMode
                ? `Apakah Anda yakin ingin menghapus ${selectedParentIds.length} akun wali murid yang dipilih? Tindakan ini tidak dapat dibatalkan.`
                : `Apakah Anda yakin ingin menghapus akun wali murid "${parentToDelete?.name}" (${parentToDelete?.phone})?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (isBulkDeleteMode) {
                  bulkDeleteMutation.mutate(selectedParentIds)
                } else if (parentToDelete) {
                  deleteMutation.mutate(parentToDelete.id)
                }
              }}
              disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
