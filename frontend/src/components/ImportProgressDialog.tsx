'use client'

import { useRef } from 'react'
import {
  CheckCircle2, XCircle, Loader2, FileSpreadsheet, AlertTriangle, Upload, Download, Database,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import * as XLSX from 'xlsx'

export type ImportStatus = 'idle' | 'reading' | 'uploading' | 'done' | 'error'

export interface ImportProgressState {
  status: ImportStatus
  totalRows: number
  totalBatches: number
  currentBatch: number
  successCount: number
  errorCount: number
  errorMessages: string[]
  label?: string
}

interface ImportProgressDialogProps {
  open: boolean
  state: ImportProgressState
  onClose: () => void
  onFileReady: (rows: any[]) => void
  customParser?: (rawData: any[]) => any[]
  columnMap?: { code: string; name: string }
  templateFileName?: string
  templateExample?: Record<string, string | number>
  accept?: string
  destination?: string
}

function getProgressPercent(state: ImportProgressState): number {
  if (state.status === 'reading') return 5
  if (state.status === 'done' || state.status === 'error') return 100
  if (state.totalBatches === 0) return 0
  return Math.min(95, Math.round((state.currentBatch / state.totalBatches) * 90) + 5)
}

function StatusIcon({ status }: { status: ImportStatus }) {
  if (status === 'done') return <CheckCircle2 className="w-9 h-9 text-emerald-500" />
  if (status === 'error') return <XCircle className="w-9 h-9 text-amber-500" />
  if (status === 'idle') return <FileSpreadsheet className="w-9 h-9 text-blue-500" />
  return (
    <div className="relative">
      <FileSpreadsheet className="w-9 h-9 text-blue-400" />
      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      </div>
    </div>
  )
}

export function ImportProgressDialog({
  open,
  state,
  onClose,
  onFileReady,
  customParser,
  columnMap = { code: 'Kode Mapel', name: 'Nama Mata Pelajaran' },
  templateFileName = 'template_import.xlsx',
  templateExample,
  accept = '.xlsx,.xls',
  destination,
}: ImportProgressDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const percent = getProgressPercent(state)
  const isProcessing = state.status === 'reading' || state.status === 'uploading'
  const isDone = state.status === 'done' || state.status === 'error'
  const label = state.label ?? 'Data'
  const columns = templateExample ? Object.keys(templateExample) : [columnMap.code, columnMap.name]

  const headerGradient: Record<ImportStatus, string> = {
    idle:      'from-blue-600 to-indigo-700',
    reading:   'from-blue-500 to-cyan-600',
    uploading: 'from-indigo-600 to-purple-700',
    done:      'from-emerald-500 to-teal-600',
    error:     'from-amber-500 to-orange-600',
  }

  const statusTitle: Record<ImportStatus, string> = {
    idle:      'Import Data ' + label,
    reading:   'Membaca File...',
    uploading: 'Mengupload ' + label,
    done:      'Import Selesai!',
    error:     'Selesai dengan Catatan',
  }

  const statusSub: Record<ImportStatus, string> = {
    idle:      'Siapkan file Excel sesuai format, lalu upload di bawah.',
    reading:   'Mohon tunggu, sistem sedang membaca isi file Excel.',
    uploading: 'Mengirim batch ' + state.currentBatch + ' dari ' + state.totalBatches + '...',
    done:      state.successCount + ' dari ' + state.totalRows + ' data berhasil diimpor.',
    error:     state.errorCount + ' data memerlukan perhatian.',
  }

  const downloadTemplate = () => {
    const example = templateExample ?? {
      [columnMap.code]: 'CONTOH-01',
      [columnMap.name]: 'Contoh Nama',
    }
    const ws = XLSX.utils.json_to_sheet([example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, templateFileName)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      let rows: any[]
      if (customParser) {
        rows = customParser(data)
      } else {
        rows = data
          .map((row: any) => ({
            code: String(row[columnMap.code] ?? '').trim(),
            name: String(row[columnMap.name] ?? '').trim(),
          }))
          .filter((r) => r.code && r.name)
      }
      if (rows.length === 0) {
        alert('File tidak memiliki data valid. Pastikan nama kolom sesuai template.')
        return
      }
      onFileReady(rows)
    }
    reader.readAsBinaryString(file)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v && (state.status === 'idle' || isDone)) onClose() }}
    >
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* HEADER */}
        <div className={`bg-gradient-to-br ${headerGradient[state.status]} px-6 pt-5 pb-5 text-white`}>
          <DialogHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex-shrink-0 bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                <StatusIcon status={state.status} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-white leading-snug">
                  {statusTitle[state.status]}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80 mt-0.5 leading-relaxed">
                  {statusSub[state.status]}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* FASE 1: IDLE */}
        {state.status === 'idle' && (
          <div className="p-5 space-y-3.5 max-h-[72vh] overflow-y-auto">

            {/* Download Template */}
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 hover:border-blue-500 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Download Template Excel
            </button>

            {/* Upload Drop-zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer group flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 py-7 transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:scale-110 transition-all duration-200">
                <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  Klik untuk memilih file Excel
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Mendukung format .xlsx / .xls
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
            </div>

            {/* Info Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">

              {/* Tujuan Upload */}
              {destination && (
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-500">
                      Tujuan Upload
                    </p>
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                      {destination}
                    </p>
                  </div>
                </div>
              )}

              {/* Kolom Wajib */}
              <div className="px-4 py-3 bg-white dark:bg-slate-900">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Kolom Wajib di File Excel ({columns.length} kolom)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((col, idx) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-[11px] font-mono px-2 py-0.5"
                    >
                      <span className="text-[9px] font-bold text-blue-400">{idx + 1}</span>
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contoh Data */}
              {templateExample && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    Contoh Isian
                  </p>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-900">
                    <table className="min-w-full text-[11px]">
                      <thead>
                        <tr>
                          {Object.keys(templateExample).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-800 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {Object.values(templateExample).map((val, i) => (
                            <td key={i} className="px-3 py-2 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono border-r last:border-r-0 border-slate-100 dark:border-slate-800">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Batal */}
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
            >
              Batal
            </button>
          </div>
        )}

        {/* FASE 2: PROCESSING / DONE / ERROR */}
        {state.status !== 'idle' && (
          <div className="p-5 space-y-4">

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {state.status === 'uploading'
                    ? 'Batch ' + state.currentBatch + ' / ' + state.totalBatches
                    : state.status === 'reading' ? 'Membaca file...' : 'Selesai'}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={'h-full rounded-full transition-all duration-500 ease-out ' + (
                    state.status === 'done' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' :
                    state.status === 'error' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-500'
                  )}
                  style={{ width: percent + '%' }}
                />
              </div>
            </div>

            {/* Stats */}
            {state.totalRows > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-center">
                  <div className="text-xl font-extrabold text-slate-800 dark:text-white tabular-nums">{state.totalRows}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Total</div>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center">
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{state.successCount}</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Berhasil</div>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <div className="text-xl font-extrabold text-red-500 dark:text-red-400 tabular-nums">{state.errorCount}</div>
                  <div className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 font-medium">Masalah</div>
                </div>
              </div>
            )}

            {/* Batch Pills */}
            {state.totalBatches > 1 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Progress Batch ({state.totalBatches} batch x 20 baris)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: state.totalBatches }, (_, i) => {
                    const n = i + 1
                    let cls = 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    if (isDone || n < state.currentBatch) cls = 'bg-emerald-500 text-white shadow-sm'
                    else if (n === state.currentBatch) cls = 'bg-blue-500 text-white animate-pulse shadow-sm'
                    return (
                      <span key={n} title={'Batch ' + n}
                        className={'inline-flex items-center justify-center w-7 h-7 text-[11px] font-bold rounded-lg transition-all duration-300 ' + cls}
                      >
                        {n}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error / Warning */}
            {state.errorMessages.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {state.errorMessages.length} Catatan
                  </span>
                </div>
                <ul className="px-3.5 py-2.5 space-y-1 max-h-28 overflow-y-auto">
                  {state.errorMessages.map((msg, i) => (
                    <li key={i} className="text-[11px] text-amber-700 dark:text-amber-400 font-mono flex gap-1.5">
                      <span className="text-amber-400 flex-shrink-0">›</span>
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Destination saat proses */}
            {destination && isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <Database className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Mengirim ke: <span className="font-semibold text-slate-500 dark:text-slate-400">{destination}</span></span>
              </div>
            )}

            {/* Tombol Tutup */}
            {isDone && (
              <button
                onClick={onClose}
                className={'w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ' + (
                  state.status === 'done'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                )}
              >
                {state.status === 'done' ? 'Selesai' : 'Tutup'}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
