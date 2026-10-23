'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  FileText, Upload, CheckCircle2, Clock, AlertCircle, 
  Trash2, Eye, ExternalLink, Plus, BookOpen, 
  ShieldCheck, RefreshCw, FileCheck, Award, 
  XCircle, Filter, Search, Check, ChevronRight, UserCheck, Sparkles,
  GraduationCap, CalendarDays, ArrowRight, Layers, Zap,
  Download, FileSpreadsheet, ChevronDown, Archive, RotateCcw
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  generateTeacherMultiClassAssessmentExcel,
  AssessmentExcelType,
} from '@/lib/assessment-excel-helper'
import Link from 'next/link'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Swal from 'sweetalert2'
import { useSorting, SortableTableHead } from '@/components/SortableTableHead'
import { KurikulumMerdekaWorkspace } from '@/components/academic/kurikulum/merdeka/KurikulumMerdekaWorkspace'
import { KurikulumSelector, AVAILABLE_CURRICULA } from '@/components/academic/kurikulum/common/KurikulumSelector'
import { KurikulumPlaceholderWorkspace } from '@/components/academic/kurikulum/common/KurikulumPlaceholderWorkspace'

// Jenis Perangkat Pembelajaran Kurikulum Merdeka & Nasional
const JENIS_PERANGKAT_OPTIONS = [
  { id: 'MODUL_AJAR', label: 'Modul Ajar / RPP', desc: 'Perencanaan pembelajaran, langkah KBM, dan diferensiasi' },
  { id: 'ATP', label: 'Alur Tujuan Pembelajaran (ATP)', desc: 'Rangkaian tujuan pembelajaran terurut dari awal hingga akhir fase' },
  { id: 'CP', label: 'Capaian Pembelajaran (CP)', desc: 'Kompetensi pembelajaran yang harus dicapai peserta didik per fase' },
  { id: 'PROTA_PROMES', label: 'Program Tahunan & Semester (Prota & Promes)', desc: 'Distribusi alokasi waktu dan program pembelajaran semester' },
  { id: 'ASESMEN', label: 'Perangkat Asesmen / Penilaian', desc: 'Instrumen asesmen diagnostik, formatif, sumatif & rubrik' },
  { id: 'BUKU_AJAR', label: 'Bahan & Buku Ajar', desc: 'Modul pengayaan, LKPD, dan materi suplemen' },
  { id: 'LAINNYA', label: 'Dokumen Administrasi Lainnya', desc: 'Kalender pendidikan, jurnal mengajar, dan suplemen guru' },
]

const FASE_OPTIONS = [
  'Fase E (Kelas X)',
  'Fase F (Kelas XI)',
  'Fase F (Kelas XII)',
  'Fase E & F (Lintas Tingkat)',
  'Umum / Seluruh Kelas',
]

