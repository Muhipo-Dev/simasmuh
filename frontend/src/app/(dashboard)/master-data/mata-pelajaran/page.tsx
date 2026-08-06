'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, FileSpreadsheet, Pencil, CheckSquare, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImportProgressDialog, ImportProgressState } from '@/components/ImportProgressDialog'

const CHUNK_SIZE = 20

type Subject = {
  id: string
  name: string
  code: string
}

export default function SubjectsPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState('')
  const [formData, setFormData] = useState({ name: '', code: '' })

  // Bulk Selection & Edit States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    updateCodePrefix: false,
    codePrefix: ''
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
    label: 'Mata Pelajaran',
  })
  const abortRef = useRef(false)

  const { data: subjects, isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) throw new Error('Gagal memuat data mata pelajaran')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newSubject: typeof formData) => {
      const res = await authenticatedFetch('/api-backend/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject)
      })
      if (!res.ok) throw new Error('Gagal menambah mata pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
      setFormData({ name: '', code: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedSubject: typeof formData) => {
      const res = await authenticatedFetch(`/api-backend/subjects/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubject)
      })
      if (!res.ok) throw new Error('Gagal memperbarui mata pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
      setFormData({ name: '', code: '' })
    }
  })

  // Chunked upload handler — dipanggil dari ImportProgressDialog via onFileReady
  const runChunkedUpload = async (allRows: { code: string; name: string }[]) => {
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
      label: 'Mata Pelajaran',
    })

    let successCount = 0
    let errorCount = 0
    const errorMessages: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) break

      setImportProgress(prev => ({ ...prev, currentBatch: i + 1 }))

      try {
        const res = await authenticatedFetch('/api-backend/subjects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunks[i]),
        })

        if (res.ok) {
          const result = await res.json() as { created: number; skipped: number }
          successCount += result.created ?? chunks[i].length
          const skipped = result.skipped ?? 0
          if (skipped > 0) {
            errorCount += skipped
            errorMessages.push(`Batch ${i + 1}: ${skipped} data dilewati (duplikat kode)`)
          }
        } else {
          errorCount += chunks[i].length
          errorMessages.push(`Batch ${i + 1}: Gagal (${res.status})`)
        }
      } catch (err: any) {
        errorCount += chunks[i].length
        errorMessages.push(`Batch ${i + 1}: ${err.message ?? 'Error tidak diketahui'}`)
      }

      setImportProgress(prev => ({
        ...prev,
        successCount,
        errorCount,
        errorMessages: [...errorMessages],
      }))

      // Jeda kecil antar batch agar UI bisa render
      await new Promise(r => setTimeout(r, 120))
    }

    queryClient.invalidateQueries({ queryKey: ['subjects'] })
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
      const res = await authenticatedFetch(`/api-backend/subjects/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus mata pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    }
  })

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && subjects) {
      setSelectedIds(subjects.map(s => s.id))
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

    if (!bulkEditData.updateCodePrefix || !bulkEditData.codePrefix) {
      alert('Pilih dan isi prefix kode baru untuk diperbarui serentak.')
      return
    }

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedIds.map(id => {
          const targetSubj = subjects?.find(s => s.id === id)
          if (!targetSubj) return Promise.resolve()
          const newCode = `${bulkEditData.codePrefix}-${targetSubj.code.split('-').pop() || targetSubj.code}`
          return authenticatedFetch(`/api-backend/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: newCode, name: targetSubj.name })
          })
        })
      )
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setBulkEditOpen(false)
      setSelectedIds([])
      alert(`Berhasil memperbarui kode serentak ${selectedIds.length} mata pelajaran!`)
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui mata pelajaran serentak.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} mata pelajaran terpilih?`)) return

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedIds.map(id =>
          authenticatedFetch(`/api-backend/subjects/${id}`, { method: 'DELETE' })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setSelectedIds([])
      alert('Berhasil menghapus mata pelajaran terpilih!')
    } catch (err: any) {
      alert('Gagal menghapus mata pelajaran terpilih.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }


  const isAllSelected = !!(subjects && subjects.length > 0 && selectedIds.length === subjects.length)

  return (
    <>
    <ImportProgressDialog
      open={importDialogOpen}
      state={importProgress}
      columnMap={{ code: 'Kode Mapel', name: 'Nama Mata Pelajaran' }}
      templateFileName="template_mapel.xlsx"
      templateExample={{ 'Kode Mapel': 'MAT-01', 'Nama Mata Pelajaran': 'Matematika' }}
      destination="Tabel Mata Pelajaran (subjects)"
      onFileReady={runChunkedUpload}
      onClose={() => {
        setImportDialogOpen(false)
        setImportProgress(prev => ({ ...prev, status: 'idle', totalRows: 0, totalBatches: 0, currentBatch: 0, successCount: 0, errorCount: 0, errorMessages: [] }))
      }}
    />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Mata Pelajaran</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data master mata pelajaran.</p>
        </div>
        
        <div className="flex gap-2">
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setIsEdit(false)
                setFormData({ name: '', code: '' })
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Mapel
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{isEdit ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}</DialogTitle>
                  <DialogDescription>
                    {isEdit ? 'Ubah informasi mata pelajaran.' : 'Masukkan kode dan nama mata pelajaran baru.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Kode Mapel *</Label>
                    <Input 
                      id="code" 
                      placeholder="Contoh: MAT-01" 
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Mata Pelajaran *</Label>
                    <Input 
                      id="name" 
                      placeholder="Contoh: Matematika Wajib" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {isEdit ? 'Simpan Perubahan' : 'Tambah Mapel'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog Bulk Edit Serentak Mapel */}
          <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="sm:max-w-[450px]">
              <form onSubmit={handleBulkEditSubmit}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Edit3 className="w-5 h-5" />
                    Edit Serentak ({selectedIds.length} Mapel Terpilih)
                  </DialogTitle>
                  <DialogDescription>
                    Pilih dan perbarui atribut kode mata pelajaran secara bersamaan.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="updateCodePrefix"
                        checked={bulkEditData.updateCodePrefix}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, updateCodePrefix: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="updateCodePrefix" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                        Ubah Prefix Kode Mapel Serentak
                      </Label>
                    </div>
                    {bulkEditData.updateCodePrefix && (
                      <Input 
                        placeholder="Contoh: MP-2026" 
                        value={bulkEditData.codePrefix}
                        onChange={(e) => setBulkEditData(prev => ({ ...prev, codePrefix: e.target.value }))}
                        className="bg-white dark:bg-slate-900 font-semibold"
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
              Terpilih <span className="text-amber-300 font-extrabold text-base">{selectedIds.length}</span> mata pelajaran
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
            <CardTitle>Daftar Mata Pelajaran</CardTitle>
            <CardDescription>
              Menampilkan seluruh mata pelajaran yang terdaftar dalam sistem.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari mapel (kode/nama)..."
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
                <TableHead>Kode</TableHead>
                <TableHead>Nama Mata Pelajaran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
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
              ) : filterDataBySearch(subjects, searchQuery)?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'Tidak ada data yang sesuai dengan pencarian.' : 'Belum ada data mata pelajaran.'}
                  </TableCell>
                </TableRow>
              ) : (
                filterDataBySearch(subjects, searchQuery)?.map((item) => {
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
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{item.code}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setIsEdit(true)
                              setEditId(item.id)
                              setFormData({
                                code: item.code,
                                name: item.name,
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
                              if(confirm('Yakin ingin menghapus mata pelajaran ini?')) {
                                deleteMutation.mutate(item.id)
                              }
                            }}
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
        </CardContent>
      </Card>
    </div>
    </>
  )
}
