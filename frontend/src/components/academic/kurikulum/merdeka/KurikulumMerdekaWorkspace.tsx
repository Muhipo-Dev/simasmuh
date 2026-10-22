'use client'

import React, { useState } from 'react'
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
  Smartphone, UserCheck, RefreshCw, Eye
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
  const [openDailyViewModal, setOpenDailyViewModal] = useState(false)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

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
      const res = await authenticatedFetch('/api/kurikulum-merdeka/guru-context')
      if (!res.ok) throw new Error('Gagal memuat konteks penugasan guru')
      return res.json()
    },
  })

  const perangkatList = guruContext?.perangkatList || []
  const assignedClasses = guruContext?.assignedClasses || []
  const assignedSubjects = guruContext?.assignedSubjects || []

  // Auto select perangkat pertama jika ada
  React.useEffect(() => {
    if (!selectedPerangkatId && perangkatList.length > 0) {
      setSelectedPerangkatId(perangkatList[0].id)
    }
  }, [perangkatList, selectedPerangkatId])

  // 2. Fetch Detail Perangkat Aktif Terpilih
  const { data: activePerangkat, isLoading: loadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['kurikulum-merdeka-detail', selectedPerangkatId],
    queryFn: async () => {
      if (!selectedPerangkatId) return null
      const res = await authenticatedFetch(`/api/kurikulum-merdeka/perangkat/${selectedPerangkatId}`)
      if (!res.ok) throw new Error('Gagal memuat detail perangkat')
      return res.json()
    },
    enabled: !!selectedPerangkatId,
  })

  // 3. Fetch Master Capaian Pembelajaran (CP)
  const { data: cpList } = useQuery({
    queryKey: ['capaian-pembelajaran-list', activePerangkat?.fase],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/kurikulum-merdeka/capaian-pembelajaran?fase=${activePerangkat?.fase || 'FASE_E'}`)
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
      const res = await authenticatedFetch(`/api/kurikulum-merdeka/daily-view?scheduleId=${selectedScheduleId}`)
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
      const res = await authenticatedFetch('/api/kurikulum-merdeka/setup', {
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-card rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Administrasi Kurikulum Terpadu
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
          <Button
            size="sm"
            onClick={() => setOpenSetupModal(true)}
            className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Setup Kelas Baru
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
                <Copy className="w-3.5 h-3.5 text-primary" />
                Sync Rombel Paralel
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={handleDownloadSupervisiZip}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                title="Unduh 1 bundel file zip berisi seluruh dokumen siap supervisi"
              >
                <FileDown className="w-3.5 h-3.5" />
                Paket Siap Supervisi (.zip)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Kartu Status Administrasi Kelas (Indikator Siap / Belum) */}
      {activePerangkat && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { title: 'Tujuan Pembelajaran', count: `${activePerangkat.tujuanPembelajarans?.length || 0} TP`, status: (activePerangkat.tujuanPembelajarans?.length || 0) > 0 ? 'Siap' : 'Belum' },
            { title: 'Alokasi Promes', count: `${activePerangkat.promesAllocations?.length || 0} Plot`, status: (activePerangkat.promesAllocations?.length || 0) > 0 ? 'Siap' : 'Belum' },
            { title: 'Modul Ajar / RPP', count: `${activePerangkat.dokumenItems?.filter((d: any) => d.kategori === 'MODUL_AJAR').length || 0} Berkas`, status: activePerangkat.dokumenItems?.some((d: any) => d.kategori === 'MODUL_AJAR') ? 'Siap' : 'Belum' },
            { title: 'LKPD Siswa', count: `${activePerangkat.dokumenItems?.filter((d: any) => d.kategori === 'LKPD').length || 0} Lembar`, status: activePerangkat.dokumenItems?.some((d: any) => d.kategori === 'LKPD') ? 'Siap' : 'Belum' },
            { title: 'Asesmen & Kisi', count: `${activePerangkat.dokumenItems?.filter((d: any) => ['ASESMEN_SUMATIF', 'SOAL_STS', 'SOAL_SAS'].includes(d.kategori)).length || 0} Set`, status: activePerangkat.dokumenItems?.some((d: any) => d.kategori.includes('SOAL')) ? 'Siap' : 'Belum' },
            { title: 'Nilai Terinput', count: `${activePerangkat.nilaiSiswaTps?.length || 0} Entri`, status: (activePerangkat.nilaiSiswaTps?.length || 0) > 0 ? 'Siap' : 'Belum' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-card rounded-xl border border-border shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground truncate">{item.title}</span>
                <Badge
                  variant={item.status === 'Siap' ? 'default' : 'secondary'}
                  className={`text-[9px] px-1.5 py-0 font-bold ${item.status === 'Siap' ? 'bg-emerald-600 text-white' : ''}`}
                >
                  {item.status}
                </Badge>
              </div>
              <p className="text-base font-bold text-foreground">{item.count}</p>
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
                <div className="flex items-center gap-2">
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
            <DialogTitle className="text-base font-bold">Setup Kelas Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Pilih kelas dan mata pelajaran penugasan Anda untuk mengaktifkan administrasi terpadu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Kelas / Rombel:</label>
              <select
                value={setupClassId}
                onChange={(e) => setSetupClassId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
              >
                <option value="">-- Pilih Kelas --</option>
                {assignedClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Tingkat {c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Mata Pelajaran:</label>
              <select
                value={setupSubjectId}
                onChange={(e) => setSetupSubjectId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 font-medium"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {assignedSubjects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
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
                  value={setupJpPerMinggu}
                  onChange={(e) => setSetupJpPerMinggu(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
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
    </div>
  )
}
