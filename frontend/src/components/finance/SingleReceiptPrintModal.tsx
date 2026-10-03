'use client'

import React, { useRef } from 'react'
import { Printer, X, Receipt, CheckCircle2, Building2, Calendar, User, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'

export interface ReceiptPaymentData {
  receiptNumber?: string
  studentName: string
  nisn: string
  nis: string
  className: string
  program?: string | null
  tagihanType: string
  periodInfo?: string
  originalAmount: number
  discountAmount?: number
  discountPercentage?: number
  discountReason?: string
  amountPaidNow: number
  totalPaidPrevious?: number
  remainingAmount: number
  isLunas: boolean
  paymentDate: string
  notes?: string
  officerName?: string
}

interface SingleReceiptPrintModalProps {
  open: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  data: ReceiptPaymentData | null
  schoolName?: string
  logoUrl?: string
}

export function SingleReceiptPrintModal({
  open,
  onClose,
  onOpenChange,
  data,
  schoolName = 'SMA MUHAMMADIYAH 1 PONOROGO',
  logoUrl = '/muhipo-log.jpg'
}: SingleReceiptPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    if (onClose) onClose()
    if (onOpenChange) onOpenChange(false)
  }

  if (!data) return null

  const currency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

  const handlePrint = () => {
    if (!printRef.current) return

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n')

    let printIframe = document.getElementById('receipt-single-print-frame') as HTMLIFrameElement
    if (!printIframe) {
      printIframe = document.createElement('iframe')
      printIframe.id = 'receipt-single-print-frame'
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

    const htmlContent = printRef.current.innerHTML

    frameDoc.open()
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Kwitansi Pembayaran Keuangan - ${data.studentName}</title>
          ${styleTags}
          <style>
            @page {
              size: 215mm 140mm landscape;
              margin: 8mm;
            }
            @media print {
              @page {
                size: 215mm 140mm landscape;
                margin: 8mm;
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
            .receipt-print-card {
              border: 2px solid #0f172a !important;
              border-radius: 8px !important;
              padding: 12px 16px !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
              min-height: 124mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
          </style>
        </head>
        <body>
          <div class="receipt-print-card">
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

  const receiptNo = data.receiptNumber || `KWT/${new Date().getFullYear()}/${data.nis}/${Math.floor(1000 + Math.random() * 9000)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[94vw] sm:max-w-lg lg:max-w-xl w-full p-0 rounded-3xl border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        {/* Header Modal */}
        <div className="shrink-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-4 sm:p-5 text-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/15">
              <Receipt className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-white">
                Kwitansi Bukti Pembayaran
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-xs">
                Bukti sah transaksi loket keuangan SIKU SIMASMUH.
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

        {/* Body Preview */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-700 rounded-2xl p-5 text-slate-900 dark:text-slate-100 space-y-4 shadow-sm">
            {/* Kop Kwitansi */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-800 dark:border-slate-700">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  SISTEM INFORMASI KEUANGAN (SIKU)
                </p>
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-tight">
                  {schoolName}
                </h4>
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">
                  KWITANSI BUKTI PEMBAYARAN
                </p>
                <p className="text-[9px] font-mono text-slate-500">
                  No: {receiptNo} · Tgl: {data.paymentDate}
                </p>
              </div>
            </div>

            {/* Rincian Identitas & Transaksi */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="font-semibold text-slate-500">Nama Siswa</span>
                <span className="col-span-2 font-black text-slate-900 dark:text-white">: {data.studentName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-semibold text-slate-500">NISN / NIS</span>
                <span className="col-span-2 font-mono font-bold">: {data.nisn} / {data.nis}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-semibold text-slate-500">Kelas / Program</span>
                <span className="col-span-2 font-bold">: {data.className} {data.program ? `(${data.program})` : ''}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="font-semibold text-slate-500">Jenis Pembayaran</span>
                <span className="col-span-2 font-black text-blue-700 dark:text-blue-400">
                  : {data.tagihanType} {data.periodInfo ? `(${data.periodInfo})` : ''}
                </span>
              </div>

              {data.discountPercentage && data.discountPercentage > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                  <span>Potongan Beasiswa</span>
                  <span className="col-span-2">: {data.discountPercentage}% {data.discountReason ? `(${data.discountReason})` : ''}</span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
                  <span>Total Tagihan:</span>
                  <span>{currency(data.originalAmount)}</span>
                </div>
                {data.totalPaidPrevious && data.totalPaidPrevious > 0 ? (
                  <div className="flex justify-between font-semibold text-blue-600 dark:text-blue-400">
                    <span>Angsuran Sebelumnya:</span>
                    <span>{currency(data.totalPaidPrevious)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-black text-emerald-700 dark:text-emerald-400 text-sm pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Nominal Dibayar:</span>
                  <span>{currency(data.amountPaidNow)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span className="text-slate-500">Sisa Tunggakan:</span>
                  <span className={data.remainingAmount === 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                    {data.remainingAmount === 0 ? 'LUNAS (Rp 0)' : currency(data.remainingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Kwitansi & QR */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-end justify-between text-[10px]">
              <div className="p-1 bg-white border border-slate-200 rounded shrink-0">
                <QRCodeSVG value={`SIMASMUH-RECEIPT:${receiptNo}:${data.studentName}:${data.amountPaidNow}`} size={42} />
              </div>
              <div className="text-center w-36 space-y-0.5 text-slate-800 dark:text-slate-200">
                <p className="text-[9px]">Ponorogo, {data.paymentDate.split(',')[0] || new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold text-[10px]">Petugas Kasir SIKU,</p>
                <div className="h-6 flex items-center justify-center">
                  <span className="text-[8px] text-slate-400 font-mono italic">[ Ttd & Cap ]</span>
                </div>
                <p className="font-black text-[10px] border-t border-slate-800 dark:border-slate-700 pt-0.5">
                  {data.officerName || 'Agung Tribowo, SE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} className="h-9 px-4 text-xs font-bold rounded-xl">
            Tutup
          </Button>
          <Button onClick={handlePrint} className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md gap-1.5">
            <Printer className="w-4 h-4" />
            Cetak Kwitansi
          </Button>
        </div>

        {/* Hidden Container for Print Output */}
        <div className="hidden">
          <div ref={printRef}>
            {/* Kop Kwitansi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '8px', borderBottom: '2px solid #0f172a' }}>
              <div style={{ width: '45px', height: '45px', flexShrink: 0 }}>
                <img src={logoUrl} alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#475569', margin: '0' }}>
                  SISTEM INFORMASI KEUANGAN (SIKU)
                </p>
                <h4 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a', margin: '2px 0 0 0' }}>
                  {schoolName}
                </h4>
                <p style={{ fontSize: '10px', fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase', margin: '2px 0 0 0', letterSpacing: '0.5px' }}>
                  KWITANSI BUKTI PEMBAYARAN KASIR
                </p>
                <p style={{ fontSize: '8.5px', fontFamily: 'monospace', color: '#64748b', margin: '1px 0 0 0' }}>
                  No: {receiptNo} · Tanggal: {data.paymentDate}
                </p>
              </div>
            </div>

            {/* Rincian Transaksi Print */}
            <div style={{ padding: '8px 0', fontSize: '11px', lineHeight: '1.4' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '120px', fontWeight: '600', color: '#475569', padding: '2px 0' }}>Nama Siswa</td>
                    <td style={{ fontWeight: 'bold', color: '#0f172a', padding: '2px 0' }}>: {data.studentName}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>NISN / NIS</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', padding: '2px 0' }}>: {data.nisn} / {data.nis}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Kelas / Rombel</td>
                    <td style={{ fontWeight: 'bold', padding: '2px 0' }}>: {data.className} {data.program ? `(${data.program})` : ''}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Jenis Tagihan</td>
                    <td style={{ fontWeight: '900', color: '#1d4ed8', padding: '2px 0' }}>: {data.tagihanType} {data.periodInfo ? `(${data.periodInfo})` : ''}</td>
                  </tr>
                  {data.discountPercentage && data.discountPercentage > 0 ? (
                    <tr>
                      <td style={{ fontWeight: '600', color: '#b45309', padding: '2px 0' }}>Potongan Diskon</td>
                      <td style={{ fontWeight: 'bold', color: '#b45309', padding: '2px 0' }}>: {data.discountPercentage}% ({currency(data.discountAmount || 0)})</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Total Tagihan</td>
                    <td style={{ fontWeight: 'bold', padding: '2px 0' }}>: {currency(data.originalAmount)}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #cbd5e1' }}>
                    <td style={{ fontWeight: '900', fontSize: '12px', color: '#047857', padding: '4px 0 2px 0' }}>Nominal Dibayar</td>
                    <td style={{ fontWeight: '900', fontSize: '12px', color: '#047857', padding: '4px 0 2px 0' }}>: {currency(data.amountPaidNow)}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '600', color: '#475569', padding: '2px 0' }}>Sisa Tagihan</td>
                    <td style={{ fontWeight: 'bold', color: data.remainingAmount === 0 ? '#047857' : '#be123c', padding: '2px 0' }}>
                      : {data.remainingAmount === 0 ? 'LUNAS (Rp 0)' : currency(data.remainingAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer & TTD */}
            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', fontSize: '9px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '2px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <QRCodeSVG value={`SIMASMUH-RECEIPT:${receiptNo}:${data.studentName}:${data.amountPaidNow}`} size={42} />
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  <p style={{ margin: '0' }}>Validasi Resmi Kasir Keuangan</p>
                  <p style={{ margin: '0' }}>SIMASMUH - SMA MUHIPO</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', width: '130px', color: '#0f172a' }}>
                <p style={{ margin: '0', fontSize: '8.5px' }}>Ponorogo, {data.paymentDate.split(',')[0] || new Date().toLocaleDateString('id-ID')}</p>
                <p style={{ margin: '1px 0 0 0', fontWeight: 'bold', fontSize: '9px' }}>Kasir Keuangan,</p>
                <div style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '7px', color: '#94a3b8', fontStyle: 'italic' }}>[ Cap & Ttd ]</span>
                </div>
                <p style={{ margin: '0', fontWeight: 'bold', borderTop: '1px solid #0f172a', paddingTop: '1px' }}>
                  {data.officerName || 'Agung Tribowo, SE'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SingleReceiptPrintModal
