'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { TablePagination } from '@/components/TablePagination'
import { 
  GraduationCap, BookOpen, Layers, ShieldCheck, CheckCircle2, 
  Clock, AlertCircle, Plus, Search, Filter, RefreshCw, 
  ExternalLink, FileText, Check, Award, SlidersHorizontal, 
  Users, CalendarDays, BookCheck, ArrowRight, Sparkles, Trash2, Edit3
} from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'
import { BUILTIN_CURRICULA, CurriculumOption } from '@/components/academic/kurikulum/common/KurikulumSelector'

interface KurikulumManagementProps {
  userRole?: string
  subRoles?: string[]
}

export function KurikulumManagement({ userRole, subRoles = [] }: KurikulumManagementProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Tab utama Waka Kurikulum
  const [activeTab, setActiveTab] = useState<'standar' | 'verifikasi' | 'struktur' | 'rekap'>('standar')

  // 1. Data Pengaturan Kurikulum Sekolah (Public Settings)
  const { data: publicSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['kurikulum-settings'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/settings/public')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Kurikulum Aktif & Custom
  const activeCurriculaIds: string[] = useMemo(() => {
    try {
      if (publicSettings?.activeCurriculaJson) {
        return JSON.parse(publicSettings.activeCurriculaJson)
      }
    } catch {}
    return ['KURIKULUM_MERDEKA']
  }, [publicSettings?.activeCurriculaJson])

  const customCurriculaList: CurriculumOption[] = useMemo(() => {
    try {
      if (publicSettings?.allCurriculaJson) {
        return JSON.parse(publicSettings.allCurriculaJson)
      }
    } catch {}
    return []
  }, [publicSettings?.allCurriculaJson])

  // Gabungan Kurikulum
  const combinedCurricula = useMemo(() => {
    return [...BUILTIN_CURRICULA, ...customCurriculaList]
  }, [customCurriculaList])

  // Mutation Simpan Kurikulum Aktif & Custom
  const saveCurriculumMutation = useMutation({
    mutationFn: async ({
      activeCurricula,
      customCurricula,
    }: {
      activeCurricula: string[]
      customCurricula: CurriculumOption[]
    }) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeCurriculaJson: JSON.stringify(activeCurricula),
          allCurriculaJson: JSON.stringify(customCurricula),
        }),
      })
      if (!res.ok) throw new Error('Gagal memperbarui konfigurasi kurikulum')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kurikulum-settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Standar kurikulum aktif sekolah telah diperbarui secara realtime.',
        timer: 1600,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi gangguan sistem.',
      })
    },
  })

  // Modal Tambah Custom Kurikulum
  const [openModalAdd, setOpenModalAdd] = useState(false)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newTagline, setNewTagline] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const handleToggleCurriculumActive = (id: string) => {
    let nextActive = [...activeCurriculaIds]
    if (nextActive.includes(id)) {
      if (nextActive.length <= 1) {
        Swal.fire({
          icon: 'warning',
          title: 'Minimal 1 Kurikulum Aktif',
          text: 'Sekolah wajib memiliki minimal satu kurikulum aktif sebagai standar operasional KBM.',
        })
        return
      }
      nextActive = nextActive.filter((item) => item !== id)
    } else {
      if (nextActive.length >= 2) {
        Swal.fire({
          icon: 'warning',
          title: 'Maksimal 2 Kurikulum Aktif',
          text: 'Sesuai regulasi sekolah di Indonesia, kurikulum aktif maksimal 2 jenis (misal: Kurikulum Merdeka & Kurikulum 2013).',
        })
        return
      }
      nextActive.push(id)
    }

    saveCurriculumMutation.mutate({
      activeCurricula: nextActive,
      customCurricula: customCurriculaList,
    })
  }

  const handleCreateCustomCurriculum = () => {
    if (!newName.trim() || !newCode.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Nama kurikulum dan kode singkatan wajib diisi.',
      })
      return
    }

    const genId = newId.trim()
      ? newId.trim().toUpperCase().replace(/\s+/g, '_')
      : `KURIKULUM_${newCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`

    if (combinedCurricula.some((c) => c.id === genId)) {
      Swal.fire({
        icon: 'error',
        title: 'Kode / ID Terpakai',
        text: 'Silakan gunakan kode kurikulum yang unik.',
      })
      return
    }

    const createdItem: CurriculumOption = {
      id: genId,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      tagline: newTagline.trim() || 'Modul Kurikulum Tambahan',
      description: newDesc.trim() || 'Standar kurikulum khusus sekolah.',
      status: 'ACTIVE',
      colorClass: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-300',
      isCustom: true,
    }

    const nextCustom = [...customCurriculaList, createdItem]
    saveCurriculumMutation.mutate(
      {
        activeCurricula: activeCurriculaIds,
        customCurricula: nextCustom,
      },
      {
        onSuccess: () => {
          setOpenModalAdd(false)
          setNewId('')
          setNewName('')
          setNewCode('')
          setNewTagline('')
          setNewDesc('')
        },
      }
    )
  }

  const handleDeleteCustom = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Kurikulum?',
      text: `Apakah Anda yakin ingin menghapus "${name}" dari daftar kurikulum custom?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        const nextCustom = customCurriculaList.filter((c) => c.id !== id)
        const nextActive = activeCurriculaIds.filter((actId) => actId !== id)
        saveCurriculumMutation.mutate({
          activeCurricula: nextActive.length > 0 ? nextActive : ['KURIKULUM_MERDEKA'],
          customCurricula: nextCustom,
        })
      }
    })
  }

  // 2. Data Supervisi / Verifikasi Perangkat Guru
  const [filterJenisPerangkat, setFilterJenisPerangkat] = useState('ALL')
  const [filterStatusPerangkat, setFilterStatusPerangkat] = useState('ALL')
  const [searchPerangkat, setSearchPerangkat] = useState('')
  const [pagePerangkat, setPagePerangkat] = useState(1)
  const [pageSizePerangkat, setPageSizePerangkat] = useState(10)
  const [selectedPerangkatIds, setSelectedPerangkatIds] = useState<string[]>([])

  const currentAcademicYear = publicSettings?.academicYear || '2026/2027'
  const currentSemester = publicSettings?.semester ? (publicSettings.semester.toUpperCase().includes('GENAP') ? 'GENAP' : 'GANJIL') : 'GANJIL'

  const { data: perangkatData, isLoading: loadingPerangkat } = useQuery({
    queryKey: ['waka-kurikulum-perangkat-list', filterJenisPerangkat, filterStatusPerangkat, currentAcademicYear, currentSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterJenisPerangkat !== 'ALL') params.append('jenisPerangkat', filterJenisPerangkat)
      if (filterStatusPerangkat !== 'ALL') params.append('status', filterStatusPerangkat)
      if (currentAcademicYear) params.append('academicYear', currentAcademicYear)
      if (currentSemester) params.append('semester', currentSemester)
      const res = await authenticatedFetch(`/api-backend/perangkat-ajar?${params.toString()}`)
      if (!res.ok) return []
      return res.json()
    },
  })
  const perangkatList: any[] = Array.isArray(perangkatData) ? perangkatData : []

  // Filtered Perangkat
  const filteredPerangkatList = useMemo(() => {
    return filterDataBySearch(perangkatList, searchPerangkat, [
      'title',
      'subject.name',
      'class.name',
      'teacher.name',
      'teacher.user.name',
      'jenisPerangkat',
      'status',
    ])
  }, [perangkatList, searchPerangkat])

  const paginatedPerangkat = useMemo(() => {
    const start = (pagePerangkat - 1) * pageSizePerangkat
    return filteredPerangkatList.slice(start, start + pageSizePerangkat)
  }, [filteredPerangkatList, pagePerangkat, pageSizePerangkat])

  // Verifikasi Perangkat Dialog
  const [openModalVerify, setOpenModalVerify] = useState(false)
  const [selectedDocForVerify, setSelectedDocForVerify] = useState<any>(null)
  const [verifyStatus, setVerifyStatus] = useState<'TERVERIFIKASI' | 'PERLU_REVISI' | 'DITOLAK'>('TERVERIFIKASI')
  const [verifyNotes, setVerifyNotes] = useState('')

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, catatanVerifikasi }: any) => {
      const res = await authenticatedFetch(`/api-backend/perangkat-ajar/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, catatanVerifikasi }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal memverifikasi berkas')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waka-kurikulum-perangkat-list'] })
      queryClient.invalidateQueries({ queryKey: ['waka-kurikulum-stats-rekap'] })
      setOpenModalVerify(false)
      setSelectedDocForVerify(null)
      setVerifyNotes('')
      Swal.fire({
        title: 'Verifikasi Berhasil',
        html: `Perangkat ajar telah diperbarui statusnya menjadi <strong>${data.status}</strong>.`,
        icon: 'success',
        timer: 1600,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Verifikasi', err.message || 'Terjadi kesalahan sistem.', 'error')
    },
  })

  // 3. Data Rekapitulasi Ketuntasan Sekolah
  const { data: rekapData, isLoading: loadingRekap } = useQuery({
    queryKey: ['waka-kurikulum-stats-rekap', currentAcademicYear, currentSemester],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (currentAcademicYear) params.append('academicYear', currentAcademicYear)
      if (currentSemester) params.append('semester', currentSemester)
      const res = await authenticatedFetch(`/api-backend/perangkat-ajar/stats-rekap?${params.toString()}`)
      if (!res.ok) return { summary: {}, rekapList: [] }
      return res.json()
    },
  })
  const summary = rekapData?.summary || {}
  const rekapList: any[] = rekapData?.rekapList || []

  const [searchRekap, setSearchRekap] = useState('')
  const [pageRekap, setPageRekap] = useState(1)
  const [pageSizeRekap, setPageSizeRekap] = useState(10)
  const [selectedRekapIds, setSelectedRekapIds] = useState<string[]>([])

  const filteredRekapList = useMemo(() => {
    return filterDataBySearch(rekapList, searchRekap, ['teacherName', 'nip', 'totalDocs', 'verifiedDocs'])
  }, [rekapList, searchRekap])

  const paginatedRekap = useMemo(() => {
    const start = (pageRekap - 1) * pageSizeRekap
    return filteredRekapList.slice(start, start + pageSizeRekap)
  }, [filteredRekapList, pageRekap, pageSizeRekap])

  // 4. Data Struktur Mata Pelajaran & Beban Kurikulum
  const { data: subjectsData, isLoading: loadingSubjects } = useQuery({
    queryKey: ['waka-kurikulum-subjects'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/subjects')
      if (!res.ok) return []
      return res.json()
    },
  })
  const subjectsList: any[] = Array.isArray(subjectsData) ? subjectsData : []

  const [searchMapel, setSearchMapel] = useState('')
  const [filterKategoriMapel, setFilterKategoriMapel] = useState('ALL')
  const [pageMapel, setPageMapel] = useState(1)
  const [pageSizeMapel, setPageSizeMapel] = useState(10)
  const [selectedMapelIds, setSelectedMapelIds] = useState<string[]>([])

  const filteredSubjects = useMemo(() => {
    let list = subjectsList
    if (filterKategoriMapel !== 'ALL') {
      list = list.filter((s) => s.category === filterKategoriMapel)
    }
    return filterDataBySearch(list, searchMapel, ['name', 'code', 'category', 'program'])
  }, [subjectsList, filterKategoriMapel, searchMapel])

  const paginatedSubjects = useMemo(() => {
    const start = (pageMapel - 1) * pageSizeMapel
    return filteredSubjects.slice(start, start + pageSizeMapel)
  }, [filteredSubjects, pageMapel, pageSizeMapel])

  // Select all handlers
  const handleSelectAllPerangkat = (checked: boolean) => {
    if (checked) {
      setSelectedPerangkatIds(paginatedPerangkat.map((p) => p.id))
    } else {
      setSelectedPerangkatIds([])
    }
  }

  const handleSelectRowPerangkat = (id: string) => {
    setSelectedPerangkatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllRekap = (checked: boolean) => {
    if (checked) {
      setSelectedRekapIds(paginatedRekap.map((r) => r.teacherId))
    } else {
      setSelectedRekapIds([])
    }
  }

  const handleSelectRowRekap = (teacherId: string) => {
    setSelectedRekapIds((prev) =>
      prev.includes(teacherId) ? prev.filter((item) => item !== teacherId) : [...prev, teacherId]
    )
  }

  const handleSelectAllMapel = (checked: boolean) => {
    if (checked) {
      setSelectedMapelIds(paginatedSubjects.map((s) => s.id))
    } else {
      setSelectedMapelIds([])
    }
  }

  const handleSelectRowMapel = (id: string) => {
    setSelectedMapelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header Utama Ringkas Sesuai Aturan AGENTS.md */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">
              <GraduationCap className="w-4 h-4" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tata Kelola Kurikulum
            </h1>
            <Badge className="bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 text-[10px] font-bold">
              Waka Kurikulum
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penetapan standar kurikulum, verifikasi berkas ajar guru, dan rekap ketuntasan.
          </p>
        </div>

        {/* Tautan Cepat Operasional */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/akademik/supervisi-akademik">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800">
              <BookCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Supervisi GTK</span>
            </Button>
          </Link>
          <Link href="/akademik/jadwal-pelajaran">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Jadwal KBM</span>
            </Button>
          </Link>
          <Link href="/akademik/perangkat-ajar">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800">
              <BookOpen className="w-3.5 h-3.5 text-fuchsia-600" />
              <span>Lembar Kerja Ajar</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Widget Statistik Riil Basis Data (Standar Aturan #13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kurikulum Aktif</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {activeCurriculaIds.length} <span className="text-xs font-medium text-slate-400">Jenis</span>
              </h3>
              <p className="text-[11px] text-fuchsia-600 dark:text-fuchsia-400 font-medium truncate max-w-[170px]" title={activeCurriculaIds.join(', ')}>
                {activeCurriculaIds.join(', ')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Menunggu Verifikasi</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">
                {perangkatList.filter((p) => p.status === 'DIAJUKAN').length}{' '}
                <span className="text-xs font-medium text-slate-400">Berkas</span>
              </h3>
              <p className="text-[11px] text-slate-500">Perangkat diajukan guru</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sah Terverifikasi</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                {summary.totalAllVerified || 0} <span className="text-xs font-medium text-slate-400">Berkas</span>
              </h3>
              <p className="text-[11px] text-slate-500">Disetujui Tim Kurikulum</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Kepatuhan Administrasi</p>
              <h3 className="text-2xl font-black text-blue-600 mt-0.5">
                {summary.persentaseKelengkapanSekolah || 0}%
              </h3>
              <p className="text-[11px] text-slate-500">Capaian Guru Sekolah</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigasi Tab Kerja Waka Kurikulum */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0">
        <button
          onClick={() => setActiveTab('standar')}
          className={`py-2 px-3.5 font-bold text-xs flex items-center gap-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'standar'
              ? 'border-fuchsia-600 bg-fuchsia-50/80 dark:bg-fuchsia-950/40 text-fuchsia-900 dark:text-fuchsia-200'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-fuchsia-600" />
          <span>Standar Kurikulum</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-fuchsia-200/80 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200 font-mono font-bold">
            {activeCurriculaIds.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('verifikasi')}
          className={`py-2 px-3.5 font-bold text-xs flex items-center gap-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'verifikasi'
              ? 'border-fuchsia-600 bg-fuchsia-50/80 dark:bg-fuchsia-950/40 text-fuchsia-900 dark:text-fuchsia-200'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verifikasi Perangkat</span>
          {perangkatList.filter((p) => p.status === 'DIAJUKAN').length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-mono font-bold">
              {perangkatList.filter((p) => p.status === 'DIAJUKAN').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          className={`py-2 px-3.5 font-bold text-xs flex items-center gap-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rekap'
              ? 'border-fuchsia-600 bg-fuchsia-50/80 dark:bg-fuchsia-950/40 text-fuchsia-900 dark:text-fuchsia-200'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-blue-600" />
          <span>Rekap Ketuntasan</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
            {rekapList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('struktur')}
          className={`py-2 px-3.5 font-bold text-xs flex items-center gap-2 rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'struktur'
              ? 'border-fuchsia-600 bg-fuchsia-50/80 dark:bg-fuchsia-950/40 text-fuchsia-900 dark:text-fuchsia-200'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
          <span>Struktur Mapel</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-md bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
            {subjectsList.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STANDAR & PILIHAN KURIKULUM (PENETAPAN STANDAR KURIKULUM) */}
      {/* ========================================================================= */}
      {activeTab === 'standar' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-fuchsia-50/60 dark:bg-fuchsia-950/20 p-4 rounded-2xl border border-fuchsia-200/60 dark:border-fuchsia-900/40">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-600" />
                Penetapan Kurikulum Resmi Sekolah
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Pilih maksimal 2 kurikulum yang berlaku secara bersamaan. Guru hanya dapat menyusun perangkat sesuai kurikulum aktif.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setOpenModalAdd(true)}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Daftarkan Kurikulum Baru</span>
            </Button>
          </div>

          {/* Grid Pilihan Kurikulum */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {combinedCurricula.map((item) => {
              const isActive = activeCurriculaIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'border-fuchsia-500 bg-fuchsia-50/30 dark:bg-fuchsia-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.code}
                      </span>
                      {isActive ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold gap-1">
                          <Check className="w-3 h-3" />
                          <span>Berlaku di Sekolah</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 dark:border-slate-800">
                          Nonaktif
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-medium text-fuchsia-700 dark:text-fuchsia-300 line-clamp-1">
                      {item.tagline}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      disabled={saveCurriculumMutation.isPending}
                      onClick={() => handleToggleCurriculumActive(item.id)}
                      className={`h-7 px-3 text-xs font-bold gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-fuchsia-500'
                      }`}
                    >
                      {isActive ? 'Nonaktifkan' : 'Aktifkan Kurikulum'}
                    </Button>

                    {item.isCustom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCustom(item.id, item.name)}
                        className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Hapus kurikulum custom ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VERIFIKASI PERANGKAT GURU (DENGAN SEARCHBAR & TOMBOL FILTER TERPUSAT) */}
      {/* ========================================================================= */}
      {activeTab === 'verifikasi' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Daftar Perangkat Pembelajaran Guru
                </CardTitle>
                <CardDescription className="text-xs">
                  Verifikasi dan berikan catatan supervisi resmi terhadap modul ajar, ATP, CP, dan berkas ajar pendidik.
                </CardDescription>
              </div>

              {/* Searchbar & Satu Tombol Filter Terpusat (Popover) Bersebelahan (Aturan #16) */}
              <div className="flex items-center gap-2">
                <TableSearch
                  value={searchPerangkat}
                  onChange={(val) => {
                    setSearchPerangkat(val)
                    setPagePerangkat(1)
                  }}
                  placeholder="Cari guru, mapel, judul..."
                  className="w-full sm:w-64"
                />

                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs border-slate-200 dark:border-slate-800 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filter</span>
                        {(filterJenisPerangkat !== 'ALL' || filterStatusPerangkat !== 'ALL') && (
                          <span className="w-2 h-2 rounded-full bg-fuchsia-600" />
                        )}
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-72 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Filter Perangkat
                    </h4>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Jenis Berkas</Label>
                      <select
                        value={filterJenisPerangkat}
                        onChange={(e) => {
                          setFilterJenisPerangkat(e.target.value)
                          setPagePerangkat(1)
                        }}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                      >
                        <option value="ALL">Semua Jenis Perangkat</option>
                        <option value="MODUL_AJAR">Modul Ajar / RPP</option>
                        <option value="ATP">Alur Tujuan Pembelajaran (ATP)</option>
                        <option value="CP">Capaian Pembelajaran (CP)</option>
                        <option value="PROTA_PROMES">Prota &amp; Promes</option>
                        <option value="ASESMEN">Instrumen Asesmen</option>
                        <option value="BUKU_AJAR">Bahan / Buku Ajar</option>
                        <option value="LAINNYA">Lainnya</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Status Validasi</Label>
                      <select
                        value={filterStatusPerangkat}
                        onChange={(e) => {
                          setFilterStatusPerangkat(e.target.value)
                          setPagePerangkat(1)
                        }}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="DIAJUKAN">Menunggu Verifikasi</option>
                        <option value="TERVERIFIKASI">Terverifikasi Sah</option>
                        <option value="PERLU_REVISI">Perlu Revisi</option>
                        <option value="DITOLAK">Ditolak</option>
                      </select>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFilterJenisPerangkat('ALL')
                        setFilterStatusPerangkat('ALL')
                        setPagePerangkat(1)
                      }}
                      className="w-full text-xs text-slate-500 hover:text-slate-800 h-7"
                    >
                      Reset Filter
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedPerangkat.length > 0 && selectedPerangkatIds.length === paginatedPerangkat.length}
                        onChange={(e) => handleSelectAllPerangkat(e.target.checked)}
                        className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                        title="Pilih Semua"
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="min-w-[180px] text-xs font-bold">Nama Guru Pendidik</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-bold">Judul &amp; Jenis Dokumen</TableHead>
                    <TableHead className="w-32 text-xs font-bold">Mapel &amp; Kelas</TableHead>
                    <TableHead className="w-28 text-center text-xs font-bold">Status</TableHead>
                    <TableHead className="w-36 text-right text-xs font-bold pr-6">Aksi Supervisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPerangkat ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                        Memuat data perangkat ajar...
                      </TableCell>
                    </TableRow>
                  ) : paginatedPerangkat.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                        Tidak ada dokumen perangkat yang cocok dengan kriteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPerangkat.map((doc, idx) => {
                      const isSelected = selectedPerangkatIds.includes(doc.id)
                      const rowNum = (pagePerangkat - 1) * pageSizePerangkat + idx + 1
                      return (
                        <TableRow key={doc.id} className={isSelected ? 'bg-fuchsia-50/30 dark:bg-fuchsia-950/20' : ''}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRowPerangkat(doc.id)}
                              className="rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-slate-500">
                            {rowNum}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {doc.teacher?.name || doc.teacher?.user?.name || '-'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP/NBM: {doc.teacher?.nip || doc.teacher?.user?.nipNbm || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1" title={doc.title}>
                              {doc.title}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-[10px] font-semibold py-0 px-1.5">
                                {doc.jenisPerangkat}
                              </Badge>
                              <span className="text-[10px] text-slate-400">
                                {doc.academicYear} ({doc.semester})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {doc.subject?.name || doc.subjectName || '-'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {doc.class?.name || doc.className || doc.fase || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {doc.status === 'TERVERIFIKASI' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                                Terverifikasi
                              </Badge>
                            ) : doc.status === 'PERLU_REVISI' ? (
                              <Badge className="bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
                                Revisi
                              </Badge>
                            ) : doc.status === 'DITOLAK' ? (
                              <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold">
                                Ditolak
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
                                Diajukan
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {doc.fileUrl && (
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-blue-600 gap-1" title="Lihat Berkas">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Buka</span>
                                  </Button>
                                </a>
                              )}
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDocForVerify(doc)
                                  setVerifyStatus(doc.status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' : 'TERVERIFIKASI')
                                  setVerifyNotes(doc.catatanVerifikasi || '')
                                  setOpenModalVerify(true)
                                }}
                                className="h-7 px-2.5 text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg shadow-xs cursor-pointer"
                              >
                                Verifikasi
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginasi Terstandar (10 / 50 / 100 per Page) Aturan #20 */}
            {!loadingPerangkat && filteredPerangkatList.length > 0 && (
              <TablePagination
                currentPage={pagePerangkat}
                pageSize={pageSizePerangkat}
                totalItems={filteredPerangkatList.length}
                onPageChange={setPagePerangkat}
                onPageSizeChange={setPageSizePerangkat}
                itemLabel="perangkat ajar"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAP KETUNTASAN GURU SEKOLAH */}
      {/* ========================================================================= */}
      {activeTab === 'rekap' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Rekapitulasi Kepatuhan Administrasi Guru
                </CardTitle>
                <CardDescription className="text-xs">
                  Capaian ketuntasan unggahan Modul Ajar, ATP, CP, dan Prota/Promes per guru pengampu.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <TableSearch
                  value={searchRekap}
                  onChange={(val) => {
                    setSearchRekap(val)
                    setPageRekap(1)
                  }}
                  placeholder="Cari nama guru / NIP..."
                  className="w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedRekap.length > 0 && selectedRekapIds.length === paginatedRekap.length}
                        onChange={(e) => handleSelectAllRekap(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Pilih Semua"
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-bold">Nama Guru Pendidik</TableHead>
                    <TableHead className="w-32 text-center text-xs font-bold">Total Berkas</TableHead>
                    <TableHead className="w-32 text-center text-xs font-bold">Terverifikasi</TableHead>
                    <TableHead className="w-40 text-center text-xs font-bold">Ketuntasan</TableHead>
                    <TableHead className="w-28 text-center text-xs font-bold pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRekap ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                        Memuat data ketuntasan guru...
                      </TableCell>
                    </TableRow>
                  ) : paginatedRekap.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-xs">
                        Tidak ada data rekapitulasi guru.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRekap.map((r, idx) => {
                      const isSelected = selectedRekapIds.includes(r.teacherId)
                      const rowNum = (pageRekap - 1) * pageSizeRekap + idx + 1
                      const pct = r.persentase || 0
                      return (
                        <TableRow key={r.teacherId} className={isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRowRekap(r.teacherId)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-slate-500">
                            {rowNum}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {r.teacherName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIP/NBM: {r.nip || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-slate-800 dark:text-slate-200">
                            {r.totalDocs || 0}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-emerald-600">
                            {r.verifiedDocs || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center pr-6">
                            {pct >= 100 ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                Tuntas
                              </Badge>
                            ) : pct > 0 ? (
                              <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 text-[10px] font-bold">
                                Berproses
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-semibold">
                                Belum
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {!loadingRekap && filteredRekapList.length > 0 && (
              <TablePagination
                currentPage={pageRekap}
                pageSize={pageSizeRekap}
                totalItems={filteredRekapList.length}
                onPageChange={setPageRekap}
                onPageSizeChange={setPageSizeRekap}
                itemLabel="guru pendidik"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STRUKTUR MATA PELAJARAN SEKOLAH */}
      {/* ========================================================================= */}
      {activeTab === 'struktur' && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 py-3.5 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Struktur Kurikulum &amp; Mata Pelajaran
                </CardTitle>
                <CardDescription className="text-xs">
                  Daftar seluruh mata pelajaran, kelompok muatan nasional/lokal, dan guru pengampu.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <TableSearch
                  value={searchMapel}
                  onChange={(val) => {
                    setSearchMapel(val)
                    setPageMapel(1)
                  }}
                  placeholder="Cari mapel / kode..."
                  className="w-full sm:w-64"
                />

                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" size="sm" className="h-9 gap-1.5 font-semibold text-xs border-slate-200 dark:border-slate-800 shrink-0">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filter</span>
                        {filterKategoriMapel !== 'ALL' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-64 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Kelompok Mapel
                    </h4>
                    <select
                      value={filterKategoriMapel}
                      onChange={(e) => {
                        setFilterKategoriMapel(e.target.value)
                        setPageMapel(1)
                      }}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                    >
                      <option value="ALL">Semua Kelompok</option>
                      <option value="WAJIB">Kelompok Umum / Wajib</option>
                      <option value="PEMINATAN">Kelompok Peminatan / Pilihan</option>
                      <option value="MUATAN_LOKAL">Muatan Lokal</option>
                      <option value="ISMUBA">Ciri Khusus ISMUBA</option>
                    </select>
                  </PopoverContent>
                </Popover>

                <Link href="/master-data/mata-pelajaran">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shrink-0 shadow-xs">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Kelola Mapel</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableHead className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedSubjects.length > 0 && selectedMapelIds.length === paginatedSubjects.length}
                        onChange={(e) => handleSelectAllMapel(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Pilih Semua"
                      />
                    </TableHead>
                    <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                    <TableHead className="w-28 text-xs font-bold">Kode</TableHead>
                    <TableHead className="min-w-[220px] text-xs font-bold">Nama Mata Pelajaran</TableHead>
                    <TableHead className="w-36 text-xs font-bold">Kelompok Muatan</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-bold pr-6">Guru Pengampu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSubjects ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs">
                        Memuat data mata pelajaran...
                      </TableCell>
                    </TableRow>
                  ) : paginatedSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs">
                        Tidak ada mata pelajaran yang terdaftar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSubjects.map((subj, idx) => {
                      const isSelected = selectedMapelIds.includes(subj.id)
                      const rowNum = (pageMapel - 1) * pageSizeMapel + idx + 1
                      const teachers = subj.teacherSubjects || []
                      return (
                        <TableRow key={subj.id} className={isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}>
                          <TableCell className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRowMapel(subj.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-center text-xs font-mono text-slate-500">
                            {rowNum}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {subj.code}
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {subj.name}
                            </div>
                            {subj.program && (
                              <div className="text-[10px] text-slate-400">
                                Program: {subj.program}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-semibold py-0 px-2">
                              {subj.category || 'WAJIB'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6">
                            {teachers.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">Belum ada pengampu</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {teachers.map((ts: any) => (
                                  <Badge
                                    key={ts.id}
                                    variant="secondary"
                                    className="text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  >
                                    {ts.teacher?.user?.name || ts.teacher?.name || 'Guru'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {!loadingSubjects && filteredSubjects.length > 0 && (
              <TablePagination
                currentPage={pageMapel}
                pageSize={pageSizeMapel}
                totalItems={filteredSubjects.length}
                onPageChange={setPageMapel}
                onPageSizeChange={setPageSizeMapel}
                itemLabel="mata pelajaran"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Tambah Kurikulum Custom */}
      <Dialog open={openModalAdd} onOpenChange={setOpenModalAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-fuchsia-600" />
              Daftarkan Kurikulum Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan format kurikulum custom yang berlaku di lingkungan sekolah.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nama Kurikulum *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Kurikulum Cambridge International"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Kode Singkatan *</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Contoh: CIE / KURNAS"
                className="text-xs h-9 uppercase font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tagline / Ciri Khas</Label>
              <Input
                value={newTagline}
                onChange={(e) => setNewTagline(e.target.value)}
                placeholder="Contoh: Standar Internasional Berbasis Evaluasi Mandiri"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Deskripsi</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Jelaskan karakteristik kurikulum ini..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenModalAdd(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCustomCurriculum}
              disabled={saveCurriculumMutation.isPending}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs h-8 font-bold"
            >
              Simpan Kurikulum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Verifikasi Dokumen Perangkat Ajar */}
      <Dialog open={openModalVerify} onOpenChange={setOpenModalVerify}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verifikasi Perangkat Pembelajaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan hasil supervisi untuk dokumen <strong>{selectedDocForVerify?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <p>
                <strong>Guru:</strong> {selectedDocForVerify?.teacher?.name || selectedDocForVerify?.teacher?.user?.name || '-'}
              </p>
              <p>
                <strong>Mapel / Kelas:</strong> {selectedDocForVerify?.subject?.name || selectedDocForVerify?.subjectName || '-'} (
                {selectedDocForVerify?.class?.name || selectedDocForVerify?.className || selectedDocForVerify?.fase || '-'})
              </p>
              <p>
                <strong>Jenis Perangkat:</strong> {selectedDocForVerify?.jenisPerangkat}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Keputusan Verifikasi *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={verifyStatus === 'TERVERIFIKASI' ? 'default' : 'outline'}
                  onClick={() => setVerifyStatus('TERVERIFIKASI')}
                  className={`text-xs h-8 font-bold cursor-pointer ${
                    verifyStatus === 'TERVERIFIKASI'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Sah / Diterima
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={verifyStatus === 'PERLU_REVISI' ? 'default' : 'outline'}
                  onClick={() => setVerifyStatus('PERLU_REVISI')}
                  className={`text-xs h-8 font-bold cursor-pointer ${
                    verifyStatus === 'PERLU_REVISI'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Perlu Revisi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={verifyStatus === 'DITOLAK' ? 'default' : 'outline'}
                  onClick={() => setVerifyStatus('DITOLAK')}
                  className={`text-xs h-8 font-bold cursor-pointer ${
                    verifyStatus === 'DITOLAK'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  Ditolak
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Catatan Evaluasi / Rekomendasi Supervisi</Label>
              <Textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Tuliskan catatan perbaikan atau rekomendasi untuk guru..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenModalVerify(false)}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={verifyMutation.isPending}
              onClick={() => {
                if (!selectedDocForVerify) return
                verifyMutation.mutate({
                  id: selectedDocForVerify.id,
                  status: verifyStatus,
                  catatanVerifikasi: verifyNotes,
                })
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-bold cursor-pointer"
            >
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
