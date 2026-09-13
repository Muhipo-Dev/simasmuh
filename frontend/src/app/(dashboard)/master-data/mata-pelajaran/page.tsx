'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Trash2, FileSpreadsheet, Pencil, CheckSquare, Edit3, UserCheck, Users, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ImportProgressDialog, ImportProgressState } from '@/components/ImportProgressDialog'
import Swal from 'sweetalert2'
import { confirmDelete } from '@/lib/swal-helper'

const CHUNK_SIZE = 20

type Teacher = {
  id: string
  nip?: string
  user?: {
    id: string
    name: string
    username: string
    nipNbm?: string
  }
}

type Subject = {
  id: string
  name: string
  code: string
  teacherSubjects?: Array<{
    id: string
    teacherId: string
    subjectId: string
    teacher: {
      id: string
      nip?: string
      user?: {
        id: string
        name: string
        username: string
        nipNbm?: string
      }
    }
  }>
}

export default function SubjectsPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState('')
  const [formData, setFormData] = useState<{
    name: string
    code: string
    teacherIds: string[]
  }>({ name: '', code: '', teacherIds: [] })

  // Search filter inside teacher selection
  const [teacherSearch, setTeacherSearch] = useState('')

  // Bulk Selection & Edit States
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState<{
    updateCodePrefix: boolean
    codePrefix: string
    assignTeacher: boolean
    teacherIdToAssign: string
  }>({
    updateCodePrefix: false,
    codePrefix: '',
    assignTeacher: false,
    teacherIdToAssign: '',
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
    },
  })

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) return []
      return res.json()
    },
  })

  const filteredTeacherOptions = useMemo(() => {
    if (!teachers) return []
    if (!teacherSearch.trim()) return teachers
    const q = teacherSearch.toLowerCase()
    return teachers.filter((t) => {
      const name = t.user?.name?.toLowerCase() || ''
      const nip = (t.nip || t.user?.nipNbm || '').toLowerCase()
      const username = t.user?.username?.toLowerCase() || ''
      return name.includes(q) || nip.includes(q) || username.includes(q)
    })
  }, [teachers, teacherSearch])

  const createMutation = useMutation({
    mutationFn: async (newSubject: typeof formData) => {
      const res = await authenticatedFetch('/api-backend/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject),
      })
      if (!res.ok) throw new Error('Gagal menambah mata pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
      setFormData({ name: '', code: '', teacherIds: [] })
      setTeacherSearch('')
      Swal.fire({
        title: 'Berhasil!',
        text: 'Mata pelajaran berhasil ditambahkan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedSubject: typeof formData) => {
      const res = await authenticatedFetch(`/api-backend/subjects/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubject),
      })
      if (!res.ok) throw new Error('Gagal memperbarui mata pelajaran')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
      setFormData({ name: '', code: '', teacherIds: [] })
      setTeacherSearch('')
      Swal.fire({
        title: 'Berhasil!',
        text: 'Mata pelajaran dan pengampu berhasil diperbarui.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      })
    },
  })

  // Chunked upload handler
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

      setImportProgress((prev) => ({ ...prev, currentBatch: i + 1 }))

      try {
        const res = await authenticatedFetch('/api-backend/subjects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunks[i]),
        })

        if (res.ok) {
          const result = (await res.json()) as { created: number; skipped: number }
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

      setImportProgress((prev) => ({
        ...prev,
        successCount,
        errorCount,
        errorMessages: [...errorMessages],
      }))

      await new Promise((r) => setTimeout(r, 120))
    }

    queryClient.invalidateQueries({ queryKey: ['subjects'] })
    setImportProgress((prev) => ({
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
    },
  })

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && subjects) {
      setSelectedIds(subjects.map((s) => s.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleTeacherSelection = (teacherId: string) => {
    setFormData((prev) => {
      const current = prev.teacherIds || []
      if (current.includes(teacherId)) {
        return { ...prev, teacherIds: current.filter((id) => id !== teacherId) }
      } else {
        return { ...prev, teacherIds: [...current, teacherId] }
      }
    })
  }

  // Bulk Operations
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return

    if (
      (!bulkEditData.updateCodePrefix || !bulkEditData.codePrefix) &&
      (!bulkEditData.assignTeacher || !bulkEditData.teacherIdToAssign)
    ) {
      alert('Pilih dan isi prefix kode atau tetapkan guru pengampu untuk diperbarui serentak.')
      return
    }

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const targetSubj = subjects?.find((s) => s.id === id)
          if (!targetSubj) return Promise.resolve()

          const updatePayload: any = {}
          if (bulkEditData.updateCodePrefix && bulkEditData.codePrefix) {
            updatePayload.code = `${bulkEditData.codePrefix}-${targetSubj.code.split('-').pop() || targetSubj.code}`
          }

          if (bulkEditData.assignTeacher && bulkEditData.teacherIdToAssign) {
            const existingTeacherIds =
              targetSubj.teacherSubjects?.map((ts) => ts.teacherId) || []
            if (!existingTeacherIds.includes(bulkEditData.teacherIdToAssign)) {
              updatePayload.teacherIds = [
                ...existingTeacherIds,
                bulkEditData.teacherIdToAssign,
              ]
            }
          }

          if (Object.keys(updatePayload).length > 0) {
            return authenticatedFetch(`/api-backend/subjects/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload),
            })
          }
          return Promise.resolve()
        })
      )
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setBulkEditOpen(false)
      setSelectedIds([])
      Swal.fire({
        title: 'Berhasil!',
        text: `Berhasil memperbarui ${selectedIds.length} mata pelajaran serentak!`,
        icon: 'success',
        timer: 1850,
        showConfirmButton: false,
      })
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui mata pelajaran serentak.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    confirmDelete({
      title: 'Hapus Mapel Terpilih?',
      text: `Apakah Anda yakin ingin menghapus ${selectedIds.length} mata pelajaran terpilih secara permanen?`,
      onConfirm: async () => {
        setIsSubmittingBulk(true)
        try {
          await Promise.all(
            selectedIds.map((id) =>
              authenticatedFetch(`/api-backend/subjects/${id}`, { method: 'DELETE' })
            )
          )
          queryClient.invalidateQueries({ queryKey: ['subjects'] })
          setSelectedIds([])
          Swal.fire({
            title: 'Berhasil!',
            text: 'Berhasil menghapus mata pelajaran terpilih!',
            icon: 'success',
            timer: 1850,
            showConfirmButton: false,
          })
        } finally {
          setIsSubmittingBulk(false)
        }
      },
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

  const isAllSelected = !!(
    subjects &&
    subjects.length > 0 &&
    selectedIds.length === subjects.length
  )

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
          setImportProgress((prev) => ({
            ...prev,
            status: 'idle',
            totalRows: 0,
            totalBatches: 0,
            currentBatch: 0,
            successCount: 0,
            errorCount: 0,
            errorMessages: [],
          }))
        }}
      />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Master Data Akademik
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Mata Pelajaran & Guru Pengampu
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Kelola data master mata pelajaran dan pengaturan guru pengampu terpadu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 text-xs h-9 rounded-xl font-bold"
              onClick={() => {
                setImportProgress((prev) => ({ ...prev, status: 'idle' }))
                setImportDialogOpen(true)
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Import Excel
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
                    onClick={() => {
                      setIsEdit(false)
                      setFormData({ name: '', code: '', teacherIds: [] })
                      setTeacherSearch('')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Mapel
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {isEdit ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                    </DialogTitle>
                    <DialogDescription>
                      {isEdit
                        ? 'Ubah informasi mata pelajaran dan tentukan guru pengampunya.'
                        : 'Masukkan kode, nama mata pelajaran, dan tentukan guru pengampunya.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Kode Mapel *</Label>
                      <Input
                        id="code"
                        placeholder="Contoh: MAT-01"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama Mata Pelajaran *</Label>
                      <Input
                        id="name"
                        placeholder="Contoh: Matematika Wajib"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Teacher / Pengampu Multi-Select Box */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-600" />
                          Guru Pengampu ({formData.teacherIds.length} Terpilih)
                        </Label>
                        {formData.teacherIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, teacherIds: [] }))
                            }
                          >
                            Reset Pilihan
                          </Button>
                        )}
                      </div>

                      {/* Selected Badges Preview */}
                      {formData.teacherIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/60">
                          {formData.teacherIds.map((tId) => {
                            const t = teachers?.find((item) => item.id === tId)
                            return (
                              <Badge
                                key={tId}
                                variant="secondary"
                                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 pr-1 gap-1 text-xs"
                              >
                                <span>{t?.user?.name || 'Guru'}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleTeacherSelection(tId)}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-0.5 text-slate-400 hover:text-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}

                      {/* Search Teacher Input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Cari guru berdasarkan nama / NIP..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="pl-8 text-xs h-9 bg-slate-50/70 dark:bg-slate-900/50"
                        />
                      </div>

                      {/* Teachers Checkbox List */}
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                        {filteredTeacherOptions.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            Tidak ada guru ditemukan.
                          </div>
                        ) : (
                          filteredTeacherOptions.map((t) => {
                            const isChecked = formData.teacherIds.includes(t.id)
                            const nip = t.nip || t.user?.nipNbm || '-'
                            return (
                              <label
                                key={t.id}
                                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors pt-1.5 ${
                                  isChecked
                                    ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleTeacherSelection(t.id)}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 accent-blue-600"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold">
                                      {t.user?.name || 'Tanpa Nama'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      NIP/NBM: {nip}
                                    </span>
                                  </div>
                                </div>
                                {isChecked && (
                                  <UserCheck className="w-4 h-4 text-blue-600" />
                                )}
                              </label>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
                      {isEdit ? 'Simpan Perubahan' : 'Tambah Mapel'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog Bulk Edit Serentak Mapel */}
            <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
              <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleBulkEditSubmit}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Edit3 className="w-5 h-5" />
                      Edit Serentak ({selectedIds.length} Mapel Terpilih)
                    </DialogTitle>
                    <DialogDescription>
                      Pilih dan perbarui atribut kode maupun guru pengampu secara bersamaan.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Option 1: Prefix Kode */}
                    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="updateCodePrefix"
                          checked={bulkEditData.updateCodePrefix}
                          onChange={(e) =>
                            setBulkEditData((prev) => ({
                              ...prev,
                              updateCodePrefix: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor="updateCodePrefix"
                          className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer text-xs"
                        >
                          Ubah Prefix Kode Mapel Serentak
                        </Label>
                      </div>
                      {bulkEditData.updateCodePrefix && (
                        <Input
                          placeholder="Contoh: MP-2026"
                          value={bulkEditData.codePrefix}
                          onChange={(e) =>
                            setBulkEditData((prev) => ({
                              ...prev,
                              codePrefix: e.target.value,
                            }))
                          }
                          className="bg-white dark:bg-slate-900 font-semibold text-xs"
                        />
                      )}
                    </div>

                    {/* Option 2: Tambahkan Guru Pengampu Serentak */}
                    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="assignTeacher"
                          checked={bulkEditData.assignTeacher}
                          onChange={(e) =>
                            setBulkEditData((prev) => ({
                              ...prev,
                              assignTeacher: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <Label
                          htmlFor="assignTeacher"
                          className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer text-xs"
                        >
                          Tambahkan Guru Pengampu ke Seluruh Mapel Terpilih
                        </Label>
                      </div>
                      {bulkEditData.assignTeacher && (
                        <select
                          value={bulkEditData.teacherIdToAssign}
                          onChange={(e) =>
                            setBulkEditData((prev) => ({
                              ...prev,
                              teacherIdToAssign: e.target.value,
                            }))
                          }
                          className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Pilih Guru Pengampu --</option>
                          {teachers?.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.user?.name} (NIP: {t.nip || t.user?.nipNbm || '-'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setBulkEditOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmittingBulk}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmittingBulk && (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      )}
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
                Terpilih{' '}
                <span className="text-amber-300 font-extrabold text-base">
                  {selectedIds.length}
                </span>{' '}
                mata pelajaran
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
                {isSubmittingBulk ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1.5" />
                )}
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
                Menampilkan seluruh mata pelajaran beserta guru pengampu terdaftar.
              </CardDescription>
            </div>
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari mapel (kode/nama/pengampu)..."
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
                  <TableHead className="w-32">Kode</TableHead>
                  <TableHead>Nama Mata Pelajaran</TableHead>
                  <TableHead>Guru Pengampu</TableHead>
                  <TableHead className="text-right w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filterDataBySearch(subjects, searchQuery)?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      {searchQuery
                        ? 'Tidak ada data yang sesuai dengan pencarian.'
                        : 'Belum ada data mata pelajaran.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filterDataBySearch(subjects, searchQuery)?.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    const assignedTeachers = item.teacherSubjects || []

                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40' : ''}
                      >
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(item.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 cursor-pointer accent-blue-600"
                          />
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                          {item.code}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          {assignedTeachers.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              Belum ada pengampu
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedTeachers.map((ts) => (
                                <Badge
                                  key={ts.id}
                                  variant="secondary"
                                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                                >
                                  {ts.teacher?.user?.name || 'Guru'}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
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
                                  teacherIds:
                                    item.teacherSubjects?.map((ts) => ts.teacherId) || [],
                                })
                                setTeacherSearch('')
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
                                  title: 'Hapus Mapel?',
                                  text: 'Apakah Anda yakin ingin menghapus mata pelajaran ini?',
                                  onConfirm: async () => {
                                    await deleteMutation.mutateAsync(item.id)
                                    Swal.fire({
                                      title: 'Berhasil!',
                                      text: 'Mata pelajaran berhasil dihapus!',
                                      icon: 'success',
                                      timer: 1500,
                                      showConfirmButton: false,
                                    })
                                  },
                                })
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

