'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useSession } from 'next-auth/react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, FileSpreadsheet, Pencil, Trash2, GraduationCap, Filter, CheckSquare, Square, Edit3, Tag, Percent, Info, UserPlus, RotateCcw } from 'lucide-react'
import Swal from 'sweetalert2'
import { confirmDelete } from '@/lib/swal-helper'

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

const defaultBioData = {
  // A. KETERANGAN TENTANG DIRI SISWA
  namaPanggilan: '',
  tempatLahir: '',
  tglLahir: '',
  agama: 'Islam',
  kewarganegaraan: 'Indonesia',
  anakKe: '',
  jmlSaudaraKandung: '',
  jmlSaudaraTiri: '',
  jmlSaudaraAngkat: '',
  statusYatim: '',
  bahasa: '',

  // B. KETERANGAN TEMPAT TINGGAL
  alamat: '',
  telp: '',
  tinggalDengan: '',
  jarakSekolah: '',

  // C. KETERANGAN KESEHATAN
  golDarah: '',
  penyakitPernah: '',
  kelainanJasmani: '',
  tinggiBadan: '',
  beratBadan: '',

  // D. KETERANGAN PENDIDIKAN
  lulusanDari: '',
  alamatSekolah: '',
  noSttb: '',
  tglSttb: '',
  lamaBelajar: '',
  noSkhun: '',
  tglSkhun: '',
  pindahanDariSekolah: '',
  alasanPindah: '',
  diterimaDiKelas: '',
  tglDiterima: '',

  // E. KETERANGAN TENTANG AYAH KANDUNG
  namaAyah: '',
  ttlAyah: '',
  agamaAyah: 'Islam',
  kewarganegaraanAyah: 'Indonesia',
  pendidikanAyah: '',
  pekerjaanAyah: '',
  penghasilanAyah: '',
  alamatAyah: '',
  telpAyah: '',
  statusAyah: '',

  // F. KETERANGAN TENTANG IBU KANDUNG
  namaIbu: '',
  ttlIbu: '',
  agamaIbu: 'Islam',
  kewarganegaraanIbu: 'Indonesia',
  pendidikanIbu: '',
  pekerjaanIbu: '',
  penghasilanIbu: '',
  alamatIbu: '',
  telpIbu: '',
  statusIbu: '',

  // G. KETERANGAN TENTANG WALI
  namaWali: '',
  ttlWali: '',
  agamaWali: '',
  kewarganegaraanWali: '',
  pendidikanWali: '',
  pekerjaanWali: '',
  penghasilanWali: '',
  alamatWali: '',
  telpWali: '',

  // H. KEGEMARAN SISWA
  kesenian: '',
  olahRaga: '',
  kemasyarakatan: '',
  kegemaranLain: '',

  // I. KETERANGAN PERKEMBANGAN SISWA
  menerimaBeasiswa: '',
  tglMeninggalkanSekolah: '',
  alasanMeninggalkan: '',
  kelasMeninggalkan: '',
  noSuratMeninggalkan: '',
  ketMeninggalkan: '',
  tamatBelajar: '',
  sttbNomor: '',
  tglIjazah: '',
  tglTerimaIjazah: '',

  // J. KETERANGAN SETELAH SELESAI PENDIDIKAN
  melanjutkanDi: '',
  bekerja: '',
  tglMulaiBekerja: '',
  namaPerusahaan: '',
  penghasilanKerja: ''
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
  beasiswaPercentage?: number
  beasiswaReason?: string | null
  beasiswaSeragamPct?: number
  beasiswaSppPct?: number
  beasiswaDppPct?: number
  bioData?: string | null
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
  const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN', 'KURIKULUM', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole2) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole3)
  const isSuperadmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(userRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole2) || ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(subRole3)
  const isKepalaSekolah = [userRole, subRole, subRole2, subRole3].includes('KEPALA_SEKOLAH')
  const isFinance = ['SUPERADMIN', 'ADMIN_IT', 'KEUANGAN'].includes(userRole) || [subRole, subRole2, subRole3].includes('KEUANGAN')

  const [open, setOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [promoteMode, setPromoteMode] = useState<'CLASS' | 'SELECTED'>('CLASS')

  const [filterClassId, setFilterClassId] = useState<string>('ALL')
  const [filterProgram, setFilterProgram] = useState<string>('ALL')
  const [filterGender, setFilterGender] = useState<string>('ALL')
  const [filterGelombang, setFilterGelombang] = useState<string>('ALL')
  const [filterJalur, setFilterJalur] = useState<string>('ALL')
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
  const [activeFormTab, setActiveFormTab] = useState<'utama' | 'diri_tinggal' | 'kesehatan_pendidikan' | 'orangtua' | 'kegemaran_perkembangan'>('utama')
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
    bioData: { ...defaultBioData }
  })

  const updateBioData = (field: string, val: any) => {
    setFormData(prev => ({
      ...prev,
      bioData: {
        ...(prev.bioData || defaultBioData),
        [field]: val
      }
    }))
  }

  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false)
  const [programTargetStudent, setProgramTargetStudent] = useState<Student | null>(null)
  const [programValue, setProgramValue] = useState<string>('')

  // Beasiswa Dialog State
  const [isBeasiswaDialogOpen, setIsBeasiswaDialogOpen] = useState(false)
  const [beasiswaTargetStudent, setBeasiswaTargetStudent] = useState<Student | null>(null)
  const [beasiswaPct, setBeasiswaPct] = useState<number>(0)
  const [beasiswaReason, setBeasiswaReason] = useState<string>('')
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

  // Combined All Program Options for Table Filter (Includes dynamic, preset, and any distinct values from actual student records)
  const allProgramOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>()

    dynamicProgramOptions.forEach(opt => {
      map.set(opt.value.toLowerCase(), { value: opt.value, label: opt.label })
    })

    PROGRAM_OPTIONS.forEach(opt => {
      if (!map.has(opt.value.toLowerCase())) {
        map.set(opt.value.toLowerCase(), { value: opt.value, label: opt.label })
      }
    })

    students?.forEach(s => {
      if (s.program && s.program.trim() !== '') {
        const valLower = s.program.toLowerCase()
        if (!map.has(valLower)) {
          const pretty = s.program.charAt(0).toUpperCase() + s.program.slice(1)
          map.set(valLower, { value: s.program, label: pretty })
        }
      }
    })

    return Array.from(map.values())
  }, [dynamicProgramOptions, students])

  const allJalurOptions = useMemo(() => {
    const defaultJalur = ['Mandiri', 'Kader', 'Kader Persyarikatan', 'Prestasi', 'Bidikmisi']
    const setJalur = new Set(defaultJalur)
    students?.forEach(s => {
      if (s.jalurPendaftaran && s.jalurPendaftaran.trim() !== '') {
        setJalur.add(s.jalurPendaftaran)
      }
    })
    return Array.from(setJalur)
  }, [students])

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
      const studentId = e.detail?.studentId
      const std = students?.find(s => s.id === studentId)
      if (std) {
        setBeasiswaTargetStudent(std)
        setBeasiswaPct(std.beasiswaPercentage || 0)
        setBeasiswaReason(std.beasiswaReason || '')
        setBeasiswaSeragamVal(std.beasiswaSeragamPct || 0)
        setBeasiswaSppVal(std.beasiswaSppPct || 0)
        setBeasiswaDppVal(std.beasiswaDppPct || 0)
        setIsBeasiswaDialogOpen(true)
      }
    }
    window.addEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
    return () => window.removeEventListener('open-beasiswa-dialog', handleOpenBeasiswa)
  }, [students])

  const createMutation = useMutation({
    mutationFn: async (newStudent: any) => {
      const payload = {
        ...newStudent,
        bioData: typeof newStudent.bioData === 'object' ? JSON.stringify(newStudent.bioData) : newStudent.bioData
      }
      const res = await authenticatedFetch('/api-backend/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      const payload = {
        ...updatedStudent,
        bioData: typeof updatedStudent.bioData === 'object' ? JSON.stringify(updatedStudent.bioData) : updatedStudent.bioData
      }
      const res = await authenticatedFetch(`/api-backend/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

  // Mutation khusus update beasiswa per item (Bagian Keuangan)
  const updateBeasiswaMutation = useMutation({
    mutationFn: async ({ id, beasiswaPercentage, beasiswaReason, beasiswaSeragamPct, beasiswaSppPct, beasiswaDppPct }: { id: string; beasiswaPercentage: number; beasiswaReason?: string; beasiswaSeragamPct?: number; beasiswaSppPct?: number; beasiswaDppPct?: number }) => {
      const res = await authenticatedFetch(`/api-backend/students/${id}/beasiswa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beasiswaPercentage, beasiswaReason, beasiswaSeragamPct, beasiswaSppPct, beasiswaDppPct }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal mengatur beasiswa siswa')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['finance-students'] })
      queryClient.invalidateQueries({ queryKey: ['student-tagihan'] })
      queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
      queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })
      setIsBeasiswaDialogOpen(false)
      setBeasiswaTargetStudent(null)
      Swal.fire({
        title: 'Berhasil!',
        text: 'Beasiswa default siswa berhasil diperbarui dan disinkronkan ke tagihan',
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan beasiswa', 'error')
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
    setActiveFormTab('utama')
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
      bioData: { ...defaultBioData }
    })
    setOpen(true)
  }

  const handleOpenEditDialog = (student: Student) => {
    setIsEdit(true)
    setActiveFormTab('utama')
    let parsedBio = { ...defaultBioData }
    if (student.bioData) {
      try {
        const raw = typeof student.bioData === 'string' ? JSON.parse(student.bioData) : student.bioData
        parsedBio = { ...defaultBioData, ...raw }
      } catch (e) {}
    }
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
      bioData: parsedBio
    })
    setOpen(true)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setActiveFormTab('utama')
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
      bioData: { ...defaultBioData }
    })
  }

  const handleDelete = (id: string) => {
    confirmDelete({
      title: 'Hapus Siswa?',
      text: 'Apakah Anda yakin ingin menghapus siswa ini?',
      onConfirm: async () => {
        await deleteMutation.mutateAsync(id)
        Swal.fire({
          title: 'Berhasil!',
          text: 'Siswa berhasil dihapus!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        })
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

  const isPending = createMutation.isPending || updateMutation.isPending

  const isAnyFilterActive = (filterClassId && filterClassId !== 'ALL') ||
    (filterProgram && filterProgram !== 'ALL') ||
    (filterGender && filterGender !== 'ALL') ||
    (filterGelombang && filterGelombang !== 'ALL') ||
    (filterJalur && filterJalur !== 'ALL') ||
    searchQuery.trim() !== ''

  const handleResetFilters = () => {
    setFilterClassId('ALL')
    setFilterProgram('ALL')
    setFilterGender('ALL')
    setFilterGelombang('ALL')
    setFilterJalur('ALL')
    setSearchQuery('')
  }

  const rawFiltered = (students || []).filter(s => {
    const classOk = !filterClassId || filterClassId === 'ALL'
      ? true
      : s.classId === filterClassId || s.class?.id === filterClassId

    const programOk = !filterProgram || filterProgram === 'ALL'
      ? true
      : filterProgram === '__none__'
        ? (!s.program || s.program.trim() === '')
        : s.program?.toLowerCase() === filterProgram.toLowerCase()

    const genderOk = !filterGender || filterGender === 'ALL'
      ? true
      : s.gender === filterGender

    const gelombangOk = !filterGelombang || filterGelombang === 'ALL'
      ? true
      : s.gelombang === filterGelombang

    const jalurOk = !filterJalur || filterJalur === 'ALL'
      ? true
      : s.jalurPendaftaran === filterJalur

    return classOk && programOk && genderOk && gelombangOk && jalurOk
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

  const handleBulkDelete = () => {
    if (selectedStudentIds.length === 0) return
    confirmDelete({
      title: 'Hapus Siswa Terpilih?',
      text: `Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} siswa terpilih secara permanen?`,
      onConfirm: async () => {
        setIsSubmittingBulk(true)
        try {
          await Promise.all(
            selectedStudentIds.map(id =>
              authenticatedFetch(`/api-backend/students/${id}`, { method: 'DELETE' })
            )
          )
          queryClient.invalidateQueries({ queryKey: ['students'] })
          setSelectedStudentIds([])
          Swal.fire({
            title: 'Berhasil!',
            text: 'Berhasil menghapus siswa terpilih!',
            icon: 'success',
            timer: 1800,
            showConfirmButton: false,
          })
        } finally {
          setIsSubmittingBulk(false)
        }
      }
    })
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
      templateExample={{ 
        'NIS *': '2401001', 
        'Nama Siswa *': 'Ahmad Dahlan', 
        'L/P *': 'L', 
        'Kelas *': 'X IPA 1', 
        'NISN': '0012345678', 
        'Program': 'tahfidz',
        'Nama Panggilan': 'Dahlan',
        'Tempat Lahir': 'Yogyakarta',
        'Tanggal Lahir': '2008-08-01',
        'Agama': 'Islam',
        'Alamat': 'Jl. K.H. Ahmad Dahlan No 1',
        'No Telp': '081234567890',
        'Nama Ayah': 'K.H. Abu Bakar',
        'Nama Ibu': 'Siti Aminah'
      }}
      customParser={(rawData) =>
        rawData
          .map((row: any) => {
            const className = String(row['Kelas *'] || row['Kelas'] || '').trim()
            const foundClass = classes?.find(c => c.name.toLowerCase() === className.toLowerCase())
            const genderVal = String(row['L/P *'] || row['L/P'] || 'L').trim()
            const nisVal = String(row['NIS *'] || row['NIS'] || '').trim()
            const bioDataObj = {
              namaPanggilan: String(row['Nama Panggilan'] || '').trim(),
              tempatLahir: String(row['Tempat Lahir'] || '').trim(),
              tglLahir: String(row['Tanggal Lahir'] || row['Tgl Lahir'] || '').trim(),
              agama: String(row['Agama'] || 'Islam').trim(),
              kewarganegaraan: String(row['Kewarganegaraan'] || 'Indonesia').trim(),
              anakKe: String(row['Anak Ke'] || '').trim(),
              jmlSaudaraKandung: String(row['Jml Saudara Kandung'] || '').trim(),
              jmlSaudaraTiri: String(row['Jml Saudara Tiri'] || '').trim(),
              jmlSaudaraAngkat: String(row['Jml Saudara Angkat'] || '').trim(),
              statusYatim: String(row['Status Yatim'] || '').trim(),
              bahasa: String(row['Bahasa'] || '').trim(),

              alamat: String(row['Alamat'] || '').trim(),
              telp: String(row['No Telp'] || row['Telp'] || row['HP'] || '').trim(),
              tinggalDengan: String(row['Tinggal Dengan'] || '').trim(),
              jarakSekolah: String(row['Jarak Sekolah'] || '').trim(),

              golDarah: String(row['Gol Darah'] || row['Golongan Darah'] || '').trim(),
              penyakitPernah: String(row['Penyakit Pernah'] || '').trim(),
              kelainanJasmani: String(row['Kelainan Jasmani'] || '').trim(),
              tinggiBadan: String(row['Tinggi Badan'] || '').trim(),
              beratBadan: String(row['Berat Badan'] || '').trim(),

              lulusanDari: String(row['Lulusan Dari'] || '').trim(),
              alamatSekolah: String(row['Alamat Sekolah Asal'] || '').trim(),
              noSttb: String(row['No STTB'] || '').trim(),
              tglSttb: String(row['Tgl STTB'] || '').trim(),
              lamaBelajar: String(row['Lama Belajar'] || '').trim(),
              noSkhun: String(row['No SKHUN'] || '').trim(),
              tglSkhun: String(row['Tgl SKHUN'] || '').trim(),
              pindahanDariSekolah: String(row['Pindahan Dari Sekolah'] || '').trim(),
              alasanPindah: String(row['Alasan Pindah'] || '').trim(),
              diterimaDiKelas: String(row['Diterima Di Kelas'] || '').trim(),
              tglDiterima: String(row['Tgl Diterima'] || '').trim(),

              namaAyah: String(row['Nama Ayah'] || '').trim(),
              ttlAyah: String(row['TTL Ayah'] || '').trim(),
              agamaAyah: String(row['Agama Ayah'] || '').trim(),
              pendidikanAyah: String(row['Pendidikan Ayah'] || '').trim(),
              pekerjaanAyah: String(row['Pekerjaan Ayah'] || '').trim(),
              penghasilanAyah: String(row['Penghasilan Ayah'] || '').trim(),
              alamatAyah: String(row['Alamat Ayah'] || '').trim(),
              telpAyah: String(row['Telp Ayah'] || '').trim(),
              statusAyah: String(row['Status Ayah'] || '').trim(),

              namaIbu: String(row['Nama Ibu'] || '').trim(),
              ttlIbu: String(row['TTL Ibu'] || '').trim(),
              agamaIbu: String(row['Agama Ibu'] || '').trim(),
              pendidikanIbu: String(row['Pendidikan Ibu'] || '').trim(),
              pekerjaanIbu: String(row['Pekerjaan Ibu'] || '').trim(),
              penghasilanIbu: String(row['Penghasilan Ibu'] || '').trim(),
              alamatIbu: String(row['Alamat Ibu'] || '').trim(),
              telpIbu: String(row['Telp Ibu'] || '').trim(),
              statusIbu: String(row['Status Ibu'] || '').trim(),

              namaWali: String(row['Nama Wali'] || '').trim(),
              ttlWali: String(row['TTL Wali'] || '').trim(),
              pekerjaanWali: String(row['Pekerjaan Wali'] || '').trim(),
              penghasilanWali: String(row['Penghasilan Wali'] || '').trim(),
              alamatWali: String(row['Alamat Wali'] || '').trim(),

              kesenian: String(row['Kesenian'] || '').trim(),
              olahRaga: String(row['Olah Raga'] || '').trim(),
              kemasyarakatan: String(row['Kemasyarakatan'] || '').trim(),
              kegemaranLain: String(row['Hobi Lain'] || row['Kegemaran Lain'] || '').trim(),

              menerimaBeasiswa: String(row['Menerima Beasiswa'] || '').trim(),
              tglMeninggalkanSekolah: String(row['Tgl Meninggalkan Sekolah'] || '').trim(),
              alasanMeninggalkan: String(row['Alasan Meninggalkan'] || '').trim(),
              kelasMeninggalkan: String(row['Kelas Meninggalkan'] || '').trim(),
              noSuratMeninggalkan: String(row['No Surat Meninggalkan'] || '').trim(),
              tamatBelajar: String(row['Tamat Belajar'] || '').trim(),
              sttbNomor: String(row['STTB Nomor'] || '').trim(),
              tglIjazah: String(row['Tgl Ijazah'] || '').trim(),

              melanjutkanDi: String(row['Melanjutkan Di'] || '').trim(),
              bekerja: String(row['Bekerja'] || '').trim(),
              namaPerusahaan: String(row['Nama Perusahaan'] || '').trim(),
              penghasilanKerja: String(row['Penghasilan Kerja'] || '').trim(),
            }

            return {
              nisn: String(row['NISN'] || '').trim(),
              nis: nisVal,
              name: String(row['Nama Siswa *'] || row['Nama Siswa'] || '').trim(),
              gender: genderVal === 'P' || genderVal === 'Perempuan' ? 'P' : 'L',
              classId: foundClass ? foundClass.id : String(row['ID Kelas'] || '').trim(),
              username: String(row['Username'] || nisVal || '').trim(),
              password: String(row['Password'] || nisVal || '').trim(),
              program: String(row['Program'] || '').trim() || null,
              gelombang: String(row['Gelombang'] || 'Gelombang 1').trim(),
              jalurPendaftaran: String(row['Jalur Pendaftaran'] || 'Mandiri').trim(),
              bioData: bioDataObj,
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

          {isKepalaSekolah && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <span>🔍</span> Mode Supervisi (Read-Only)
            </div>
          )}

          {isSuperOrAdmin && (
            <>
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
            </>
          )}
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
        <DialogContent className="sm:max-w-[850px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* Custom Header */}
            <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pr-12">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  {isEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEdit ? 'Ubah Data Buku Induk Siswa' : 'Tambah Siswa Baru (Buku Induk)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola data pokok, biodata lengkap A-J (Buku Induk Siswa), data orang tua, dan riwayat akademik.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Section Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 px-4 pt-2 gap-1 overflow-x-auto text-xs font-semibold shrink-0 custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFormTab('utama')}
                className={`py-2 px-3 rounded-t-lg transition-all shrink-0 ${
                  activeFormTab === 'utama'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                1. Data Pokok & Akun
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('diri_tinggal')}
                className={`py-2 px-3 rounded-t-lg transition-all shrink-0 ${
                  activeFormTab === 'diri_tinggal'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2. Diri dan Tempat Tinggal
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('kesehatan_pendidikan')}
                className={`py-2 px-3 rounded-t-lg transition-all shrink-0 ${
                  activeFormTab === 'kesehatan_pendidikan'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                3. Kesehatan dan Pendidikan
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('orangtua')}
                className={`py-2 px-3 rounded-t-lg transition-all shrink-0 ${
                  activeFormTab === 'orangtua'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                4. Orang Tua dan Wali
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('kegemaran_perkembangan')}
                className={`py-2 px-3 rounded-t-lg transition-all shrink-0 ${
                  activeFormTab === 'kegemaran_perkembangan'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                5. Kegemaran dan Pasca Sekolah
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar max-h-[calc(92vh-170px)]">
              {/* TAB 1: DATA POKOK & AKUN */}
              {activeFormTab === 'utama' && (
                <div className="space-y-5">
                  {/* Identitas Utama */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Identitas Utama</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nisn" className="text-xs font-semibold text-slate-700 dark:text-slate-300">NISN (Opsional)</Label>
                        <Input 
                          id="nisn" 
                          value={formData.nisn}
                          onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                          placeholder="Masukkan NISN (Opsional)"
                          className="rounded-xl border-slate-200/80 dark:border-slate-700/80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="nis" className="text-xs font-semibold text-slate-700 dark:text-slate-300">NIS</Label>
                        <Input 
                          id="nis" 
                          value={formData.nis}
                          onChange={(e) => setFormData({...formData, nis: e.target.value})}
                          placeholder="Masukkan NIS"
                          required 
                          className="rounded-xl border-slate-200/80 dark:border-slate-700/80"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</Label>
                        <Input 
                          id="name" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Nama Lengkap Siswa"
                          required 
                          className="rounded-xl border-slate-200/80 dark:border-slate-700/80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jenis Kelamin</Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v || ''})}>
                          <SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-700/80">
                            <SelectValue placeholder="Pilih Gender" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="L">Laki-Laki (L)</SelectItem>
                            <SelectItem value="P">Perempuan (P)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Kredensial Akun */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Kredensial Akun (Opsional)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Username Login</Label>
                        <Input 
                          id="username" 
                          placeholder="Otomatis dari NISN jika kosong"
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          className="rounded-xl border-slate-200/80 dark:border-slate-700/80"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password</Label>
                        <Input 
                          id="password" 
                          type="password"
                          placeholder="Otomatis dari NIS jika kosong"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="rounded-xl border-slate-200/80 dark:border-slate-700/80"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Data Akademik & Pendaftaran */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Data Akademik & Pendaftaran</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Penempatan Kelas</Label>
                        <Select value={formData.classId} onValueChange={(v) => setFormData({...formData, classId: v || ''})} required>
                          <SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-700/80">
                            <SelectValue placeholder="Pilih Kelas">
                              {classes?.find(c => c.id === formData.classId)?.name || 'Pilih Kelas'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {classes?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gelombang Masuk</Label>
                        <Select value={formData.gelombang || 'Gelombang 1'} onValueChange={(v) => setFormData({...formData, gelombang: v || 'Gelombang 1'})}>
                          <SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-700/80">
                            <SelectValue placeholder="Gelombang" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Gelombang 1">Gelombang 1</SelectItem>
                            <SelectItem value="Gelombang 2">Gelombang 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jalur Pendaftaran</Label>
                        <Select value={formData.jalurPendaftaran || 'Mandiri'} onValueChange={(v) => setFormData({...formData, jalurPendaftaran: v || 'Mandiri'})}>
                          <SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-700/80">
                            <SelectValue placeholder="Jalur" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Mandiri">Mandiri</SelectItem>
                            <SelectItem value="Kader">Kader</SelectItem>
                            <SelectItem value="Kader Persyarikatan">Kader Persyarikatan</SelectItem>
                            <SelectItem value="Prestasi">Prestasi</SelectItem>
                            <SelectItem value="Bidikmisi">Bidikmisi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Program Unggulan Sekolah</Label>
                      <Select
                        value={formData.program || '__none__'}
                        onValueChange={(v) => setFormData({...formData, program: v === '__none__' ? '' : (v ?? '')})}
                      >
                        <SelectTrigger className="rounded-xl border-slate-200/80 dark:border-slate-700/80">
                          <SelectValue placeholder="Pilih Program Unggulan Sekolah (Opsional)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="__none__">— Tanpa Program Khusus (Reguler) —</SelectItem>
                          {dynamicProgramOptions.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: A. DIRI SISWA & B. TEMPAT TINGGAL */}
              {activeFormTab === 'diri_tinggal' && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      A. KETERANGAN TENTANG DIRI SISWA
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Panggilan</Label>
                        <Input value={formData.bioData?.namaPanggilan || ''} onChange={e => updateBioData('namaPanggilan', e.target.value)} placeholder="Contoh: Dahlan" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Agama</Label>
                        <Select value={formData.bioData?.agama || 'Islam'} onValueChange={v => updateBioData('agama', v)}>
                          <SelectTrigger><SelectValue placeholder="Agama" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Islam">Islam</SelectItem>
                            <SelectItem value="Kristen">Kristen</SelectItem>
                            <SelectItem value="Katolik">Katolik</SelectItem>
                            <SelectItem value="Hindu">Hindu</SelectItem>
                            <SelectItem value="Buddha">Buddha</SelectItem>
                            <SelectItem value="Khonghucu">Khonghucu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold">Tempat Lahir</Label>
                        <Input value={formData.bioData?.tempatLahir || ''} onChange={e => updateBioData('tempatLahir', e.target.value)} placeholder="Kota / Kabupaten Lahir" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Lahir</Label>
                        <Input type="date" value={formData.bioData?.tglLahir || ''} onChange={e => updateBioData('tglLahir', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kewarganegaraan</Label>
                        <Input value={formData.bioData?.kewarganegaraan || 'Indonesia'} onChange={e => updateBioData('kewarganegaraan', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Bahasa Sehari-hari di Rumah</Label>
                        <Input value={formData.bioData?.bahasa || ''} onChange={e => updateBioData('bahasa', e.target.value)} placeholder="Contoh: Indonesia / Jawa" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Anak Keberapa</Label>
                        <Input type="number" min="1" value={formData.bioData?.anakKe || ''} onChange={e => updateBioData('anakKe', e.target.value)} placeholder="1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Saudara Kandung</Label>
                        <Input type="number" min="0" value={formData.bioData?.jmlSaudaraKandung || ''} onChange={e => updateBioData('jmlSaudaraKandung', e.target.value)} placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Saudara Tiri</Label>
                        <Input type="number" min="0" value={formData.bioData?.jmlSaudaraTiri || ''} onChange={e => updateBioData('jmlSaudaraTiri', e.target.value)} placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Saudara Angkat</Label>
                        <Input type="number" min="0" value={formData.bioData?.jmlSaudaraAngkat || ''} onChange={e => updateBioData('jmlSaudaraAngkat', e.target.value)} placeholder="0" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Status Anak Yatim / Piatu</Label>
                      <Select value={formData.bioData?.statusYatim || 'Orang Tua Lengkap'} onValueChange={v => updateBioData('statusYatim', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Orang Tua Lengkap">Orang Tua Lengkap</SelectItem>
                          <SelectItem value="Yatim">Yatim (Ayah Meninggal)</SelectItem>
                          <SelectItem value="Piatu">Piatu (Ibu Meninggal)</SelectItem>
                          <SelectItem value="Yatim Piatu">Yatim Piatu (Kedua Orang Tua Meninggal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4 pt-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      B. KETERANGAN TEMPAT TINGGAL
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Alamat Rumah Lengkap</Label>
                      <Input value={formData.bioData?.alamat || ''} onChange={e => updateBioData('alamat', e.target.value)} placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kab" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. Telepon / HP</Label>
                        <Input value={formData.bioData?.telp || ''} onChange={e => updateBioData('telp', e.target.value)} placeholder="0812xxxxxxxx" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tinggal Dengan</Label>
                        <Select value={formData.bioData?.tinggalDengan || 'Orang Tua'} onValueChange={v => updateBioData('tinggalDengan', v)}>
                          <SelectTrigger><SelectValue placeholder="Tinggal dengan" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                            <SelectItem value="Saudara">Saudara</SelectItem>
                            <SelectItem value="Asrama">Asrama</SelectItem>
                            <SelectItem value="Kos">Kos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Jarak Tempat Tinggal ke Sekolah</Label>
                        <Input value={formData.bioData?.jarakSekolah || ''} onChange={e => updateBioData('jarakSekolah', e.target.value)} placeholder="Contoh: 3 km" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: C. KESEHATAN & D. PENDIDIKAN */}
              {activeFormTab === 'kesehatan_pendidikan' && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      C. KETERANGAN KESEHATAN
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Golongan Darah</Label>
                        <Select value={formData.bioData?.golDarah || '-'} onValueChange={v => updateBioData('golDarah', v)}>
                          <SelectTrigger><SelectValue placeholder="Golongan Darah" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">- (Belum Tahu)</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="AB">AB</SelectItem>
                            <SelectItem value="O">O</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tinggi Badan (Cm)</Label>
                        <Input type="number" value={formData.bioData?.tinggiBadan || ''} onChange={e => updateBioData('tinggiBadan', e.target.value)} placeholder="165" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Berat Badan (Kg)</Label>
                        <Input type="number" value={formData.bioData?.beratBadan || ''} onChange={e => updateBioData('beratBadan', e.target.value)} placeholder="55" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penyakit yang Pernah Diderita</Label>
                        <Input value={formData.bioData?.penyakitPernah || ''} onChange={e => updateBioData('penyakitPernah', e.target.value)} placeholder="TBC / Cacar / Malaria / Tidak Ada" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kelainan Jasmani</Label>
                        <Input value={formData.bioData?.kelainanJasmani || ''} onChange={e => updateBioData('kelainanJasmani', e.target.value)} placeholder="Catatan kelainan fisik jika ada" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      D. KETERANGAN PENDIDIKAN
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Lulusan Dari (SMP/MTs)</Label>
                        <Input value={formData.bioData?.lulusanDari || ''} onChange={e => updateBioData('lulusanDari', e.target.value)} placeholder="SMP N 1 / MTs N 1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alamat Sekolah Asal</Label>
                        <Input value={formData.bioData?.alamatSekolah || ''} onChange={e => updateBioData('alamatSekolah', e.target.value)} placeholder="Kota / Kabupaten Sekolah" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. STTB / Ijazah SMP</Label>
                        <Input value={formData.bioData?.noSttb || ''} onChange={e => updateBioData('noSttb', e.target.value)} placeholder="DN-xx/xxxxxxx" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal STTB / Ijazah</Label>
                        <Input type="date" value={formData.bioData?.tglSttb || ''} onChange={e => updateBioData('tglSttb', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Lama Belajar (Tahun)</Label>
                        <Input type="number" value={formData.bioData?.lamaBelajar || '3'} onChange={e => updateBioData('lamaBelajar', e.target.value)} placeholder="3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. SKHUN</Label>
                        <Input value={formData.bioData?.noSkhun || ''} onChange={e => updateBioData('noSkhun', e.target.value)} placeholder="Nomor SKHUN" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal SKHUN</Label>
                        <Input type="date" value={formData.bioData?.tglSkhun || ''} onChange={e => updateBioData('tglSkhun', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Siswa Pindahan Dari Sekolah</Label>
                        <Input value={formData.bioData?.pindahanDariSekolah || ''} onChange={e => updateBioData('pindahanDariSekolah', e.target.value)} placeholder="Nama Sekolah Pindahan" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alasan Pindah</Label>
                        <Input value={formData.bioData?.alasanPindah || ''} onChange={e => updateBioData('alasanPindah', e.target.value)} placeholder="Alasan pindah sekolah" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Diterima di Sekolah Ini (Kelas)</Label>
                        <Input value={formData.bioData?.diterimaDiKelas || ''} onChange={e => updateBioData('diterimaDiKelas', e.target.value)} placeholder="Contoh: X IPA 1" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Diterima</Label>
                        <Input type="date" value={formData.bioData?.tglDiterima || ''} onChange={e => updateBioData('tglDiterima', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: E, F, G. ORANG TUA & WALI */}
              {activeFormTab === 'orangtua' && (
                <div className="space-y-6">
                  {/* AYAH */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      E. KETERANGAN TENTANG AYAH KANDUNG
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Ayah Kandung</Label>
                        <Input value={formData.bioData?.namaAyah || ''} onChange={e => updateBioData('namaAyah', e.target.value)} placeholder="Nama Lengkap Ayah" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tempat & Tanggal Lahir Ayah</Label>
                        <Input value={formData.bioData?.ttlAyah || ''} onChange={e => updateBioData('ttlAyah', e.target.value)} placeholder="Kota, DD-MM-YYYY" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Agama Ayah</Label>
                        <Input value={formData.bioData?.agamaAyah || 'Islam'} onChange={e => updateBioData('agamaAyah', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kewarganegaraan</Label>
                        <Input value={formData.bioData?.kewarganegaraanAyah || 'Indonesia'} onChange={e => updateBioData('kewarganegaraanAyah', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pendidikan Ayah</Label>
                        <Input value={formData.bioData?.pendidikanAyah || ''} onChange={e => updateBioData('pendidikanAyah', e.target.value)} placeholder="SD/SMP/SMA/S1/S2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pekerjaan Ayah</Label>
                        <Input value={formData.bioData?.pekerjaanAyah || ''} onChange={e => updateBioData('pekerjaanAyah', e.target.value)} placeholder="PNS/Wiraswasta/dll" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penghasilan per Bulan (Rp)</Label>
                        <Input value={formData.bioData?.penghasilanAyah || ''} onChange={e => updateBioData('penghasilanAyah', e.target.value)} placeholder="Contoh: 3.500.000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Status Ayah</Label>
                        <Input value={formData.bioData?.statusAyah || ''} onChange={e => updateBioData('statusAyah', e.target.value)} placeholder="Masih Hidup / Meninggal (Tahun)" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alamat Rumah Ayah</Label>
                        <Input value={formData.bioData?.alamatAyah || ''} onChange={e => updateBioData('alamatAyah', e.target.value)} placeholder="Alamat lengkap Ayah" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. Telepon HP Ayah</Label>
                        <Input value={formData.bioData?.telpAyah || ''} onChange={e => updateBioData('telpAyah', e.target.value)} placeholder="08xxxxxxxx" />
                      </div>
                    </div>
                  </div>

                  {/* IBU */}
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      F. KETERANGAN TENTANG IBU KANDUNG
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Ibu Kandung</Label>
                        <Input value={formData.bioData?.namaIbu || ''} onChange={e => updateBioData('namaIbu', e.target.value)} placeholder="Nama Lengkap Ibu" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tempat & Tanggal Lahir Ibu</Label>
                        <Input value={formData.bioData?.ttlIbu || ''} onChange={e => updateBioData('ttlIbu', e.target.value)} placeholder="Kota, DD-MM-YYYY" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Agama Ibu</Label>
                        <Input value={formData.bioData?.agamaIbu || 'Islam'} onChange={e => updateBioData('agamaIbu', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kewarganegaraan</Label>
                        <Input value={formData.bioData?.kewarganegaraanIbu || 'Indonesia'} onChange={e => updateBioData('kewarganegaraanIbu', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pendidikan Ibu</Label>
                        <Input value={formData.bioData?.pendidikanIbu || ''} onChange={e => updateBioData('pendidikanIbu', e.target.value)} placeholder="SD/SMP/SMA/S1/S2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pekerjaan Ibu</Label>
                        <Input value={formData.bioData?.pekerjaanIbu || ''} onChange={e => updateBioData('pekerjaanIbu', e.target.value)} placeholder="Ibu Rumah Tangga / PNS / dll" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penghasilan per Bulan (Rp)</Label>
                        <Input value={formData.bioData?.penghasilanIbu || ''} onChange={e => updateBioData('penghasilanIbu', e.target.value)} placeholder="Contoh: 2.000.000" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Status Ibu</Label>
                        <Input value={formData.bioData?.statusIbu || ''} onChange={e => updateBioData('statusIbu', e.target.value)} placeholder="Masih Hidup / Meninggal (Tahun)" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alamat Rumah Ibu</Label>
                        <Input value={formData.bioData?.alamatIbu || ''} onChange={e => updateBioData('alamatIbu', e.target.value)} placeholder="Alamat lengkap Ibu" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. Telepon HP Ibu</Label>
                        <Input value={formData.bioData?.telpIbu || ''} onChange={e => updateBioData('telpIbu', e.target.value)} placeholder="08xxxxxxxx" />
                      </div>
                    </div>
                  </div>

                  {/* WALI */}
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      G. KETERANGAN TENTANG WALI (OPSIONAL)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Wali</Label>
                        <Input value={formData.bioData?.namaWali || ''} onChange={e => updateBioData('namaWali', e.target.value)} placeholder="Nama Lengkap Wali" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tempat & Tanggal Lahir Wali</Label>
                        <Input value={formData.bioData?.ttlWali || ''} onChange={e => updateBioData('ttlWali', e.target.value)} placeholder="Kota, DD-MM-YYYY" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Agama Wali</Label>
                        <Input value={formData.bioData?.agamaWali || ''} onChange={e => updateBioData('agamaWali', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pendidikan Wali</Label>
                        <Input value={formData.bioData?.pendidikanWali || ''} onChange={e => updateBioData('pendidikanWali', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pekerjaan Wali</Label>
                        <Input value={formData.bioData?.pekerjaanWali || ''} onChange={e => updateBioData('pekerjaanWali', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alamat Rumah / Telepon Wali</Label>
                        <Input value={formData.bioData?.alamatWali || ''} onChange={e => updateBioData('alamatWali', e.target.value)} placeholder="Alamat Wali" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penghasilan per Bulan Wali (Rp)</Label>
                        <Input value={formData.bioData?.penghasilanWali || ''} onChange={e => updateBioData('penghasilanWali', e.target.value)} placeholder="Contoh: 3.000.000" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: H. KEGEMARAN, I. PERKEMBANGAN & J. PASCA SEKOALH */}
              {activeFormTab === 'kegemaran_perkembangan' && (
                <div className="space-y-6">
                  {/* H. KEGEMARAN */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      H. KEGEMARAN SISWA
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kesenian</Label>
                        <Input value={formData.bioData?.kesenian || ''} onChange={e => updateBioData('kesenian', e.target.value)} placeholder="Contoh: Musik / Seni Rupa / Tari" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Olah Raga</Label>
                        <Input value={formData.bioData?.olahRaga || ''} onChange={e => updateBioData('olahRaga', e.target.value)} placeholder="Contoh: Futsal / Basket / Badminton" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Kemasyarakatan / Organisasi</Label>
                        <Input value={formData.bioData?.kemasyarakatan || ''} onChange={e => updateBioData('kemasyarakatan', e.target.value)} placeholder="Contoh: IPM / Pramuka" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Hobi / Kegemaran Lain-Lain</Label>
                        <Input value={formData.bioData?.kegemaranLain || ''} onChange={e => updateBioData('kegemaranLain', e.target.value)} placeholder="Kegemaran lainnya" />
                      </div>
                    </div>
                  </div>

                  {/* I. PERKEMBANGAN */}
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      I. KETERANGAN PERKEMBANGAN SISWA
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Menerima Beasiswa (Detail / Tahun)</Label>
                      <Input value={formData.bioData?.menerimaBeasiswa || ''} onChange={e => updateBioData('menerimaBeasiswa', e.target.value)} placeholder="Contoh: Beasiswa Prestasi 2025" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Meninggalkan Sekolah</Label>
                        <Input type="date" value={formData.bioData?.tglMeninggalkanSekolah || ''} onChange={e => updateBioData('tglMeninggalkanSekolah', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Alasan Meninggalkan</Label>
                        <Input value={formData.bioData?.alasanMeninggalkan || ''} onChange={e => updateBioData('alasanMeninggalkan', e.target.value)} placeholder="Pindah / Lulus / dll" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Di Kelas Berapa</Label>
                        <Input value={formData.bioData?.kelasMeninggalkan || ''} onChange={e => updateBioData('kelasMeninggalkan', e.target.value)} placeholder="Kelas XII" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">No. Surat Meninggalkan Sekolah</Label>
                        <Input value={formData.bioData?.noSuratMeninggalkan || ''} onChange={e => updateBioData('noSuratMeninggalkan', e.target.value)} placeholder="Nomor surat resmi" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Keterangan Tamat Belajar</Label>
                        <Input value={formData.bioData?.tamatBelajar || ''} onChange={e => updateBioData('tamatBelajar', e.target.value)} placeholder="Tamat / Lulus" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">STTB Nomor</Label>
                        <Input value={formData.bioData?.sttbNomor || ''} onChange={e => updateBioData('sttbNomor', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Ijazah</Label>
                        <Input type="date" value={formData.bioData?.tglIjazah || ''} onChange={e => updateBioData('tglIjazah', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Terima Ijazah</Label>
                        <Input type="date" value={formData.bioData?.tglTerimaIjazah || ''} onChange={e => updateBioData('tglTerimaIjazah', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* J. SETELAH SELESAI */}
                  <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      J. KETERANGAN SETELAH SELESAI PENDIDIKAN
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Melanjutkan Di (PT / Instansi)</Label>
                        <Input value={formData.bioData?.melanjutkanDi || ''} onChange={e => updateBioData('melanjutkanDi', e.target.value)} placeholder="Nama Perguruan Tinggi / Akademi" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Keterangan Bekerja</Label>
                        <Input value={formData.bioData?.bekerja || ''} onChange={e => updateBioData('bekerja', e.target.value)} placeholder="Status Bekerja" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Tanggal Mulai Bekerja</Label>
                        <Input type="date" value={formData.bioData?.tglMulaiBekerja || ''} onChange={e => updateBioData('tglMulaiBekerja', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Nama Perusahaan / Lembaga</Label>
                        <Input value={formData.bioData?.namaPerusahaan || ''} onChange={e => updateBioData('namaPerusahaan', e.target.value)} placeholder="PT / Instansi / Usaha" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penghasilan (Rp)</Label>
                        <Input value={formData.bioData?.penghasilanKerja || ''} onChange={e => updateBioData('penghasilanKerja', e.target.value)} placeholder="Estimasi penghasilan" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-slate-500 font-medium">
                {activeFormTab !== 'utama' && (
                  <span>Form Buku Induk (Seksi {activeFormTab.toUpperCase().replace('_', ' & ')})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-xl shadow-md shadow-blue-500/10 transition-all duration-200">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isEdit ? 'Simpan Perubahan Buku Induk' : 'Simpan Data Siswa'}
                </Button>
              </div>
            </div>
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
                placeholder="Cari siswa (NISN/NIS/nama)..."
              />

              {/* Filter Kelas */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kelas:</span>
                <Select value={filterClassId} onValueChange={(v) => setFilterClassId(v || 'ALL')}>
                  <SelectTrigger className="w-[130px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Kelas">
                      {filterClassId === 'ALL' || !filterClassId
                        ? 'Semua Kelas'
                        : classes?.find(c => c.id === filterClassId)?.name || 'Semua Kelas'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                    {classes?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Program Unggulan (Lengkap & Sinkron) */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Program:</span>
                <Select value={filterProgram} onValueChange={(v) => setFilterProgram(v || 'ALL')}>
                  <SelectTrigger className="w-[160px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Program" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Semua Program</SelectItem>
                    <SelectItem value="__none__"> Reguler / Tanpa Program</SelectItem>
                    {allProgramOptions.map((p: { value: string; label: string }) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Gender */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Gender:</span>
                <Select value={filterGender} onValueChange={(v) => setFilterGender(v || 'ALL')}>
                  <SelectTrigger className="w-[100px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua L/P" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Semua L/P</SelectItem>
                    <SelectItem value="L">Laki-Laki (L)</SelectItem>
                    <SelectItem value="P">Perempuan (P)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Gelombang */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Gelombang:</span>
                <Select value={filterGelombang} onValueChange={(v) => setFilterGelombang(v || 'ALL')}>
                  <SelectTrigger className="w-[125px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Gelombang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Semua Gelombang</SelectItem>
                    <SelectItem value="Gelombang 1">Gelombang 1</SelectItem>
                    <SelectItem value="Gelombang 2">Gelombang 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Jalur Pendaftaran */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jalur:</span>
                <Select value={filterJalur} onValueChange={(v) => setFilterJalur(v || 'ALL')}>
                  <SelectTrigger className="w-[130px] h-7 text-xs border-0 shadow-none focus:ring-0 p-0">
                    <SelectValue placeholder="Semua Jalur" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Semua Jalur</SelectItem>
                    {allJalurOptions.map((j: string) => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filter Button */}
              {isAnyFilterActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset Filter
                </Button>
              )}
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
                {isSuperOrAdmin && <TableHead className="text-right pr-6">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperOrAdmin ? 9 : 7} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperOrAdmin ? 9 : 7} className="text-center py-10 text-slate-500">
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
                      {isSuperOrAdmin && (
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
                      )}
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
      <Dialog open={isBeasiswaDialogOpen} onOpenChange={setIsBeasiswaDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 sm:p-6 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-lg font-bold">
              <Percent className="w-5 h-5 text-amber-600" /> Pengaturan Beasiswa Keuangan Siswa
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-slate-500">
              Atur persentase beasiswa per item biaya. Potongan otomatis dihitung dari biaya default (misal Seragam default Rp 2.000.000, beasiswa 50% = Rp 1.000.000).
            </DialogDescription>
          </DialogHeader>

          {beasiswaTargetStudent && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar max-h-[calc(90vh-130px)]">
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{beasiswaTargetStudent.name}</p>
                <p className="text-xs text-slate-500 font-mono">NISN: {beasiswaTargetStudent.nisn} | Kelas: {beasiswaTargetStudent.class?.name || 'Belum ada kelas'}</p>
                <div className="flex flex-wrap gap-1.5 text-xs font-semibold pt-1">
                  <span className={`px-2 py-0.5 rounded-md ${
                    beasiswaTargetStudent.jalurPendaftaran === 'Mandiri'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  }`}>
                    Jalur: {beasiswaTargetStudent.jalurPendaftaran || 'Mandiri'}
                  </span>
                  <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    Gelombang: {beasiswaTargetStudent.gelombang || 'Gelombang 1'}
                  </span>
                  {beasiswaTargetStudent.program && (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                      Program: {beasiswaTargetStudent.program.toUpperCase()}
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
                    {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? 'Seragam, SPP & DPP' : 'Hanya SPP & DPP'}
                  </span>
                </div>

                {/* Beasiswa Seragam (Hanya Non-Mandiri: Kader, Kader Persyarikatan, Prestasi, Bidikmisi) */}
                {beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? (
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
                  value={beasiswaReason}
                  onChange={(e) => setBeasiswaReason(e.target.value)}
                  className="bg-white dark:bg-slate-950 text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setIsBeasiswaDialogOpen(false)}>Batal</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => {
                if (!beasiswaTargetStudent) return
                updateBeasiswaMutation.mutate({
                  id: beasiswaTargetStudent.id,
                  beasiswaPercentage: beasiswaSppVal || beasiswaPct,
                  beasiswaReason: beasiswaReason,
                  beasiswaSeragamPct: beasiswaTargetStudent.jalurPendaftaran !== 'Mandiri' ? beasiswaSeragamVal : 0,
                  beasiswaSppPct: beasiswaSppVal,
                  beasiswaDppPct: beasiswaDppVal,
                })
              }}
              disabled={updateBeasiswaMutation.isPending}
            >
              {updateBeasiswaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Simpan Beasiswa Keuangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
