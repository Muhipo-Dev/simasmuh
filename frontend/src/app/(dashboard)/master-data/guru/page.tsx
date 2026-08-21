'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2, Trash2, FileSpreadsheet, Pencil, CheckSquare, Edit3, ShieldCheck } from 'lucide-react'
import { ImportProgressDialog, ImportProgressState } from '@/components/ImportProgressDialog'
import Swal from 'sweetalert2'
import { confirmDelete } from '@/lib/swal-helper'

const CHUNK_SIZE = 20

type Teacher = {
  id: string
  nip: string
  phone: string
  user: {
    username: string
    name: string
    email: string
    nipNbm?: string
  }
  schedules?: Array<{
    id: string
    day: string
    startTime: string
    endTime: string
    subject?: { name: string; code: string }
    class?: { name: string }
  }>
  homeroomClasses?: Array<{
    id: string
    name: string
  }>
}

export default function TeachersPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const subRole = (session?.user as any)?.subRole || ''
  const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'KURIKULUM', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole)
  const isKepalaSekolah = userRole === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH'
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState('')
  const [formData, setFormData] = useState({ nip: '', name: '', username: '', email: '', phone: '', password: '' })

  // Bulk Selection & Edit States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    updatePhone: false,
    phone: '',
    updatePassword: false,
    password: ''
  })
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false)

  // Import Progress State
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    status: 'idle',
    totalRows: 0,
    totalBatches: 0,
    currentBatch: 0,
    successCount: 0,
    errorCount: 0,
    errorMessages: [],
    label: 'Guru',
  })
  const abortRef = useRef(false)

  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) throw new Error('Gagal memuat data guru')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newTeacher: typeof formData) => {
      const res = await authenticatedFetch('/api-backend/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher)
      })
      if (!res.ok) throw new Error('Gagal menambah guru')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setOpen(false)
      setFormData({ nip: '', name: '', username: '', email: '', phone: '', password: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedTeacher: typeof formData) => {
      const res = await authenticatedFetch(`/api-backend/teachers/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTeacher)
      })
      if (!res.ok) throw new Error('Gagal memperbarui guru')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setOpen(false)
      setFormData({ nip: '', name: '', username: '', email: '', phone: '', password: '' })
    }
  })

  // Chunked upload handler untuk guru
  const runChunkedUpload = async (allRows: { nip: string; name: string; username: string; email: string; phone: string; password: string }[]) => {
    const totalRows = allRows.length
    const chunks: typeof allRows[] = []
    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
      chunks.push(allRows.slice(i, i + CHUNK_SIZE))
    }
    const totalBatches = chunks.length

    abortRef.current = false
    setImportProgress({
      status: 'uploading',
      totalRows,
      totalBatches,
      currentBatch: 1,
      successCount: 0,
      errorCount: 0,
      errorMessages: [],
      label: 'Guru',
    })

    let successCount = 0
    let errorCount = 0
    const errorMessages: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) break
      setImportProgress(prev => ({ ...prev, currentBatch: i + 1 }))

      try {
        const res = await authenticatedFetch('/api-backend/teachers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunks[i]),
        })
        if (res.ok) {
          const result = await res.json()
          const created = result?.created ?? result?.count ?? chunks[i].length
          successCount += created
          const skipped = chunks[i].length - created
          if (skipped > 0) {
            errorCount += skipped
            errorMessages.push(`Batch ${i + 1}: ${skipped} data dilewati`)
          }
        } else {
          errorCount += chunks[i].length
          errorMessages.push(`Batch ${i + 1}: Gagal (${res.status})`)
        }
      } catch (err: any) {
        errorCount += chunks[i].length
        errorMessages.push(`Batch ${i + 1}: ${err.message ?? 'Error'}`)
      }

      setImportProgress(prev => ({
        ...prev,
        successCount,
        errorCount,
        errorMessages: [...errorMessages],
      }))
      await new Promise(r => setTimeout(r, 120))
    }

    queryClient.invalidateQueries({ queryKey: ['teachers'] })
    setImportProgress(prev => ({
      ...prev,
      status: errorMessages.length > 0 ? 'error' : 'done',
      currentBatch: totalBatches,
      successCount,
      errorCount,
      errorMessages,
    }))
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/teachers/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus guru')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && teachers) {
      setSelectedIds(teachers.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Bulk Operations
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return

    const updatePayload: any = {}
    if (bulkEditData.updatePhone) updatePayload.phone = bulkEditData.phone
    if (bulkEditData.updatePassword && bulkEditData.password) updatePayload.password = bulkEditData.password

    if (Object.keys(updatePayload).length === 0) {
      alert('Pilih setidaknya satu bidang untuk diperbarui serentak.')
      return
    }

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedIds.map(id => 
          authenticatedFetch(`/api-backend/teachers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setBulkEditOpen(false)
      setSelectedIds([])
      alert(`Berhasil memperbarui serentak ${selectedIds.length} data guru!`)
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data guru serentak.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    confirmDelete({
      title: 'Hapus Guru Terpilih?',
      text: `Apakah Anda yakin ingin menghapus ${selectedIds.length} guru terpilih secara permanen?`,
      onConfirm: async () => {
        setIsSubmittingBulk(true)
        try {
          await Promise.all(
            selectedIds.map(id =>
              authenticatedFetch(`/api-backend/teachers/${id}`, { method: 'DELETE' })
            )
          )
          queryClient.invalidateQueries({ queryKey: ['teachers'] })
          setSelectedIds([])
          Swal.fire({
            title: 'Berhasil!',
            text: 'Berhasil menghapus guru terpilih!',
            icon: 'success',
            timer: 1850,
            showConfirmButton: false,
          })
        } finally {
          setIsSubmittingBulk(false)
        }
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }


  const isAllSelected = !!(teachers && teachers.length > 0 && selectedIds.length === teachers.length)

  return (
    <>
    <ImportProgressDialog
      open={importDialogOpen}
      state={importProgress}
      templateFileName="template_guru.xlsx"
      templateExample={{ 'NIP / NBM': '123456789', 'Nama Lengkap': 'Budi Santoso', 'Username': 'budis', 'Email': 'budi@sekolah.com', 'No. HP': '0812345678', 'Password': 'guru123' }}
      destination="Tabel Guru (teachers)"
      customParser={(rawData) =>
        rawData
          .map((row: any) => ({
            nip: String(row['NIP / NBM'] || '').trim(),
            name: String(row['Nama Lengkap'] || '').trim(),
            username: String(row['Username'] || '').trim(),
            email: String(row['Email'] || '').trim(),
            phone: String(row['No. HP'] || '').trim(),
            password: String(row['Password'] || 'guru123').trim(),
          }))
          .filter((r: any) => r.name && r.username)
      }
      onFileReady={runChunkedUpload}
      onClose={() => {
        setImportDialogOpen(false)
        setImportProgress(prev => ({ ...prev, status: 'idle', totalRows: 0, totalBatches: 0, currentBatch: 0, successCount: 0, errorCount: 0, errorMessages: [] }))
      }}
    />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Data Guru</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data master guru sekolah beserta akses login.</p>
        </div>
        
        <div className="flex gap-2">
          {isKepalaSekolah && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Mode Supervisi (Read-Only)
            </div>
          )}

          {isSuperOrAdmin && (
            <>
              <Button
                variant="outline"
                className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                onClick={() => {
                  setImportProgress(prev => ({ ...prev, status: 'idle' }))
                  setImportDialogOpen(true)
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Excel
              </Button>

              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setIsEdit(false)
                setFormData({ nip: '', name: '', username: '', email: '', phone: '', password: '' })
                setOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Guru
              </Button>
            </>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{isEdit ? 'Ubah Data Guru' : 'Tambah Guru Baru'}</DialogTitle>
                <DialogDescription>
                  {isEdit ? 'Ubah data informasi guru. Jika password tidak ingin diubah, kosongkan form password.' : 'Masukkan data guru dan akun login untuk sistem. Default password adalah "guru123".'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP / NBM</Label>
                  <Input 
                    id="nip" 
                    placeholder="Masukkan NIP atau NBM" 
                    value={formData.nip}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input 
                    id="name" 
                    placeholder="Contoh: Drs. Ahmad Dahlan" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input 
                      id="username" 
                      placeholder="Username login" 
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@sekolah.com" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon / WhatsApp</Label>
                  <Input 
                    id="phone" 
                    placeholder="081234567890" 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password {isEdit ? '(Opsional)' : '*'}</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder={isEdit ? "Biarkan kosong jika tidak diubah" : "Default: guru123"} 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!isEdit}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {isEdit ? 'Simpan Perubahan' : 'Tambah Guru'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Bulk Edit Serentak Guru */}
        <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleBulkEditSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                  Edit Serentak ({selectedIds.length} Guru Terpilih)
                </DialogTitle>
                <DialogDescription>
                  Pilih bidang yang ingin Anda perbarui secara bersamaan untuk seluruh guru terpilih.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Option 1: Telepon */}
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="updatePhone"
                      checked={bulkEditData.updatePhone}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, updatePhone: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="updatePhone" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Ubah No. HP / WhatsApp Serentak
                    </Label>
                  </div>
                  {bulkEditData.updatePhone && (
                    <Input 
                      placeholder="Masukkan No. HP baru" 
                      value={bulkEditData.phone}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white dark:bg-slate-900"
                    />
                  )}
                </div>

                {/* Option 2: Password */}
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="updatePassword"
                      checked={bulkEditData.updatePassword}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, updatePassword: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="updatePassword" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Reset / Ubah Password Serentak
                    </Label>
                  </div>
                  {bulkEditData.updatePassword && (
                    <Input 
                      type="password"
                      placeholder="Masukkan password baru" 
                      value={bulkEditData.password}
                      onChange={(e) => setBulkEditData(prev => ({ ...prev, password: e.target.value }))}
                      className="bg-white dark:bg-slate-900"
                    />
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setBulkEditOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmittingBulk} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmittingBulk && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Simpan Perubahan Serentak
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Floating Bar Aksi Serentak / Bulk Selection Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-900 text-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-blue-700 mb-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-300" />
            <span className="font-bold text-sm">
              Terpilih <span className="text-amber-300 font-extrabold text-base">{selectedIds.length}</span> guru
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => setBulkEditOpen(true)}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-xs"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              Edit Serentak
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isSubmittingBulk}
              className="font-bold shadow-xs"
            >
              {isSubmittingBulk ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Hapus Terpilih
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setSelectedIds([])}
              className="text-blue-200 hover:text-white hover:bg-blue-800"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Daftar Guru</CardTitle>
            <CardDescription>
              Menampilkan seluruh data guru yang terdaftar dalam sistem.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari guru (NIP/nama/email)..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table className="w-full table-auto">
            <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
              <TableRow>
                <TableHead className="w-10 text-center pl-4">
                  <input 
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                    title="Pilih Semua"
                  />
                </TableHead>
                <TableHead>Guru & Identitas</TableHead>
                <TableHead>Kontak & Akun Login</TableHead>
                <TableHead className="text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filterDataBySearch(teachers, searchQuery)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'Tidak ada data guru yang sesuai dengan pencarian.' : 'Belum ada data guru.'}
                  </TableCell>
                </TableRow>
              ) : (
                filterDataBySearch(teachers, searchQuery)?.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  const nip = item.nip || item.user?.nipNbm
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''}>
                      <TableCell className="text-center pl-4">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{item.user?.name || '-'}</span>
                          <span className="text-xs text-slate-500 font-mono">NIP/NBM: {nip || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                              @{item.user?.username}
                            </span>
                            {item.phone && <span className="text-slate-600 dark:text-slate-400">HP: {item.phone}</span>}
                          </div>
                          {item.user?.email && <span className="text-slate-500 text-[11px]">{item.user.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {isSuperOrAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => {
                                setIsEdit(true)
                                setEditId(item.id)
                                setFormData({
                                  nip: item.nip || '',
                                  name: item.user?.name || '',
                                  username: item.user?.username || '',
                                  email: item.user?.email || '',
                                  phone: item.phone || '',
                                  password: ''
                                })
                                setOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                confirmDelete({
                                  title: 'Hapus Guru?',
                                  text: 'Apakah Anda yakin ingin menghapus guru ini?',
                                  onConfirm: async () => {
                                    await deleteMutation.mutateAsync(item.id)
                                    Swal.fire({
                                      title: 'Berhasil!',
                                      text: 'Guru berhasil dihapus!',
                                      icon: 'success',
                                      timer: 1500,
                                      showConfirmButton: false,
                                    })
                                  }
                                })
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">Read-Only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </>
  )
}
