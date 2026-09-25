'use client'

import React, { useState, useRef } from 'react'
import { Printer, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BukuIndukSheet, BukuIndukData } from './BukuIndukSheet'

interface BukuIndukPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentDataList: BukuIndukData[]
  title?: string
}

export function BukuIndukPrintDialog({
  open,
  onOpenChange,
  studentDataList,
  title = 'Cetak Lembar Buku Induk Peserta Didik (K-Merdeka)'
}: BukuIndukPrintDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentStudent = studentDataList[currentIndex] || studentDataList[0]

  const singlePrintRef = useRef<HTMLDivElement>(null)
  const allPrintRef = useRef<HTMLDivElement>(null)

  const printHtmlContent = (htmlContent: string) => {
    // Kumpulkan seluruh CSS stylesheet dan tag style dari dokumen utama
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n')

    let printIframe = document.getElementById('buku-induk-print-frame') as HTMLIFrameElement
    if (!printIframe) {
      printIframe = document.createElement('iframe')
      printIframe.id = 'buku-induk-print-frame'
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

    frameDoc.open()
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Buku Induk - SIMASMUH</title>
          ${styleTags}
          <style>
            @page {
              size: 330mm 215mm landscape;
              margin: 0;
            }
            @media print {
              @page {
                size: 330mm 215mm landscape;
                margin: 0;
              }
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 330mm !important;
              min-height: 215mm !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .buku-induk-page-print {
              width: 330mm !important;
              height: 215mm !important;
              max-height: 215mm !important;
              min-height: 215mm !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              border: none !important;
              box-shadow: none !important;
              overflow: hidden !important;
              background: #ffffff !important;
            }
            .buku-induk-page-print:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .buku-induk-page {
              width: 330mm !important;
              height: 215mm !important;
              max-width: 330mm !important;
              max-height: 215mm !important;
              min-height: 215mm !important;
              padding: 4mm 9mm 3mm 8mm !important;
              margin: 0 !important;
              box-sizing: border-box !important;
              border: none !important;
              box-shadow: none !important;
              overflow: hidden !important;
              background: #ffffff !important;
            }
          </style>
        </head>
        <body class="bg-white">
          ${htmlContent}
        </body>
      </html>
    `)
    frameDoc.close()

    setTimeout(() => {
      printIframe.contentWindow?.focus()
      printIframe.contentWindow?.print()
    }, 250)
  }

  const handlePrintSingle = () => {
    if (singlePrintRef.current) {
      printHtmlContent(singlePrintRef.current.innerHTML)
    }
  }

  const handlePrintAll = () => {
    if (allPrintRef.current) {
      printHtmlContent(allPrintRef.current.innerHTML)
    }
  }

  if (!currentStudent && studentDataList.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[98vw] xl:max-w-[1440px] 2xl:max-w-[1520px] h-[96vh] max-h-[96vh] flex flex-col p-0 overflow-hidden !rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        {/* Modal Header dengan padding sudut yang aman dan rapi */}
        <DialogHeader className="px-5 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {title}
                  </DialogTitle>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-300 dark:border-emerald-800">
                    Standar F4 Landscape (330 × 215 mm)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  Format presisi 1 lembar F4 Landscape (Folio Mendatar) sesuai blanko resmi Buku Induk Kurikulum Merdeka.
                </p>
              </div>
            </div>

            {studentDataList.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold px-1.5">
                  {currentIndex + 1} / {studentDataList.length}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentIndex === studentDataList.length - 1}
                  onClick={() => setCurrentIndex(prev => Math.min(studentDataList.length - 1, prev + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Preview Scrollable Body */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 custom-scrollbar bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
          <div className="w-full flex flex-col items-center gap-6 overflow-visible p-1">
            {/* Area Preview Siswa Terpilih */}
            <div ref={singlePrintRef} className="w-fit">
              <div className="buku-induk-page-print shadow-2xl rounded-sm bg-white border border-slate-300 shrink-0">
                {currentStudent && <BukuIndukSheet data={currentStudent} />}
              </div>
            </div>

            {/* Container Khusus Cetak Semua Siswa (Hidden di Preview Modal) */}
            <div ref={allPrintRef} style={{ display: 'none' }}>
              {studentDataList.map((st, idx) => (
                <div key={st.nis || idx} className="buku-induk-page-print">
                  <BukuIndukSheet data={st} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-5 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 mt-0">
          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[320px]">
            Siswa: <strong className="text-slate-900 dark:text-white">{currentStudent?.name}</strong> ({currentStudent?.nis || currentStudent?.nisn})
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Tutup
            </Button>

            {studentDataList.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handlePrintAll}
                className="text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Cetak Semua ({studentDataList.length} Siswa)
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handlePrintSingle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Cetak F4 Lembar Ini
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
