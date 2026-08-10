'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, FileSpreadsheet, Pencil, Trash2, GraduationCap, Filter, CheckSquare, Square, Edit3, Tag, Percent, Info } from 'lucide-react'
import Swal from 'sweetalert2'

const currencyFormat = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0)
}
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
  { value: 'tahfidz', label: 'Tahfidz', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { value: 'saintek', label: 'SAINSOS', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
  { value: 'olahraga', label: 'Olahraga', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  { value: 'MIC', label: 'MIC (Muhipo Internasional Class)', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'seni budaya', label: 'Seni Budaya', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' },
  { value: 'ai', label: 'Artificial Intelligence', color: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
  { value: 'inklusi', label: 'Inklusi', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  { value: 'enterpreneur', label: 'Enterpreneur', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
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
  gelombang?: string | null
  jalurPendaftaran?: string | null
  discountPercentage?: number
  discountReason?: string | null
  beasiswaSeragamPct?: number
  beasiswaSppPct?: number
  beasiswaDppPct?: number
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
  const subRole = (session?.user as any)?.subRole || ''
  const subRole2 = (session?.user as any)?.subRole2 || ''
  const subRole3 = (session?.user as any)?.subRole3 || ''
  const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'KURIKULUM', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole)
  const isSuperadmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole)
  const isFinance = ['SUPERADMIN', 'ADMIN_IT', 'KEUANGAN'].includes(userRole) || [subRole, subRole2, subRole3].includes('KEUANGAN')

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
  const [formData, setFormData] = useState({ 
    id: '', 
    nisn: '', 
    nis: '', 
    name: '', 
    gender: 'L', 
    classId: '', 
    username: '', 
    password: '', 
    program: '',
    gelombang: 'Gelombang 1',
    jalurPendaftaran: 'Mandiri',
    beasiswaSeragamPct: 0,
    beasiswaSppPct: 0,
    beasiswaDppPct: 0,
  })
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false)
  const [programTargetStudent, setProgramTargetStudent] = useState<Student | null>(null)
  const [programValue, setProgramValue] = useState<string>('')

  // Discount Dialog State
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountTargetStudent, setDiscountTargetStudent] = useState<Student | null>(null)
  const [discountPct, setDiscountPct] = useState<number>(0)
  const [discountReason, setDiscountReason] = useState<string>('')
  const [beasiswaSeragamVal, setBeasiswaSeragamVal] = useState<number>(0)
  const [beasiswaSppVal, setBeasiswaSppVal] = useState<number>(0)
  const [beasiswaDppVal, setBeasiswaDppVal] = useState<number>(0)

  const { data: programConfigs } = useQuery<Array<{ id: string; code: string; name: string }>>({
    queryKey: ['program-configs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/program-configs')
      if (!res.ok) return []
      return res.json()
    }
  })

  const dynamicProgramOptions = programConfigs && programConfigs.length > 0
    ? programConfigs.map((p) => {
        const fallbackObj = PROGRAM_OPTIONS.find((opt) => opt.value.toLowerCase() === p.code.toLowerCase())
        return {
          value: p.code,
          label: p.name,
          color: fallbackObj ? fallbackObj.color : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
        }
      })
    : PROGRAM_OPTIONS

  const getProgramBadge = (programValue: string | null | undefined) => {
    if (!programValue) return null
    return dynamicProgramOptions.find(p => p.value.toLowerCase() === programValue.toLowerCase()) ?? {
      value: programValue,
      label: programValue,
      color: 'bg-purple-100 text-purple-800'
    }
  }

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

  useEffect(() => {
    const handleOpenBeasiswa = (e: any) => {
      const std = e.detail
      if (std) {
        setDiscountTargetStudent(std)
        setDiscountPct(std.discountPercentage || 0)
        setDiscountReason(std.discountReason || '')
        setBeasiswaSeragamVal(std.beasiswaSeragamPct || 0)
        setBeasiswaSppVal(std.beasiswaSppPct || 0)
        setBeasiswaDppVal(std.beasiswaDppPct || 0)
        setIsDiscountDialogOpen(true)
      }
    }
    window.addEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
    return () => window.removeEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
  }, [])

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

  // Mutation khusus update program (SUPERADMIN / ADMIN TU)
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
      alert(err.message || 'Gagal mengubah program siswa.')
    }
  })

  // Mutation khusus update discount & beasiswa per item (Bagian Keuangan)
  const updateDiscountMutation = useMutation({
    mutationFn: async ({ id, discountPercentage, discountReason, beasiswaSeragamPct, beasiswaSppPct, beasiswaDppPct }: { id: string; discountPercentage: number; discountReason?: string; beasiswaSeragamPct?: number; beasiswaSppPct?: number; beasiswaDppPct?: number }) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}/discount`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPercentage, discountReason, beasiswaSeragamPct, beasiswaSppPct, beasiswaDppPct }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal mengatur diskon/beasiswa siswa')
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
    setFormData({ 
      id: '', 
      nisn: '', 
      nis: '', 
      name: '', 
      gender: 'L', 
      classId: '', 
      username: '', 
      password: '', 
      program: '',
      gelombang: 'Gelombang 1',
      jalurPendaftaran: 'Mandiri',
      beasiswaSeragamPct: 0,
      beasiswaSppPct: 0,
      beasiswaDppPct: 0,
    })
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
      program: student.program || '',
      gelombang: student.gelombang || 'Gelombang 1',
      jalurPendaftaran: student.jalurPendaftaran || 'Mandiri',
      beasiswaSeragamPct: student.beasiswaSeragamPct || 0,
      beasiswaSppPct: student.beasiswaSppPct || 0,
      beasiswaDppPct: student.beasiswaDppPct || 0,
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setFormData({ 
      id: '', 
      nisn: '', 
      nis: '', 
      name: '', 
      gender: 'L', 
      classId: '', 
      username: '', 
      password: '', 
      program: '',
      gelombang: 'Gelombang 1',
      jalurPendaftaran: 'Mandiri',
      beasiswaSeragamPct: 0,
      beasiswaSppPct: 0,
      beasiswaDppPct: 0,
    })
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
              {dynamicProgramOptions.map(p => (
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
                  <SelectValue placeholder="Pilih Kelas Tujuan Baru">
                    {classes?.find(c => c.id === toClassId)?.name || 'Pilih Kelas Tujuan Baru'}
                  </SelectValue>
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
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-500">
                {isEdit ? 'Perbarui data induk, gelombang, jalur pendaftaran, dan kelas siswa.' : 'Isi form di bawah untuk mendaftarkan siswa baru ke dalam sistem.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar max-h-[calc(90vh-130px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nisn" className="text-xs font-semibold">NISN</Label>
                  <Input 
                    id="nisn" 
                    value={formData.nisn}
                    onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                    placeholder="Masukkan NISN"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nis" className="text-xs font-semibold">NIS</Label>
                  <Input 
                    id="nis" 
                    value={formData.nis}
                    onChange={(e) => setFormData({...formData, nis: e.target.value})}
                    placeholder="Masukkan NIS"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">Nama Lengkap</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nama Lengkap Siswa"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jenis Kelamin</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v || ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-Laki (L)</SelectItem>
                      <SelectItem value="P">Perempuan (P)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold">Username Login (Opsional)</Label>
                  <Input 
                    id="username" 
                    placeholder="Otomatis dari NISN jika kosong"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">Password (Opsional)</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Otomatis dari NIS jika kosong"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Penempatan Kelas</Label>
                  <Select value={formData.classId} onValueChange={(v) => setFormData({...formData, classId: v || ''})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kelas">
                        {classes?.find(c => c.id === formData.classId)?.name || 'Pilih Kelas'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gelombang Masuk</Label>
                  <Select value={formData.gelombang || 'Gelombang 1'} onValueChange={(v) => setFormData({...formData, gelombang: v || 'Gelombang 1'})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gelombang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gelombang 1">Gelombang 1</SelectItem>
                      <SelectItem value="Gelombang 2">Gelombang 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jalur Pendaftaran</Label>
                  <Select value={formData.jalurPendaftaran || 'Mandiri'} onValueChange={(v) => setFormData({...formData, jalurPendaftaran: v || 'Mandiri'})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jalur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mandiri">Mandiri</SelectItem>
                      <SelectItem value="Kader">Kader</SelectItem>
                      <SelectItem value="Kader Persyarikatan">Kader Persyarikatan</SelectItem>
                      <SelectItem value="Prestasi">Prestasi</SelectItem>
                      <SelectItem value="Bidikmisi">Bidikmisi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Label className="text-xs font-semibold">Program Unggulan Sekolah</Label>
                <Select
                  value={formData.program || '__none__'}
                  onValueChange={(v) => setFormData({...formData, program: v === '__none__' ? '' : (v ?? '')})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Program Unggulan Sekolah (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa Program Khusus (Reguler) —</SelectItem>
                    {dynamicProgramOptions.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 font-bold text-white">
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
                    <SelectValue placeholder="Semua Kelas">
                      {filterClassId === 'ALL' || !filterClassId
                        ? 'Semua Kelas'
                        : classes?.find(c => c.id === filterClassId)?.name || 'Semua Kelas'}
                    </SelectValue>
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
                    {dynamicProgramOptions.map(p => (
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
                <TableHead>Gelombang</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Jalur Pendaftaran</TableHead>
                <TableHead>Kelas</TableHead>
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
                          <span className="font-semibold text-slate-900 dark:text-white font-mono text-xs">{item.nisn}</span>
                          <span className="text-xs text-slate-400 font-mono">{item.nis}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {item.gelombang || 'Gelombang 1'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const badge = getProgramBadge(item.program)
                          return badge ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Reguler</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.jalurPendaftaran === 'Kader' || item.jalurPendaftaran === 'Kader Persyarikatan'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : item.jalurPendaftaran === 'Prestasi' || item.jalurPendaftaran === 'Bidikmisi'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {item.jalurPendaftaran || 'Mandiri'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-800">
                          {item.class?.name || 'Belum ada kelas'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="ghost" size="icon" title="Kelola / Edit Data Siswa" onClick={() => handleOpenEditDialog(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Hapus Siswa" onClick={() => handleDelete(item.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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

      {/* Modal Pengaturan Beasiswa Keuangan Siswa */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg font-bold">
              <Percent className="w-5 h-5 text-amber-600" /> Pengaturan Beasiswa Keuangan Siswa
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500">
              Atur persentase beasiswa per item biaya. Potongan otomatis dihitung dari biaya default (misal Seragam default Rp 2.000.000, diskon 50% = Rp 1.000.000).
            </DialogDescription>
          </DialogHeader>

          {discountTargetStudent && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar max-h-[calc(90vh-130px)]">
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{discountTargetStudent.name}</p>
                <p className="text-xs text-slate-500 font-mono">NISN: {discountTargetStudent.nisn} | Kelas: {discountTargetStudent.class?.name || 'Belum ada kelas'}</p>
                <div className="flex flex-wrap gap-1.5 text-xs font-semibold pt-1">
                  <span className={`px-2 py-0.5 rounded-md ${
                    discountTargetStudent.jalurPendaftaran === 'Mandiri'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  }`}>
                    Jalur: {discountTargetStudent.jalurPendaftaran || 'Mandiri'}
                  </span>
                  <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    Gelombang: {discountTargetStudent.gelombang || 'Gelombang 1'}
                  </span>
                  {discountTargetStudent.program && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                      Program: {discountTargetStudent.program.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Rincian Beasiswa Per Item */}
              <div className="space-y-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <p className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Alokasi Beasiswa (%) Per Item Biaya:
                  </p>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950 px-2 py-0.5 rounded">
                    {discountTargetStudent.jalurPendaftaran !== 'Mandiri' ? 'Seragam, SPP & DPP' : 'Hanya SPP & DPP'}
                  </span>
                </div>

                {/* Beasiswa Seragam (Hanya Non-Mandiri: Kader, Kader Persyarikatan, Prestasi, Bidikmisi) */}
                {discountTargetStudent.jalurPendaftaran !== 'Mandiri' ? (
                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3 rounded-lg border border-amber-200/60 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200">
                        Beasiswa Seragam (%)
                      </Label>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        Potongan: {beasiswaSeragamVal}% ({currencyFormat(2000000 * (beasiswaSeragamVal / 100))})
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaSeragamVal || ''}
                        onChange={(e) => setBeasiswaSeragamVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-xs h-9 pr-8 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Bayar Netto: {currencyFormat(2000000 * (1 - beasiswaSeragamVal / 100))} (Default Seragam Rp 2.000.000)</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-amber-100/40 dark:bg-slate-950 p-2.5 rounded-lg border border-amber-200/60 dark:border-slate-800 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Jalur Mandiri tidak berhak mendapat Beasiswa Seragam. (Hanya SPP & DPP).</span>
                  </div>
                )}

                {/* Beasiswa SPP & DPP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3 rounded-lg border border-amber-200/60 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200">
                        Beasiswa SPP (%)
                      </Label>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {beasiswaSppVal}%
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaSppVal || ''}
                        onChange={(e) => setBeasiswaSppVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-xs h-9 pr-8 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3 rounded-lg border border-amber-200/60 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-bold text-slate-800 dark:text-slate-200">
                        Beasiswa DPP (%)
                      </Label>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {beasiswaDppVal}%
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0 - 100%"
                        value={beasiswaDppVal || ''}
                        onChange={(e) => setBeasiswaDppVal(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="bg-white dark:bg-slate-900 text-xs h-9 pr-8 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Alasan / Catatan Beasiswa</Label>
                <Input
                  placeholder="Misal: Beasiswa Kader Persyarikatan / Prestasi / Bidikmisi"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>Batal</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => {
                if (!discountTargetStudent) return
                updateDiscountMutation.mutate({
                  id: discountTargetStudent.id,
                  discountPercentage: beasiswaSppVal || discountPct,
                  discountReason: discountReason,
                  beasiswaSeragamPct: discountTargetStudent.jalurPendaftaran !== 'Mandiri' ? beasiswaSeragamVal : 0,
                  beasiswaSppPct: beasiswaSppVal,
                  beasiswaDppPct: beasiswaDppVal,
                })
              }}
              disabled={updateDiscountMutation.isPending}
            >
              {updateDiscountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Simpan Beasiswa Keuangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