export default function PerangkatAjarPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const user = session?.user as any
  const userRoles = [
    user?.role,
    user?.subRole,
    user?.subRole2,
    user?.subRole3,
    user?.subRole4,
    user?.subRole5,
  ].filter(Boolean)

  const isGuru = userRoles.some((r: string) =>
    ['GURU', 'HONORER', 'GURU_HONORER', 'GURU_PIKET', 'WALI_KELAS'].includes(r)
  )

  const isKurikulumOrPimpinan = userRoles.some((r: string) =>
    [
      'SUPERADMIN',
      'ADMIN_IT',
      'KEPALA_SEKOLAH',
      'KURIKULUM',
      'WAKA_KURIKULUM',
      'KESISWAAN',
      'WAKA_KESISWAAN',
      'HUMAS_SDM',
      'WAKA_HUMAS_SDM',
      'KEPEGAWAIAN',
      'SDM',
      'SARPRAS',
      'WAKA_SARPRAS',
      'ISMUBA',
      'WAKA_ISMUBA',
    ].includes(r) || r?.startsWith('WAKA_') || r?.includes('WAKA')
  )

  // Modul administrasi & perangkat ajar hanya boleh diakses oleh Guru dan Pihak Berwenang (Pimpinan/Kurikulum/Superadmin)
  // Pegawai / Karyawan biasa TIDAK BOLEH mengakses modul ini
  const isAuthorized = isGuru || isKurikulumOrPimpinan

  const [activeTab, setActiveTab] = useState<'alur' | 'merdeka' | 'saya' | 'arsip' | 'verifikasi' | 'rekap'>('merdeka')
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('KURIKULUM_MERDEKA')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterJenis, setFilterJenis] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterTeacher, setFilterTeacher] = useState('ALL')
  const [filterTahun, setFilterTahun] = useState('2025/2026')
  const [filterSemester, setFilterSemester] = useState('ALL')

  // Modal State Form Upload / Edit
  const [openModalUpload, setOpenModalUpload] = useState(false)
  const [editDocId, setEditDocId] = useState<string | null>(null)
  const [uploadMode, setUploadMode] = useState<'FILE' | 'LINK'>('FILE')
  const [formSubjectName, setFormSubjectName] = useState('')
  const [formClassName, setFormClassName] = useState('')
  const [formFase, setFormFase] = useState('Fase E (Kelas X)')
  const [formJenisPerangkat, setFormJenisPerangkat] = useState('MODUL_AJAR')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFileUrl, setFormFileUrl] = useState('')
  const [formFileType, setFormFileType] = useState('PDF')
  const [formFileSize, setFormFileSize] = useState('')
  const [formAcademicYear, setFormAcademicYear] = useState('2025/2026')
  const [formSemester, setFormSemester] = useState('GANJIL')
  const [uploadingFile, setUploadingFile] = useState(false)

  // Modal State Verifikasi Kurikulum
  const [openModalVerify, setOpenModalVerify] = useState(false)
  const [selectedDocForVerify, setSelectedDocForVerify] = useState<any>(null)
  const [verifyStatus, setVerifyStatus] = useState<'TERVERIFIKASI' | 'PERLU_REVISI' | 'DITOLAK'>('TERVERIFIKASI')
  const [verifyNotes, setVerifyNotes] = useState('')

  // Modal State Quick Setup Administrasi Guru
  const [openModalQuickSetup, setOpenModalQuickSetup] = useState(false)
  const [formQuickClassId, setFormQuickClassId] = useState('')
  const [formQuickSubjectId, setFormQuickSubjectId] = useState('')
  const [formQuickFase, setFormQuickFase] = useState('FASE_E')
  const [formQuickJpPerMinggu, setFormQuickJpPerMinggu] = useState(2)
  const [formQuickApplySameGrade, setFormQuickApplySameGrade] = useState(true) // Otomatis aktifkan untuk semua rombel jenjang sama
  const [quickSetupSubmitting, setQuickSetupSubmitting] = useState(false)

  // 1. Fetch Konteks Guru (Kelas yang diampu & mapel riil)
  const { data: guruContext, refetch: refetchGuruContext } = useQuery({
    queryKey: ['kurikulum-merdeka-guru-context'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/guru-context')
      if (!res.ok) return { assignedClasses: [], assignedSubjects: [], perangkatList: [], schedulePairings: [] }
      return res.json()
    },
  })
  const assignedClasses = guruContext?.assignedClasses || []
  const assignedSubjects = guruContext?.assignedSubjects || []
  const schedulePairings: any[] = guruContext?.schedulePairings || []
  const archivePerangkatList: any[] = guruContext?.archivePerangkatList || []
  const allCurriculumPerangkatList: any[] = guruContext?.allPerangkatList || []

  // State & Handler Export Format Nilai Excel Multi-Sheet (1 File per Mapel, Multi-Sheet Kelas)
  const [exportingMultiSheet, setExportingMultiSheet] = useState(false)
  const handleExportTeacherMultiClassExcel = async (exportType: AssessmentExcelType, targetSubjectId?: string) => {
    // Tentukan mapel: jika diberikan secara eksplisit, gunakan target; jika tidak, gunakan mapel pertama yang diampu
    const subjId = targetSubjectId || (assignedSubjects.length > 0 ? assignedSubjects[0].id : '')
    const subjectObj = assignedSubjects.find((s: any) => s.id === subjId)
    const subjectName = subjectObj?.name || 'Mata Pelajaran'

    // Temukan kelas-kelas yang diampu guru untuk mapel ini
    let targetClasses: any[] = []
    if (schedulePairings.length > 0) {
      const matched = schedulePairings.filter((p: any) => p.subjectId === subjId)
      const cIds = new Set(matched.map((p: any) => p.classId))
      targetClasses = assignedClasses.filter((c: any) => cIds.has(c.id))
    }

    if (targetClasses.length === 0) {
      targetClasses = assignedClasses
    }

    if (targetClasses.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak Ada Kelas',
        text: 'Tidak ditemukan rombel kelas yang diampu untuk mata pelajaran ini.',
      })
      return
    }

    setExportingMultiSheet(true)
    Swal.fire({
      title: 'Menyiapkan Format Excel Multi-Sheet...',
      html: `Sedang memuat data siswa & nilai untuk <strong>${targetClasses.length} rombel kelas</strong> (${subjectName})...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const classSheetList = await Promise.all(
        targetClasses.map(async (cls: any) => {
          const sRes = await authenticatedFetch(`/api-backend/students?classId=${cls.id}`)
          const students: any[] = sRes.ok ? await sRes.json() : []

          const aRes = await authenticatedFetch(
            `/api-backend/grades/assessments?classId=${cls.id}&subjectId=${subjId}&academicYear=2025/2026&semester=1`
          )
          const assessList: any[] = aRes.ok ? await aRes.json() : []
          const aMap = new Map<string, any>()
          assessList.forEach((item: any) => {
            if (item.studentId) aMap.set(item.studentId, item)
          })

          const studentRows = students.map((s) => ({
            id: s.id,
            nis: s.nis || '',
            name: s.name || '',
            gender: s.gender || 'L',
            assessment: aMap.get(s.id) || null,
          }))

          const homeroom = cls.homeroomTeacher?.user?.name || cls.homeroomTeacher?.name || '-'

          return {
            className: cls.name,
            homeroomTeacherName: homeroom,
            students: studentRows,
          }
        })
      )

      const typeLabel = exportType === 'sts' ? 'STS' : exportType === 'sas' ? 'SAS' : 'KD_Formatif'
      const teacherName = user?.name || 'Guru'
      const blob = await generateTeacherMultiClassAssessmentExcel({
        type: exportType,
        subjectName,
        subjectCode: subjectObj?.code,
        teacherName,
        academicYear: '2025/2026',
        semester: '1',
        classes: classSheetList,
      })

      const safeTeacher = teacherName.replace(/[^a-zA-Z0-9]/g, '_')
      const safeSubject = subjectName.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `Format_Nilai_${typeLabel}_${safeSubject}_${safeTeacher}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      Swal.fire({
        icon: 'success',
        title: 'Ekspor Multi-Sheet Berhasil!',
        html: `File Excel <strong>${fileName}</strong> telah terunduh dengan <strong>${classSheetList.length} sheet kelas</strong> (${classSheetList.map(c => c.className).join(', ')}).`,
        confirmButtonColor: '#2563eb',
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Ekspor Multi-Sheet',
        text: err?.message || 'Terjadi kesalahan sistem saat memproses berkas Excel.',
      })
    } finally {
      setExportingMultiSheet(false)
    }
  }

  // Auto pre-fill quick setup modal saat dibuka jika ada jadwal
  useEffect(() => {
    if (openModalQuickSetup && !formQuickClassId && schedulePairings.length > 0) {
      const unconfig = schedulePairings.find((p) => !p.isConfigured) || schedulePairings[0]
      if (unconfig) {
        setFormQuickClassId(unconfig.classId)
        setFormQuickSubjectId(unconfig.subjectId)
        setFormQuickFase(unconfig.fase || (unconfig.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
        setFormQuickJpPerMinggu(unconfig.totalJpPerMinggu || 2)
      }
    }
  }, [openModalQuickSetup, schedulePairings, formQuickClassId])

  // Handler auto-matching ketika memilih kelas di Quick Setup
  const handleSelectQuickClass = (classId: string) => {
    setFormQuickClassId(classId)
    if (!classId) return
    const match = schedulePairings.find((p) => p.classId === classId)
    if (match) {
      setFormQuickSubjectId(match.subjectId)
      setFormQuickFase(match.fase || (match.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
      setFormQuickJpPerMinggu(match.totalJpPerMinggu || 2)
    } else {
      const cls = assignedClasses.find((c: any) => c.id === classId)
      if (cls) {
        setFormQuickFase(cls.gradeLevel === 10 ? 'FASE_E' : 'FASE_F')
      }
    }
  }

  // Handler auto-matching ketika memilih mapel di Quick Setup
  const handleSelectQuickSubject = (subjectId: string) => {
    setFormQuickSubjectId(subjectId)
    if (formQuickClassId && subjectId) {
      const match = schedulePairings.find((p) => p.classId === formQuickClassId && p.subjectId === subjectId)
      if (match) {
        setFormQuickFase(match.fase || (match.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
        setFormQuickJpPerMinggu(match.totalJpPerMinggu || 2)
      }
    }
  }

  // 1b. Fetch Daftar Guru
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-perangkat-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) return []
      return res.json()
    },
  })
  const teachersList = Array.isArray(teachersData) ? teachersData : []

  // 2. Fetch Daftar Mata Pelajaran
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-perangkat-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
  })
  const subjectsList = Array.isArray(subjectsData) ? subjectsData : []

  // 3. Fetch Data Perangkat Ajar
  const { data: perangkatData, isLoading: loadingPerangkat } = useQuery({
    queryKey: ['perangkat-ajar-list', filterJenis, filterStatus, filterTeacher, filterTahun, filterSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterJenis !== 'ALL') params.append('jenisPerangkat', filterJenis)
      if (filterStatus !== 'ALL') params.append('status', filterStatus)
      if (filterTeacher !== 'ALL') params.append('teacherId', filterTeacher)
      if (filterTahun !== 'ALL') params.append('academicYear', filterTahun)
      if (filterSemester !== 'ALL') params.append('semester', filterSemester)

      const res = await authenticatedFetch(`/api-backend/perangkat-ajar?${params.toString()}`)
      if (!res.ok) return []
      return res.json()
    },
  })
  const perangkatList: any[] = Array.isArray(perangkatData) ? perangkatData : []

  // 4. Fetch Rekapitulasi & Statistik Supervisi Dokumen
  const { data: rekapData, isLoading: loadingRekap } = useQuery({
    queryKey: ['perangkat-ajar-stats-rekap', filterTahun, filterSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterTahun !== 'ALL') params.append('academicYear', filterTahun)
      if (filterSemester !== 'ALL') params.append('semester', filterSemester)

      const res = await authenticatedFetch(`/api-backend/perangkat-ajar/stats-rekap?${params.toString()}`)
      if (!res.ok) return { summary: {}, rekapList: [] }
      return res.json()
    },
  })
  const summary = rekapData?.summary || {}
  const rekapList: any[] = rekapData?.rekapList || []

  // Mutasi Simpan / Update Dokumen
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editDocId 
        ? `/api-backend/perangkat-ajar/${editDocId}` 
        : '/api-backend/perangkat-ajar'
      const method = editDocId ? 'PATCH' : 'POST'

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan dokumen.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] })
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-rekap'] })
      setOpenModalUpload(false)
      resetForm()
      Swal.fire({
        title: 'Berhasil Disimpan!',
        text: 'Dokumen perangkat pembelajaran berhasil diunggah dan diajukan ke Tim Kurikulum.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'error')
    },
  })

  // Mutasi Verifikasi Kurikulum
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, catatanVerifikasi }: any) => {
      const res = await authenticatedFetch(`/api-backend/perangkat-ajar/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, catatanVerifikasi }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal memverifikasi dokumen.')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] })
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-rekap'] })
      setOpenModalVerify(false)
      setSelectedDocForVerify(null)
      setVerifyNotes('')
      Swal.fire({
        title: 'Verifikasi Berhasil!',
        html: `Dokumen berhasil diperbarui menjadi status <strong>${data.status}</strong> dan notifikasi telah dikirimkan ke guru terkait.`,
        icon: 'success',
        confirmButtonColor: '#2563eb',
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Verifikasi', err.message || 'Terjadi kesalahan.', 'error')
    },
  })

  // Mutasi Hapus Dokumen
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/perangkat-ajar/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus dokumen.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] })
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-rekap'] })
      Swal.fire('Terhapus', 'Dokumen perangkat pembelajaran berhasil dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menghapus.', 'error')
    },
  })

  // Handle Quick Setup Administrasi Guru
  const handleQuickSetupSubmit = async () => {
    if (!formQuickClassId || !formQuickSubjectId) {
      Swal.fire({
        icon: 'warning',
        title: 'Lengkapi Data Setup',
        text: 'Silakan pilih kelas dan mata pelajaran yang diampu terlebih dahulu.',
        confirmButtonColor: '#2563eb',
      })
      return
    }

    setQuickSetupSubmitting(true)
    try {
      // Dapatkan rombel-rombel satu jenjang yang diampu untuk mapel terpilih
      const selectedClassObj = assignedClasses.find((c: any) => c.id === formQuickClassId)
      const grade = selectedClassObj?.gradeLevel || (selectedClassObj?.name?.startsWith('X ') ? 10 : selectedClassObj?.name?.startsWith('XI ') ? 11 : 12)
      
      const sameGradeClassIds = assignedClasses
        .filter((c: any) => {
          const cGrade = c.gradeLevel || (c.name?.startsWith('X ') ? 10 : c.name?.startsWith('XI ') ? 11 : 12)
          return cGrade === grade
        })
        .map((c: any) => c.id)

      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: formQuickClassId,
          subjectId: formQuickSubjectId,
          fase: formQuickFase,
          totalJpSemester: Number(formQuickJpPerMinggu) * 18,
          jpPerMinggu: Number(formQuickJpPerMinggu),
          applyToGradeLevel: formQuickApplySameGrade,
          targetClassIds: formQuickApplySameGrade ? sameGradeClassIds : [formQuickClassId],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan Quick Setup Administrasi Guru')
      }

      await queryClient.invalidateQueries({ queryKey: ['kurikulum-merdeka-guru-context'] })
      await queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-list'] })
      await queryClient.invalidateQueries({ queryKey: ['perangkat-ajar-stats-rekap'] })

      setOpenModalQuickSetup(false)
      setActiveTab('merdeka')

      Swal.fire({
        icon: 'success',
        title: 'Quick Setup Berhasil!',
        text: 'Administrasi kelas & mapel aktif berhasil disiapkan. Anda dapat langsung mengelola TP, Promes, RPP, dan Soal.',
        confirmButtonColor: '#2563eb',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Quick Setup',
        text: e.message || 'Terjadi kesalahan sistem saat konfigurasi administrasi.',
        confirmButtonColor: '#2563eb',
      })
    } finally {
      setQuickSetupSubmitting(false)
    }
  }

  // Handle Sinkronisasi Langsung dari Jadwal KBM pada Quick Setup
  const [quickSyncing, setQuickSyncing] = useState(false)
  const handleQuickSyncAllSchedules = async () => {
    setQuickSyncing(true)
    try {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/auto-sync-schedules', {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal sinkronisasi dari jadwal.')
      }
      const data = await res.json()
      await queryClient.invalidateQueries({ queryKey: ['kurikulum-merdeka-guru-context'] })
      setOpenModalQuickSetup(false)
      setActiveTab('merdeka')
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Jadwal Berhasil!',
        text: data.message || 'Semua rombel & mapel penugasan berhasil disiapkan secara otomatis.',
        confirmButtonColor: '#2563eb',
      })
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: e.message || 'Terjadi kesalahan sistem.',
      })
    } finally {
      setQuickSyncing(false)
    }
  }

  const resetForm = () => {
    setEditDocId(null)
    setFormSubjectName('')
    setFormClassName('')
    setFormFase('Fase E (Kelas X)')
    setFormJenisPerangkat('MODUL_AJAR')
    setFormTitle('')
    setFormDescription('')
    setFormFileUrl('')
    setFormFileType('PDF')
    setFormFileSize('')
  }

  // Handle File Input (Convert to Base64 and upload)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Batas maksimal ukuran file adalah 20 MB.', 'warning')
      return
    }

    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Str = reader.result as string
        const res = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Str,
            folder: 'sdm_docs',
          }),
        })
        const uploadRes = await res.json()
        if (uploadRes.url) {
          setFormFileUrl(uploadRes.url)
          const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF'
          setFormFileType(ext)
          const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB'
          setFormFileSize(sizeMb)
          if (!formTitle) {
            setFormTitle(file.name.replace(/\.[^/.]+$/, ''))
          }
        }
      } catch (err) {
        Swal.fire('Gagal Upload', 'Gagal memproses file.', 'error')
      } finally {
        setUploadingFile(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formSubjectName || !formTitle || !formFileUrl) {
      Swal.fire('Lengkapi Formulir', 'Silakan isi mata pelajaran, judul, dan lampirkan file/link dokumen.', 'warning')
      return
    }

    const payload = {
      subjectName: formSubjectName,
      className: formClassName,
      fase: formFase,
      jenisPerangkat: formJenisPerangkat,
      title: formTitle,
      description: formDescription,
      fileUrl: formFileUrl,
      fileType: formFileType,
      fileSize: formFileSize,
      academicYear: formAcademicYear,
      semester: formSemester,
    }

    saveMutation.mutate(payload)
  }

  const handleOpenEdit = (doc: any) => {
    setEditDocId(doc.id)
    setFormSubjectName(doc.subjectName)
    setFormClassName(doc.className || '')
    setFormFase(doc.fase || 'Fase E (Kelas X)')
    setFormJenisPerangkat(doc.jenisPerangkat)
    setFormTitle(doc.title)
    setFormDescription(doc.description || '')
    setFormFileUrl(doc.fileUrl)
    setFormFileType(doc.fileType || 'PDF')
    setFormFileSize(doc.fileSize || '')
    setFormAcademicYear(doc.academicYear)
    setFormSemester(doc.semester)
    setUploadMode(doc.fileType === 'LINK' || doc.fileType === 'GDRIVE' ? 'LINK' : 'FILE')
    setOpenModalUpload(true)
  }

  const handleDeleteDoc = (id: string, title: string) => {
    Swal.fire({
      title: 'Hapus Dokumen?',
      html: `Apakah Anda yakin ingin menghapus <strong>${title}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })
  }

  // Filter Data
  const filteredList = perangkatList.filter((item) => {
    return (
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.teacherName && item.teacherName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  const { sortConfig, handleSort, sortedItems } = useSorting(filteredList)
  const searchedItems = filterDataBySearch(sortedItems, searchQuery)

  // Rule 20 Pagination States
  const [docPage, setDocPage] = useState<number>(1)
  const [docPageSize, setDocPageSize] = useState<number>(10)
  const [rekapPage, setRekapPage] = useState<number>(1)
  const [rekapPageSize, setRekapPageSize] = useState<number>(10)

  useEffect(() => {
    setDocPage(1)
  }, [searchQuery, filterJenis, filterStatus, filterTeacher, docPageSize])

  const paginatedDocs = useMemo(() => {
    const startIndex = (docPage - 1) * docPageSize
    return searchedItems.slice(startIndex, startIndex + docPageSize)
  }, [searchedItems, docPage, docPageSize])

  const filteredRekapList = useMemo(() => {
    return rekapList.filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [rekapList, searchQuery])

  useEffect(() => {
    setRekapPage(1)
  }, [searchQuery, rekapPageSize])

  const paginatedRekapList = useMemo(() => {
    const startIndex = (rekapPage - 1) * rekapPageSize
    return filteredRekapList.slice(startIndex, startIndex + rekapPageSize)
  }, [filteredRekapList, rekapPage, rekapPageSize])

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TERVERIFIKASI':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> Terverifikasi
          </Badge>
        )
      case 'PERLU_REVISI':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] gap-1 py-0.5">
            <AlertCircle className="w-3 h-3" /> Perlu Revisi
          </Badge>
        )
      case 'DITOLAK':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] gap-1 py-0.5">
            <XCircle className="w-3 h-3" /> Ditolak
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] gap-1 py-0.5">
            <Clock className="w-3 h-3" /> Menunggu Verifikasi
          </Badge>
        )
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Akses Terbatas: Khusus Guru & Pihak Berwenang
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          Modul Perangkat Pembelajaran dan Administrasi Guru hanya diperuntukkan bagi Bapak/Ibu Guru serta Pimpinan/Tim Kurikulum yang berwenang. Pegawai / karyawan biasa tidak diizinkan mengakses modul ini.
        </p>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="text-xs font-semibold px-4 py-2"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header Halaman: Bersih, Berwibawa & Fungsional */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
              Portal Guru
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground">
              SMA Muhammadiyah 1 Ponorogo
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary shrink-0" />
            Administrasi &amp; Perangkat Pembelajaran
          </h1>
          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Penyusunan Prota, Promes, CP &amp; ATP, Modul Ajar, presensi harian, hingga integrasi nilai e-rapor terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Tombol Ekspor Format Nilai Multi-Sheet */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingMultiSheet}
                  className="h-9 px-3 text-xs font-semibold gap-1.5 border-border"
                >
                  <Download className={`w-3.5 h-3.5 text-emerald-600 ${exportingMultiSheet ? 'animate-bounce' : ''}`} />
                  <span>{exportingMultiSheet ? 'Mengunduh...' : 'Ekspor Nilai'}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80 p-3 rounded-xl shadow-lg border border-border bg-card">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <div>
                  <span className="text-[11px] font-bold text-foreground block">
                    Format Penilaian Excel
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Multi-sheet untuk seluruh rombel kelas yang diampu.
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold">
                  Multi-Sheet
                </Badge>
              </div>

              {assignedSubjects.length > 1 && (
                <div className="mb-2 p-2 rounded-lg bg-muted/40 border border-border text-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Pilih Mata Pelajaran:
                  </span>
                  <div className="space-y-1">
                    {assignedSubjects.map((s: any) => (
                      <div key={s.id} className="text-xs font-medium flex items-center justify-between py-0.5">
                        <span className="truncate max-w-[140px]">{s.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleExportTeacherMultiClassExcel('sts', s.id)}
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            STS
                          </button>
                          <button
                            onClick={() => handleExportTeacherMultiClassExcel('sas', s.id)}
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          >
                            SAS
                          </button>
                          <button
                            onClick={() => handleExportTeacherMultiClassExcel('kd', s.id)}
                            className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-muted text-foreground hover:bg-muted/80"
                          >
                            Formatif
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={exportingMultiSheet}
                  className="w-full justify-start text-xs font-medium h-8 rounded-md"
                  onClick={() => handleExportTeacherMultiClassExcel('sts')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary mr-2 shrink-0" />
                  <span>Nilai STS (Semua Sheet Kelas)</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={exportingMultiSheet}
                  className="w-full justify-start text-xs font-medium h-8 rounded-md"
                  onClick={() => handleExportTeacherMultiClassExcel('sas')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 mr-2 shrink-0" />
                  <span>Nilai SAS (Semua Sheet Kelas)</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={exportingMultiSheet}
                  className="w-full justify-start text-xs font-medium h-8 rounded-md"
                  onClick={() => handleExportTeacherMultiClassExcel('kd')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                  <span>Nilai Formatif &amp; TP</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (schedulePairings.length > 0) {
                const targetPair = schedulePairings.find((p) => !p.isConfigured) || schedulePairings[0]
                setFormQuickClassId(targetPair.classId)
                setFormQuickSubjectId(targetPair.subjectId)
                setFormQuickFase(targetPair.fase || (targetPair.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
                setFormQuickJpPerMinggu(targetPair.totalJpPerMinggu || 2)
              } else {
                if (assignedClasses.length > 0) setFormQuickClassId(assignedClasses[0].id)
                if (assignedSubjects.length > 0) setFormQuickSubjectId(assignedSubjects[0].id)
              }
              setOpenModalQuickSetup(true)
            }}
            className="h-9 px-3 text-xs font-semibold gap-1.5 border-border"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Setup</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setOpenModalUpload(true)
            }}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Unggah Berkas</span>
          </Button>
        </div>
      </div>

      {/* Navigasi Tab Modul */}
      <div className="flex border-b border-border gap-1 overflow-x-auto pb-0.5 no-scrollbar">
        <button
          onClick={() => setActiveTab('merdeka')}
          className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'merdeka'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Perangkat Ajar (Prota/Promes &amp; ATP)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-muted text-foreground font-mono">
            Kurikulum
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alur')}
          className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'alur'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Alur Administrasi</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-muted text-muted-foreground font-mono">
            6 Tahap
          </span>
        </button>

        <button
          onClick={() => setActiveTab('saya')}
          className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'saya'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Berkas Manual</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-muted text-muted-foreground font-mono">
            {perangkatList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('arsip')}
          className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'arsip'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Arsip Riwayat</span>
          {archivePerangkatList.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-muted text-foreground font-mono font-bold">
              {archivePerangkatList.length}
            </span>
          )}
        </button>

        {isKurikulumOrPimpinan && (
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'verifikasi'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verifikasi Kurikulum</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-emerald-500/10 text-emerald-600 font-mono font-bold">
              {perangkatList.filter((p) => p.status === 'DIAJUKAN').length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('rekap')}
          className={`pb-2.5 px-3.5 font-semibold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Rekapitulasi</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-muted text-muted-foreground font-mono">
            {summary.persentaseKelengkapanSekolah || 0}%
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: ALUR KERJA LENGKAP ADMINISTRASI GURU (INTEGRASI 1 PINTU) */}
      {/* ========================================================================= */}
      {activeTab === 'alur' && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Peta Alur Kerja Administrasi Guru Terpadu
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dari perencanaan perangkat ajar awal tahun hingga pelaporan e-rapor dan supervisi akademik.
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 text-xs font-bold w-fit">
                  Terintegrasi Basis Data Riil
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tahap 1: Perangkat Ajar & Prota/Promes */}
                <div className="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        Tahap 1 • Awal Semester
                      </span>
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Prota, Promes, CP & ATP
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Penyusunan Program Tahunan, Program Semester, Capaian Pembelajaran (CP), dan pembagian Alur Tujuan Pembelajaran (ATP) per fase.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('merdeka')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
                  >
                    <span>Buka Matriks Prota & Promes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Tahap 2: RPP / Silabus & Bank Soal */}
                <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                        Tahap 2 • Persiapan KBM
                      </span>
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Modul Ajar, Silabus & Soal
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pembuatan modul ajar diferensiasi, LKPD siswa, penyusunan kisi-kisi soal, paket soal asesmen harian, STS, dan SAS sekolah.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('merdeka')}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
                  >
                    <span>Generator Modul & Paket Soal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Tahap 3: Jadwal KBM & Jadwal Pelajaran */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Tahap 3 • Sinkronisasi Sesi
                      </span>
                      <CalendarDays className="w-4 h-4 text-slate-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Jadwal Mengajar & Jadwal Kelas
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Verifikasi alokasi JP per minggu, jam tatap muka ruang kelas, dan jadwal pelajaran resmi sekolah secara sinkron.
                    </p>
                  </div>
                  <Link href="/akademik/jadwal-mengajar" className="w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5 border-slate-300 dark:border-slate-700"
                    >
                      <span>Lihat Jadwal Mengajar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Tahap 4: Presensi & Jurnal Mengajar Harian */}
                <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                        Tahap 4 • Pelaksanaan KBM
                      </span>
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Presensi Siswa & Jurnal Mengajar
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pengisian materi KBM per sesi jam pelajaran, rekam kehadiran siswa di kelas (H/I/S/A), dan dokumentasi foto kegiatan belajar.
                    </p>
                  </div>
                  <Link href="/akademik/jurnal-mengajar" className="w-full">
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
                    >
                      <span>Isi & Rekap Jurnal KBM</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Tahap 5: Penilaian Akademik & E-Rapor (Internal & Program) */}
                <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300">
                        Tahap 5 • Asesmen &amp; Rapor
                      </span>
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Penilaian, E-Rapor Internal &amp; Program
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Pengolahan nilai formatif/TP, STS, SAS, integrasi ledger nilai e-rapor wali kelas, dan evaluasi capaian program unggulan.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Link href="/akademik/penilaian">
                      <Button
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 rounded-xl shadow-xs gap-1"
                      >
                        <span>Input Penilaian</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Link href="/akademik/e-rapor">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-bold text-xs h-8 rounded-xl shadow-xs gap-1"
                      >
                        <span>E-Rapor Internal</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    <Link href="/akademik/e-rapor-program" className="sm:col-span-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-slate-700 dark:text-slate-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 text-[11px] font-semibold h-7 rounded-lg"
                      >
                        <span>Buka E-Rapor Program Pilihan</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Tahap 6: Supervisi Akademik & Kinerja */}
                <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-300">
                        Tahap 6 • Penjaminan Mutu
                      </span>
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Supervisi Akademik & Kinerja GTK
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Observasi KBM kelas, telaah dokumen perangkat ajar oleh kepala sekolah & tim kurikulum, evaluasi rubrik, dan pembinaan berkala.
                    </p>
                  </div>
                  <Link href="/akademik/supervisi-akademik" className="w-full">
                    <Button
                      size="sm"
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs gap-1.5"
                    >
                      <span>Buka Supervisi Akademik</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: MODUL PERANGKAT AJAR TERPADU MULTI-KURIKULUM */}
      {/* ========================================================================= */}
      {activeTab === 'merdeka' && (
        <div className="space-y-4">
          {/* Pilihan Kurikulum Indonesia Dinamis (Merdeka, K13, Kurikulum Baru) */}
          <KurikulumSelector
            selectedCurriculumId={selectedCurriculum}
            onSelect={setSelectedCurriculum}
          />

          {selectedCurriculum === 'KURIKULUM_MERDEKA' && (
            <KurikulumMerdekaWorkspace />
          )}

          {selectedCurriculum === 'KURIKULUM_2013' && (
            <KurikulumPlaceholderWorkspace
              name="Kurikulum 2013 (K-13)"
              code="K13"
              description="Format silabus, RPP 1 lembar, pemetaan KD (Kompetensi Dasar 3 & 4), dan kriteria ketuntasan minimal (KKM)."
            />
          )}

          {selectedCurriculum === 'KURIKULUM_NASIONAL_BARU' && (
            <KurikulumPlaceholderWorkspace
              name="Kurikulum Nasional Terpadu"
              code="KURNAS"
              description="Slot arsitektur modular terstandar untuk integrasi kebijakan kurikulum baru kementerian pendidikan di masa depan."
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PERANGKAT SAYA / DAFTAR DOKUMEN ARSIP */}
      {/* ========================================================================= */}
      {(activeTab === 'saya' || activeTab === 'verifikasi') && (

        <div className="space-y-6">
          {/* Tabel Dokumen */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeTab === 'verifikasi' ? 'Antrian Verifikasi Berkas Guru' : 'Daftar Berkas Perangkat Ajar'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activeTab === 'verifikasi' 
                      ? 'Telaah kesesuaian ATP, Modul Ajar, CP, dan Prota/Promes guru sebelum disahkan.'
                      : 'Dokumen administrasi yang telah Anda unggah dan status validasinya oleh kurikulum.'}
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0">
                  {searchedItems.length} Dokumen
                </Badge>
              </div>

              <div className="w-full sm:w-auto">
                <TableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Cari judul / mapel / guru..."
                  activeFiltersCount={
                    (filterJenis !== 'ALL' ? 1 : 0) +
                    (filterStatus !== 'ALL' ? 1 : 0) +
                    (filterTeacher !== 'ALL' ? 1 : 0)
                  }
                  onResetFilters={() => {
                    setFilterJenis('ALL')
                    setFilterStatus('ALL')
                    setFilterTeacher('ALL')
                  }}
                  filters={
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Jenis Perangkat</label>
                        <select
                          value={filterJenis}
                          onChange={(e) => setFilterJenis(e.target.value)}
                          aria-label="Filter Jenis Perangkat"
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ALL">Semua Jenis Perangkat</option>
                          {JENIS_PERANGKAT_OPTIONS.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Status Verifikasi</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          aria-label="Filter Status Verifikasi"
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ALL">Semua Status</option>
                          <option value="DIAJUKAN">Menunggu Verifikasi</option>
                          <option value="TERVERIFIKASI">Terverifikasi</option>
                          <option value="PERLU_REVISI">Perlu Revisi</option>
                          <option value="DITOLAK">Ditolak</option>
                        </select>
                      </div>

                      {isKurikulumOrPimpinan && activeTab === 'verifikasi' && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Guru Sasaran</label>
                          <select
                            value={filterTeacher}
                            onChange={(e) => setFilterTeacher(e.target.value)}
                            aria-label="Filter Guru Sasaran"
                            className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ALL">Semua Guru</option>
                            {teachersList.map((t: any) => (
                              <option key={t.id} value={t.id}>
                                {t.user?.name || t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="pl-6 w-12 text-center">No</TableHead>
                    {(activeTab === 'verifikasi' || isKurikulumOrPimpinan) && (
                      <TableHead className="w-48">Guru & NIP</TableHead>
                    )}
                    <TableHead className="w-36">Mapel & Fase</TableHead>
                    <TableHead className="w-40">Jenis Perangkat</TableHead>
                    <TableHead className="min-w-[200px] max-w-[320px]">Judul & Deskripsi</TableHead>
                    <TableHead className="w-28 text-center">Berkas</TableHead>
                    <TableHead className="w-36 text-center">Status</TableHead>
                    <TableHead className="pr-6 text-right w-36">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPerangkat ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                        Memuat data perangkat pembelajaran...
                      </TableCell>
                    </TableRow>
                  ) : searchedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Belum ada dokumen perangkat pembelajaran yang sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDocs.map((doc, idx) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="pl-6 text-center font-medium text-slate-400 text-xs">
                          {(docPage - 1) * docPageSize + idx + 1}
                        </TableCell>

                        {(activeTab === 'verifikasi' || isKurikulumOrPimpinan) && (
                          <TableCell className="text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {doc.teacher?.user?.name || doc.teacherName || 'Guru'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {doc.nip ? `NIP. ${doc.nip}` : 'Pendidik'}
                            </span>
                          </TableCell>
                        )}

                        <TableCell className="text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {doc.subjectName}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {doc.fase || doc.className || 'Fase E/F'}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40 text-[11px]">
                            {JENIS_PERANGKAT_OPTIONS.find((j) => j.id === doc.jenisPerangkat)?.label || doc.jenisPerangkat}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="font-bold text-slate-900 dark:text-white truncate" title={doc.title}>
                            {doc.title}
                          </div>
                          {doc.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={doc.description}>
                              {doc.description}
                            </p>
                          )}
                          {doc.catatanVerifikasi && (
                            <div className="mt-1 p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900/40 text-[10px] text-amber-800 dark:text-amber-300">
                              <strong>Catatan Kurikulum:</strong> {doc.catatanVerifikasi}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {doc.fileType || 'Buka'}
                          </a>
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          {getStatusBadge(doc.status)}
                          {doc.verifiedByName && (
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              oleh {doc.verifiedByName}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Tombol Verifikasi (Khusus Kurikulum / Pimpinan) */}
                            {isKurikulumOrPimpinan && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDocForVerify(doc)
                                  setVerifyStatus(
                                    doc.status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' : 'TERVERIFIKASI'
                                  )
                                  setVerifyNotes(doc.catatanVerifikasi || '')
                                  setOpenModalVerify(true)
                                }}
                                className="h-7 px-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Telaah
                              </Button>
                            )}

                            {/* Tombol Edit & Hapus (Untuk pemilik atau Kurikulum) */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(doc)}
                              className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDoc(doc.id, doc.title)}
                              className="h-7 px-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
            {!loadingPerangkat && searchedItems.length > 0 && (
              <TablePagination
                currentPage={docPage}
                pageSize={docPageSize}
                totalItems={searchedItems.length}
                onPageChange={setDocPage}
                onPageSizeChange={setDocPageSize}
                itemLabel="dokumen perangkat"
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ARSIP KHUSUS ADMINISTRASI GURU (SEMUA KURIKULUM & TAHUN AJARAN) */}
      {/* ========================================================================= */}
      {activeTab === 'arsip' && (
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-500" />
                    Arsip Administrasi Guru &amp; Perangkat Ajar Lintas Tahun Ajaran
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Setiap pergantian tahun ajaran baru, seluruh administrasi guru (Prota, Promes, ATP/CP, RPP, dan dokumen ajar) otomatis diarsipkan secara tersinkronisasi waktu dan dapat digunakan kembali kapan saja.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 shrink-0">
                  {archivePerangkatList.length} Berkas Diarsipkan
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {archivePerangkatList.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
                  <Archive className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Belum Ada Data Arsip Tahun Ajaran Lampau
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Saat tahun pelajaran atau semester sekolah berganti, sistem SIMASMUH secara otomatis memindahkan perangkat periode sebelumnya ke halaman arsip ini secara aman tanpa menghapus data historis.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivePerangkatList.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                            {item.academicYear} • {item.semester}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            Fase {item.fase || 'E/F'}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.class?.name} • {item.subject?.name}
                        </h4>
                        <div className="text-xs text-slate-500 space-y-1">
                          <p>
                            • <strong>{item._count?.tujuanPembelajarans || 0}</strong> Butir Tujuan Pembelajaran
                          </p>
                          <p>
                            • <strong>{item._count?.promesAllocations || 0}</strong> Plot Alokasi Promes
                          </p>
                          <p>
                            • <strong>{item._count?.dokumenItems || 0}</strong> Dokumen Ajar (Modul/RPP/LKPD)
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {item.jpPerMinggu ? `${item.jpPerMinggu} JP/Minggu` : '2 JP/Minggu'}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setActiveTab('merdeka')
                            Swal.fire({
                              icon: 'info',
                              title: 'Arsip Perangkat Terpilih',
                              text: `Untuk menggunakan kembali perangkat ${item.class?.name} - ${item.subject?.name}, buka tombol "Arsip Guru" pada tab Kurikulum dan klik "Gunakan Kembali".`,
                              confirmButtonColor: '#2563eb',
                            })
                          }}
                          className="h-7 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Gunakan Kembali</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAPITULASI SEKOLAH LENGKAP & DINAMIS */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Kartu Statistik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Guru Terdaftar</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {summary.totalTeachers || 0} Pendidik
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Total Berkas Diunggah</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {summary.totalAllDocs || 0} Dokumen
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Berkas Terverifikasi</div>
                  <div className="text-xl font-black text-emerald-600">
                    {summary.totalAllVerified || 0} Sah
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Kepatuhan Administrasi</div>
                  <div className="text-xl font-black text-amber-600">
                    {summary.persentaseKelengkapanSekolah || 0}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Matriks Rekapitulasi Real 100% */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 px-6">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  Matriks Status Perangkat Pembelajaran Guru (Data Riil)
                </CardTitle>
                <CardDescription className="text-xs">
                  Keterpenuhan administrasi 4 pilar: Modul Ajar/RPP, Alur Tujuan Pembelajaran (ATP), Capaian Pembelajaran (CP), dan Prota & Promes.
                </CardDescription>
              </div>
              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari guru..."
              />
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="pl-6 w-12 text-center">No</TableHead>
                    <TableHead className="w-48">Nama Guru</TableHead>
                    <TableHead className="text-center w-36">Modul Ajar / RPP</TableHead>
                    <TableHead className="text-center w-36">ATP</TableHead>
                    <TableHead className="text-center w-36">CP</TableHead>
                    <TableHead className="text-center w-36">Prota & Promes</TableHead>
                    <TableHead className="text-center w-28">KBM Terisi</TableHead>
                    <TableHead className="text-center w-28">Kelengkapan</TableHead>
                    <TableHead className="pr-6 text-right w-36">Status Validasi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRekap ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                        Memuat rekapitulasi data perangkat...
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRekapList.map((t, idx) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="pl-6 text-center font-medium text-slate-400 text-xs">
                          {(rekapPage - 1) * rekapPageSize + idx + 1}
                        </TableCell>

                          <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                            {t.name}
                            {t.nip !== '-' && (
                              <span className="text-[10px] text-slate-400 font-mono block">NIP. {t.nip}</span>
                            )}
                          </TableCell>

                          {/* Modul Ajar */}
                          <TableCell className="text-center">
                            {t.modulAjarCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> {t.modulAjarStatus}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </TableCell>

                          {/* ATP */}
                          <TableCell className="text-center">
                            {t.atpCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> {t.atpStatus}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </TableCell>

                          {/* CP */}
                          <TableCell className="text-center">
                            {t.cpCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> {t.cpStatus}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </TableCell>

                          {/* Prota & Promes */}
                          <TableCell className="text-center">
                            {t.protaPromesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> {t.protaPromesStatus}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum Diunggah</span>
                            )}
                          </TableCell>

                          {/* Jurnal KBM */}
                          <TableCell className="text-center text-xs">
                            <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                              {t.journalsCount} Sesi
                            </span>
                          </TableCell>

                          {/* Skor Kelengkapan % */}
                          <TableCell className="text-center">
                            <Badge className={`${
                              t.completenessScore === 100 
                                ? 'bg-emerald-600' 
                                : t.completenessScore >= 50 
                                ? 'bg-blue-600' 
                                : 'bg-slate-500'
                            } text-white font-bold text-[10px]`}>
                              {t.completenessScore}%
                            </Badge>
                          </TableCell>

                          {/* Status Validasi */}
                          <TableCell className="pr-6 text-right">
                            {t.statusValidasi === 'TERVERIFIKASI_LENGKAP' ? (
                              <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                                Terverifikasi
                              </Badge>
                            ) : t.totalDocs > 0 ? (
                              <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                                Proses Telaah
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Belum Lengkap
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
            </CardContent>
            {!loadingRekap && filteredRekapList.length > 0 && (
              <TablePagination
                currentPage={rekapPage}
                pageSize={rekapPageSize}
                totalItems={filteredRekapList.length}
                onPageChange={setRekapPage}
                onPageSizeChange={setRekapPageSize}
                itemLabel="rekapitulasi guru"
              />
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UNGGAH / EDIT PERANGKAT AJAR GURU */}
      {/* ========================================================================= */}
      <Dialog open={openModalUpload} onOpenChange={setOpenModalUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              {editDocId ? 'Edit Dokumen Perangkat Ajar' : 'Unggah Perangkat Pembelajaran'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lengkapi rincian dokumen administrasi pembelajaran Kurikulum Merdeka untuk diverifikasi kurikulum.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mata Pelajaran */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Matematika, Bahasa Indonesia"
                  value={formSubjectName}
                  onChange={(e) => setFormSubjectName(e.target.value)}
                  required
                  className="h-10 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Jenis Perangkat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Jenis Dokumen <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={formJenisPerangkat}
                  onChange={(e) => setFormJenisPerangkat(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {JENIS_PERANGKAT_OPTIONS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fase / Tingkat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fase / Sasaran Tingkat
                </Label>
                <select
                  value={formFase}
                  onChange={(e) => setFormFase(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {FASE_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rombel / Kelas Spesifik */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Rombel / Kelas (Opsional)
                </Label>
                <Input
                  placeholder="Contoh: X 1, XI 2, XII 1"
                  value={formClassName}
                  onChange={(e) => setFormClassName(e.target.value)}
                  className="h-10 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Tahun Pelajaran */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tahun Pelajaran
                </Label>
                <Input
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  className="h-10 rounded-xl text-xs font-semibold"
                />
              </div>

              {/* Semester */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Semester
                </Label>
                <select
                  value={formSemester}
                  onChange={(e) => setFormSemester(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="GANJIL">Ganjil</option>
                  <option value="GENAP">Genap</option>
                </select>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Dokumen / Modul <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: Modul Ajar Bab 1 - Struktur Atom & Ikatan Kimia"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="h-10 rounded-xl text-xs font-semibold"
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Ringkasan Lingkup Materi / Catatan (Opsional)
              </Label>
              <Textarea
                placeholder="Tuliskan catatan alokasi JP, integrasi P5, atau ringkasan capaian tujuan..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="rounded-xl text-xs min-h-[60px]"
              />
            </div>

            {/* Pilihan Sumber Dokumen: File vs Link */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-white">
                  Lampiran Berkas / Tautan Dokumen <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('FILE')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      uploadMode === 'FILE'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Upload File (PDF/DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('LINK')}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      uploadMode === 'LINK'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Link Google Drive / URL
                  </button>
                </div>
              </div>

              {uploadMode === 'FILE' ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.pptx,.zip"
                    onChange={handleFileChange}
                    disabled={uploadingFile}
                    className="h-10 rounded-xl text-xs cursor-pointer"
                  />
                  {uploadingFile && (
                    <p className="text-[11px] text-blue-600 font-semibold animate-pulse">
                      Sedang mengunggah berkas ke penyimpanan server...
                    </p>
                  )}
                  {formFileUrl && !uploadingFile && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Berkas tersimpan ({formFileType} &bull; {formFileSize || 'Ready'})</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="https://drive.google.com/file/d/... atau https://docs.google.com/..."
                    value={formFileUrl}
                    onChange={(e) => {
                      setFormFileUrl(e.target.value)
                      setFormFileType('LINK')
                    }}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                  <p className="text-[11px] text-slate-400">
                    Pastikan hak akses tautan Google Drive / Cloud diatur ke &quot;Siapa saja yang memiliki link (Viewer)&quot;.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenModalUpload(false)}
                className="h-10 rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || uploadingFile}
                className="h-10 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Ajukan Dokumen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: VERIFIKASI KURIKULUM / PIMPINAN */}
      {/* ========================================================================= */}
      <Dialog open={openModalVerify} onOpenChange={setOpenModalVerify}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Telaah & Verifikasi Dokumen Kurikulum
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pemeriksaan kesesuaian dokumen perangkat pembelajaran sebelum disahkan.
            </DialogDescription>
          </DialogHeader>

          {selectedDocForVerify && (
            <div className="space-y-4 pt-2">
              {/* Rincian Dokumen */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pendidik:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedDocForVerify.teacher?.user?.name || selectedDocForVerify.teacherName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mata Pelajaran:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedDocForVerify.subjectName} ({selectedDocForVerify.fase || 'Fase E/F'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jenis Perangkat:</span>
                  <span className="font-bold text-indigo-600">
                    {selectedDocForVerify.jenisPerangkat}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Judul Dokumen:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                    {selectedDocForVerify.title}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400">Tautan Berkas:</span>
                  <a
                    href={selectedDocForVerify.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Dokumen
                  </a>
                </div>
              </div>

              {/* Pilihan Keputusan Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Keputusan Hasil Telaah Kurikulum <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('TERVERIFIKASI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      verifyStatus === 'TERVERIFIKASI'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Terverifikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('PERLU_REVISI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      verifyStatus === 'PERLU_REVISI'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Perlu Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyStatus('DITOLAK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      verifyStatus === 'DITOLAK'
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Ditolak
                  </button>
                </div>
              </div>

              {/* Catatan Verifikasi / Evaluasi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Evaluasi / Rekomendasi Perbaikan
                </Label>
                <Textarea
                  placeholder="Tuliskan umpan balik konstruktif untuk guru (misal: Sesuai fase E, tambahkan rubrik asesmen sumatif)..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenModalVerify(false)}
                  className="h-10 rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={verifyMutation.isPending}
                  onClick={() => {
                    verifyMutation.mutate({
                      id: selectedDocForVerify.id,
                      status: verifyStatus,
                      catatanVerifikasi: verifyNotes,
                    })
                  }}
                  className={`h-10 rounded-xl text-xs font-black text-white ${
                    verifyStatus === 'TERVERIFIKASI'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : verifyStatus === 'PERLU_REVISI'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {verifyMutation.isPending ? 'Memproses...' : 'Simpan Status Telaah'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG MODAL: QUICK SETUP ADMINISTRASI GURU BERSANGKUTAN */}
      {/* ========================================================================= */}
      <Dialog open={openModalQuickSetup} onOpenChange={setOpenModalQuickSetup}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Quick Setup Portal Guru
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasi kilat rombel kelas & mata pelajaran untuk mengaktifkan administrasi Prota, Promes, ATP, RPP, dan Soal secara terpadu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Info Guru Login */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Pendidik Pengampu:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{session?.user?.name || 'Guru Pengampu'}</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-blue-200 text-blue-700 dark:text-blue-300">
                T.P. {filterTahun}
              </Badge>
            </div>

            {/* Pilihan Rombel Kelas & Pengelompokan Jenjang */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Rombongan Belajar / Kelas <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  Format Baku: Romawi Spasi Angka
                </span>
              </div>
              <select
                value={formQuickClassId}
                onChange={(e) => handleSelectQuickClass(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Rombel Kelas --</option>
                {assignedClasses.length > 0 ? (
                  ['X', 'XI', 'XII'].map((roman) => {
                    const gradeNum = roman === 'X' ? 10 : roman === 'XI' ? 11 : 12
                    const classesInGrade = assignedClasses.filter((c: any) => {
                      const cGrade = c.gradeLevel || (c.name?.startsWith('X ') ? 10 : c.name?.startsWith('XI ') ? 11 : 12)
                      return cGrade === gradeNum
                    })

                    if (classesInGrade.length === 0) return null

                    return (
                      <optgroup key={roman} label={`Jenjang Kelas ${roman} (${classesInGrade.length} Rombel)`}>
                        {classesInGrade.map((c: any) => {
                          const hasSched = schedulePairings.some((p) => p.classId === c.id)
                          return (
                            <option key={c.id} value={c.id}>
                              Kelas {c.name} {hasSched ? '• Ada Jadwal KBM' : ''}
                            </option>
                          )
                        })}
                      </optgroup>
                    )
                  })
                ) : (
                  <option value="" disabled>Belum ada jadwal penugasan kelas di sistem</option>
                )}
              </select>
            </div>

            {/* Checkbox Efisiensi Waktu Guru: Aktifkan untuk seluruh rombel jenjang sama */}
            {formQuickClassId && (
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="apply-same-grade-toggle"
                  checked={formQuickApplySameGrade}
                  onChange={(e) => setFormQuickApplySameGrade(e.target.checked)}
                  className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="apply-same-grade-toggle" className="cursor-pointer text-xs space-y-0.5 select-none">
                  <span className="font-bold text-blue-900 dark:text-blue-200 block">
                    Otomatis Berlaku untuk Seluruh Rombel Jenjang Sama
                  </span>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
                    {(() => {
                      const sel = assignedClasses.find((c: any) => c.id === formQuickClassId)
                      const gradeNum = sel?.gradeLevel || (sel?.name?.startsWith('X ') ? 10 : sel?.name?.startsWith('XI ') ? 11 : 12)
                      const roman = gradeNum === 10 ? 'X' : gradeNum === 11 ? 'XI' : 'XII'
                      const count = assignedClasses.filter((c: any) => {
                        const cGrade = c.gradeLevel || (c.name?.startsWith('X ') ? 10 : c.name?.startsWith('XI ') ? 11 : 12)
                        return cGrade === gradeNum
                      }).length
                      return `Contoh: Cukup 1 kali setup untuk seluruh rombel Kelas ${roman} (${count} rombel kelas). Guru tidak perlu mengulang setup satu per satu.`
                    })()}
                  </p>
                </label>
              </div>
            )}

            {/* Pilihan Mata Pelajaran */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Mata Pelajaran <span className="text-rose-500">*</span>
              </Label>
              <select
                value={formQuickSubjectId}
                onChange={(e) => handleSelectQuickSubject(e.target.value)}
                className="w-full text-xs h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {assignedSubjects.length > 0 ? (
                  assignedSubjects.map((s: any) => {
                    const matchPair = schedulePairings.find((p) => p.classId === formQuickClassId && p.subjectId === s.id)
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) {matchPair ? `• ${matchPair.totalJpPerMinggu} JP/minggu (Jadwal)` : ''}
                      </option>
                    )
                  })
                ) : (
                  subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Grid Fase & JP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fase Kurikulum
                </Label>
                <select
                  value={formQuickFase}
                  onChange={(e) => setFormQuickFase(e.target.value)}
                  className="w-full text-xs h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FASE_E">Fase E (Kelas X)</option>
                  <option value="FASE_F">Fase F (Kelas XI - XII)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Beban JP per Minggu
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={formQuickJpPerMinggu}
                  onChange={(e) => setFormQuickJpPerMinggu(Number(e.target.value))}
                  className="h-10 text-xs rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
              💡 <strong>Integrasi Otomatis:</strong> Setelah disimpan, sistem otomatis mengalokasikan total <strong>{Number(formQuickJpPerMinggu) * 18} JP Semester</strong> pada matriks Promes, menyiapkan ruang input TP, modul ajar, dan paket soal.
            </div>

            {/* Tombol Opsi 1-Klik Sinkron Semua Jadwal jika ada jadwal KBM belum disetup */}
            {schedulePairings.some((p) => !p.isConfigured) && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs">
                    Ada {schedulePairings.filter((p) => !p.isConfigured).length} Rombel di Jadwal Resmi
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    Aktifkan semua kelas & mapel jadwal KBM Anda dalam satu kali klik.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={quickSyncing}
                  onClick={handleQuickSyncAllSchedules}
                  className="h-8 shrink-0 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${quickSyncing ? 'animate-spin' : ''}`} />
                  Sinkron Semua
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenModalQuickSetup(false)}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={quickSetupSubmitting || !formQuickClassId || !formQuickSubjectId}
              onClick={handleQuickSetupSubmit}
              className="h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              {quickSetupSubmitting ? 'Menyiapkan...' : 'Simpan & Aktifkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
