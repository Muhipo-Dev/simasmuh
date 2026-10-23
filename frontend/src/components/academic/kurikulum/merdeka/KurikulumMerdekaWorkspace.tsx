'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sparkles, Copy, Calendar, BookOpen, 
  FileText, Plus, Download, CheckCircle2, 
  Trash2, Edit3, ArrowRight, Layers, FileDown, 
  Smartphone, UserCheck, RefreshCw, Eye, Archive, RotateCcw
} from 'lucide-react'
import Swal from 'sweetalert2'
import { PromesMatrixView } from './PromesMatrixView'
import { DailyClassTeachingQuickView } from './DailyClassTeachingQuickView'

export function KurikulumMerdekaWorkspace() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // Tab internal: Setup & Rombel, CP & ATP, Promes (Visual Grid), Generator Dokumen, Penilaian Harian
  const [activeSubTab, setActiveSubTab] = useState<'setup' | 'atp' | 'promes' | 'generator' | 'harian'>('setup')
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null)

  // Dialog States
  const [openSetupModal, setOpenSetupModal] = useState(false)
  const [openCloneModal, setOpenCloneModal] = useState(false)
  const [openTpModal, setOpenTpModal] = useState(false)
  const [openWizardJenjangModal, setOpenWizardJenjangModal] = useState(false)
  const [openDailyViewModal, setOpenDailyViewModal] = useState(false)
  const [openArchiveModal, setOpenArchiveModal] = useState(false)
  const [selectedArchiveForReuse, setSelectedArchiveForReuse] = useState<any>(null)
  const [reuseTargetClassId, setReuseTargetClassId] = useState<string>('')
  const [isReusingArchive, setIsReusingArchive] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  // Wizard Auto-Isi per Jenjang Kelas State
  const [wizardGradeLevel, setWizardGradeLevel] = useState<number>(10)
  const [wizardSubjectId, setWizardSubjectId] = useState<string>('')
  const [wizardFase, setWizardFase] = useState<string>('FASE_E')
  const [wizardTargetClassIds, setWizardTargetClassIds] = useState<string[]>([])
  const [wizardTpRows, setWizardTpRows] = useState<Array<{
    kodeTp: string
    lingkupMateri: string
    materiPokok: string
    deskripsiTp: string
    alokasiJp: number
  }>>([
    { kodeTp: 'TP 1', lingkupMateri: '', materiPokok: '', deskripsiTp: '', alokasiJp: 2 },
    { kodeTp: 'TP 2', lingkupMateri: '', materiPokok: '', deskripsiTp: '', alokasiJp: 2 },
  ])
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false)

  // Form Setup State
  const [setupClassId, setSetupClassId] = useState('')
  const [setupSubjectId, setSetupSubjectId] = useState('')
  const [setupFase, setSetupFase] = useState('FASE_E')
  const [setupTotalJp, setSetupTotalJp] = useState(36)
  const [setupJpPerMinggu, setSetupJpPerMinggu] = useState(2)

  // Form Clone State
  const [targetClassIds, setTargetClassIds] = useState<string[]>([])

  // Form TP State
  const [tpKode, setTpKode] = useState('TP 1')
  const [tpMateri, setTpMateri] = useState('')
  const [tpTopik, setTpTopik] = useState('')
  const [tpDeskripsi, setTpDeskripsi] = useState('')
  const [tpJp, setTpJp] = useState(4)

  // 1. Fetch Konteks Guru (Kelas yang diampu, mapel, & list perangkat kurikulum)
  const { data: guruContext, isLoading: loadingContext, refetch: refetchContext } = useQuery({
    queryKey: ['kurikulum-merdeka-guru-context'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/guru-context')
      if (!res.ok) throw new Error('Gagal memuat konteks penugasan guru')
      return res.json()
    },
  })

  const perangkatList = guruContext?.perangkatList || []
  const archivePerangkatList = guruContext?.archivePerangkatList || []
  const assignedClasses = guruContext?.assignedClasses || []
  const assignedSubjects = guruContext?.assignedSubjects || []
  const schedulePairings: any[] = guruContext?.schedulePairings || []

  // Auto select perangkat pertama jika ada
  React.useEffect(() => {
    if (!selectedPerangkatId && perangkatList.length > 0) {
      setSelectedPerangkatId(perangkatList[0].id)
    }
  }, [perangkatList, selectedPerangkatId])

  // Handle Gunakan Kembali (Reuse) Perangkat dari Arsip Tahun Lalu
  const handleReuseArchive = async () => {
    if (!selectedArchiveForReuse || !reuseTargetClassId) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Kelas Tujuan',
        text: 'Silakan tentukan kelas tujuan di tahun ajaran aktif untuk menerapkan perangkat arsip ini.',
      })
      return
    }

    setIsReusingArchive(true)
    try {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/reuse-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archivePerangkatId: selectedArchiveForReuse.id,
          targetClassId: reuseTargetClassId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal memulihkan perangkat dari arsip')
      }

      const data = await res.json()
      Swal.fire({
        icon: 'success',
        title: 'Perangkat Berhasil Dipulihkan!',
        text: data.message || 'Perangkat pembelajaran telah siap digunakan di tahun ajaran aktif.',
        timer: 2000,
        showConfirmButton: false,
      })

      setOpenArchiveModal(false)
      setSelectedArchiveForReuse(null)
      await refetchContext()
      if (data.perangkat?.id) {
        setSelectedPerangkatId(data.perangkat.id)
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsReusingArchive(false)
    }
  }

  // Hitung berapa pairing jadwal resmi yang belum di-setup
  const unconfiguredPairings = useMemo(() => {
    return schedulePairings.filter((p) => !p.isConfigured)
  }, [schedulePairings])

  // Ketika modal setup dibuka, jika ada jadwal resmi, otomatis pre-fill opsi pertama
  useEffect(() => {
    if (openSetupModal && !setupClassId && schedulePairings.length > 0) {
      const candidate = unconfiguredPairings[0] || schedulePairings[0]
      if (candidate) {
        setSetupClassId(candidate.classId)
        setSetupSubjectId(candidate.subjectId)
        setSetupFase(candidate.fase || (candidate.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
        setSetupJpPerMinggu(candidate.totalJpPerMinggu || 2)
        setSetupTotalJp((candidate.totalJpPerMinggu || 2) * 18)
      }
    }
  }, [openSetupModal, schedulePairings, unconfiguredPairings, setupClassId])

  // Ketika Kelas dipilih di Setup Modal, sinkronkan otomatis Mata Pelajaran, Fase, dan JP per Minggu dari Jadwal Resmi
  const handleSelectSetupClass = (classId: string) => {
    setSetupClassId(classId)
    if (!classId) return

    // Cari pairing jadwal untuk kelas ini
    const matches = schedulePairings.filter((p) => p.classId === classId)
    if (matches.length > 0) {
      const firstMatch = matches[0]
      setSetupSubjectId(firstMatch.subjectId)
      setSetupFase(firstMatch.fase || (firstMatch.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
      const jp = firstMatch.totalJpPerMinggu || 2
      setSetupJpPerMinggu(jp)
      setSetupTotalJp(jp * 18)
    } else {
      // Fallback: deteksi fase dari grade level kelas jika ada
      const cls = assignedClasses.find((c: any) => c.id === classId)
      if (cls) {
        const autoFase = cls.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'
        setSetupFase(autoFase)
      }
    }
  }

  // Ketika Mata Pelajaran dipilih di Setup Modal, sinkronkan JP jika ada pairing spesifik
  const handleSelectSetupSubject = (subjectId: string) => {
    setSetupSubjectId(subjectId)
    if (setupClassId && subjectId) {
      const pair = schedulePairings.find((p) => p.classId === setupClassId && p.subjectId === subjectId)
      if (pair) {
        setSetupFase(pair.fase || (pair.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
        const jp = pair.totalJpPerMinggu || 2
        setSetupJpPerMinggu(jp)
        setSetupTotalJp(jp * 18)
      }
    }
  }

  // Handle Sinkronisasi Otomatis 1-Klik dari Jadwal Resmi Kurikulum & Admin TU
  const [syncingSchedules, setSyncingSchedules] = useState(false)
  const handleAutoSyncFromSchedules = async () => {
    setSyncingSchedules(true)
    try {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/auto-sync-schedules', {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal sinkronisasi dari jadwal.')
      }
      const data = await res.json()
      await refetchContext()
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Jadwal Berhasil!',
        text: data.message || 'Semua rombel dan mata pelajaran dari jadwal resmi telah otomatis disiapkan.',
        confirmButtonColor: '#2563eb',
      })
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: e.message || 'Terjadi kesalahan sistem.',
      })
    } finally {
      setSyncingSchedules(false)
    }
  }

  // 2. Fetch Detail Perangkat Aktif Terpilih
  const { data: activePerangkat, isLoading: loadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['kurikulum-merdeka-detail', selectedPerangkatId],
    queryFn: async () => {
      if (!selectedPerangkatId) return null
      const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/perangkat/${selectedPerangkatId}`)
      if (!res.ok) throw new Error('Gagal memuat detail perangkat')
      return res.json()
    },
    enabled: !!selectedPerangkatId,
  })

  // 3. Fetch Master Capaian Pembelajaran (CP)
  const { data: cpList } = useQuery({
    queryKey: ['capaian-pembelajaran-list', activePerangkat?.fase],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/capaian-pembelajaran?fase=${activePerangkat?.fase || 'FASE_E'}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!activePerangkat,
  })

  // 4. Fetch Daily Class View jika modal quick view dibuka
  const { data: dailyViewData, isLoading: loadingDailyView } = useQuery({
    queryKey: ['daily-view-data', selectedScheduleId],
    queryFn: async () => {
      if (!selectedScheduleId) return null
      const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/daily-view?scheduleId=${selectedScheduleId}`)
      if (!res.ok) throw new Error('Gagal memuat tampilan harian kelas')
      return res.json()
    },
    enabled: !!selectedScheduleId && openDailyViewModal,
  })

  // Handle Buat Setup Kelas Baru
  const handleCreateSetup = async () => {
    if (!setupClassId || !setupSubjectId) {
      Swal.fire({ icon: 'warning', title: 'Pilih Kelas & Mapel', text: 'Silakan pilih kelas dan mata pelajaran yang diampu' })
      return
    }

    try {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: setupClassId,
          subjectId: setupSubjectId,
          fase: setupFase,
          totalJpSemester: Number(setupTotalJp),
          jpPerMinggu: Number(setupJpPerMinggu),
        }),
      })

      if (!res.ok) throw new Error('Gagal membuat setup perangkat')
      const created = await res.json()

      Swal.fire({
        icon: 'success',
        title: 'Setup Berhasil Dibuat',
        text: 'Administrasi kelas telah terdaftar. Anda dapat menyusun ATP, Promes, dan dokumen ajar.',
        timer: 1800,
        showConfirmButton: false,
      })

      setOpenSetupModal(false)
      refetchContext()
      setSelectedPerangkatId(created.id)
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Duplikasi / Cloning Rombel Paralel (Single-Input Multi-Output)
  const handleCloneParallel = async () => {
    if (!selectedPerangkatId || targetClassIds.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Pilih Rombel Target', text: 'Centang minimal satu kelas paralel tujuan cloning' })
      return
    }

    try {
      const res = await authenticatedFetch('/api/kurikulum-merdeka/clone-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePerangkatId: selectedPerangkatId,
          targetClassIds,
        }),
      })

      if (!res.ok) throw new Error('Gagal menduplikasi rombel paralel')
      const data = await res.json()

      Swal.fire({
        icon: 'success',
        title: 'Duplikasi Selesai',
        text: data.message || `Seluruh perangkat ajar, ATP, dan matriks Promes berhasil disalin ke rombel paralel.`,
      })

      setOpenCloneModal(false)
      setTargetClassIds([])
      refetchContext()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Tambah Tujuan Pembelajaran (TP)
  const handleCreateTp = async () => {
    if (!selectedPerangkatId || !tpMateri || !tpDeskripsi) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi Data', text: 'Isi kode TP, lingkup materi, dan deskripsi tujuan pembelajaran' })
      return
    }

    try {
      const res = await authenticatedFetch('/api/kurikulum-merdeka/tujuan-pembelajaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: selectedPerangkatId,
          kodeTp: tpKode,
          lingkupMateri: tpMateri,
          materiPokok: tpTopik || tpMateri,
          deskripsiTp: tpDeskripsi,
          alokasiJp: Number(tpJp),
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan Tujuan Pembelajaran')

      Swal.fire({
        icon: 'success',
        title: 'TP Berhasil Ditambahkan',
        timer: 1500,
        showConfirmButton: false,
      })

      setOpenTpModal(false)
      setTpMateri('')
      setTpTopik('')
      setTpDeskripsi('')
      refetchDetail()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Submit Wizard Auto-Isi CP & ATP per Jenjang Kelas
  const handleWizardSubmit = async () => {
    if (!wizardSubjectId) {
      Swal.fire({ icon: 'warning', title: 'Pilih Mata Pelajaran', text: 'Pilih mata pelajaran yang akan diisi CP & ATP-nya.' })
      return
    }

    const validTpRows = wizardTpRows.filter(r => r.lingkupMateri.trim() && r.deskripsiTp.trim())
    if (validTpRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Isi Butir TP', text: 'Minimal isi 1 butir Tujuan Pembelajaran (lingkup materi dan deskripsi rumusan TP).' })
      return
    }

    setIsSubmittingWizard(true)
    try {
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/wizard-jenjang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: Number(wizardGradeLevel),
          subjectId: wizardSubjectId,
          fase: wizardFase,
          tujuanPembelajarans: validTpRows,
          targetClassIds: wizardTargetClassIds.length > 0 ? wizardTargetClassIds : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal memproses Wizard Jenjang')
      }

      const data = await res.json()
      Swal.fire({
        icon: 'success',
        title: 'Wizard Berhasil Diterapkan!',
        text: data.message || `CP & ATP telah otomatis terdistribusi ke seluruh kelas di jenjang ${wizardGradeLevel}.`,
        confirmButtonColor: '#2563eb',
      })

      setOpenWizardJenjangModal(false)
      await refetchContext()
      if (selectedPerangkatId) {
        await refetchDetail()
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsSubmittingWizard(false)
    }
  }

  // Handle Generate Dokumen Otomatis (Modul Ajar, LKPD, Soal)
  const handleGenerateDoc = async (kategori: string, tpId?: string, judul?: string) => {
    if (!selectedPerangkatId) return

    try {
      const res = await authenticatedFetch('/api/kurikulum-merdeka/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: selectedPerangkatId,
          tpId,
          kategori,
          judul: judul || `Dokumen ${kategori.replace(/_/g, ' ')}`,
        }),
      })

      if (!res.ok) throw new Error('Gagal men-generate dokumen')

      Swal.fire({
        icon: 'success',
        title: 'Dokumen Ter-generate',
        text: 'Perangkat pembelajaran berbasis TP telah berhasil dibuat secara otomatis.',
        timer: 1800,
        showConfirmButton: false,
      })

      refetchDetail()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Download Word .docx Format Sekolah
  const handleDownloadDocx = (kategori: string, tpId?: string) => {
    if (!selectedPerangkatId) return
    const url = `/api/kurikulum-merdeka/export/docx?perangkatKurikulumId=${selectedPerangkatId}&kategori=${kategori}${tpId ? `&tpId=${tpId}` : ''}`
    window.open(url, '_blank')
  }

  // Handle Download Paket Siap Supervisi (.zip)
  const handleDownloadSupervisiZip = () => {
    if (!selectedPerangkatId) return
    const url = `/api/kurikulum-merdeka/export/supervisi-zip?perangkatKurikulumId=${selectedPerangkatId}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* 1. Baris Pilih Perangkat Aktif & Tombol Operasional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-card rounded-xl border border-border shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-foreground shrink-0 border border-border">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Perangkat Ajar Aktif
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {perangkatList.length > 0 ? (
                <select
                  value={selectedPerangkatId || ''}
                  onChange={(e) => setSelectedPerangkatId(e.target.value)}
                  className="font-bold text-sm bg-transparent border-b border-primary/40 focus:outline-hidden pb-0.5 cursor-pointer text-foreground"
                >
                  {perangkatList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.class.name} • {p.subject.name} ({p.semester} {p.academicYear})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-semibold text-muted-foreground">Belum ada setup kelas</span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Aksi Kanan */}
        <div className="flex flex-wrap items-center gap-2">
          {unconfiguredPairings.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoSyncFromSchedules}
              disabled={syncingSchedules}
              className="h-8 gap-1.5 text-xs font-semibold border-blue-200 dark:border-blue-900 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              title="Sinkronkan seluruh rombel & mata pelajaran langsung dari jadwal KBM resmi"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSchedules ? 'animate-spin' : ''}`} />
              Sinkron Jadwal ({unconfiguredPairings.length})
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setOpenSetupModal(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Setup Kelas
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenArchiveModal(true)}
            className="h-8 gap-1.5 text-xs font-medium border-border"
            title="Buka halaman arsip administrasi tahun ajaran lampau untuk digunakan kembali"
          >
            <Archive className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Arsip</span>
            {archivePerangkatList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-muted text-foreground text-[10px] font-mono font-bold">
                {archivePerangkatList.length}
              </span>
            )}
          </Button>

          {activePerangkat && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpenCloneModal(true)}
                className="h-8 gap-1.5 text-xs font-medium border-border"
                title="Salin seluruh administrasi ke kelas paralel (X 2, X 3, dll.)"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                Sync Paralel
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadSupervisiZip}
                className="h-8 gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title="Unduh 1 bundel file zip berisi seluruh dokumen siap supervisi"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                Paket Supervisi (.zip)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Ringkasan Kelengkapan Berkas Administrasi */}
      {activePerangkat && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { title: 'Tujuan Pembelajaran', count: `${activePerangkat.tujuanPembelajarans?.length || 0} TP`, isReady: (activePerangkat.tujuanPembelajarans?.length || 0) > 0 },
            { title: 'Alokasi Promes', count: `${activePerangkat.promesAllocations?.length || 0} Plot`, isReady: (activePerangkat.promesAllocations?.length || 0) > 0 },
            { title: 'Modul Ajar / RPP', count: `${activePerangkat.dokumenItems?.filter((d: any) => d.kategori === 'MODUL_AJAR').length || 0} Berkas`, isReady: activePerangkat.dokumenItems?.some((d: any) => d.kategori === 'MODUL_AJAR') },
            { title: 'LKPD Siswa', count: `${activePerangkat.dokumenItems?.filter((d: any) => d.kategori === 'LKPD').length || 0} Lembar`, isReady: activePerangkat.dokumenItems?.some((d: any) => d.kategori === 'LKPD') },
            { title: 'Asesmen & Kisi', count: `${activePerangkat.dokumenItems?.filter((d: any) => ['ASESMEN_SUMATIF', 'SOAL_STS', 'SOAL_SAS'].includes(d.kategori)).length || 0} Set`, isReady: activePerangkat.dokumenItems?.some((d: any) => d.kategori.includes('SOAL')) },
            { title: 'Nilai Terinput', count: `${activePerangkat.nilaiSiswaTps?.length || 0} Siswa`, isReady: (activePerangkat.nilaiSiswaTps?.length || 0) > 0 },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-card rounded-xl border border-border shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-muted-foreground truncate">{item.title}</span>
                <span className={`w-2 h-2 rounded-full ${item.isReady ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} title={item.isReady ? 'Lengkap' : 'Belum'} />
              </div>
              <p className="text-sm font-bold text-foreground">{item.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3. Tab Kerja Utama */}
      {activePerangkat ? (
        <div className="space-y-4">
          <div className="flex border-b border-border gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            {[
              { id: 'atp', label: '1. Manajemen CP & ATP', icon: BookOpen },
              { id: 'promes', label: '2. Matriks Promes & Prota', icon: Calendar },
              { id: 'generator', label: '3. Generator Perangkat & Soal', icon: FileText },
              { id: 'harian', label: '4. Quick View KBM Harian (Mobile)', icon: Smartphone },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`pb-2.5 px-3.5 font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: MANAJEMEN CP & ATP */}
          {activeSubTab === 'atp' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <div>
                  <h4 className="text-sm font-semibold">Alur Tujuan Pembelajaran (ATP) - Kelas {activePerangkat.class.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    Total {activePerangkat.tujuanPembelajarans?.length || 0} butir TP tersusun untuk mata pelajaran {activePerangkat.subject.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (activePerangkat) {
                        setWizardGradeLevel(activePerangkat.class.gradeLevel || 10)
                        setWizardSubjectId(activePerangkat.subjectId)
                        setWizardFase(activePerangkat.fase || (activePerangkat.class.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
                      }
                      setOpenWizardJenjangModal(true)
                    }}
                    className="h-8 gap-1.5 text-xs font-semibold border-blue-200 dark:border-blue-900 bg-blue-50/60 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    title="Isi CP & butir TP sekali untuk seluruh rombel kelas di jenjang ini"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Wizard Auto-Isi Jenjang
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('ATP')}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh ATP (.docx)
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setOpenTpModal(true)}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Butir TP
                  </Button>
                </div>
              </div>

              {/* Tabel Butir TP */}
              <div className="rounded-md border border-border overflow-x-auto bg-card">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center font-bold">No</TableHead>
                      <TableHead className="w-20 text-center font-bold">Kode TP</TableHead>
                      <TableHead className="w-44 font-bold">Lingkup Materi</TableHead>
                      <TableHead className="min-w-[240px] font-bold">Rumusan Tujuan Pembelajaran (ABCD)</TableHead>
                      <TableHead className="w-20 text-center font-bold">Alokasi</TableHead>
                      <TableHead className="w-36 text-center font-bold">Aksi Generator</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePerangkat.tujuanPembelajarans?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          Belum ada Tujuan Pembelajaran yang ditambahkan. Klik tombol "Tambah Butir TP" untuk memulai.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activePerangkat.tujuanPembelajarans.map((tp: any, idx: number) => (
                        <TableRow key={tp.id} className="hover:bg-muted/30">
                          <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                          <TableCell className="text-center font-mono font-bold text-primary">
                            {tp.kodeTp}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {tp.lingkupMateri}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tp.deskripsiTp}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-foreground">
                            {tp.alokasiJp} JP
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateDoc('MODUL_AJAR', tp.id, `Modul Ajar ${tp.lingkupMateri}`)}
                                className="h-7 px-2 text-[10px] font-medium text-primary hover:bg-primary/10"
                                title="Generate Modul Ajar"
                              >
                                + Modul
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateDoc('LKPD', tp.id, `LKPD ${tp.lingkupMateri}`)}
                                className="h-7 px-2 text-[10px] font-medium text-emerald-600 hover:bg-emerald-500/10"
                                title="Generate LKPD"
                              >
                                + LKPD
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateDoc('SOAL_HARIAN', tp.id, `Soal Harian ${tp.lingkupMateri}`)}
                                className="h-7 px-2 text-[10px] font-medium text-amber-600 hover:bg-amber-500/10"
                                title="Generate Soal Kuis"
                              >
                                + Soal
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* TAB 2: MATRIKS PROMES & PROTA */}
          {activeSubTab === 'promes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Program Semester & Program Tahunan</h4>
                  <p className="text-xs text-muted-foreground">
                    Atur plot alokasi minggu efektif untuk kalkulasi otomatis dokumen Prota & Promes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('PROTA')}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Prota (.docx)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('PROMES')}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Promes (.docx)
                  </Button>
                </div>
              </div>

              {/* Visual Grid Matriks */}
              <PromesMatrixView
                perangkat={activePerangkat}
                onSaveSuccess={() => refetchDetail()}
              />
            </div>
          )}

          {/* TAB 3: GENERATOR DOKUMEN & SOAL */}
          {activeSubTab === 'generator' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <div>
                  <h4 className="text-sm font-semibold">Dokumen Perangkat Ajar & Paket Asesmen</h4>
                  <p className="text-xs text-muted-foreground">
                    Modul Ajar, LKPD, serta Soal Ujian (Kisi-kisi, Kunci Jawaban & Lembar Siswa)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleGenerateDoc('SOAL_STS', undefined, `Paket Soal STS ${activePerangkat.subject.name}`)}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Paket STS
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateDoc('SOAL_SAS', undefined, `Paket Soal SAS ${activePerangkat.subject.name}`)}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Paket SAS
                  </Button>
                </div>
              </div>

              {/* Grid Dokumen Siap Pakai */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePerangkat.dokumenItems?.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground text-xs bg-card rounded-lg border border-border">
                    Belum ada dokumen ter-generate. Silakan generate dokumen dari tab Manajemen ATP atau klik tombol di atas.
                  </div>
                ) : (
                  activePerangkat.dokumenItems.map((doc: any) => (
                    <div key={doc.id} className="p-4 bg-card rounded-xl border border-border shadow-2xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-[10px] font-mono mb-1">
                            {doc.kategori}
                          </Badge>
                          <h5 className="font-bold text-sm text-foreground truncate" title={doc.judul}>
                            {doc.judul}
                          </h5>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold shrink-0">
                          Siap
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground line-clamp-2">
                        Tersedia komponen lengkap: RPP/KBM, LKPD, kisi-kisi, kunci jawaban, dan lembar siswa.
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadDocx(doc.kategori, doc.tpId)}
                          className="h-8 text-xs font-medium gap-1 text-primary hover:bg-primary/10"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh Word (.docx)
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: QUICK VIEW KBM HARIAN */}
          {activeSubTab === 'harian' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">Tampilan Cepat Guru di Kelas (Mobile Quick View)</h4>
                  <p className="text-xs text-muted-foreground">
                    Optimal untuk penggunaan saat KBM di kelas dengan HP/Tablet: Presensi, Jurnal Mengajar, dan Nilai TP
                  </p>
                </div>
              </div>

              {/* Tampilkan komponen DailyClassTeachingQuickView langsung */}
              <Card className="border border-border shadow-xs">
                <CardContent className="p-4">
                  <DailyClassTeachingQuickView
                    scheduleId={activePerangkat.id}
                    initialData={{
                      perangkat: activePerangkat,
                      students: activePerangkat.class?.students || [],
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <h4 className="font-bold text-sm text-foreground">Belum Ada Setup Kelas Aktif</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Klik tombol di bawah untuk membuat konfigurasi kelas dan mata pelajaran yang Anda ampu semester ini.
          </p>
          <Button
            size="sm"
            onClick={() => setOpenSetupModal(true)}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat Setup Kelas Baru
          </Button>
        </div>
      )}

      {/* DIALOG 1: SETUP KELAS BARU */}
      <Dialog open={openSetupModal} onOpenChange={setOpenSetupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Setup Kelas Baru</span>
              {schedulePairings.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 border-blue-200">
                  Sinkron Jadwal KBM
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih rombel dan mata pelajaran penugasan Anda. Data otomatis menyesuaikan jadwal resmi yang diset Kurikulum/TU.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Kelas / Rombel:</label>
              <select
                value={setupClassId}
                onChange={(e) => handleSelectSetupClass(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
              >
                <option value="">-- Pilih Kelas --</option>
                {assignedClasses.map((c: any) => {
                  const hasSchedule = schedulePairings.some((p) => p.classId === c.id)
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tingkat {c.gradeLevel}) {hasSchedule ? '• Ada Jadwal KBM' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Mata Pelajaran:</label>
              <select
                value={setupSubjectId}
                onChange={(e) => handleSelectSetupSubject(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {assignedSubjects.map((s: any) => {
                  const matchPair = schedulePairings.find((p) => p.classId === setupClassId && p.subjectId === s.id)
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) {matchPair ? `• ${matchPair.totalJpPerMinggu} JP/minggu (Jadwal)` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Fase:</label>
                <select
                  value={setupFase}
                  onChange={(e) => setSetupFase(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
                >
                  <option value="FASE_E">Fase E (Kelas X)</option>
                  <option value="FASE_F">Fase F (Kelas XI - XII)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">JP per Minggu:</label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={setupJpPerMinggu}
                  onChange={(e) => {
                    const jp = Number(e.target.value)
                    setSetupJpPerMinggu(jp)
                    setSetupTotalJp(jp * 18)
                  }}
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
              💡 <strong>Total Alokasi Semester:</strong> {setupTotalJp} JP (18 minggu efektif). Terhubung langsung dengan presensi harian dan e-rapor internal.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenSetupModal(false)} className="h-8 text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateSetup} className="h-8 text-xs font-semibold shadow-xs">
              Simpan & Aktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: CLONING ROMBEL PARALEL */}
      <Dialog open={openCloneModal} onOpenChange={setOpenCloneModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Sync / Clone Rombel Paralel</DialogTitle>
            <DialogDescription className="text-xs">
              Salin seluruh Tujuan Pembelajaran (ATP), matriks Promes, dan dokumen ajar dari kelas{' '}
              <strong className="text-foreground">{activePerangkat?.class?.name}</strong> ke kelas paralel lainnya dalam 1 klik.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Pilih Kelas Target:</p>
            <div className="max-h-56 overflow-y-auto space-y-2 border border-border rounded-lg p-2.5">
              {assignedClasses
                .filter((c: any) => c.id !== activePerangkat?.classId)
                .map((cls: any) => {
                  const isChecked = targetClassIds.includes(cls.id)
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTargetClassIds((prev) => [...prev, cls.id])
                          } else {
                            setTargetClassIds((prev) => prev.filter((id) => id !== cls.id))
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span className="font-bold text-foreground">{cls.name}</span>
                      <span className="text-muted-foreground text-[11px]">(Tingkat {cls.gradeLevel})</span>
                    </label>
                  )
                })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCloneModal(false)} className="h-8 text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleCloneParallel} className="h-8 text-xs font-semibold shadow-xs">
              Duplikasi Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: TAMBAH BUTIR TP */}
      <Dialog open={openTpModal} onOpenChange={setOpenTpModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Butir Tujuan Pembelajaran (TP)</DialogTitle>
            <DialogDescription className="text-xs">
              Rumuskan tujuan pembelajaran sesuai capaian kompetensi dan alokasi JP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Kode TP:</label>
                <Input
                  value={tpKode}
                  onChange={(e) => setTpKode(e.target.value)}
                  placeholder="TP 1"
                  className="text-xs h-9 font-mono font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Alokasi Waktu (JP):</label>
                <Input
                  type="number"
                  value={tpJp}
                  onChange={(e) => setTpJp(Number(e.target.value))}
                  placeholder="4"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Lingkup Materi / Elemen:</label>
              <Input
                value={tpMateri}
                onChange={(e) => setTpMateri(e.target.value)}
                placeholder="Contoh: Algoritma dan Struktur Data"
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Topik Pokok:</label>
              <Input
                value={tpTopik}
                onChange={(e) => setTpTopik(e.target.value)}
                placeholder="Contoh: Logika Percabangan Kompleks"
                className="text-xs h-9"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Rumusan Tujuan Pembelajaran (ABCD):</label>
              <Textarea
                value={tpDeskripsi}
                onChange={(e) => setTpDeskripsi(e.target.value)}
                placeholder="Peserta didik mampu menganalisis dan menerapkan struktur algoritma secara kritis..."
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenTpModal(false)} className="h-8 text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateTp} className="h-8 text-xs font-semibold shadow-xs">
              Simpan TP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: ARSIP PERANGKAT PEMBELAJARAN GURU (TAHUN AJARAN LAMPAU) */}
      <Dialog open={openArchiveModal} onOpenChange={setOpenArchiveModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500" />
              Arsip Administrasi &amp; Perangkat Pembelajaran Guru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masa berlaku administrasi CP, ATP, dan TP adalah <strong>1 tahun pelajaran</strong>. Ketika sekolah memasuki tahun pelajaran baru, seluruh perangkat tahun sebelumnya otomatis diarsipkan ke halaman ini dan dapat digunakan kembali (di-reuse/di-restore) dalam 1 klik.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {archivePerangkatList.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl border-border bg-muted/20">
                <Archive className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-semibold text-foreground">Belum Ada Arsip Tahun Ajaran Lampau</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Ketika sekolah berganti tahun ajaran baru, semua perangkat pembelajaran tahun sebelumnya otomatis terarsip ke halaman ini secara aman.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivePerangkatList.map((item: any) => {
                  const isSelectedForReuse = selectedArchiveForReuse?.id === item.id
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelectedForReuse
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border bg-card hover:border-border/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {item.class?.name} • {item.subject?.name}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800">
                              {item.academicYear} ({item.semester})
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              Fase {item.fase}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Kelengkapan: <strong>{item._count?.tujuanPembelajarans || 0} Butir TP</strong> •{' '}
                            <strong>{item._count?.promesAllocations || 0} Plot Promes</strong> •{' '}
                            <strong>{item._count?.dokumenItems || 0} Modul/Dokumen</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={isSelectedForReuse ? 'default' : 'outline'}
                            onClick={() => {
                              if (isSelectedForReuse) {
                                setSelectedArchiveForReuse(null)
                                setReuseTargetClassId('')
                              } else {
                                setSelectedArchiveForReuse(item)
                                // Pre-select kelas aktif pertama dengan grade sejenis jika ada
                                const matchingClass = assignedClasses.find((c: any) => c.gradeLevel === item.class?.gradeLevel)
                                setReuseTargetClassId(matchingClass?.id || (assignedClasses.length > 0 ? assignedClasses[0].id : ''))
                              }
                            }}
                            className="h-8 gap-1.5 text-xs font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isSelectedForReuse ? 'Batal Pilih' : 'Gunakan Kembali'}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Panel Konfirmasi Reuse */}
                      {isSelectedForReuse && (
                        <div className="mt-3 pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-lg">
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-xs font-semibold text-foreground shrink-0">
                              Terapkan ke Kelas Aktif:
                            </label>
                            <select
                              value={reuseTargetClassId}
                              onChange={(e) => setReuseTargetClassId(e.target.value)}
                              className="text-xs font-bold bg-card border border-border rounded-md px-2 py-1.5 text-foreground flex-1 max-w-xs focus:outline-hidden"
                            >
                              <option value="">-- Pilih Kelas Aktif --</option>
                              {assignedClasses.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (Tingkat {c.gradeLevel})
                                </option>
                              ))}
                            </select>
                          </div>

                          <Button
                            size="sm"
                            onClick={handleReuseArchive}
                            disabled={!reuseTargetClassId || isReusingArchive}
                            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isReusingArchive ? 'Memproses...' : 'Terapkan di Tahun Ajaran Aktif'}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenArchiveModal(false)} className="h-8 text-xs">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: WIZARD AUTO-ISI CP & ATP PER JENJANG KELAS */}
      <Dialog open={openWizardJenjangModal} onOpenChange={setOpenWizardJenjangModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Wizard Auto-Isi Manajemen CP &amp; ATP per Jenjang Kelas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rumuskan Capaian Pembelajaran (CP) dan butir Alur Tujuan Pembelajaran (ATP) cukup <strong>sekali di awal per jenjang</strong>. Sistem akan otomatis mendistribusikan dan mengintegrasikannya ke seluruh rombel kelas paralel di jenjang tersebut.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Header Konfigurasi Jenjang & Mapel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Jenjang Kelas:</label>
                <select
                  value={wizardGradeLevel}
                  onChange={(e) => {
                    const gl = Number(e.target.value)
                    setWizardGradeLevel(gl)
                    setWizardFase(gl === 10 ? 'FASE_E' : 'FASE_F')
                    setWizardTargetClassIds([])
                  }}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-bold"
                >
                  <option value={10}>Kelas X (Sepuluh) • Fase E</option>
                  <option value={11}>Kelas XI (Sebelas) • Fase F</option>
                  <option value={12}>Kelas XII (Dua Belas) • Fase F</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Mata Pelajaran:</label>
                <select
                  value={wizardSubjectId}
                  onChange={(e) => setWizardSubjectId(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-semibold"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {assignedSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Fase Kurikulum:</label>
                <div className="flex items-center h-9 px-3 text-xs font-mono font-bold bg-muted/60 rounded-md border border-border text-foreground">
                  {wizardFase === 'FASE_E' ? 'Fase E (Fondasi SMA)' : 'Fase F (Lanjutan SMA)'}
                </div>
              </div>
            </div>

            {/* Target Distribusi Rombel Paralel */}
            <div className="p-3 bg-card rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Rombel Target di Jenjang Kelas {wizardGradeLevel === 10 ? 'X' : wizardGradeLevel === 11 ? 'XI' : 'XII'}:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Otomatis terdistribusi ke seluruh rombel yang diajar
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedClasses
                  .filter((c: any) => c.gradeLevel === wizardGradeLevel)
                  .map((cls: any) => {
                    const isSelected = wizardTargetClassIds.length === 0 || wizardTargetClassIds.includes(cls.id)
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          if (wizardTargetClassIds.length === 0) {
                            // Jika sebelumnya all, ubah jadi seleksi spesifik minus yang ini
                            const allSameGrade: string[] = assignedClasses.filter((c: any) => c.gradeLevel === wizardGradeLevel).map((c: any) => c.id)
                            setWizardTargetClassIds(allSameGrade.filter((id: string) => id !== cls.id))
                          } else if (wizardTargetClassIds.includes(cls.id)) {
                            setWizardTargetClassIds(prev => prev.filter((id: string) => id !== cls.id))
                          } else {
                            setWizardTargetClassIds(prev => [...prev, cls.id])
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        ✓ {cls.name}
                      </button>
                    )
                  })}
              </div>
            </div>

            {/* Form Dinamis Butir TP */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Rancangan Butir Alur Tujuan Pembelajaran (ATP)
                </h5>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextNum = wizardTpRows.length + 1
                    setWizardTpRows(prev => [
                      ...prev,
                      { kodeTp: `TP ${nextNum}`, lingkupMateri: '', materiPokok: '', deskripsiTp: '', alokasiJp: 2 },
                    ])
                  }}
                  className="h-7 text-[11px] gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Baris TP
                </Button>
              </div>

              <div className="space-y-2.5">
                {wizardTpRows.map((row, index) => (
                  <div key={index} className="p-3 bg-muted/20 border border-border rounded-xl space-y-2 relative">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <Input
                          value={row.kodeTp}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, kodeTp: val } : r))
                          }}
                          placeholder={`TP ${index + 1}`}
                          className="w-20 text-xs h-7 font-mono font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground">Alokasi JP:</label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={row.alokasiJp}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, alokasiJp: val } : r))
                          }}
                          className="w-16 text-xs h-7 font-mono text-center font-bold"
                        />
                        {wizardTpRows.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setWizardTpRows(prev => prev.filter((_, i) => i !== index))
                            }}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Hapus baris TP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-0.5 block">
                          Lingkup Materi / Elemen:
                        </label>
                        <Input
                          value={row.lingkupMateri}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, lingkupMateri: val, materiPokok: r.materiPokok || val } : r))
                          }}
                          placeholder="Contoh: Algoritma & Pemrograman"
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-0.5 block">
                          Materi Pokok:
                        </label>
                        <Input
                          value={row.materiPokok}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, materiPokok: val } : r))
                          }}
                          placeholder="Contoh: Struktur Kontrol Percabangan"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground mb-0.5 block">
                        Rumusan Tujuan Pembelajaran (ABCD):
                      </label>
                      <Textarea
                        value={row.deskripsiTp}
                        onChange={(e) => {
                          const val = e.target.value
                          setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, deskripsiTp: val } : r))
                        }}
                        rows={2}
                        placeholder="Contoh: Peserta didik mampu menganalisis alur algoritma percabangan dan mengimplementasikannya dalam program dengan tepat."
                        className="text-xs resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenWizardJenjangModal(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleWizardSubmit}
              disabled={isSubmittingWizard || !wizardSubjectId}
              className="h-8 text-xs font-semibold gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmittingWizard ? 'Menerapkan...' : 'Terapkan ke Seluruh Rombel'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
