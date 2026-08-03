'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type User = {
  id: string
  name: string
  email: string
  username?: string
  nipNbm?: string
  teacherProfile?: { nip?: string }
  role: string
  subRole?: string
  subRole2?: string
  subRole3?: string
  createdAt: string
}

export const SUB_ROLE_OPTIONS = [
  { value: 'NONE', label: 'Tanpa Sub Role' },
  { value: 'GURU', label: 'Guru' },
  { value: 'PEGAWAI', label: 'Pegawai / Karyawan' },
  { value: 'ADMIN_WEB', label: 'Admin Web' },
  { value: 'PEMBINA_EKSTRA', label: 'Pembina Ekstrakulikuler' },
  { value: 'KETERTIBAN', label: 'Ketertiban' },
  { value: 'KEBERSIHAN', label: 'Kebersihan' },
  { value: 'KEAMANAN', label: 'Keamanan' },
  { value: 'KEPEGAWAIAN', label: 'Kepegawaian' },
  { value: 'BK_BP', label: 'BK/BP' },
  { value: 'PUSTAKAWAN', label: 'Pustakawan' },
  { value: 'GURU_TAHFIDZ', label: 'Guru Tahfidz' },
  { value: 'PERSURATAN', label: 'Persuratan' },
  { value: 'WALI_KELAS', label: 'Wali Kelas' },
  { value: 'GURU_PIKET', label: 'Guru Piket' },
  { value: 'PETUGAS_SPMB', label: 'Petugas SPMB' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'KURIKULUM', label: 'Kurikulum' },
]

export const SUB_ROLE_LABELS: Record<string, string> = {
  GURU: 'Guru',
  PEGAWAI: 'Pegawai / Karyawan',
  ADMIN_WEB: 'Admin Web',
  PEMBINA_EKSTRA: 'Pembina Ekstrakulikuler',
  KETERTIBAN: 'Ketertiban',
  KEBERSIHAN: 'Kebersihan',
  KEAMANAN: 'Keamanan',
  KEPEGAWAIAN: 'Kepegawaian',
  BK_BP: 'BK/BP',
  PUSTAKAWAN: 'Pustakawan',
  GURU_TAHFIDZ: 'Guru Tahfidz',
  PERSURATAN: 'Persuratan',
  WALI_KELAS: 'Wali Kelas',
  GURU_PIKET: 'Guru Piket',
  PETUGAS_SPMB: 'Petugas SPMB',
  KEUANGAN: 'Keuangan',
  KURIKULUM: 'Kurikulum',
}

