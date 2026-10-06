'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  Printer, X, CreditCard, ShieldCheck, CheckCircle2, AlertCircle,
  FileSpreadsheet, Filter, Search, Download, GraduationCap, Building2,
  Calendar, Award, User, RefreshCw, Sparkles, Clock
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QRCodeSVG } from 'qrcode.react'

import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export interface ExamCardStudent {
  id: string
  name: string
  nisn: string
  nis: string
  className: string
  gender: string
  program?: string | null
  totalTagihan: number
  totalLunas: number
  sisaTagihan?: number
  belumLunasCount: number
  sppLunasCount: number
  avatarUrl?: string | null
}

interface ExamCardPrintDialogProps {
  open: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  students?: ExamCardStudent[]
  classes?: Array<{ id: string; name: string; gradeLevel?: number }>
  academicYear?: string
  semester?: string
  schoolName?: string
  logoUrl?: string
}

export function ExamCardPrintDialog({
  open,
  onClose,
  onOpenChange,
  students: initialStudents,
  classes = [],
  academicYear = '2026/2027',
  semester = 'Genap',
  schoolName = 'SMA MUHAMMADIYAH 1 PONOROGO',
  logoUrl = '/muhipo-log.jpg'
}: ExamCardPrintDialogProps) {
  const authenticatedQuery = useAuthenticatedQuery()
  const handleClose = () => {
    if (onClose) onClose()
    if (onOpenChange) onOpenChange(false)
  }

  const { data: fetchedStudents = [] } = useQuery<ExamCardStudent[]>({
    queryKey: ['finance-students'],
    queryFn: () => authenticatedQuery('/api-backend/finance/students'),
    enabled: !initialStudents || initialStudents.length === 0,
  })

  const students = initialStudents && initialStudents.length > 0 ? initialStudents : fetchedStudents

  const [examType, setExamType] = useState<'STS' | 'SAS' | 'SAT' | 'CBT' | 'TRYOUT'>('SAS')
  const [examNameCustom, setExamNameCustom] = useState('')
  const [filterKelas, setFilterKelas] = useState('ALL')
  const [filterStatusKeuangan, setFilterStatusKeuangan] = useState<'ALL' | 'LUNAS' | 'TUNGGAKAN'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [locationDate, setLocationDate] = useState('Ponorogo, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))
  const [officerName, setOfficerName] = useState('Agung Tribowo, SE')
  const [officerTitle, setOfficerTitle] = useState('Bendahara / Bagian Keuangan')
  const [notesRule, setNotesRule] = useState('1. Kartu ini wajib dibawa saat pelaksanaan ujian.\n2. Wajib berpakaian seragam rapi dan hadir 15 menit sebelum ujian.\n3. Syarat mengikuti ujian: Telah menyelesaikan administrasi keuangan.')

  const examTitleMap: Record<string, string> = {
    STS: 'SUMATIF TENGAH SEMESTER (STS)',
    SAS: 'SUMATIF AKHIR SEMESTER (SAS)',
    SAT: 'SUMATIF AKHIR TAHUN (SAT)',
    CBT: 'ASESMEN BERBASIS KOMPUTER (CBT)',
    TRYOUT: 'TRY OUT UJIAN SEKOLAH'
  }

  const activeExamTitle = examNameCustom.trim() || examTitleMap[examType] || 'SUMATIF AKHIR SEMESTER (SAS)'

  const uniqueClasses = useMemo(() => {
    if (classes && classes.length > 0) {
      return classes.map(c => c.name).sort()
    }
    return Array.from(new Set(students.map(s => s.className))).filter(Boolean).sort()
  }, [classes, students])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search) || s.nisn.includes(search) || s.className.toLowerCase().includes(search.toLowerCase())
      const matchKelas = filterKelas === 'ALL' || s.className === filterKelas
      const sisa = (s.sisaTagihan !== undefined && s.sisaTagihan > 0) ? s.sisaTagihan : Math.max(0, s.totalTagihan - s.totalLunas)
      const isLunas = sisa === 0 && s.belumLunasCount === 0
      const matchStatus = filterStatusKeuangan === 'ALL' || (filterStatusKeuangan === 'LUNAS' ? isLunas : !isLunas)
      return matchSearch && matchKelas && matchStatus
    })
  }, [students, search, filterKelas, filterStatusKeuangan])

  const effectiveStudents = useMemo(() => {
    if (selectedStudentIds.length > 0) {
      return students.filter(s => selectedStudentIds.includes(s.id))
    }
    return filteredStudents
  }, [selectedStudentIds, students, filteredStudents])

  const printAreaRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!printAreaRef.current) return

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n')

    let printIframe = document.getElementById('exam-card-print-frame') as HTMLIFrameElement
    if (!printIframe) {
      printIframe = document.createElement('iframe')
      printIframe.id = 'exam-card-print-frame'
      printIframe.style.position = 'fixed'
      printIframe.style.right = '0'
      printIframe.style.bottom = '0'
      printIframe.style.width = '0'
      printIframe.style.height = '0'
      printIframe.style.border = 'none'
      printIframe.style.opacity = '0'
      printIframe.style.pointerEvents = 'none'
      document.body.appendChild(printIframe)
    }

    const frameDoc = printIframe.contentWindow?.document
    if (!frameDoc) return

    const htmlContent = printAreaRef.current.innerHTML

    frameDoc.open()
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Kartu Ujian Peserta Didik - ${schoolName}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .exam-grid-container {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 8mm !important;
              page-break-inside: avoid !important;
            }
            .exam-card-single {
              border: 1.5px solid #1e293b !important;
              border-radius: 8px !important;
              padding: 10px 12px !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              height: 125mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              position: relative !important;
            }
            .page-break-item {
              page-break-after: always !important;
              break-after: page !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${htmlContent}
          </div>
        </body>
      </html>
    `)
    frameDoc.close()

    setTimeout(() => {
      printIframe.contentWindow?.focus()
      printIframe.contentWindow?.print()
    }, 400)
  }

  // Chunk students into pages of 4 cards per A4 page
  const chunkedStudents = useMemo(() => {
    const chunks: ExamCardStudent[][] = []
    for (let i = 0; i < effectiveStudents.length; i += 4) {
      chunks.push(effectiveStudents.slice(i, i + 4))
    }
    return chunks
  }, [effectiveStudents])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[96vw] md:max-w-5xl lg:max-w-6xl w-full max-h-[94vh] flex flex-col p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Header Modal */}
        <div className="shrink-0 bg-white dark:bg-slate-900 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cetak Kartu Peserta Ujian (SIKU & SIMASMUH)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generator cetak kartu ujian resmi berbasis verifikasi status administrasi keuangan.
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Jenis Ujian</Label>
              <Select value={examType} onValueChange={(v: any) => setExamType(v)}>
                <SelectTrigger className="h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STS">Sumatif Tengah Semester (STS)</SelectItem>
                  <SelectItem value="SAS">Sumatif Akhir Semester (SAS)</SelectItem>
                  <SelectItem value="SAT">Sumatif Akhir Tahun (SAT)</SelectItem>
                  <SelectItem value="CBT">Asesmen CBT Muhipo</SelectItem>
                  <SelectItem value="TRYOUT">Try Out Ujian Sekolah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Filter Kelas</Label>
              <Select value={filterKelas} onValueChange={(v) => setFilterKelas(v || 'ALL')}>
                <SelectTrigger className="h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kelas ({students.length})</SelectItem>
                  {uniqueClasses.map(k => (
                    <SelectItem key={k} value={k}>Kelas {k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Syarat Keuangan</Label>
              <Select value={filterStatusKeuangan} onValueChange={(v: any) => setFilterStatusKeuangan(v)}>
                <SelectTrigger className="h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Siswa</SelectItem>
                  <SelectItem value="LUNAS">Hanya Bebas Tunggakan / Lunas</SelectItem>
                  <SelectItem value="TUNGGAKAN">Masih Ada Tunggakan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Pencarian</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nama / NISN / NIS..."
                  className="h-8.5 pl-8 text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200">
                {effectiveStudents.length} Siswa Siap Cetak
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 font-medium">
                {chunkedStudents.length} Lembar A4 ({chunkedStudents.length * 4 >= effectiveStudents.length ? `${effectiveStudents.length} kartu` : ''})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentIds(filteredStudents.map(s => s.id))
                }}
                className="h-8 text-xs font-bold"
              >
                Pilih Semua Sesuai Filter
              </Button>
              {selectedStudentIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudentIds([])}
                  className="h-8 text-xs font-bold text-slate-500"
                >
                  Reset Pilihan ({selectedStudentIds.length})
                </Button>
              )}
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={effectiveStudents.length === 0}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs h-8 px-4 gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak {effectiveStudents.length} Kartu
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/80 custom-scrollbar">
          {effectiveStudents.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Tidak ada data siswa yang cocok dengan filter</p>
              <p className="text-xs text-slate-400 mt-1">Ubah filter kelas atau status syarat keuangan di atas.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {chunkedStudents.map((pageStudents, pageIdx) => (
                <div
                  key={pageIdx}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">
                    <span>Halaman A4 #{pageIdx + 1}</span>
                    <span className="text-slate-400 font-normal">Memuat {pageStudents.length} Kartu Ujian</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pageStudents.map(student => {
                      const sisa = (student.sisaTagihan !== undefined && student.sisaTagihan > 0) ? student.sisaTagihan : Math.max(0, student.totalTagihan - student.totalLunas)
                      const isLunas = sisa === 0 && student.belumLunasCount === 0

                      return (
                        <div
                          key={student.id}
                          className="border-2 border-slate-800 dark:border-slate-700 rounded-xl p-3.5 bg-white text-slate-900 space-y-2 relative shadow-xs"
                        >
                          {/* Kop Kartu */}
                          <div className="flex items-center gap-2.5 pb-2 border-b-2 border-slate-800">
                            <div className="w-10 h-10 shrink-0 relative flex items-center justify-center">
                              <img src={logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
                            </div>
                            <div className="min-w-0 flex-1 text-center">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
                                MAJELIS PENDIDIKAN DASAR MENENGAH & PNF
                              </p>
                              <h4 className="text-xs font-black uppercase text-slate-900 leading-tight">
                                {schoolName}
                              </h4>
                              <p className="text-[9px] font-bold text-rose-700 uppercase tracking-widest mt-0.5">
                                KARTU PESERTA {activeExamTitle}
                              </p>
                              <p className="text-[8px] font-semibold text-slate-500">
                                Tahun Ajaran {academicYear} (Semester {semester})
                              </p>
                            </div>
                          </div>

                          {/* Data Siswa & Pas Foto */}
                          <div className="flex items-start gap-3 pt-1">
                            <div className="flex-1 space-y-1 text-[11px]">
                              <div className="grid grid-cols-3 gap-1">
                                <span className="font-semibold text-slate-500">Nama Lengkap</span>
                                <span className="col-span-2 font-black text-slate-900 truncate">: {student.name}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <span className="font-semibold text-slate-500">NISN / NIS</span>
                                <span className="col-span-2 font-mono font-bold text-slate-800">: {student.nisn} / {student.nis}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <span className="font-semibold text-slate-500">Kelas / Rombel</span>
                                <span className="col-span-2 font-bold text-slate-900">: {student.className}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <span className="font-semibold text-slate-500">Program</span>
                                <span className="col-span-2 font-semibold text-slate-800">: {student.program || 'Reguler'}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 items-center pt-0.5">
                                <span className="font-semibold text-slate-500">Validasi SIKU</span>
                                <span className="col-span-2">
                                  : {isLunas ? (
                                    <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.2 rounded text-[9px]">
                                      LUNAS ADMINISTRASI
                                    </span>
                                  ) : (
                                    <span className="font-black text-rose-700 bg-rose-50 border border-rose-300 px-1.5 py-0.2 rounded text-[9px]">
                                      DISPENSASI / ANGSURAN
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Foto & QR Code Verification */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <div className="w-14 h-16 border border-slate-300 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                                {student.avatarUrl ? (
                                  <img src={student.avatarUrl} alt="Foto" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-center p-1">
                                    <User className="w-6 h-6 text-slate-400 mx-auto" />
                                    <span className="text-[7px] text-slate-400 font-bold block">Foto 3x4</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-0.5 bg-white border border-slate-200 rounded">
                                <QRCodeSVG value={`SIMASMUH-EXAM:${student.nisn}:${student.name}`} size={32} />
                              </div>
                            </div>
                          </div>

                          {/* Tata Tertib Ringkas & Tanda Tangan */}
                          <div className="pt-2 border-t border-slate-200 flex items-end justify-between text-[8px] gap-2">
                            <div className="flex-1 text-slate-600 space-y-0.5">
                              <p className="font-bold text-slate-800 uppercase">Catatan Peserta:</p>
                              <p className="line-clamp-2 leading-tight">1. Wajib membawa kartu saat ujian CBT/Tertulis.</p>
                              <p className="line-clamp-1 leading-tight">2. Hadir 15 menit sebelum asesmen dimulai.</p>
                            </div>
                            <div className="text-center shrink-0 w-28 text-slate-800">
                              <p className="text-[8px] font-medium leading-tight">Ponorogo, {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                              <p className="text-[8px] font-bold leading-tight">Bagian Keuangan</p>
                              <div className="h-6 flex items-center justify-center">
                                <span className="text-[8px] text-slate-400 font-mono italic">[ Ttd & Cap ]</span>
                              </div>
                              <p className="font-black text-[8px] border-t border-slate-800 pt-0.5 leading-tight">{officerName}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden Container exclusively for printing output */}
        <div className="hidden">
          <div ref={printAreaRef}>
            {chunkedStudents.map((pageStudents, pageIdx) => (
              <div
                key={pageIdx}
                className={`exam-page-print ${pageIdx < chunkedStudents.length - 1 ? 'page-break-item' : ''}`}
                style={{ padding: '0', margin: '0' }}
              >
                <div className="exam-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8mm' }}>
                  {pageStudents.map(student => {
                    const sisa = (student.sisaTagihan !== undefined && student.sisaTagihan > 0) ? student.sisaTagihan : Math.max(0, student.totalTagihan - student.totalLunas)
                    const isLunas = sisa === 0 && student.belumLunasCount === 0

                    return (
                      <div
                        key={student.id}
                        className="exam-card-single"
                        style={{
                          border: '1.5px solid #0f172a',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          background: '#ffffff',
                          color: '#000000',
                          height: '125mm',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Kop Kartu */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '2px solid #0f172a' }}>
                          <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                            <img src={logoUrl} alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
                          </div>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', margin: '0', lineHeight: '1.1' }}>
                              MAJELIS PENDIDIKAN DASAR MENENGAH & PNF
                            </p>
                            <h4 style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '2px 0 0 0', lineHeight: '1.1' }}>
                              {schoolName}
                            </h4>
                            <p style={{ fontSize: '10px', fontWeight: '900', color: '#b91c1c', textTransform: 'uppercase', margin: '2px 0 0 0', letterSpacing: '0.5px' }}>
                              KARTU PESERTA {activeExamTitle}
                            </p>
                            <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', margin: '1px 0 0 0' }}>
                              Tahun Ajaran {academicYear} (Semester {semester})
                            </p>
                          </div>
                        </div>

                        {/* Data Siswa */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0' }}>
                          <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.4' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: '90px', fontWeight: '600', color: '#475569', padding: '2px 0' }}>Nama Lengkap</td>
                                  <td style={{ fontWeight: 'bold', color: '#0f172a', padding: '2px 0' }}>: {student.name}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>NISN / NIS</td>
                                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold', padding: '2px 0' }}>: {student.nisn} / {student.nis}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Kelas / Rombel</td>
                                  <td style={{ fontWeight: 'bold', padding: '2px 0' }}>: {student.className}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Program</td>
                                  <td style={{ fontWeight: '600', padding: '2px 0' }}>: {student.program || 'Reguler'}</td>
                                </tr>
                                <tr>
                                  <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Status SIKU</td>
                                  <td style={{ padding: '2px 0' }}>
                                    : <span style={{ fontWeight: 'bold', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', border: isLunas ? '1px solid #10b981' : '1px solid #f43f5e', color: isLunas ? '#047857' : '#be123c', background: isLunas ? '#ecfdf5' : '#fff1f2' }}>
                                      {isLunas ? 'LUNAS ADMINISTRASI' : 'DISPENSASI / ANGSURAN'}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <div style={{ width: '55px', height: '65px', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', fontWeight: 'bold' }}>Foto<br/>3x4</span>
                              )}
                            </div>
                            <div style={{ padding: '2px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                              <QRCodeSVG value={`SIMASMUH-EXAM:${student.nisn}:${student.name}`} size={32} />
                            </div>
                          </div>
                        </div>

                        {/* Footer & TTD */}
                        <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', fontSize: '8px' }}>
                          <div style={{ flex: 1, color: '#475569', lineHeight: '1.2' }}>
                            <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Tata Tertib Singkat:</strong>
                            <p style={{ margin: '1px 0 0 0' }}>1. Kartu ini wajib dibawa saat pelaksanaan ujian.</p>
                            <p style={{ margin: '1px 0 0 0' }}>2. Wajib hadir 15 menit sebelum ujian dimulai.</p>
                          </div>
                          <div style={{ textAlign: 'center', width: '110px', flexShrink: 0, color: '#0f172a' }}>
                            <p style={{ margin: '0', fontSize: '8px' }}>Ponorogo, {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                            <p style={{ margin: '1px 0 0 0', fontWeight: 'bold', fontSize: '8px' }}>Bagian Keuangan</p>
                            <div style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '7px', color: '#94a3b8', fontStyle: 'italic' }}>[ Cap & Ttd ]</span>
                            </div>
                            <p style={{ margin: '0', fontWeight: 'bold', borderTop: '1px solid #0f172a', paddingTop: '1px' }}>{officerName}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ExamCardPrintDialog
