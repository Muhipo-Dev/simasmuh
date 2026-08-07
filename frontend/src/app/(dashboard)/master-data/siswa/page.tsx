'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSession } from 'next-auth/react'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, FileSpreadsheet, Pencil, Trash2, GraduationCap, Filter, CheckSquare, Square, Edit3, Tag, Percent } from 'lucide-react'
import Swal from 'sweetalert2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImportProgressDialog, ImportProgressState } from '@/components/ImportProgressDialog'

const CHUNK_SIZE = 20

// Enum program unggulan siswa — hanya SUPERADMIN yang bisa mengubah
const PROGRAM_OPTIONS = [
  { value: 'kader', label: 'Kader', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { value: 'reguler', label: 'Reguler', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'tahfidz', label: 'Tahfidz', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { value: 'olahraga', label: 'Olahraga', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { value: 'MIC', label: 'Muhipo Internasional Class (MIC)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'enterpreneur', label: 'Entrepreneur', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
  { value: 'seni budaya', label: 'Seni Budaya', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' },
  { value: 'soshum saintek', label: 'Soshum Saintek', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  { value: 'inklusi', label: 'Inklusi', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
]

const getProgramBadge = (programValue: string | null | undefined) => {
  if (!programValue) return null
  return PROGRAM_OPTIONS.find(p => p.value === programValue) ?? null
}

type Student = {
  id: string
  nisn: string
  nis: string
  name: string
  gender: string
  classId: string
  program?: string | null
  discountPercentage?: number
  discountReason?: string | null
  class: {
    id: string
    name: string
  }
  user?: {
    username: string
  }
}

type Class = {
  id: string
  name: string
}

export default function StudentsPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const userRole = (session?.user as any)?.role || ''
  const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'KURIKULUM'].includes(userRole)
  const isSuperadmin = userRole === 'SUPERADMIN'

  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteMode, setPromoteMode] = useState<'CLASS' | 'SELECTED'>('CLASS')

  const [filterClassId, setFilterClassId] = useState<string>('ALL')
  const [filterProgram, setFilterProgram] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [fromClassId, setFromClassId] = useState<string>('')
  const [toClassId, setToClassId] = useState<string>('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Bulk Edit States
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditData, setBulkEditData] = useState({
    updateClassId: false,
    classId: '',
    updateGender: false,
    gender: 'L',
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
    label: 'Siswa',
  })
  const abortRef = useRef(false)

  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState({ id: '', nisn: '', nis: '', name: '', gender: 'L', classId: '', username: '', password: '', program: '' })
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false)
  const [programTargetStudent, setProgramTargetStudent] = useState<Student | null>(null)
  const [programValue, setProgramValue] = useState<string>('')

  // Discount Dialog State
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountTargetStudent, setDiscountTargetStudent] = useState<Student | null>(null)
  const [discountPct, setDiscountPct] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState<string>('')

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) throw new Error('Gagal memuat data siswa')
      return res.json()
    }
  })

  const { data: classes } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/classes')
      if (!res.ok) throw new Error('Gagal memuat data kelas')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newStudent: any) => {
      const res = await authenticatedFetch('/api-backend/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      })
      if (!res.ok) throw new Error('Gagal menambah siswa')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      handleCloseDialog()
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedStudent: any) => {
      const res = await authenticatedFetch(`/api-backend/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent)
      })
      if (!res.ok) throw new Error('Gagal memperbarui siswa')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      handleCloseDialog()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus siswa')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    }
  })

  // Mutation khusus update program (SUPERADMIN only — memanggil PATCH /students/:id/program)
  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, program }: { id: string; program: string | null }) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}/program`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal mengubah program siswa')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setIsProgramDialogOpen(false)
      setProgramTargetStudent(null)
      setProgramValue('')
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal mengubah program siswa. Pastikan Anda login sebagai SUPERADMIN.')
    }
  })

  // Mutation khusus update discount default siswa (Bagian Keuangan / Admin)
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ id, discountPercentage, discountReason }: { id: string; discountPercentage: number; discountReason?: string }) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercentage, discountReason }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal mengatur diskon siswa')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['finance-students'] })
      queryClient.invalidateQueries({ queryKey: ['student-tagihan'] })
      queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
      queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })
      setIsDiscountDialogOpen(false)
      setDiscountTargetStudent(null)
      Swal.fire({
        title: 'Berhasil!',
        text: 'Diskon default siswa berhasil diperbarui dan disinkronkan ke tagihan',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan diskon', 'error')
    }
  })

  // Chunked upload handler untuk siswa
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
      label: 'Siswa',
    })

    let successCount = 0
    let errorCount = 0
    const errorMessages: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      if (abortRef.current) break
      setImportProgress(prev => ({ ...prev, currentBatch: i + 1 }))

      try {
        const res = await authenticatedFetch('/api-backend/students/bulk', {
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

    queryClient.invalidateQueries({ queryKey: ['students'] })
    setImportProgress(prev => ({
      ...prev,
      status: errorMessages.length > 0 ? 'error' : 'done',
      currentBatch: totalBatches,
      successCount,
      errorCount,
      errorMessages,
    }))
  }

  const promoteMutation = useMutation({
    mutationFn: async (payload: { fromClassId?: string; studentIds?: string[]; toClassId: string }) => {
      const res = await authenticatedFetch('/api-backend/students/promote-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal memproses kenaikan kelas')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setPromoteOpen(false)
      setSelectedStudentIds([])
      setFromClassId('')
      setToClassId('')
      alert(data.message || 'Berhasil menaikkan kelas siswa secara bersamaan!')
    },
    onError: (err: any) => {
      alert(err.message || 'Terjadi kesalahan saat memproses kenaikan kelas.')
    }
  })

  const handleOpenAddDialog = () => {
    setIsEdit(false)
    setFormData({ id: '', nisn: '', nis: '', name: '', gender: 'L', classId: '', username: '', password: '', program: '' })
    setOpen(true)
  }

  const handleOpenEditDialog = (student: Student) => {
    setIsEdit(true)
    setFormData({ 
      id: student.id, 
      nisn: student.nisn, 
      nis: student.nis, 
      name: student.name, 
      gender: student.gender, 
      classId: student.classId || student.class?.id || '', 
      username: student.user?.username || '', 
      password: '',
      program: student.program || ''
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ id: '', nisn: '', nis: '', name: '', gender: 'L', classId: '', username: '', password: '', program: '' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
      deleteMutation.mutate(id)
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

  const isPending = createMutation.isPending || updateMutation.isPending

  const rawFiltered = (students || []).filter(s => {
    const classOk = !filterClassId || filterClassId === 'ALL'
      ? true
      : s.classId === filterClassId || s.class?.id === filterClassId
    const programOk = !filterProgram || filterProgram === 'ALL'
      ? true
      : s.program === filterProgram
    return classOk && programOk
  })

  const filteredStudents = filterDataBySearch(rawFiltered, searchQuery)

  const toggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id))
    } else {
      setSelectedStudentIds([...selectedStudentIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id))
    }
  }

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStudentIds.length === 0) return

    const updatePayload: any = {}
    if (bulkEditData.updateClassId && bulkEditData.classId) updatePayload.classId = bulkEditData.classId
    if (bulkEditData.updateGender) updatePayload.gender = bulkEditData.gender
    if (bulkEditData.updatePassword && bulkEditData.password) updatePayload.password = bulkEditData.password

    if (Object.keys(updatePayload).length === 0) {
      alert('Pilih setidaknya satu bidang untuk diperbarui serentak.')
      return
    }

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedStudentIds.map(id => 
          authenticatedFetch(`/api-backend/students/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setBulkEditOpen(false)
      setSelectedStudentIds([])
      alert(`Berhasil memperbarui serentak ${selectedStudentIds.length} data siswa!`)
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui data siswa serentak.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} siswa terpilih?`)) return

    setIsSubmittingBulk(true)
    try {
      await Promise.all(
        selectedStudentIds.map(id =>
          authenticatedFetch(`/api-backend/students/${id}`, { method: 'DELETE' })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setSelectedStudentIds([])
      alert('Berhasil menghapus siswa terpilih!')
    } catch (err: any) {
      alert('Gagal menghapus siswa terpilih.')
    } finally {
      setIsSubmittingBulk(false)
    }
  }


  return (
    <>
    <ImportProgressDialog
      open={importDialogOpen}
      state={importProgress}
      destination="Tabel Siswa (students)"
      onDownloadTemplate={async () => {
        try {
          const res = await fetch('/api/template/siswa')
          if (!res.ok) throw new Error('Gagal mengunduh template')
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'template_import_siswa.xlsx'
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        } catch (err: any) {
          alert(err.message || 'Gagal mengunduh template Excel.')
        }
      }}
      templateExample={{ 'NISN': '0012345678', 'NIS': '2401001', 'Nama Siswa': 'Ahmad Dahlan', 'L/P': 'L', 'Kelas': 'X IPA 1', 'Username': 'ahmad123', 'Password': 'password123', 'Program': 'tahfidz' }}
      customParser={(rawData) =>
        rawData
          .map((row: any) => {
            const className = String(row['Kelas'] || '')
            const foundClass = classes?.find(c => c.name.toLowerCase() === className.toLowerCase())
            return {
              nisn: String(row['NISN'] || '').trim(),
              nis: String(row['NIS'] || '').trim(),
              name: String(row['Nama Siswa'] || '').trim(),
              gender: row['L/P'] === 'P' || row['L/P'] === 'Perempuan' ? 'P' : 'L',
              classId: foundClass ? foundClass.id : String(row['ID Kelas'] || '').trim(),
              username: String(row['Username'] || '').trim(),
              password: String(row['Password'] || '').trim(),
              program: String(row['Program'] || '').trim() || null,
            }
          })
          .filter((r: any) => r.name)
      }
      onFileReady={runChunkedUpload}
      onClose={() => {
        setImportDialogOpen(false)
        setImportProgress(prev => ({ ...prev, status: 'idle', totalRows: 0, totalBatches: 0, currentBatch: 0, successCount: 0, errorCount: 0, errorMessages: [] }))
      }}
    />

    {/* Dialog Set Program Siswa (SUPERADMIN Only) */}
    <Dialog open={isProgramDialogOpen} onOpenChange={(val) => { if (!val) { setIsProgramDialogOpen(false); setProgramTargetStudent(null); setProgramValue('') } }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <Tag className="w-5 h-5" />
            Set Label Program Siswa
          </DialogTitle>
          <DialogDescription>
            {programTargetStudent ? (
              <span>Mengubah label program untuk <strong>{programTargetStudent.name}</strong>. Fitur ini hanya bisa diakses oleh <strong>SUPERADMIN</strong>.</span>
            ) : 'Pilih program untuk siswa ini.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 rounded-xl p-3 text-xs text-purple-700 dark:text-purple-300 font-medium">
            ℹ️ Label program adalah kategorisasi program unggulan siswa. Label ini dapat digunakan oleh fitur keuangan, laporan, dan fitur lain di masa depan.
          </div>
          <Select value={programValue || '__none__'} onValueChange={(v) => setProgramValue(v === '__none__' ? '' : (v ?? ''))}>
            <SelectTrigger id="program-select">
              <SelectValue placeholder="Pilih Program..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Hapus / Tidak ada program —</SelectItem>
              {PROGRAM_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${p.color}`}>{p.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsProgramDialogOpen(false); setProgramTargetStudent(null); setProgramValue('') }}>
            Batal
          </Button>
          <Button
            disabled={updateProgramMutation.isPending}
            onClick={() => {
              if (programTargetStudent) {
                updateProgramMutation.mutate({ id: programTargetStudent.id, program: programValue || null })
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {updateProgramMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Simpan Program
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manajemen Siswa</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola data induk siswa, penempatan kelas, dan kenaikan kelas massal.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isSuperOrAdmin && (
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs" 
              onClick={() => {
                setPromoteMode('CLASS')
                setPromoteOpen(true)
              }}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Naik Kelas Massal
            </Button>
          )}

          <Button variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
            onClick={() => {
              setImportProgress(prev => ({ ...prev, status: 'idle' }))
              setImportDialogOpen(true)
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import Excel
          </Button>

          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Siswa
          </Button>
        </div>
      </div>


      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <GraduationCap className="w-6 h-6" />
              Naik Kelas / Pindah Kelas Massal
            </DialogTitle>
            <DialogDescription>
              Fitur khusus Superadmin & Admin IT untuk menaikkan kelas siswa secara bersamaan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="font-bold text-slate-800 dark:text-slate-200">Kelas Tujuan Baru (Dinaikkan Ke)</Label>
              <Select value={toClassId} onValueChange={(v) => setToClassId(v || '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Kelas Tujuan Baru" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
              <Label className="font-bold text-slate-800 dark:text-slate-200">Pilih Metode Kenaikan Kelas:</Label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={promoteMode === 'CLASS' ? 'default' : 'outline'}
                  onClick={() => setPromoteMode('CLASS')}
                  className={`text-xs font-bold ${promoteMode === 'CLASS' ? 'bg-indigo-600 text-white' : ''}`}
                >
                  Berdasarkan Kelas Asal
                </Button>
                <Button
                  type="button"
                  variant={promoteMode === 'SELECTED' ? 'default' : 'outline'}
                  onClick={() => setPromoteMode('SELECTED')}
                  className={`text-xs font-bold ${promoteMode === 'SELECTED' ? 'bg-indigo-600 text-white' : ''}`}
                >
                  Siswa Terpilih ({selectedStudentIds.length})
                </Button>
              </div>

              {promoteMode === 'CLASS' ? (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilih Kelas Asal yang akan Dinaikkan Bersamaan:</Label>
                  <Select value={fromClassId} onValueChange={(v) => setFromClassId(v || '')}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-950">
                      <SelectValue placeholder="Pilih Kelas Asal" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {fromClassId && (
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 font-medium">
                      Terdapat <strong>{students?.filter(s => s.classId === fromClassId || s.class?.id === fromClassId).length || 0} siswa</strong> di kelas asal ini yang akan dipindahkan bersamaan.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mt-2 text-xs">
                  {selectedStudentIds.length === 0 ? (
                    <p className="text-amber-600 dark:text-amber-400 font-medium">Belum ada siswa yang dicentang di tabel. Silakan centang siswa pada tabel terlebih dahulu atau pilih metode Per Kelas Asal.</p>
                  ) : (
                    <p className="text-emerald-700 dark:text-emerald-400 font-bold">Sebanyak {selectedStudentIds.length} siswa telah dipilih dari tabel untuk dinaikkan kelas bersamaan.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteOpen(false)}>Batal</Button>
            <Button
              disabled={
                promoteMutation.isPending ||
                !toClassId ||
                (promoteMode === 'CLASS' && !fromClassId) ||
                (promoteMode === 'SELECTED' && selectedStudentIds.length === 0)
              }
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin memproses kenaikan kelas massal ini?')) {
                  promoteMutation.mutate({
                    fromClassId: promoteMode === 'CLASS' ? fromClassId : undefined,
                    studentIds: promoteMode === 'SELECTED' ? selectedStudentIds : undefined,
                    toClassId
                  })
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {promoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Proses Naik Kelas Massal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(val) => !val && handleCloseDialog()}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
              <DialogDescription>
                {isEdit ? 'Ubah data induk siswa dan penempatan kelas.' : 'Masukkan data induk siswa untuk mendaftarkannya ke dalam sistem.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nisn">NISN</Label>
                <Input 
                  id="nisn" 
                  value={formData.nisn}
                  onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nis">NIS</Label>
                <Input 
                  id="nis" 
                  value={formData.nis}
                  onChange={(e) => setFormData({...formData, nis: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input 
                  id="name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-Laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username (Opsional)</Label>
                <Input 
                  id="username" 
                  placeholder="Biarkan kosong untuk otomatis NISN"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (Opsional)</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Biarkan kosong untuk otomatis dari NIS"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={formData.classId} onValueChange={(v) => setFormData({...formData, classId: v || ''})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Program Unggulan</Label>
                  {!isSuperadmin && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                      Hanya SUPERADMIN
                    </span>
                  )}
                </div>
                <Select
                  value={formData.program || '__none__'}
                  onValueChange={(v) => setFormData({...formData, program: v === '__none__' ? '' : (v ?? '')})}
                  disabled={!isSuperadmin}
                >
                  <SelectTrigger className={!isSuperadmin ? 'opacity-60 cursor-not-allowed' : ''}>
                    <SelectValue placeholder="Pilih Program (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tidak ada program —</SelectItem>
                    {PROGRAM_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isSuperadmin && (
                  <p className="text-xs text-slate-400 mt-1">Label program hanya bisa diubah oleh SUPERADMIN.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEdit ? 'Simpan Perubahan' : 'Simpan Siswa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Bulk Edit Serentak Siswa */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleBulkEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Edit3 className="w-5 h-5" />
                Edit Serentak ({selectedStudentIds.length} Siswa Terpilih)
              </DialogTitle>
              <DialogDescription>
                Pilih bidang yang ingin Anda ubah secara bersamaan untuk seluruh siswa terpilih.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Option 1: Ubah Kelas */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="updateClassId"
                    checked={bulkEditData.updateClassId}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, updateClassId: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="updateClassId" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Pindahkan Kelas Serentak
                  </Label>
                </div>
                {bulkEditData.updateClassId && (
                  <Select value={bulkEditData.classId} onValueChange={(v) => setBulkEditData(prev => ({ ...prev, classId: v || '' }))}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Pilih Kelas Tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Option 2: Ubah Jenis Kelamin */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="updateGender"
                    checked={bulkEditData.updateGender}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, updateGender: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="updateGender" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Ubah Jenis Kelamin Serentak
                  </Label>
                </div>
                {bulkEditData.updateGender && (
                  <Select value={bulkEditData.gender} onValueChange={(v) => setBulkEditData(prev => ({ ...prev, gender: v || 'L' }))}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Pilih L/P" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki (L)</SelectItem>
                      <SelectItem value="P">Perempuan (P)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Option 3: Reset Password */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="updatePasswordSiswa"
                    checked={bulkEditData.updatePassword}
                    onChange={(e) => setBulkEditData(prev => ({ ...prev, updatePassword: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="updatePasswordSiswa" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Reset / Ubah Password Login Serentak
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

      {/* Floating Bar Aksi Serentak / Bulk Selection Toolbar */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-blue-900 text-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-blue-700 mb-4">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-blue-300" />
            <span className="font-bold text-sm">
              Terpilih <span className="text-amber-300 font-extrabold text-base">{selectedStudentIds.length}</span> siswa
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
            {isSuperOrAdmin && (
              <Button 
                size="sm" 
                onClick={() => {
                  setPromoteMode('SELECTED')
                  setPromoteOpen(true)
                }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold shadow-xs"
              >
                <GraduationCap className="w-4 h-4 mr-1.5" />
                Naik / Pindah Kelas
              </Button>
            )}
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
              onClick={() => setSelectedStudentIds([])}
              className="text-blue-200 hover:text-white hover:bg-blue-800"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Daftar Siswa Aktif</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">Menampilkan semua siswa yang terdaftar di sistem.</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedStudentIds.length > 0 && isSuperOrAdmin && (
                <Button 
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  onClick={() => {
                    setPromoteMode('SELECTED')
                    setPromoteOpen(true)
                  }}
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                  Pindahkan ({selectedStudentIds.length}) Siswa
                </Button>
              )}

              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari siswa (NISN/nama)..."
              />

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">Kelas:</span>
                <Select value={filterClassId} onValueChange={(v) => setFilterClassId(v || 'ALL')}>
                  <SelectTrigger className="w-[140px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {classes?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900 rounded-lg px-2.5 py-1">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-purple-500">Program:</span>
                <Select value={filterProgram} onValueChange={(v) => setFilterProgram(v || 'ALL')}>
                  <SelectTrigger className="w-[150px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Program</SelectItem>
                    {PROGRAM_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                {isSuperOrAdmin && (
                  <TableHead className="w-[40px] pl-4">
                    <button type="button" onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
                      {selectedStudentIds.length > 0 && selectedStudentIds.length === filteredStudents.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead className="w-[60px] pl-4">No</TableHead>
                <TableHead>NISN / NIS</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>L/P</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Diskon Default</TableHead>
                <TableHead>Akun Login</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                    Belum ada data siswa untuk kriteria ini.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((item, index) => {
                  const isSelected = selectedStudentIds.includes(item.id)
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''}>
                      {isSuperOrAdmin && (
                        <TableCell className="pl-4">
                          <button type="button" onClick={() => toggleSelectStudent(item.id)} className="text-slate-500 hover:text-indigo-600">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      <TableCell className="pl-4 font-medium text-slate-500">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{item.nisn}</span>
                          <span className="text-xs text-slate-500">{item.nis}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell>{item.gender}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {item.class?.name || 'Belum ada kelas'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const badge = getProgramBadge(item.program)
                          return badge ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {item.discountPercentage && item.discountPercentage > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                            Diskon {item.discountPercentage}% {item.discountReason ? `(${item.discountReason})` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.user ? (
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                            {item.user.username}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Tidak ada</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Set Diskon (Keuangan)"
                            onClick={() => {
                              setDiscountTargetStudent(item)
                              setDiscountPct(item.discountPercentage || 0)
                              setDiscountReason(item.discountReason || '')
                              setIsDiscountDialogOpen(true)
                            }}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Percent className="w-4 h-4" />
                          </Button>
                          {isSuperadmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Set Program (SUPERADMIN)"
                              onClick={() => {
                                setProgramTargetStudent(item)
                                setProgramValue(item.program || '')
                                setIsProgramDialogOpen(true)
                              }}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <Tag className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

      {/* Modal Pengaturan Diskon Default Siswa (Keuangan) */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Percent className="w-5 h-5 text-amber-600" /> Pengaturan Diskon Default Siswa
            </DialogTitle>
            <DialogDescription>
              Atur persentase diskon yang akan memotong otomatis tagihan baru siswa ini.
            </DialogDescription>
          </DialogHeader>

          {discountTargetStudent && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{discountTargetStudent.name}</p>
                <p className="text-xs text-slate-500">NISN: {discountTargetStudent.nisn} | Kelas: {discountTargetStudent.class?.name}</p>
                {discountTargetStudent.program && (
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mt-1">Program Siswa: {discountTargetStudent.program.toUpperCase()}</p>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Pilihan Diskon Default</Label>
                <Select value={discountPct.toString()} onValueChange={(v) => setDiscountPct(parseInt(v || '0', 10))}>
                  <SelectTrigger className="bg-white dark:bg-slate-950"><SelectValue placeholder="Pilih persentase..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Tanpa Diskon)</SelectItem>
                    <SelectItem value="25">25% Diskon</SelectItem>
                    <SelectItem value="50">50% Diskon</SelectItem>
                    <SelectItem value="75">75% Diskon</SelectItem>
                    <SelectItem value="100">100% Diskon (Beasiswa Penuh / Kader)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Alasan / Catatan Diskon (Opsional)</Label>
                <Input
                  placeholder="Misal: Beasiswa Kader / Anak Yatim / Prestasi"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>Batal</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (!discountTargetStudent) return
                updateDiscountMutation.mutate({
                  id: discountTargetStudent.id,
                  discountPercentage: discountPct,
                  discountReason: discountReason
                })
              }}
              disabled={updateDiscountMutation.isPending}
            >
              {updateDiscountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Simpan Diskon Siswa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