export default function UsersPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({ id: '', name: '', username: '', nipNbm: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE' })

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/users')
      if (!res.ok) throw new Error('Gagal memuat data pengguna')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newUser: any) => {
      const res = await authenticatedFetch('/api-backend/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (!res.ok) throw new Error('Gagal menambah pengguna')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      handleCloseDialog()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedUser: any) => {
      const res = await authenticatedFetch(`/api-backend/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })
      if (!res.ok) throw new Error('Gagal memperbarui pengguna')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      handleCloseDialog()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/users/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus pengguna')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({ id: '', name: '', username: '', nipNbm: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE' })
    setOpen(true)
  }

  const handleOpenEditDialog = (user: User) => {
    setIsEdit(true)
    setFormData({ 
      id: user.id, 
      name: user.name, 
      username: user.username || '',
      nipNbm: user.nipNbm || user.teacherProfile?.nip || '',
      email: user.email, 
      password: '', 
      role: user.role, 
      subRole: user.subRole || 'NONE',
      subRole2: user.subRole2 || 'NONE',
      subRole3: user.subRole3 || 'NONE'
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', name: '', username: '', nipNbm: '', email: '', password: '', role: 'GURU', subRole: 'NONE', subRole2: 'NONE', subRole3: 'NONE' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus akun ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSubmit = {
      ...formData,
      subRole: formData.subRole === 'NONE' ? null : formData.subRole,
      subRole2: formData.subRole2 === 'NONE' ? null : formData.subRole2,
      subRole3: formData.subRole3 === 'NONE' ? null : formData.subRole3
    }
    
    if (isEdit) {
      updateMutation.mutate(dataToSubmit)
    } else {
      createMutation.mutate(dataToSubmit)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manajemen Akun Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data login dan hak akses pengguna sistem.</p>
        </div>
        <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Akun
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna'}</DialogTitle>
              <DialogDescription>
                {isEdit ? 'Ubah data atau perbarui password pengguna.' : 'Buat akun pengguna baru untuk mengakses aplikasi.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Ahmad Dahlan, S.Pd."
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username (Opsional)</Label>
                  <Input 
                    id="username" 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Contoh: ahmaddahlan" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nipNbm">NIP / NBM (Opsional)</Label>
                  <Input 
                    id="nipNbm" 
                    value={formData.nipNbm}
                    onChange={(e) => setFormData({ ...formData, nipNbm: e.target.value })}
                    placeholder="Contoh: 19850101..." 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contoh: ahmad@sekolah.sch.id"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password *'}</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role Utama *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(val) => setFormData({ ...formData, role: val || 'GURU' })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GURU">GURU (Guru)</SelectItem>
                    <SelectItem value="PEGAWAI">PEGAWAI (Karyawan / Staf)</SelectItem>
                    <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
                    <SelectItem value="ADMIN_IT">ADMIN IT</SelectItem>
                    <SelectItem value="KEPALA_SEKOLAH">KEPALA SEKOLAH</SelectItem>
                    <SelectItem value="KEUANGAN">KEUANGAN (Bendahara)</SelectItem>
                    <SelectItem value="SISWA">SISWA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="subRole" className="text-xs">Sub Role 1</Label>
                  <Select 
                    value={formData.subRole} 
                    onValueChange={(val) => setFormData({ ...formData, subRole: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole" className="text-xs">
                      <SelectValue placeholder="Pilih Sub Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subRole2" className="text-xs">Sub Role 2</Label>
                  <Select 
                    value={formData.subRole2} 
                    onValueChange={(val) => setFormData({ ...formData, subRole2: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole2" className="text-xs">
                      <SelectValue placeholder="Pilih Sub Role 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subRole3" className="text-xs">Sub Role 3</Label>
                  <Select 
                    value={formData.subRole3} 
                    onValueChange={(val) => setFormData({ ...formData, subRole3: val || 'NONE' })}
                  >
                    <SelectTrigger id="subRole3" className="text-xs">
                      <SelectValue placeholder="Pilih Sub Role 3" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEdit ? 'Simpan Perubahan' : 'Simpan Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Daftar Pengguna</CardTitle>
            <CardDescription>Menampilkan semua pengguna yang memiliki akses ke sistem.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari pengguna (nama/email/username)..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px] pl-6">No</TableHead>
                <TableHead>Nama Pengguna</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>NIP / NBM</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sub Role 1</TableHead>
                <TableHead>Sub Role 2</TableHead>
                <TableHead>Sub Role 3</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filterDataBySearch(users, searchQuery)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                    {searchQuery ? 'Tidak ada akun pengguna yang sesuai dengan pencarian.' : 'Belum ada data pengguna.'}
                  </TableCell>
                </TableRow>
              ) : (
                filterDataBySearch(users, searchQuery)?.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6 font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-900 dark:text-white">{item.name}</TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400">{item.username || '-'}</TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400">{item.nipNbm || item.teacherProfile?.nip || '-'}</TableCell>
                    <TableCell className="text-slate-400 text-xs font-mono">••••••••</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        item.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                        item.role === 'ADMIN_IT' ? 'bg-indigo-100 text-indigo-800' :
                        item.role === 'KEPALA_SEKOLAH' ? 'bg-amber-100 text-amber-800' :
                        item.role === 'GURU' ? 'bg-emerald-100 text-emerald-800' :
                        item.role === 'PEGAWAI' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {item.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.subRole ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {SUB_ROLE_LABELS[item.subRole] || item.subRole}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.subRole2 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {SUB_ROLE_LABELS[item.subRole2] || item.subRole2}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.subRole3 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                          {SUB_ROLE_LABELS[item.subRole3] || item.subRole3}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(item)}>
                        <Pencil className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-600" />
                      </Button>
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
