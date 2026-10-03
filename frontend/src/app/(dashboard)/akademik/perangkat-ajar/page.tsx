'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
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
  XCircle, Filter, Search, Check, ChevronRight, UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Swal from 'sweetalert2'
import { useSorting, SortableTableHead } from '@/components/SortableTableHead'

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

  const [activeTab, setActiveTab] = useState<'saya' | 'verifikasi' | 'rekap'>('saya')
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

  // 1. Fetch Daftar Guru
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header Utama Modul Perangkat Pembelajaran */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-amber-400/20 text-amber-300 text-xs px-3 py-1 rounded-full font-extrabold backdrop-blur-md border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Kurikulum Merdeka & Standar Proses
            </span>
            <span className="text-xs text-blue-200 font-semibold">
              SMA Muhammadiyah 1 Ponorogo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-amber-300 shrink-0" />
            Perangkat Pembelajaran Guru
          </h1>
          <p className="text-blue-100 mt-1 text-xs sm:text-sm max-w-2xl">
            Pusat unggah dan telaah administrasi guru: Modul Ajar, Alur Tujuan Pembelajaran (ATP), Capaian Pembelajaran (CP), Program Tahunan (Prota), dan Program Semester (Promes).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => {
              resetForm()
              setOpenModalUpload(true)
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Unggah Perangkat Ajar
          </Button>
        </div>
      </div>

      {/* Navigasi Tab */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('saya')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'saya'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Perangkat Ajar Saya</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
            {perangkatList.length}
          </span>
        </button>

        {isKurikulumOrPimpinan && (
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'verifikasi'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verifikasi Kurikulum</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              {perangkatList.filter((p) => p.status === 'DIAJUKAN').length} Antrian
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('rekap')}
          className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <span>Rekapitulasi Sekolah</span>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
            {summary.persentaseKelengkapanSekolah || 0}% Lengkap
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERANGKAT SAYA / DAFTAR DOKUMEN */}
      {/* ========================================================================= */}
      {(activeTab === 'saya' || activeTab === 'verifikasi') && (
        <div className="space-y-6">
          {/* Bar Filter & Pencarian */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Jenis */}
                <select
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                  aria-label="Filter Jenis Perangkat"
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Jenis Perangkat</option>
                  {JENIS_PERANGKAT_OPTIONS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter Status Verifikasi"
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="DIAJUKAN">Menunggu Verifikasi</option>
                  <option value="TERVERIFIKASI">Terverifikasi</option>
                  <option value="PERLU_REVISI">Perlu Revisi</option>
                  <option value="DITOLAK">Ditolak</option>
                </select>

                {/* Filter Guru (Khusus Tim Kurikulum) */}
                {isKurikulumOrPimpinan && activeTab === 'verifikasi' && (
                  <select
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    aria-label="Filter Guru Sasaran"
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Semua Guru</option>
                    {teachersList.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.user?.name || t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <TableSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Cari judul / mapel / guru..."
              />
            </CardContent>
          </Card>

          {/* Tabel Dokumen */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-6">
              <div className="flex items-center justify-between">
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
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                  {searchedItems.length} Dokumen
                </Badge>
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
                    searchedItems.map((doc, idx) => (
                      <TableRow key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="pl-6 text-center font-medium text-slate-400 text-xs">
                          {idx + 1}
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
                  ) : rekapList
                      .filter((t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((t, idx) => (
                        <TableRow key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <TableCell className="pl-6 text-center font-medium text-slate-400 text-xs">
                            {idx + 1}
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
                      ))}
                </TableBody>
              </Table>
            </CardContent>
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

              {/* Tahun Ajaran */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tahun Ajaran
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
    </div>
  )
}
