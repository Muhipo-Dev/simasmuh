'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  Printer, X, Award, ShieldCheck, CheckCircle2, AlertCircle,
  FileSpreadsheet, Filter, Search, Download, GraduationCap, Building2,
  Calendar, User, RefreshCw, Sparkles, Clock, FileCheck
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QRCodeSVG } from 'qrcode.react'

import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export interface SklStudent {
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
}

interface SklPrintDialogProps {
  open: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  students?: SklStudent[]
  classes?: Array<{ id: string; name: string; gradeLevel?: number }>
  academicYear?: string
  schoolName?: string
  headmasterName?: string
  headmasterNip?: string
  logoUrl?: string
}

export function SklPrintDialog({
  open,
  onClose,
  onOpenChange,
  students: initialStudents,
  classes = [],
  academicYear = '2026/2027',
  schoolName = 'SMA MUHAMMADIYAH 1 PONOROGO',
  headmasterName = 'Drs. H. Sugeng Riadi, M.Pd.',
  headmasterNip = '196805141994121002',
  logoUrl = '/muhipo-log.jpg'
}: SklPrintDialogProps) {
  const authenticatedQuery = useAuthenticatedQuery()
  const handleClose = () => {
    if (onClose) onClose()
    if (onOpenChange) onOpenChange(false)
  }

  const { data: fetchedStudents = [] } = useQuery<SklStudent[]>({
    queryKey: ['finance-students'],
    queryFn: () => authenticatedQuery('/api-backend/finance/students'),
    enabled: !initialStudents || initialStudents.length === 0,
  })

  const students = initialStudents && initialStudents.length > 0 ? initialStudents : fetchedStudents
  const [filterKelas, setFilterKelas] = useState('ALL')
  const [filterStatusKeuangan, setFilterStatusKeuangan] = useState<'ALL' | 'LUNAS' | 'TUNGGAKAN'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [letterNumber, setLetterNumber] = useState(`421.3/SKL/${new Date().getFullYear()}/SMA.MUH.1`)
  const [releaseDate, setReleaseDate] = useState(`Ponorogo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)

  // Default filter to Class XII if available
  const grade12Classes = useMemo(() => {
    return Array.from(new Set(students.map(s => s.className))).filter(c => c.startsWith('XII') || c.startsWith('12') || c.includes('XII')).sort()
  }, [students])

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.className))).filter(Boolean).sort()
  }, [students])

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

    let printIframe = document.getElementById('skl-print-frame') as HTMLIFrameElement
    if (!printIframe) {
      printIframe = document.createElement('iframe')
      printIframe.id = 'skl-print-frame'
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
          <title>Surat Keterangan Bebas Keuangan & Kelulusan (SKL) - ${schoolName}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 20mm;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 15mm 20mm;
              }
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: 'Times New Roman', Times, serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .skl-sheet-single {
              page-break-after: always !important;
              break-after: page !important;
              box-sizing: border-box !important;
              min-height: 250mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              padding: 0 !important;
            }
            .skl-sheet-single:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `)
    frameDoc.close()

    setTimeout(() => {
      printIframe.contentWindow?.focus()
      printIframe.contentWindow?.print()
    }, 400)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[96vw] md:max-w-5xl lg:max-w-6xl w-full max-h-[94vh] flex flex-col p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Header Modal */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-800 via-teal-800 to-green-900 p-4 sm:p-5 text-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md border border-white/20">
              <Award className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Surat Keterangan Lulus & Bebas Keuangan (SKL)
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs">
                Cetak Surat Keterangan Kelulusan & Bebas Tanggungan Keuangan Peserta Didik (SIKU Muhipo).
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Filter Kelas</Label>
              <Select value={filterKelas} onValueChange={(v) => setFilterKelas(v || 'ALL')}>
                <SelectTrigger className="h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kelas ({students.length})</SelectItem>
                  {grade12Classes.length > 0 && (
                    <SelectItem value={grade12Classes[0]}>Prioritas Kelas XII ({grade12Classes.join(', ')})</SelectItem>
                  )}
                  {uniqueClasses.map(k => (
                    <SelectItem key={k} value={k}>Kelas {k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Syarat Bebas Keuangan</Label>
              <Select value={filterStatusKeuangan} onValueChange={(v: any) => setFilterStatusKeuangan(v)}>
                <SelectTrigger className="h-8.5 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status Siswa</SelectItem>
                  <SelectItem value="LUNAS">Hanya yang LUNAS Bebas Keuangan</SelectItem>
                  <SelectItem value="TUNGGAKAN">Masih Ada Tunggakan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Nomor Surat</Label>
              <Input
                value={letterNumber}
                onChange={e => setLetterNumber(e.target.value)}
                className="h-8.5 text-xs font-mono font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Pencarian Siswa</Label>
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
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                {effectiveStudents.length} Lembar SKL Siap Cetak
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudentIds(filteredStudents.map(s => s.id))}
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
                  Reset Pilihan
                </Button>
              )}
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={effectiveStudents.length === 0}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs h-8 px-4 gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak {effectiveStudents.length} Dokumen SKL
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950/80 custom-scrollbar">
          {effectiveStudents.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Tidak ada data siswa yang cocok dengan filter</p>
              <p className="text-xs text-slate-400 mt-1">Ubah filter kelas atau status syarat keuangan di atas.</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {effectiveStudents.map((student, idx) => {
                const sisa = (student.sisaTagihan !== undefined && student.sisaTagihan > 0) ? student.sisaTagihan : Math.max(0, student.totalTagihan - student.totalLunas)
                const isLunas = sisa === 0 && student.belumLunasCount === 0

                return (
                  <div
                    key={student.id}
                    className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-10 shadow-md space-y-5 font-serif"
                  >
                    {/* Kop Surat Resmi */}
                    <div className="flex items-center gap-4 pb-3 border-b-2 border-slate-900 text-center">
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          PIMPINAN DAERAH MUHAMMADIYAH PONOROGO
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL
                        </p>
                        <h3 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-tight">
                          {schoolName}
                        </h3>
                        <p className="text-[11px] font-sans text-slate-600 mt-0.5">
                          Jl. Budi Utomo No. 10, Ronowijayan, Siman, Ponorogo · Telp: (0352) 481524 · NPSN: 20510141
                        </p>
                      </div>
                    </div>

                    {/* Judul Surat */}
                    <div className="text-center space-y-1">
                      <h4 className="text-base font-bold uppercase tracking-wider underline text-slate-900">
                        SURAT KETERANGAN BEBAS KEUANGAN & KELULUSAN
                      </h4>
                      <p className="text-xs font-mono text-slate-700">
                        Nomor: {letterNumber}/{idx + 1}
                      </p>
                    </div>

                    {/* Isi Surat */}
                    <div className="text-xs sm:text-sm text-slate-800 space-y-3 leading-relaxed">
                      <p>
                        Yang bertanda tangan di bawah ini, Kepala {schoolName}, menerangkan dengan sebenarnya bahwa:
                      </p>

                      <div className="pl-4 sm:pl-8 space-y-1.5 font-sans text-xs sm:text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-semibold text-slate-600">Nama Lengkap</span>
                          <span className="col-span-2 font-bold text-slate-950">: {student.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-semibold text-slate-600">NISN / NIS</span>
                          <span className="col-span-2 font-mono font-bold text-slate-900">: {student.nisn} / {student.nis}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-semibold text-slate-600">Kelas / Rombel</span>
                          <span className="col-span-2 font-bold text-slate-900">: {student.className}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="font-semibold text-slate-600">Program Studi</span>
                          <span className="col-span-2 font-medium text-slate-900">: {student.program || 'Reguler'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <span className="font-semibold text-slate-600">Status Bebas Keuangan</span>
                          <span className="col-span-2">
                            : {isLunas ? (
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> BEBAS TANGGUNGAN KEUANGAN (LUNAS)
                              </span>
                            ) : (
                              <span className="font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> MASIH TERDAPAT TUNGGAKAN ADMINISTRASI
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <p className="pt-2">
                        Berdasarkan hasil verifikasi sistem informasi keuangan (SIKU) dan kriteria kelulusan peserta didik Tahun Ajaran {academicYear}, yang bersangkutan dinyatakan telah memenuhi persyaratan administrasi sekolah.
                      </p>

                      <p>
                        Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya untuk keperluan pengambilan Ijazah, Rapor, atau kelanjutan studi ke jenjang pendidikan tinggi.
                      </p>
                    </div>

                    {/* Tanda Tangan & Legalisir */}
                    <div className="pt-6 flex items-end justify-between text-xs sm:text-sm">
                      <div className="p-2 border border-slate-300 rounded-lg text-center font-sans space-y-1">
                        <QRCodeSVG value={`SIMASMUH-SKL:${student.nisn}:${student.name}:${isLunas ? 'LUNAS' : 'PENDING'}`} size={64} />
                        <span className="text-[9px] text-slate-500 font-mono block">Verifikasi Digital</span>
                      </div>

                      <div className="text-center w-64 space-y-1 text-slate-900">
                        <p className="text-xs">{releaseDate}</p>
                        <p className="text-xs font-bold">Kepala Sekolah,</p>
                        <div className="h-16 flex items-center justify-center">
                          <span className="text-xs text-slate-400 font-mono italic">[ Tanda Tangan & Stempel ]</span>
                        </div>
                        <p className="font-bold underline text-sm">{headmasterName}</p>
                        <p className="text-xs font-mono text-slate-600">NIP. {headmasterNip}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Hidden Container for Printing */}
        <div className="hidden">
          <div ref={printAreaRef}>
            {effectiveStudents.map((student, idx) => {
              const sisa = (student.sisaTagihan !== undefined && student.sisaTagihan > 0) ? student.sisaTagihan : Math.max(0, student.totalTagihan - student.totalLunas)
              const isLunas = sisa === 0 && student.belumLunasCount === 0

              return (
                <div
                  key={student.id}
                  className="skl-sheet-single"
                  style={{
                    padding: '0',
                    margin: '0',
                    minHeight: '260mm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontFamily: "'Times New Roman', Times, serif",
                    color: '#000000'
                  }}
                >
                  <div>
                    {/* Kop Surat Resmi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '10px', borderBottom: '3px double #000000', textAlign: 'center' }}>
                      <div style={{ width: '65px', height: '65px', flexShrink: 0 }}>
                        <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0', letterSpacing: '0.5px' }}>
                          PIMPINAN DAERAH MUHAMMADIYAH PONOROGO
                        </p>
                        <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '1px 0 0 0', letterSpacing: '0.5px' }}>
                          MAJELIS PENDIDIKAN DASAR MENENGAH DAN PENDIDIKAN NONFORMAL
                        </p>
                        <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', margin: '3px 0 0 0' }}>
                          {schoolName}
                        </h3>
                        <p style={{ fontSize: '10px', fontFamily: 'Arial, sans-serif', color: '#333333', margin: '3px 0 0 0' }}>
                          Jl. Budi Utomo No. 10, Ronowijayan, Siman, Ponorogo · Telp: (0352) 481524 · NPSN: 20510141
                        </p>
                      </div>
                    </div>

                    {/* Judul Surat */}
                    <div style={{ textAlign: 'center', margin: '20px 0 15px 0' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', margin: '0' }}>
                        SURAT KETERANGAN BEBAS KEUANGAN & KELULUSAN
                      </h4>
                      <p style={{ fontSize: '12px', fontFamily: 'monospace', margin: '3px 0 0 0' }}>
                        Nomor: {letterNumber}/{idx + 1}
                      </p>
                    </div>

                    {/* Isi Surat */}
                    <div style={{ fontSize: '13px', lineHeight: '1.6', textAlign: 'justify' }}>
                      <p style={{ margin: '0 0 10px 0' }}>
                        Yang bertanda tangan di bawah ini, Kepala {schoolName}, menerangkan dengan sebenarnya bahwa:
                      </p>

                      <div style={{ margin: '10px 0 15px 25px', fontFamily: 'Arial, sans-serif', fontSize: '12.5px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '150px', padding: '3px 0', fontWeight: '600' }}>Nama Lengkap</td>
                              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>: {student.name}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 0', fontWeight: '600' }}>NISN / NIS</td>
                              <td style={{ padding: '3px 0', fontFamily: 'monospace', fontWeight: 'bold' }}>: {student.nisn} / {student.nis}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 0', fontWeight: '600' }}>Kelas / Rombel</td>
                              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>: {student.className}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 0', fontWeight: '600' }}>Program Studi</td>
                              <td style={{ padding: '3px 0' }}>: {student.program || 'Reguler'}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '3px 0', fontWeight: '600' }}>Status Bebas Keuangan</td>
                              <td style={{ padding: '3px 0' }}>
                                : <strong style={{ border: '1px solid #000', padding: '2px 6px', fontSize: '11px' }}>
                                  {isLunas ? 'BEBAS TANGGUNGAN KEUANGAN (LUNAS)' : 'MASIH TERDAPAT TUNGGAKAN ADMINISTRASI'}
                                </strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p style={{ margin: '0 0 10px 0', textIndent: '30px' }}>
                        Berdasarkan hasil verifikasi sistem informasi keuangan (SIKU) dan kriteria kelulusan peserta didik Tahun Ajaran {academicYear}, yang bersangkutan dinyatakan telah memenuhi persyaratan administrasi sekolah.
                      </p>

                      <p style={{ margin: '0 0 10px 0', textIndent: '30px' }}>
                        Demikian surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya untuk keperluan pengambilan Ijazah, Rapor, atau kelanjutan studi ke jenjang pendidikan tinggi.
                      </p>
                    </div>
                  </div>

                  {/* TTD & QR */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '30px', fontSize: '12px' }}>
                    <div style={{ textAlign: 'center', padding: '4px', border: '1px solid #999999', borderRadius: '4px' }}>
                      <QRCodeSVG value={`SIMASMUH-SKL:${student.nisn}:${student.name}:${isLunas ? 'LUNAS' : 'PENDING'}`} size={64} />
                      <span style={{ fontSize: '8px', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>Validasi SIMASMUH</span>
                    </div>

                    <div style={{ textAlign: 'center', width: '220px' }}>
                      <p style={{ margin: '0' }}>{releaseDate}</p>
                      <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>Kepala Sekolah,</p>
                      <div style={{ height: '60px' }}></div>
                      <p style={{ margin: '0', fontWeight: 'bold', textDecoration: 'underline' }}>{headmasterName}</p>
                      <p style={{ margin: '2px 0 0 0', fontFamily: 'monospace', fontSize: '11px' }}>NIP. {headmasterNip}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SklPrintDialog
