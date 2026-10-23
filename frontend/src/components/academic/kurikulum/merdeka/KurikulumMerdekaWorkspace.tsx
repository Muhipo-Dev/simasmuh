'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  Smartphone, UserCheck, RefreshCw, Eye, Archive, RotateCcw, ChevronRight,
  BarChart3, ListChecks, CalendarDays, ExternalLink, Check, AlertCircle,
  Upload, FileSpreadsheet, Bot, FileCheck, MoreHorizontal, ChevronDown
} from 'lucide-react'
import Swal from 'sweetalert2'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PromesMatrixView } from './PromesMatrixView'
import { ProtaTableView } from './ProtaTableView'
import { DailyClassTeachingQuickView } from './DailyClassTeachingQuickView'
import { TeacherRoadmapStepper } from './TeacherRoadmapStepper'
import { Compass, HelpCircle } from 'lucide-react'
import { PanduanAdministrasiGuruModal } from '../common/PanduanAdministrasiGuruModal'

export function KurikulumMerdekaWorkspace() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  // Tab internal: Jadwal Mengajar, RPE, CP & ATP, Promes & Prota, Modul/RPP & Kisi-kisi, Penilaian Harian
  const [activeSubTab, setActiveSubTab] = useState<'jadwal' | 'rpe' | 'atp' | 'promes' | 'generator' | 'harian'>('promes')
  const [activeTahap3View, setActiveTahap3View] = useState<'promes' | 'prota'>('promes')
  const [selectedPerangkatId, setSelectedPerangkatId] = useState<string | null>(null)

  // Sinkronkan subTab dari query params jika ada
  useEffect(() => {
    const tabParam = searchParams?.get('subTab')
    if (tabParam) {
      if (['jadwal', 'rpe', 'atp', 'promes', 'generator', 'harian'].includes(tabParam)) {
        setActiveSubTab(tabParam as any)
      } else if (tabParam === 'prota') {
        setActiveSubTab('promes')
        setActiveTahap3View('prota')
      } else if (tabParam === 'silabus' || tabParam === 'atp_prosem') {
        setActiveSubTab('atp')
      } else if (tabParam === 'kisi_kisi' || tabParam === 'rpp') {
        setActiveSubTab('generator')
      }
    }
  }, [searchParams])

  // Dialog States
  const [openSetupModal, setOpenSetupModal] = useState(false)
  const [openCloneModal, setOpenCloneModal] = useState(false)
  const [openTpModal, setOpenTpModal] = useState(false)
  const [openWizardJenjangModal, setOpenWizardJenjangModal] = useState(false)
  const [openDailyViewModal, setOpenDailyViewModal] = useState(false)
  const [openArchiveModal, setOpenArchiveModal] = useState(false)
  const [openRoadmapStepperModal, setOpenRoadmapStepperModal] = useState(false)
  const [openPanduanModal, setOpenPanduanModal] = useState(false)
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

  // Form TP State (Tambah & Edit)
  const [editingTpId, setEditingTpId] = useState<string | null>(null)
  const [tpKode, setTpKode] = useState('TP 1')
  const [tpMateri, setTpMateri] = useState('')
  const [tpTopik, setTpTopik] = useState('')
  const [tpDeskripsi, setTpDeskripsi] = useState('')
  const [tpJp, setTpJp] = useState(4)
  const [isGeneratingAiTp, setIsGeneratingAiTp] = useState(false)

  // Upload Dokumen Manual State (Modul, Silabus, Soal dari File/Excel/PDF)
  const [openUploadDocModal, setOpenUploadDocModal] = useState(false)
  const [uploadKategori, setUploadKategori] = useState<string>('MODUL_AJAR')
  const [uploadJudul, setUploadJudul] = useState<string>('')
  const [uploadTpId, setUploadTpId] = useState<string>('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadParsedText, setUploadParsedText] = useState<string>('')
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false)

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

  // Deteksi URL query param untuk membuka Wizard ATP atau subTab tertentu langsung dari Dashboard Guru
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const targetSubTab = params.get('subTab')
      if (targetSubTab && ['jadwal', 'setup', 'rpe', 'atp', 'promes', 'generator', 'harian'].includes(targetSubTab)) {
        if (targetSubTab === 'setup') {
          setActiveSubTab('jadwal')
        } else {
          setActiveSubTab(targetSubTab as any)
        }
      }

      if (params.get('openWizard') === 'atp' || params.get('quickSetup') === 'true') {
        setActiveSubTab('atp')
        setOpenWizardJenjangModal(true)
      }
    }
  }, [])

  // Fungsi Helper: Ambil Beban JP Resmi dari Jadwal Kurikulum untuk Jenjang dan Mapel tertentu
  const getOfficialJpFromSchedule = (subjectId: string, gradeLevel: number): number => {
    if (!subjectId) return 2
    // Cari pairing jadwal yang cocok dengan mapel dan jenjang kelas ini
    const matches = schedulePairings.filter((p) => {
      const matchSubject = p.subjectId === subjectId
      const matchGrade = p.gradeLevel === gradeLevel || (p.className && (
        (gradeLevel === 10 && p.className.startsWith('X ')) ||
        (gradeLevel === 11 && p.className.startsWith('XI ')) ||
        (gradeLevel === 12 && p.className.startsWith('XII '))
      ))
      return matchSubject && matchGrade
    })

    if (matches.length > 0 && matches[0].totalJpPerMinggu) {
      return matches[0].totalJpPerMinggu
    }

    // Fallback jika tidak spesifik jenjang, cari jadwal mapel ini di rombel manapun yang diampu
    const anyMatch = schedulePairings.find((p) => p.subjectId === subjectId)
    if (anyMatch?.totalJpPerMinggu) {
      return anyMatch.totalJpPerMinggu
    }

    return 2
  }

  // Handle Perubahan Mapel di Wizard ATP: Otomatis sinkronkan alokasi JP dari Jadwal Resmi Kurikulum
  const handleSelectWizardSubject = (subjectId: string) => {
    setWizardSubjectId(subjectId)
    if (!subjectId) return

    const officialJp = getOfficialJpFromSchedule(subjectId, wizardGradeLevel)
    // Update seluruh baris TP di wizard agar default JP mengikuti jadwal resmi kurikulum
    setWizardTpRows((prev) =>
      prev.map((r) => ({
        ...r,
        alokasiJp: officialJp,
      }))
    )
  }

  // Handle Perubahan Jenjang Kelas di Wizard ATP: Otomatis sinkronkan Fase dan JP jika mapel sudah terpilih
  const handleSelectWizardGrade = (gl: number) => {
    setWizardGradeLevel(gl)
    const autoFase = gl === 10 ? 'FASE_E' : 'FASE_F'
    setWizardFase(autoFase)
    setWizardTargetClassIds([])

    if (wizardSubjectId) {
      const officialJp = getOfficialJpFromSchedule(wizardSubjectId, gl)
      setWizardTpRows((prev) =>
        prev.map((r) => ({
          ...r,
          alokasiJp: officialJp,
        }))
      )
    }
  }

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
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/clone-parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePerangkatId: selectedPerangkatId,
          targetClassIds,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menduplikasi rombel paralel')
      }
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

  // Helper Buka Modal Tambah TP
  const handleOpenAddTpModal = () => {
    setEditingTpId(null)
    const nextNum = (activePerangkat?.tujuanPembelajarans?.length || 0) + 1
    setTpKode(`TP ${nextNum}`)
    setTpMateri('')
    setTpTopik('')
    setTpDeskripsi('')
    setTpJp(activePerangkat?.jpPerMinggu || 4)
    setOpenTpModal(true)
  }

  // Helper Buka Modal Edit TP
  const handleOpenEditTpModal = (tp: any) => {
    setEditingTpId(tp.id)
    setTpKode(tp.kodeTp || '')
    setTpMateri(tp.lingkupMateri || '')
    setTpTopik(tp.materiPokok || '')
    setTpDeskripsi(tp.deskripsiTp || '')
    setTpJp(tp.alokasiJp || 4)
    setOpenTpModal(true)
  }

  // Handle Simpan Tujuan Pembelajaran (Tambah Baru atau Edit)
  const handleSaveTp = async () => {
    if (!selectedPerangkatId || !tpMateri || !tpDeskripsi) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi Data', text: 'Isi kode TP, lingkup materi, dan rumusan tujuan pembelajaran' })
      return
    }

    try {
      if (editingTpId) {
        // Mode Edit TP Eksisting
        const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/tujuan-pembelajaran/${editingTpId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kodeTp: tpKode,
            lingkupMateri: tpMateri,
            materiPokok: tpTopik || tpMateri,
            deskripsiTp: tpDeskripsi,
            alokasiJp: Number(tpJp),
          }),
        })

        if (!res.ok) throw new Error('Gagal memperbarui Tujuan Pembelajaran')

        Swal.fire({
          icon: 'success',
          title: 'TP Berhasil Diperbarui',
          text: `Perubahan butir ${tpKode} telah tersimpan.`,
          timer: 1500,
          showConfirmButton: false,
        })
      } else {
        // Mode Tambah TP Baru
        const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/tujuan-pembelajaran', {
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
      }

      setOpenTpModal(false)
      setEditingTpId(null)
      setTpMateri('')
      setTpTopik('')
      setTpDeskripsi('')
      refetchDetail()
      refetchContext()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Generator Rumusan TP Berbasis AI (Kaidah ABCD Kurikulum Merdeka)
  const handleGenerateRumusanAi = (materi: string, topik: string, targetIndex?: number) => {
    const mapel = activePerangkat?.subject?.name || 'Mata Pelajaran'
    const cleanMateri = materi.trim() || 'Materi Utama'
    const cleanTopik = topik.trim() || cleanMateri

    // Template rumusan kaidah ABCD: Audience (Peserta didik), Behavior (mampu menganalisis/menerapkan), Condition (melalui eksplorasi & diskusi), Degree (secara kritis & tepat)
    const prompts = [
      `Peserta didik mampu menganalisis konsep ${cleanMateri} khususnya topik ${cleanTopik} pada mata pelajaran ${mapel}, serta mampu menerapkannya dalam pemecahan masalah kontekstual dengan kritis, mandiri, dan bertanggung jawab.`,
      `Peserta didik mampu memahami prinsip dasar ${cleanMateri} dan mengimplementasikan topik ${cleanTopik} dalam karya atau studi kasus nyata secara kolaboratif sesuai kaidah keilmuan ${mapel}.`,
      `Melalui observasi dan eksplorasi terarah, peserta didik mampu mengevaluasi struktur ${cleanMateri} serta menyajikan hasil analisis topik ${cleanTopik} secara sistematis, logis, dan percaya diri.`
    ]

    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)]

    if (targetIndex !== undefined) {
      // Untuk Wizard Jenjang row
      setWizardTpRows(prev => prev.map((r, i) => i === targetIndex ? { ...r, deskripsiTp: selectedPrompt } : r))
    } else {
      // Untuk Modal Form TP Single
      setTpDeskripsi(selectedPrompt)
    }

    Swal.fire({
      icon: 'success',
      title: 'Rumusan AI Dihasilkan',
      text: 'Rumusan Tujuan Pembelajaran (ABCD) telah dibuat otomatis sesuai kaidah Kurikulum Merdeka.',
      timer: 1200,
      showConfirmButton: false,
    })
  }

  // Handle Buka Modal Upload Dokumen Manual
  const handleOpenUploadDocModal = (kategori: string = 'MODUL_AJAR') => {
    setUploadKategori(kategori)
    const mapelName = activePerangkat?.subject?.name || ''
    const defaultJudul = kategori === 'SILABUS'
      ? `Silabus ${mapelName}`
      : kategori === 'SOAL_HARIAN'
      ? `Paket Soal Harian ${mapelName}`
      : `Modul Ajar ${mapelName}`

    setUploadJudul(defaultJudul)
    setUploadTpId('')
    setUploadFile(null)
    setUploadParsedText('')
    setOpenUploadDocModal(true)
  }

  // Handle Pembacaan & Upload File Dokumen (Word/PDF/Excel/Teks)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setIsProcessingUpload(true)

    try {
      const fileName = file.name.toLowerCase()
      // Jika file Excel (.xlsx / .xls)
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const XLSX = await import('xlsx')
        const arrayBuffer = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const rawJson = XLSX.utils.sheet_to_json(sheet)
        const summaryText = `Terbaca ${rawJson.length} baris data dari spreadsheet Excel "${file.name}".`
        setUploadParsedText(summaryText)
      } else {
        // File PDF / Docx / Teks
        setUploadParsedText(`File "${file.name}" (${(file.size / 1024).toFixed(1)} KB) siap diproses dan disinkronkan ke administrasi guru.`)
      }
    } catch {
      setUploadParsedText(`File "${file.name}" berhasil dipilih dan siap diarsipkan ke perangkat ajar.`)
    } finally {
      setIsProcessingUpload(false)
    }
  }

  // Handle Submit Dokumen Manual ke Administrasi Guru
  const handleSubmitManualDoc = async () => {
    if (!selectedPerangkatId || !uploadJudul) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi Data', text: 'Tentukan judul dokumen administrasi guru.' })
      return
    }

    setIsProcessingUpload(true)
    try {
      let fileDocxUrl: string | undefined = undefined
      let filePdfUrl: string | undefined = undefined

      if (uploadFile) {
        // Konversi file ke data URI base64 aman agar dapat diunduh/dibuka kapan saja
        const reader = new FileReader()
        const fileDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(uploadFile)
        })

        const lowerName = uploadFile.name.toLowerCase()
        if (lowerName.endsWith('.pdf')) {
          filePdfUrl = fileDataUrl
        } else {
          fileDocxUrl = fileDataUrl
        }
      }

      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/dokumen-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: selectedPerangkatId,
          tpId: uploadTpId || undefined,
          kategori: uploadKategori,
          judul: uploadJudul,
          kontenJson: {
            keterangan: uploadParsedText || 'Dokumen diunggah manual oleh guru',
            fileName: uploadFile?.name || 'Dokumen Guru',
            fileSize: uploadFile?.size || 0,
            uploadedAt: new Date().toISOString(),
          },
          fileDocxUrl,
          filePdfUrl,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan dokumen ke administrasi guru')

      Swal.fire({
        icon: 'success',
        title: 'Dokumen Berhasil Ditambahkan',
        text: `Dokumen "${uploadJudul}" telah otomatis tersimpan ke administrasi guru.`,
        timer: 1600,
        showConfirmButton: false,
      })

      setOpenUploadDocModal(false)
      setUploadFile(null)
      refetchDetail()
      refetchContext()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsProcessingUpload(false)
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
        title: 'Quick Setup Berhasil Diterapkan!',
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
      const res = await authenticatedFetch('/api-backend/kurikulum-merdeka/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: selectedPerangkatId,
          tpId,
          kategori,
          judul: judul || `Dokumen ${kategori.replace(/_/g, ' ')}`,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal men-generate dokumen')
      }

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
    const url = `/api-backend/kurikulum-merdeka/export/docx?perangkatKurikulumId=${selectedPerangkatId}&kategori=${kategori}${tpId ? `&tpId=${tpId}` : ''}`
    window.open(url, '_blank')
  }

  // Handle Hapus Butir TP Mandiri oleh Guru
  const handleDeleteTp = async (tpId: string, kodeTp: string) => {
    const confirm = await Swal.fire({
      title: `Hapus ${kodeTp}?`,
      text: 'Butir TP ini serta alokasi promes dan dokumen terikat akan dihapus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })

    if (!confirm.isConfirmed) return

    try {
      const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/tujuan-pembelajaran/${tpId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus butir TP')

      Swal.fire({
        icon: 'success',
        title: 'TP Terhapus',
        text: `Butir ${kodeTp} berhasil dihapus dari alur pembelajaran.`,
        timer: 1500,
        showConfirmButton: false,
      })

      refetchDetail()
      refetchContext()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Hapus Dokumen Ajar Item oleh Guru
  const handleDeleteDocItem = async (docId: string, judul: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Dokumen?',
      text: `Apakah Anda yakin ingin menghapus dokumen "${judul}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })

    if (!confirm.isConfirmed) return

    try {
      const res = await authenticatedFetch(`/api-backend/kurikulum-merdeka/dokumen-item/${docId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus dokumen')

      Swal.fire({
        icon: 'success',
        title: 'Dokumen Terhapus',
        timer: 1500,
        showConfirmButton: false,
      })

      refetchDetail()
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    }
  }

  // Handle Download Paket Siap Supervisi (.zip)
  const handleDownloadSupervisiZip = () => {
    if (!selectedPerangkatId) return
    const url = `/api-backend/kurikulum-merdeka/export/supervisi-zip?perangkatKurikulumId=${selectedPerangkatId}`
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

        {/* Tombol Aksi Kanan: Ringkas, Rapi & Tidak Membingungkan Guru Awam */}
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
            onClick={() => setOpenRoadmapStepperModal(true)}
            className="h-8 gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-2xs"
            title="Buka Peta Jalan Dokumen Hidup (Roadmap Tahap 1 sampai 5)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Roadmap Guru</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setOpenSetupModal(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Setup Kelas
          </Button>

          {/* Menu Dropdown Aksi Lanjutan / Pelengkap */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-medium border-border"
                  title="Menu aksi & alat administrasi lainnya"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span>Alat Lainnya</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1">
                Aksi &amp; Supervisi
              </DropdownMenuLabel>

              {activePerangkat && (
                <>
                  <DropdownMenuItem
                    onClick={handleDownloadSupervisiZip}
                    className="cursor-pointer gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 py-2"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Paket Supervisi (.zip)</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setOpenCloneModal(true)}
                    className="cursor-pointer gap-2 text-xs font-medium py-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Sync Kelas Paralel</span>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem
                onClick={() => setOpenArchiveModal(true)}
                className="cursor-pointer gap-2 text-xs font-medium py-2"
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span className="flex-1">Arsip Tahun Lalu</span>
                {archivePerangkatList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-muted text-foreground text-[10px] font-mono font-bold">
                    {archivePerangkatList.length}
                  </span>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setOpenPanduanModal(true)}
                className="cursor-pointer gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-400 py-2"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Panduan Lengkap</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>


      {/* 2. Pilihan Tahap Kerja Administrasi Guru (Fokus Tombol Tahap Terstruktur, Kontras Lembut & Ramah Mata) */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            {
              id: 'jadwal',
              step: 'Tahap 1',
              title: 'Jadwal & SK KBM',
              desc: 'Rombel & alokasi mengajar',
              icon: Calendar,
              activeClass: 'border-slate-400 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-100 shadow-sm ring-2 ring-slate-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
              badgeBg: 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
              badgeActiveBg: 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900',
              iconColor: 'text-slate-700 dark:text-slate-300',
            },
            {
              id: 'atp',
              step: 'Tahap 2',
              title: 'Alur Tujuan (ATP)',
              desc: 'Capaian & butir TP',
              icon: BookOpen,
              activeClass: 'border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/60 dark:border-sky-500 dark:text-sky-100 shadow-sm ring-2 ring-sky-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-sky-300 hover:text-sky-900 dark:hover:text-sky-100',
              badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
              badgeActiveBg: 'bg-sky-700 text-white dark:bg-sky-300 dark:text-sky-950',
              iconColor: 'text-sky-700 dark:text-sky-300',
            },
            {
              id: 'promes',
              step: 'Tahap 3',
              title: 'Promes & Prota',
              desc: 'Alokasi tahunan & semester',
              icon: Layers,
              activeClass: 'border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/60 dark:border-amber-500 dark:text-amber-100 shadow-sm ring-2 ring-amber-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-900 dark:hover:text-amber-100',
              badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
              badgeActiveBg: 'bg-amber-700 text-white dark:bg-amber-300 dark:text-amber-950',
              iconColor: 'text-amber-700 dark:text-amber-300',
            },
            {
              id: 'generator',
              step: 'Tahap 4',
              title: 'Modul & Soal',
              desc: 'Modul, silabus & asesmen',
              icon: FileText,
              activeClass: 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100',
              badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
              badgeActiveBg: 'bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950',
              iconColor: 'text-emerald-700 dark:text-emerald-300',
            },
            {
              id: 'harian',
              step: 'Tahap 5',
              title: 'KBM & Presensi',
              desc: 'Presensi kelas & jurnal',
              icon: Smartphone,
              activeClass: 'border-indigo-400 bg-indigo-50 text-indigo-950 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-100 shadow-sm ring-2 ring-indigo-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100',
              badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
              badgeActiveBg: 'bg-indigo-700 text-white dark:bg-indigo-300 dark:text-indigo-950',
              iconColor: 'text-indigo-700 dark:text-indigo-300',
            },
            {
              id: 'rpe',
              step: 'Pekan Efektif',
              title: 'RPE',
              desc: 'Distribusi pekan & jam',
              icon: BarChart3,
              activeClass: 'border-teal-400 bg-teal-50 text-teal-950 dark:bg-teal-950/60 dark:border-teal-500 dark:text-teal-100 shadow-sm ring-2 ring-teal-400/40',
              inactiveClass: 'border-slate-200 dark:border-slate-800 bg-card text-slate-600 dark:text-slate-400 hover:border-teal-300 hover:text-teal-900 dark:hover:text-teal-100',
              badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
              badgeActiveBg: 'bg-teal-700 text-white dark:bg-teal-300 dark:text-teal-950',
              iconColor: 'text-teal-700 dark:text-teal-300',
            },
          ].map((tab) => {
            const TabIcon = tab.icon
            const isSelected = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected ? tab.activeClass : tab.inactiveClass
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] sm:text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-full ${isSelected ? tab.badgeActiveBg : tab.badgeBg}`}>
                    {tab.step}
                  </span>
                  <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? tab.iconColor : 'text-slate-400'}`} />
                </div>
                <div>
                  <h5 className={`font-bold text-xs truncate ${isSelected ? 'font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                    {tab.title}
                  </h5>
                  <p className={`text-[10px] truncate leading-normal mt-0.5 ${isSelected ? 'opacity-90 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* TAHAP 1: JADWAL MENGAJAR KBM & SK KURIKULUM */}
        {activeSubTab === 'jadwal' && (
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-xl border border-border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-700 dark:text-slate-300 border-slate-300">
                    Tahap 1 Dasar KBM
                  </Badge>
                  <h4 className="text-sm font-bold text-foreground">Jadwal Mengajar KBM & SK Kurikulum</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  SK KBM yang diturunkan tim Kurikulum/TU menjadi dasar legalitas rombel dan alokasi jam mengajar Anda.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAutoSyncFromSchedules}
                  disabled={syncingSchedules || unconfiguredPairings.length === 0}
                  className="h-8.5 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                  title="Sinkronkan rombel dan mata pelajaran dari jadwal resmi secara otomatis"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSchedules ? 'animate-spin' : ''}`} />
                  <span>Sinkron Jadwal SK ({unconfiguredPairings.length} Baru)</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenSetupModal(true)}
                  className="h-8.5 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Setup Manual Rombel</span>
                </Button>
              </div>
            </div>

            {/* Tabel Pairing Jadwal Resmi & Status Setup */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Daftar Rombel & Jam Mengajar Berdasarkan SK KBM
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {schedulePairings.length} Kelas Terjadwal
                </span>
              </div>

              {schedulePairings.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <p>Belum ada jadwal mengajar KBM yang di-plot oleh tim Kurikulum untuk akun Anda.</p>
                  <p className="text-[11px]">Anda dapat melakukan <strong>Setup Manual Rombel</strong> atau menghubungi Waka Kurikulum.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-12 text-center text-xs">No</TableHead>
                        <TableHead className="text-xs">Kelas / Rombel</TableHead>
                        <TableHead className="text-xs">Mata Pelajaran</TableHead>
                        <TableHead className="text-xs">Fase / Jenjang</TableHead>
                        <TableHead className="text-xs text-center">Beban JP/Minggu</TableHead>
                        <TableHead className="text-xs text-center">Status Perangkat</TableHead>
                        <TableHead className="text-xs text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedulePairings.map((pair, idx) => {
                        const targetPerangkat = perangkatList.find(
                          (p: any) => p.classId === pair.classId && p.subjectId === pair.subjectId
                        )
                        const tpCount = targetPerangkat?.tujuanPembelajarans?.length || targetPerangkat?._count?.tujuanPembelajarans || pair.tpCount || 0
                        const isConfigured = !!targetPerangkat
                        const isReady = isConfigured && tpCount > 0

                        return (
                          <TableRow key={`${pair.classId}-${pair.subjectId}-${idx}`} className="hover:bg-muted/30">
                            <TableCell className="text-center font-mono text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-bold text-xs text-foreground">
                              {pair.className}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-semibold text-foreground">{pair.subjectName}</span>
                              {pair.subjectCode && (
                                <span className="ml-1 text-[10px] font-mono text-muted-foreground">({pair.subjectCode})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {pair.fase || (pair.gradeLevel === 10 ? 'Fase E' : 'Fase F')} (Kls {pair.gradeLevel})
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                              {pair.totalJpPerMinggu || 2} JP
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {isReady ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 text-[10px] font-semibold gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Siap ({tpCount} Butir TP)
                                </Badge>
                              ) : isConfigured ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  Belum Siap (Belum Input TP)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-300 text-[10px] font-semibold">
                                  Belum Di-setup
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {isConfigured ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPerangkatId(targetPerangkat.id)
                                    setActiveSubTab('atp')
                                  }}
                                  className={`h-7 px-2.5 text-[11px] font-bold gap-1 ${
                                    isReady
                                      ? 'text-blue-700 dark:text-blue-300 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                                      : 'text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                  }`}
                                >
                                  <span>{isReady ? 'Kelola Tahap 2 (ATP)' : 'Input TP & Silabus'}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSetupClassId(pair.classId)
                                    setSetupSubjectId(pair.subjectId)
                                    setSetupFase(pair.fase || (pair.gradeLevel === 10 ? 'FASE_E' : 'FASE_F'))
                                    setSetupJpPerMinggu(pair.totalJpPerMinggu || 2)
                                    setSetupTotalJp((pair.totalJpPerMinggu || 2) * 18)
                                    setOpenSetupModal(true)
                                  }}
                                  className="h-7 px-2.5 text-[11px] font-bold bg-slate-900 hover:bg-black text-white dark:bg-slate-700 gap-1"
                                >
                                  <span>Setup Rombel Ini</span>
                                  <ChevronRight className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAHAP KHUSUS: RPE (RENCANA PEKAN EFEKTIF) - SATU CARD TERPADU */}
        {activeSubTab === 'rpe' && activePerangkat && (
          <div className="space-y-4">
            {/* Kartu Informasi & Statistik Terpadu RPE */}
            <div className="bg-card rounded-2xl border border-border shadow-2xs overflow-hidden">
              {/* Header RPE Ringkas */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-teal-700 dark:text-teal-300 border-teal-300 bg-teal-50 dark:bg-teal-950/40">
                      Pekan Efektif
                    </Badge>
                    <h4 className="text-sm sm:text-base font-bold text-foreground">
                      Rincian Pekan Efektif (RPE) • Kelas {activePerangkat.class.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kalkulasi pekan kalender pendidikan, pekan tatap muka KBM, dan alokasi total jam pelajaran {activePerangkat.subject.name}.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('RPE')}
                    className="h-8 gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Unduh RPE (.docx)</span>
                  </Button>
                </div>
              </div>

              {/* Strip Metrik Terpadu (4 Kolom dengan Divider Halus, Tanpa Kotak-kotak Terpisah) */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Total Pekan Semester
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-foreground font-mono">26</span>
                    <span className="text-xs font-medium text-muted-foreground">Pekan</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">Kalender Pendidikan</span>
                </div>

                <div className="p-4 bg-teal-500/5">
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                    Pekan Efektif KBM
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
                      {activePerangkat.mingguEfektifCount || 18}
                    </span>
                    <span className="text-xs font-medium text-teal-600 dark:text-teal-400">Pekan</span>
                  </div>
                  <span className="text-[11px] text-teal-600/90 dark:text-teal-400/90 mt-0.5 block">Tatap Muka Pembelajaran</span>
                </div>

                <div className="p-4 bg-rose-500/5">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                    Pekan Tidak Efektif
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
                      {26 - (activePerangkat.mingguEfektifCount || 18)}
                    </span>
                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Pekan</span>
                  </div>
                  <span className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5 block">Libur &amp; Asesmen Sekolah</span>
                </div>

                <div className="p-4 bg-sky-500/5">
                  <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">
                    Total Alokasi JP KBM
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-sky-700 dark:text-sky-300 font-mono">
                      {activePerangkat.totalJpSemester || ((activePerangkat.mingguEfektifCount || 18) * (activePerangkat.jpPerMinggu || 2))}
                    </span>
                    <span className="text-xs font-medium text-sky-600 dark:text-sky-400">JP</span>
                  </div>
                  <span className="text-[11px] text-sky-600/90 dark:text-sky-400/90 mt-0.5 block font-mono">
                    {activePerangkat.jpPerMinggu || 2} JP/mgg × {activePerangkat.mingguEfektifCount || 18} pkn
                  </span>
                </div>
              </div>
            </div>

            {/* Tabel Pemetaan Distribusi Alokasi Materi */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-teal-600" />
                  Distribusi Alokasi Jam Pelajaran (JP) ke Butir TP
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {activePerangkat.tujuanPembelajarans?.length || 0} Butir TP
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-12 text-center font-bold">No</TableHead>
                      <TableHead className="w-20 text-center font-bold">Kode TP</TableHead>
                      <TableHead className="min-w-[200px] font-bold">Lingkup Materi Pokok</TableHead>
                      <TableHead className="min-w-[260px] font-bold">Uraian Tujuan Pembelajaran</TableHead>
                      <TableHead className="w-24 text-center font-bold">Alokasi Waktu</TableHead>
                      <TableHead className="w-24 text-center font-bold">Porsi JP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!activePerangkat.tujuanPembelajarans || activePerangkat.tujuanPembelajarans.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          Belum ada butir Tujuan Pembelajaran. Silakan rumuskan TP di <strong>Tahap 2 (ATP)</strong>.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activePerangkat.tujuanPembelajarans.map((tp: any, idx: number) => {
                        const totalJp = activePerangkat.totalJpSemester || 36
                        const pct = totalJp > 0 ? Math.round((tp.alokasiJp / totalJp) * 100) : 0
                        return (
                          <TableRow key={tp.id} className="hover:bg-muted/30">
                            <TableCell className="text-center font-mono">{idx + 1}</TableCell>
                            <TableCell className="text-center font-mono font-bold text-teal-700 dark:text-teal-300">
                              {tp.kodeTp}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {tp.lingkupMateri}
                            </TableCell>
                            <TableCell className="text-muted-foreground line-clamp-2">
                              {tp.deskripsiTp}
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-foreground">
                              {tp.alokasiJp} JP
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {pct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAHAP 2: MANAJEMEN CP & ATP */}
        {activeSubTab === 'atp' && activePerangkat && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <div>
                  <h4 className="text-sm font-semibold">Alur Tujuan Pembelajaran (ATP) - {activePerangkat.class.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {activePerangkat.tujuanPembelajarans?.length || 0} butir TP ({activePerangkat.subject.name})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (activePerangkat) {
                        const gl = activePerangkat.class.gradeLevel || 10
                        const subId = activePerangkat.subjectId
                        setWizardGradeLevel(gl)
                        setWizardSubjectId(subId)
                        setWizardFase(activePerangkat.fase || (gl === 10 ? 'FASE_E' : 'FASE_F'))
                        const officialJp = getOfficialJpFromSchedule(subId, gl)
                        setWizardTpRows((prev) =>
                          prev.map((r) => ({
                            ...r,
                            alokasiJp: officialJp,
                          }))
                        )
                      }
                      setOpenWizardJenjangModal(true)
                    }}
                    className="h-8 gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                    title="Buka Quick Setup Auto-Isi CP & ATP Jenjang Kelas"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick Setup ATP</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('ATP')}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh ATP
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenAddTpModal}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah TP
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
                      <TableHead className="w-24 text-center font-bold">Aksi</TableHead>
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
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEditTpModal(tp)}
                                className="h-7 px-2 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                title="Edit Nama & Rumusan TP"
                              >
                                <Edit3 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTp(tp.id, tp.kodeTp)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                title="Hapus Butir TP"
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
              </div>
            </div>
          )}

          {/* TAHAP 3: PROGRAM SEMESTER (PROMES) & PROGRAM TAHUNAN (PROTA) */}
          {activeSubTab === 'promes' && activePerangkat && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">Program Semester &amp; Program Tahunan</h4>
                  <p className="text-xs text-muted-foreground">
                    Distribusi alokasi materi per semester (Promes) dan target capaian tahunan (Prota)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Switcher Tampilan Prota vs Promes */}
                  <div className="inline-flex items-center p-1 bg-muted/60 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setActiveTahap3View('promes')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeTahap3View === 'promes'
                          ? 'bg-card text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Program Semester (Promes)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTahap3View('prota')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeTahap3View === 'prota'
                          ? 'bg-card text-foreground shadow-2xs font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Program Tahunan (Prota)
                    </button>
                  </div>

                  {activeTahap3View === 'prota' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDocx('PROTA')}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Prota (.docx)
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDocx('PROMES')}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Promes (.docx)
                    </Button>
                  )}
                </div>
              </div>

              {/* Tampilan Konten Sesuai View Terpilih */}
              {activeTahap3View === 'prota' ? (
                <ProtaTableView perangkat={activePerangkat} />
              ) : (
                <PromesMatrixView
                  perangkat={activePerangkat}
                  onSaveSuccess={() => refetchDetail()}
                />
              )}
            </div>
          )}

          {/* TAHAP 4: GENERATOR DOKUMEN & SOAL */}
          {activeSubTab === 'generator' && activePerangkat && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <div>
                  <h4 className="text-sm font-semibold">Dokumen Perangkat Ajar & Paket Asesmen</h4>
                  <p className="text-xs text-muted-foreground">
                    Modul Ajar, LKPD, serta Soal Ujian (Kisi-kisi, Kunci Jawaban & Lembar Siswa)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenUploadDocModal('MODUL_AJAR')}
                    className="h-8 gap-1.5 text-xs font-semibold border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    title="Tambah Modul Ajar dari file Docx/Excel/PDF/Manual"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Modul
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenUploadDocModal('SILABUS')}
                    className="h-8 gap-1.5 text-xs font-semibold border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    title="Tambah Silabus Pembelajaran dari file Docx/Excel/PDF/Manual"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Silabus
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenUploadDocModal('SOAL_HARIAN')}
                    className="h-8 gap-1.5 text-xs font-semibold border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    title="Tambah Paket Soal Asesmen dari file Docx/Excel/PDF/Manual"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Soal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('SILABUS')}
                    className="h-8 gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                    title="Unduh Silabus format resmi Word"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Silabus
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDocx('KISI_KISI')}
                    className="h-8 gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                    title="Unduh Kisi-kisi Soal Asesmen"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Kisi-kisi
                  </Button>
                </div>
              </div>

              {/* Grid Dokumen Siap Pakai */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activePerangkat.dokumenItems?.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground text-xs bg-card rounded-lg border border-border">
                    Belum ada dokumen yang ditambahkan. Klik tombol "Tambah Modul", "Tambah Silabus", atau "Tambah Soal" di atas untuk menambahkan dokumen manual maupun upload file Excel/PDF/Word.
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDocItem(doc.id, doc.judul)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAHAP 5: QUICK VIEW KBM HARIAN */}
          {activeSubTab === 'harian' && activePerangkat && (
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
        {/* TAMPILAN TAHAP 2 - 5 HANYA BILA ACTIVE PERANGKAT ADA, ATAU ARAHKAN KE TAHAP 1 */}
        {activeSubTab !== 'jadwal' && !activePerangkat && (
          <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-primary/60 mb-1" />
            <h4 className="font-bold text-sm text-foreground">Selesaikan Tahap 1 Terlebih Dahulu</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Sebelum menyusun Alur Tujuan Pembelajaran (ATP), Matriks Promes, atau Modul Ajar, pastikan Anda telah memverifikasi Jadwal KBM resmi (SK Kurikulum) dan menyiapkan rombel di Tahap 1.
            </p>
            <Button
              size="sm"
              onClick={() => setActiveSubTab('jadwal')}
              className="h-8.5 gap-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white dark:bg-slate-700 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Buka Tahap 1 (Jadwal & SK KBM)</span>
            </Button>
          </div>
        )}
      </div>

      {/* DIALOG 1: SETUP KELAS BARU */}
      <Dialog open={openSetupModal} onOpenChange={setOpenSetupModal}>
        <DialogContent className="sm:max-w-md bg-background border-slate-300 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between text-slate-900 dark:text-slate-100">
              <span>Setup Kelas &amp; Rombel Baru</span>
              {schedulePairings.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold text-sky-700 dark:text-sky-300 border-sky-300 bg-sky-50 dark:bg-sky-950/50">
                  Sinkron Jadwal KBM
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Pilih rombel dan mata pelajaran penugasan Anda. Data otomatis menyesuaikan jadwal resmi yang diset Kurikulum/TU.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">1. Kelas / Rombel:</label>
              <select
                value={setupClassId}
                onChange={(e) => handleSelectSetupClass(e.target.value)}
                className="w-full text-xs sm:text-sm h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 font-semibold shadow-2xs"
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
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">2. Mata Pelajaran:</label>
              <select
                value={setupSubjectId}
                onChange={(e) => handleSelectSetupSubject(e.target.value)}
                className="w-full text-xs sm:text-sm h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 font-semibold shadow-2xs"
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
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Fase Kurikulum:</label>
                <select
                  value={setupFase}
                  onChange={(e) => setSetupFase(e.target.value)}
                  className="w-full text-xs sm:text-sm h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 font-semibold shadow-2xs"
                >
                  <option value="FASE_E">Fase E (Kelas X)</option>
                  <option value="FASE_F">Fase F (Kelas XI - XII)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Beban JP/Minggu:</label>
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
                  className="text-xs sm:text-sm h-10 font-mono font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-900/60 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
              💡 <strong>Total Alokasi Semester:</strong> {setupTotalJp} JP (18 minggu efektif). Terhubung langsung dengan presensi harian dan e-rapor internal.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenSetupModal(false)} className="h-9 text-xs border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button size="sm" onClick={handleCreateSetup} className="h-9 text-xs font-bold shadow-xs bg-sky-600 hover:bg-sky-700 text-white">
              Simpan &amp; Aktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: CLONING ROMBEL PARALEL */}
      <Dialog open={openCloneModal} onOpenChange={setOpenCloneModal}>
        <DialogContent className="sm:max-w-md bg-background border-slate-300 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Sync / Clone Rombel Paralel</DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Salin seluruh Tujuan Pembelajaran (ATP), matriks Promes, dan dokumen ajar dari kelas{' '}
              <strong className="text-slate-900 dark:text-slate-100">{activePerangkat?.class?.name}</strong> ke kelas paralel lainnya dalam 1 klik.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Pilih Kelas Target:</p>
            <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
              {assignedClasses
                .filter((c: any) => c.id !== activePerangkat?.classId)
                .map((cls: any) => {
                  const isChecked = targetClassIds.includes(cls.id)
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors"
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
                        className="rounded border-slate-400 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="font-bold text-slate-900 dark:text-slate-100">{cls.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Tingkat {cls.gradeLevel})</span>
                    </label>
                  )
                })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenCloneModal(false)} className="h-9 text-xs border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button size="sm" onClick={handleCloneParallel} className="h-9 text-xs font-bold shadow-xs bg-sky-600 hover:bg-sky-700 text-white">
              Duplikasi Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: TAMBAH BUTIR TP */}
      <Dialog open={openTpModal} onOpenChange={setOpenTpModal}>
        <DialogContent className="sm:max-w-lg bg-background border-slate-300 dark:border-slate-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tambah Butir Tujuan Pembelajaran (TP)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Rumuskan tujuan pembelajaran sesuai capaian kompetensi dan alokasi JP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Kode TP:</label>
                <Input
                  value={tpKode}
                  onChange={(e) => setTpKode(e.target.value)}
                  placeholder="TP 1"
                  className="text-xs h-9 font-mono font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Alokasi Waktu (JP):</label>
                <Input
                  type="number"
                  value={tpJp}
                  onChange={(e) => setTpJp(Number(e.target.value))}
                  placeholder="4"
                  className="text-xs h-9 font-mono font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Lingkup Materi / Elemen:</label>
              <Input
                value={tpMateri}
                onChange={(e) => setTpMateri(e.target.value)}
                placeholder="Contoh: Algoritma dan Struktur Data"
                className="text-xs sm:text-sm h-9 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">Topik Pokok:</label>
              <Input
                value={tpTopik}
                onChange={(e) => setTpTopik(e.target.value)}
                placeholder="Contoh: Logika Percabangan Kompleks"
                className="text-xs sm:text-sm h-9 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Rumusan Tujuan Pembelajaran (ABCD):
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateRumusanAi(tpMateri, tpTopik)}
                  className="h-6 px-2 text-[10px] font-bold text-sky-600 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 gap-1"
                  title="Generate otomatis rumusan TP dengan kaidah ABCD (Audience, Behavior, Condition, Degree)"
                >
                  <Sparkles className="w-3 h-3 text-sky-600 animate-pulse" />
                  <span>Generate AI (ABCD)</span>
                </Button>
              </div>
              <Textarea
                value={tpDeskripsi}
                onChange={(e) => setTpDeskripsi(e.target.value)}
                placeholder="Peserta didik mampu menganalisis dan menerapkan struktur algoritma secara kritis..."
                className="text-xs sm:text-sm min-h-[90px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Info AI: Disintesis otomatis dari Lingkup Materi, Topik Pokok, dan Mata Pelajaran {activePerangkat?.subject?.name}.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenTpModal(false)} className="h-9 text-xs border-slate-300 dark:border-slate-700">
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveTp} className="h-9 text-xs font-bold shadow-xs bg-sky-600 hover:bg-sky-700 text-white">
              {editingTpId ? 'Simpan Perubahan' : 'Simpan TP'}
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

      {/* DIALOG 4: WIZARD AUTO-ISI CP & ATP PER JENJANG KELAS (COMPACT & EYE-FRIENDLY) */}
      <Dialog open={openWizardJenjangModal} onOpenChange={setOpenWizardJenjangModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-slate-300 dark:border-slate-700 shadow-2xl">
          {/* Header Compact & Teduh */}
          <div className="px-5 py-3.5 bg-slate-100/80 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Quick Setup CP &amp; ATP Jenjang
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                  Isi capaian sekali, otomatis terpasang ke seluruh kelas rombel di jenjang ini.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              {wizardFase === 'FASE_E' ? 'Fase E' : 'Fase F'}
            </Badge>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {/* 1. Baris Ringkas: Jenjang, Mapel & Rombel Target */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    Jenjang Kelas:
                  </label>
                  <select
                    value={wizardGradeLevel}
                    onChange={(e) => handleSelectWizardGrade(Number(e.target.value))}
                    className="w-full text-xs h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 font-bold focus:ring-1 focus:ring-sky-500"
                  >
                    <option value={10}>Kelas X (Sepuluh) • Fase E</option>
                    <option value={11}>Kelas XI (Sebelas) • Fase F</option>
                    <option value={12}>Kelas XII (Dua Belas) • Fase F</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Mata Pelajaran:
                    </label>
                    {wizardSubjectId && (
                      <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                        Jadwal: {getOfficialJpFromSchedule(wizardSubjectId, wizardGradeLevel)} JP/Minggu
                      </span>
                    )}
                  </div>
                  <select
                    value={wizardSubjectId}
                    onChange={(e) => handleSelectWizardSubject(e.target.value)}
                    className="w-full text-xs h-8.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 font-semibold focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {assignedSubjects.map((s: any) => {
                      const jp = getOfficialJpFromSchedule(s.id, wizardGradeLevel)
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) • {jp} JP (Jadwal KBM)
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Rombel Chips Compact */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                  Rombel Target:
                </span>
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
                            const allSameGrade: string[] = assignedClasses.filter((c: any) => c.gradeLevel === wizardGradeLevel).map((c: any) => c.id)
                            setWizardTargetClassIds(allSameGrade.filter((id: string) => id !== cls.id))
                          } else if (wizardTargetClassIds.includes(cls.id)) {
                            setWizardTargetClassIds(prev => prev.filter((id: string) => id !== cls.id))
                          } else {
                            setWizardTargetClassIds(prev => [...prev, cls.id])
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700'
                            : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{cls.name}
                      </button>
                    )
                  })}
              </div>
            </div>

            {/* 2. Butir Alur Tujuan Pembelajaran (ATP) - Desain Padat & Nyaman Dibaca */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Daftar Butir Tujuan Pembelajaran ({wizardTpRows.length} TP)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextNum = wizardTpRows.length + 1
                    const officialJp = getOfficialJpFromSchedule(wizardSubjectId, wizardGradeLevel)
                    setWizardTpRows(prev => [
                      ...prev,
                      { kodeTp: `TP ${nextNum}`, lingkupMateri: '', materiPokok: '', deskripsiTp: '', alokasiJp: officialJp },
                    ])
                  }}
                  className="h-7 text-[11px] gap-1 px-2.5 font-bold border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  Tambah TP
                </Button>
              </div>

              <div className="space-y-2.5">
                {wizardTpRows.map((row, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-700 rounded-xl space-y-2 shadow-2xs"
                  >
                    {/* Header Baris TP: Kode + Alokasi + Hapus */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <Input
                          value={row.kodeTp}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, kodeTp: val } : r))
                          }}
                          placeholder={`TP ${index + 1}`}
                          className="w-20 text-xs h-7 font-mono font-bold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">Waktu:</span>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={row.alokasiJp}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, alokasiJp: val } : r))
                          }}
                          className="w-12 text-xs h-7 font-mono text-center font-bold bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                        />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">JP</span>

                        {wizardTpRows.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setWizardTpRows(prev => prev.filter((_, i) => i !== index))
                            }}
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-0.5"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Materi & Sub Materi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Input
                          value={row.lingkupMateri}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, lingkupMateri: val, materiPokok: r.materiPokok || val } : r))
                          }}
                          placeholder="Lingkup Materi (contoh: Algoritma)"
                          className="text-xs h-7.5 bg-slate-50/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <Input
                          value={row.materiPokok}
                          onChange={(e) => {
                            const val = e.target.value
                            setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, materiPokok: val } : r))
                          }}
                          placeholder="Materi Pokok (contoh: Logika Percabangan)"
                          className="text-xs h-7.5 bg-slate-50/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Rumusan Deskripsi TP & Tombol Generate AI */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Rumusan Tujuan Pembelajaran (ABCD):
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerateRumusanAi(row.lingkupMateri, row.materiPokok, index)}
                          className="h-5 px-1.5 text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 gap-1"
                          title="Generate otomatis rumusan TP dari Lingkup Materi, Topik Pokok, dan Mata Pelajaran"
                        >
                          <Sparkles className="w-3 h-3 text-sky-600" />
                          <span>Generate AI (ABCD)</span>
                        </Button>
                      </div>
                      <Textarea
                        value={row.deskripsiTp}
                        onChange={(e) => {
                          const val = e.target.value
                          setWizardTpRows(prev => prev.map((r, i) => i === index ? { ...r, deskripsiTp: val } : r))
                        }}
                        rows={2}
                        placeholder="Rumusan Tujuan Pembelajaran (ABCD): Peserta didik mampu menganalisis alur algoritma percabangan dan mengimplementasikannya dalam program dengan tepat."
                        className="text-xs bg-slate-50/70 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 placeholder:text-slate-400 text-slate-900 dark:text-slate-100 resize-none leading-relaxed py-1.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Aksi */}
          <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Otomatis terdistribusi ke seluruh rombel kelas.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenWizardJenjangModal(false)}
                className="h-8 px-3 text-xs border-slate-300 dark:border-slate-700"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleWizardSubmit}
                disabled={isSubmittingWizard || !wizardSubjectId}
                className="h-8 px-3.5 text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmittingWizard ? 'Menerapkan...' : 'Terapkan Sekarang'}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: TAMBAH MODUL, SILABUS, SOAL MANUAL DARI FILE EXCEL/PDF/DOCX */}
      <Dialog open={openUploadDocModal} onOpenChange={setOpenUploadDocModal}>
        <DialogContent className="sm:max-w-lg bg-background border-slate-300 dark:border-slate-700 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>
                {uploadKategori === 'SILABUS'
                  ? 'Tambah Silabus Pembelajaran'
                  : uploadKategori === 'SOAL_HARIAN'
                  ? 'Tambah Paket Soal Asesmen'
                  : 'Tambah Modul Ajar'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Dokumen dapat ditambahkan manual atau diunggah dari file Word, Excel, maupun PDF. Sistem otomatis membaca dan menyimpannya ke administrasi guru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Kategori Dokumen */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Jenis Dokumen:
              </label>
              <select
                value={uploadKategori}
                onChange={(e) => {
                  const kat = e.target.value
                  setUploadKategori(kat)
                  const mapelName = activePerangkat?.subject?.name || ''
                  if (kat === 'SILABUS') setUploadJudul(`Silabus ${mapelName}`)
                  else if (kat === 'SOAL_HARIAN') setUploadJudul(`Paket Soal Harian ${mapelName}`)
                  else setUploadJudul(`Modul Ajar ${mapelName}`)
                }}
                className="w-full text-xs h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 font-bold focus:ring-1 focus:ring-sky-500"
              >
                <option value="MODUL_AJAR">Modul Ajar / RPP</option>
                <option value="SILABUS">Silabus Pembelajaran</option>
                <option value="SOAL_HARIAN">Paket Soal Harian / Kuis</option>
                <option value="LKPD">Lembar Kerja Peserta Didik (LKPD)</option>
                <option value="KISI_KISI">Kisi-kisi Soal Asesmen</option>
              </select>
            </div>

            {/* Judul Dokumen */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Judul Dokumen:
              </label>
              <Input
                value={uploadJudul}
                onChange={(e) => setUploadJudul(e.target.value)}
                placeholder="Contoh: Modul Ajar Algoritma dan Pemrograman"
                className="text-xs sm:text-sm h-9 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Hubungkan ke Butir TP (Opsional) */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Terkait Butir TP (Opsional):
              </label>
              <select
                value={uploadTpId}
                onChange={(e) => setUploadTpId(e.target.value)}
                className="w-full text-xs h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2.5 font-medium focus:ring-1 focus:ring-sky-500"
              >
                <option value="">-- Umum / Seluruh Capaian Semester --</option>
                {activePerangkat?.tujuanPembelajarans?.map((tp: any) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.kodeTp}: {tp.lingkupMateri}
                  </option>
                ))}
              </select>
            </div>

            {/* Unggah Berkas Dokumen/Excel/PDF */}
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 block">
                Unggah File Dokumen / Excel / PDF:
              </label>
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-900/40 text-center">
                <input
                  type="file"
                  id="manual-doc-file"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="manual-doc-file"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
                >
                  <FileSpreadsheet className="w-7 h-7 text-sky-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : 'Pilih Berkas Dokumen (.xlsx, .pdf, .docx)'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Sistem otomatis mengekstrak &amp; mengarsipkan berkas ke administrasi guru
                  </span>
                </label>
              </div>

              {uploadParsedText && (
                <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadParsedText}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenUploadDocModal(false)}
              className="h-9 text-xs border-slate-300 dark:border-slate-700"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitManualDoc}
              disabled={isProcessingUpload || !uploadJudul}
              className="h-9 text-xs font-bold shadow-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isProcessingUpload ? 'Memproses...' : 'Simpan ke Administrasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MODAL ROADMAP STEPPER DOKUMEN HIDUP GURU (TAHAP 1 - 3 SINKRON JADWAL & MAPEL) */}
      <Dialog open={openRoadmapStepperModal} onOpenChange={setOpenRoadmapStepperModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white text-[10px] font-bold">PETA JALAN HIDUP</Badge>
              <DialogTitle className="text-base font-bold text-foreground">
                Roadmap Administrasi Guru: Tahap 1 s.d. 3
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Dokumen hidup terpadu yang menuntun Anda dari pemetaan target (CP), breakdown TP &amp; alur kronologis ATP, hingga perancangan Modul Ajar dan KKTP kualitatif yang otomatis tersinkronisasi dengan jadwal penugasan resmi Anda.
            </DialogDescription>
          </DialogHeader>

          <TeacherRoadmapStepper
            initialFase={(activePerangkat?.fase as any) || 'FASE_E'}
            initialClassId={activePerangkat?.classId || setupClassId}
            initialSubjectId={activePerangkat?.subjectId || setupSubjectId}
            teacherId={guruContext?.teacher?.id}
            perangkatKurikulumId={selectedPerangkatId || undefined}
            assignedClasses={assignedClasses}
            assignedSubjects={assignedSubjects}
            schedulePairings={schedulePairings}
            existingTps={activePerangkat?.tujuanPembelajarans}
            onFinish={() => {
              setOpenRoadmapStepperModal(false)
              refetchDetail()
              refetchContext()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Panduan Lengkap Alur Kerja Administrasi Guru */}
      <PanduanAdministrasiGuruModal
        open={openPanduanModal}
        onOpenChange={setOpenPanduanModal}
      />
    </div>
  )
}
