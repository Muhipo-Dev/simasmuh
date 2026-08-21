'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, FileSpreadsheet, Pencil, CheckSquare, Edit3, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { ImportProgressDialog, ImportProgressState } from '@/components/ImportProgressDialog'
import Swal from 'sweetalert2'
import { confirmDelete } from '@/lib/swal-helper'

const CHUNK_SIZE = 20

type Class = {
  id: string
  name: string
  gradeLevel: number
  academicYear: string
  homeroomTeacherId?: string
  homeroomTeacher?: {
    id: string
    user?: {
      name: string
    }
  }
  _count: { students: number }
}

export default function ClassesPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const subRole = (session?.user as any)?.subRole || ''
  const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'KURIKULUM', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole)
  const isKepalaSekolah = userRole === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH'
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState('')

  // Bulk Selection & Edit States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    updateGradeLevel: false,
    gradeLevel: '10',
    updateAcademicYear: false,
    academicYear: ''
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
    label: 'Kelas',
  })
  const abortRef = useRef(false)

  const { data: systemSettings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/public')
      if (!res.ok) return null
      return res.json()
    }
  })

  const activeAcademicYear = systemSettings?.academicYear || '2026/2027'
  const [formData, setFormData] = useState<{ name: string; gradeLevel: string; academicYear: string; homeroomTeacherId: string }>({ name: '', gradeLevel: '10', academicYear: activeAcademicYear, homeroomTeacherId: '' })

  useEffect(() => {
    if (systemSettings?.academicYear && !isEdit) {
      setFormData(prev => ({ ...prev, academicYear: systemSettings.academicYear || '2026/2027' }))
      setBulkEditData(prev => ({ ...prev, academicYear: systemSettings.academicYear || '2026/2027' }))
    }
  }, [systemSettings, isEdit])

  const { data: classes, isLoading } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) throw new Error('Gagal memuat data kelas')
      return res.json()
    }
  })

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) throw new Error('Gagal memuat data guru')
      return res.json() as Promise<any[]>
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newClass: any) => {
      const res = await authenticatedFetch('/api-backend/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
      })
      if (!res.ok) throw new Error('Gagal menambah kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setOpen(false)
      setFormData({ name: '', gradeLevel: '10', academicYear: activeAcademicYear, homeroomTeacherId: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedClass: any) => {
      const res = await authenticatedFetch(`/api-backend/classes/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedClass)
      })
      if (!res.ok) throw new Error('Gagal memperbarui kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setOpen(false)
      setFormData({ name: '', gradeLevel: '10', academicYear: activeAcademicYear, homeroomTeacherId: '' })
    }
  })
// ... sisa code untuk chunked upload dsb ... (mari sesuaikan dengan replace)
// Tunggu, replace_file_content harus spesifik. Mari kita cari target content yang tepat untuk diganti.
// Let's replace the whole file from type Class down to the end of state declaration, but we can do it chunks or the whole thing.
// Kita akan ganti dari line 21 ke 122 dulu.


  // Chunked upload handler untuk kelas
  const runChunkedUpload = async (allRows: any[]) => {
    const totalRows = allRows.length
    const chunks: any[][] = []
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
      label: 'Kelas',
    })

    let successCount = 0
    let errorCount = 0
    const errorMessages: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) break
      setImportProgress(prev => ({ ...prev, currentBatch: i + 1 }))

      try {
        const res = await authenticatedFetch('/api-backend/classes/bulk', {
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

    queryClient.invalidateQueries({ queryKey: ['classes'] })
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
      const res = await authenticatedFetch(`/api-backend/classes/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus kelas')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    }
  })

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && classes) {
      setSelectedIds(classes.map(c => c.id))
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
    if (bulkEditData.updateGradeLevel) updatePayload.gradeLevel = parseInt(bulkEditData.gradeLevel)
    if (bulkEditData.updateAcademicYear && bulkEditData.academicYear) updatePayload.academicYear = bulkEditData.academicYear

    if (Object.keys(updatePayload).length === 0) {
      alert('Pilih setidaknya satu bidang untuk diperbarui serentak.')
      return
    }

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedIds.map(id => 
          authenticatedFetch(`/api-backend/classes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setBulkEditOpen(false)
      setSelectedIds([])
      alert(`Berhasil memperbarui serentak ${selectedIds.length} kelas!`)
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui kelas serentak.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    confirmDelete({
      title: 'Hapus Kelas Terpilih?',
      text: `Apakah Anda yakin ingin menghapus ${selectedIds.length} kelas terpilih secara permanen?`,
      onConfirm: async () => {
        setIsSubmittingBulk(true)
        try {
          await Promise.all(
            selectedIds.map(id =>
              authenticatedFetch(`/api-backend/classes/${id}`, { method: 'DELETE' })
            )
          )
          queryClient.invalidateQueries({ queryKey: ['classes'] })
          setSelectedIds([])
          Swal.fire({
            title: 'Berhasil!',
            text: 'Berhasil menghapus kelas terpilih!',
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
    const payload = {
      name: formData.name,
      gradeLevel: parseInt(formData.gradeLevel),
      academicYear: formData.academicYear,
      homeroomTeacherId: formData.homeroomTeacherId || null
    }
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }


  const isAllSelected = !!(classes && classes.length > 0 && selectedIds.length === classes.length)

  return (
    <>
    <ImportProgressDialog
      open={importDialogOpen}
      state={importProgress}
      templateFileName="template_import_kelas.xlsx"
      templateExample={{ 'Nama Kelas *': 'XI 2', 'Tingkat Kelas (10/11/12) *': 11, 'Tahun Ajaran *': activeAcademicYear }}
      destination="Tabel Kelas (classes)"
      customParser={(rawData) =>
        rawData
          .map((row: any) => ({
            name: String(row['Nama Kelas *'] || row['Nama Kelas'] || '').trim(),
            gradeLevel: parseInt(String(row['Tingkat Kelas (10/11/12) *'] || row['Tingkat Kelas'] || '10')) || 10,
            academicYear: String(row['Tahun Ajaran *'] || row['Tahun Ajaran'] || activeAcademicYear).trim(),
          }))
          .filter((r: any) => r.name)
      }
      onFileReady={runChunkedUpload}
      onClose={() => {
        setImportDialogOpen(false)
        setImportProgress(prev => ({ ...prev, status: 'idle', totalRows: 0, totalBatches: 0, currentBatch: 0, successCount: 0, errorCount: 0, errorMessages: [] }))
      }}
    />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Data Kelas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data kelas dan rombel untuk tahun pelajaran aktif ({activeAcademicYear}).</p>
        </div>
        <div className="flex items-center gap-2">
          {isKepalaSekolah && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Mode Supervisi (Read-Only)
            </div>
          )}

          {isSuperOrAdmin && (
            <>
              <Button
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => {
                  setImportProgress(prev => ({ ...prev, status: 'idle' }))
                  setImportDialogOpen(true)
                }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import Excel
              </Button>

              {/* Dialog Tambah/Edit Kelas */}
              <Dialog open={open} onOpenChange={(val) => {
                setOpen(val)
                if (!val) {
                  setIsEdit(false)
                  setEditId('')
                  setFormData({ name: '', gradeLevel: '10', academicYear: activeAcademicYear, homeroomTeacherId: '' })
                }
              }}>
                <DialogTrigger render={
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Kelas
                  </Button>
                } />
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru'}</DialogTitle>
                  <DialogDescription>
                    {isEdit ? 'Ubah informasi kelas di bawah ini.' : 'Isi formulir berikut untuk menambahkan kelas baru.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Kelas</Label>
                    <Input 
                      id="name" 
                      placeholder="Contoh: X IPA 1" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradeLevel">Tingkat Kelas</Label>
                    <Select 
                      value={formData.gradeLevel} 
                      onValueChange={(val: string | null) => setFormData(prev => ({ ...prev, gradeLevel: val || '10' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tingkat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Kelas 10</SelectItem>
                        <SelectItem value="11">Kelas 11</SelectItem>
                        <SelectItem value="12">Kelas 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Tahun Pelajaran (Otomatis dari Sistem)</Label>
                    <Input 
                      id="academicYear" 
                      value={formData.academicYear || activeAcademicYear}
                      disabled
                      readOnly
                      className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400">Diatur global di Pengaturan Sistem</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homeroomTeacher">Wali Kelas</Label>
                    <Select 
                      value={formData.homeroomTeacherId || "none"} 
                      onValueChange={(val: string | null) => setFormData(prev => ({ ...prev, homeroomTeacherId: val === "none" || !val ? "" : val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Wali Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belum Ditentukan</SelectItem>
                        {teachers?.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.user?.name || 'Tanpa Nama'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {isEdit ? 'Simpan Perubahan' : 'Tambah Kelas'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </>
          )}

          {/* Dialog Bulk Edit Serentak — selalu tersedia untuk admin */}
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <form onSubmit={handleBulkEditSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Edit3 className="w-5 h-5" />
                    Edit Serentak ({selectedIds.length} Kelas Terpilih)
                  </DialogTitle>
                  <DialogDescription>
                    Pilih bidang yang ingin Anda ubah secara bersamaan untuk seluruh data yang dipilih.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Option 1: Tingkat Kelas */}
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="updateGradeLevel"
                        checked={bulkEditData.updateGradeLevel}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, updateGradeLevel: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="updateGradeLevel" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        Ubah Tingkat Kelas Serentak
                      </Label>
                    </div>
                    {bulkEditData.updateGradeLevel && (
                      <Select 
                        value={bulkEditData.gradeLevel} 
                        onValueChange={(val: string | null) => setBulkEditData(prev => ({ ...prev, gradeLevel: val || '10' }))}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Pilih tingkat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">Kelas 10</SelectItem>
                          <SelectItem value="11">Kelas 11</SelectItem>
                          <SelectItem value="12">Kelas 12</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Option 2: Tahun Pelajaran */}
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="updateAcademicYear"
                        checked={bulkEditData.updateAcademicYear}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, updateAcademicYear: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="updateAcademicYear" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        Ubah Tahun Pelajaran Serentak
                      </Label>
                    </div>
                    {bulkEditData.updateAcademicYear && (
                      <div className="space-y-1">
                        <Input 
                          value={activeAcademicYear}
                          disabled
                          readOnly
                          className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold cursor-not-allowed"
                        />
                        <p className="text-[11px] text-slate-400">Tahun pelajaran akan otomatis diperbarui ke versi aktif sistem ({activeAcademicYear})</p>
                      </div>
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
              Terpilih <span className="text-amber-300 font-extrabold text-base">{selectedIds.length}</span> kelas
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
            <CardTitle>Daftar Kelas</CardTitle>
            <CardDescription>
              Menampilkan seluruh kelas yang terdaftar dalam sistem.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari kelas..."
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto max-w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input 
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                    title="Pilih Semua"
                  />
                </TableHead>
                <TableHead>Nama Kelas</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead>Jumlah Siswa</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filterDataBySearch(classes, searchQuery)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'Tidak ada data kelas yang sesuai dengan pencarian.' : 'Belum ada data kelas.'}
                  </TableCell>
                </TableRow>
              ) : (
                filterDataBySearch(classes, searchQuery)?.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''}>
                      <TableCell className="text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{item.name}</TableCell>
                      <TableCell>Kelas {item.gradeLevel}</TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-350">
                        {item.homeroomTeacher?.user?.name || (
                          <span className="text-slate-400 italic text-xs">Belum Ditentukan</span>
                        )}
                      </TableCell>
                      <TableCell>{item._count?.students || 0} Siswa</TableCell>
                      <TableCell className="text-right">
                        {isSuperOrAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setIsEdit(true)
                                setEditId(item.id)
                                setFormData({
                                  name: item.name,
                                  gradeLevel: item.gradeLevel.toString(),
                                  academicYear: item.academicYear || activeAcademicYear,
                                  homeroomTeacherId: item.homeroomTeacherId || ''
                                })
                                setOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                confirmDelete({
                                  title: 'Hapus Kelas?',
                                  text: 'Apakah Anda yakin ingin menghapus kelas ini?',
                                  onConfirm: async () => {
                                    await deleteMutation.mutateAsync(item.id)
                                    Swal.fire({
                                      title: 'Berhasil!',
                                      text: 'Kelas berhasil dihapus!',
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
