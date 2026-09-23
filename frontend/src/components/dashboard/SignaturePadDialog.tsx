'use client'

import { useRef, useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PenTool, Trash2, Check, Shield, QrCode, FileCheck, Award, Mail } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Swal from 'sweetalert2'
import Link from 'next/link'

interface SignaturePadDialogProps {
  open: boolean
  onClose: () => void
  userName?: string
  userRole?: string
  pendingCounts?: {
    dispensasi?: number
    disposisi?: number
    suratKeluar?: number
  }
}

export function SignaturePadDialog({
  open,
  onClose,
  userName = 'Kepala Sekolah',
  userRole = 'KEPALA_SEKOLAH',
  pendingCounts = { dispensasi: 0, disposisi: 0, suratKeluar: 0 }
}: SignaturePadDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignatureDrawn, setHasSignatureDrawn] = useState(false)
  const [signerName, setSignerName] = useState(userName)
  const [signerNbm, setSignerNbm] = useState('NBM. 974.501')
  const [savedSignUrl, setSavedSignUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSignerName(userName)
      setTimeout(() => {
        clearSignatureCanvas()
      }, 100)
    }
  }, [open, userName])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.beginPath()
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    setHasSignatureDrawn(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignatureCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignatureDrawn(false)
    setSavedSignUrl(null)
  }

  const handleSimpan = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignatureDrawn) {
      Swal.fire({
        title: 'Tanda Tangan Belum Dibuat',
        text: 'Silakan goreskan tanda tangan pada bidang canvas sebelum menyimpan.',
        icon: 'warning',
        confirmButtonColor: '#4f46e5'
      })
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setSavedSignUrl(dataUrl)

    Swal.fire({
      title: 'Tanda Tangan Digital Siap!',
      html: `Tanda tangan digital atas nama <strong>${signerName}</strong> (${signerNbm}) telah tersimpan dan siap digunakan untuk pengesahan E-Sign dokumen persuratan & dispensasi.`,
      icon: 'success',
      confirmButtonColor: '#10b981'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-black text-slate-900 dark:text-white">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <span>Pad Tanda Tangan Digital Pimpinan</span>
            </DialogTitle>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
              E-Sign Sah SIMASMUH
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Form Identitas Penandatangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Pejabat / Pimpinan</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nama Lengkap & Gelar"
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">NBM / NIP Pejabat</Label>
              <Input
                value={signerNbm}
                onChange={(e) => setSignerNbm(e.target.value)}
                placeholder="NBM / NIP"
                className="h-9 text-xs font-mono rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Area Canvas Goresan TTD */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                Area Torehan Tanda Tangan (Touch / Pen / Mouse):
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSignatureCanvas}
                className="h-7 text-xs px-2.5 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Bersihkan
              </Button>
            </div>

            <div className="relative border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 shadow-inner">
              <canvas
                ref={canvasRef}
                width={700}
                height={260}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[200px] sm:h-[240px] cursor-crosshair touch-none bg-white dark:bg-slate-900"
              />
              {!hasSignatureDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 bg-slate-50/30 dark:bg-slate-950/20">
                  <Shield className="w-7 h-7 text-indigo-400/80 stroke-1" />
                  <span className="font-bold text-slate-600 dark:text-slate-300">Torehkan coretan tanda tangan asli di sini</span>
                  <span className="text-[10px] text-slate-400 font-medium">(Mendukung stylus pen, jari layar sentuh, dan mouse)</span>
                </div>
              )}
            </div>
          </div>

          {/* Akses Antrian Berkas yang Membutuhkan Tanda Tangan */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider block">
              Tujuan Pengesahan & Antrean Berkas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link href="/presensi/dispensasi" onClick={onClose} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Dispensasi</span>
                </div>
                <Badge className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold px-1.5 py-0">
                  {pendingCounts.dispensasi || 0}
                </Badge>
              </Link>

              <Link href="/fitur/persuratan?tab=surat-masuk" onClick={onClose} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Disposisi Masuk</span>
                </div>
                <Badge className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-1.5 py-0">
                  {pendingCounts.disposisi || 0}
                </Badge>
              </Link>

              <Link href="/fitur/persuratan?tab=surat-keluar" onClick={onClose} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Surat Keluar / SK</span>
                </div>
                <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0">
                  {pendingCounts.suratKeluar || 0}
                </Badge>
              </Link>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-semibold">
            Tutup
          </Button>
          <div className="flex items-center gap-2">
            <Link href="/fitur/persuratan" onClick={onClose}>
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1 text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100">
                <FileCheck className="w-3.5 h-3.5" /> Buka Persuratan Penuh
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleSimpan}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" /> Simpan Tanda Tangan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
