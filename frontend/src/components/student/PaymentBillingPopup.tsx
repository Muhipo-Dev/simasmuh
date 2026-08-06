'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaymentSocket } from '@/hooks/useSocket'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CreditCard, 
  Upload, 
  Calendar, 
  Receipt, 
  AlertTriangle, 
  Clock,
  CheckCircle2,
  X,
  Loader2,
  Building2,
  Copy
} from 'lucide-react'
import Swal from 'sweetalert2'
import { compressImageFile } from '@/utils/imageCompressor'

// Types
type Tagihan = {
  id: string
  type: string
  amount: number
  amountPaid?: number
  month: number | null
  year: number | null
  dueDate: string | null
  status: 'BELUM_LUNAS' | 'ANGSURAN' | 'LUNAS'
  paidDate: string | null
  notes: string | null
  createdAt: string
  originalAmount?: number
  discountPercentage?: number
  discountAmount?: number
}

type BankAccount = {
  bankName: string
  bankNumber: string
  bankOwner: string
}

type PaymentBillingPopupProps = {
  open: boolean
  onClose: () => void
  initialTagihanId?: string
}

const PAYMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  SPP: { label: 'SPP', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  DPP: { label: 'DPP', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  INFAQ: { label: 'Infaq', color: 'bg-green-100 text-green-800 border-green-200' },
  AKADEMIK: { label: 'Akademik', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  SEKOLAH: { label: 'Kegiatan', color: 'bg-red-100 text-red-800 border-red-200' },
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

const getMonthName = (month: number) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return months[month - 1] || ''
}

const parseDiscountInfo = (notes: string | null) => {
  if (!notes) return null
  const match = notes.match(/DISCOUNT_INFO:\s*(\{.*?\})/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

export default function PaymentBillingPopup({ open, onClose, initialTagihanId }: PaymentBillingPopupProps) {
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [customAmountInput, setCustomAmountInput] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  // Query untuk mendapatkan tagihan siswa yang belum lunas
  const { data: tagihanData, isLoading: loadingTagihans } = useQuery<{
    student: any;
    tagihans: Tagihan[];
  }>({
    queryKey: ['my-tagihans'],
    queryFn: () => authenticatedQuery(`/api-backend/finance/my-tagihan`),
    enabled: open,
  })

  const allTagihans = tagihanData?.tagihans || []
  const tagihans = allTagihans.filter((t: any) => !t.paymentProofs || t.paymentProofs.length === 0)
  const studentInfo = tagihanData?.student

  // Query untuk mendapatkan informasi bank
  const { data: bankAccount } = useQuery<BankAccount>({
    queryKey: ['bank-account'],
    queryFn: () => authenticatedQuery('/api-backend/settings/bank-account'),
    enabled: open,
  })

  const handleSelectTagihan = (t: Tagihan) => {
    setSelectedTagihan(t)
    const paid = t.amountPaid || (t.status === 'LUNAS' ? t.amount : 0)
    const remaining = Math.max(0, t.amount - paid)
    setCustomAmountInput(remaining.toString())
  }

  // Set initial selected tagihan
  useEffect(() => {
    if (open && initialTagihanId && tagihans.length > 0) {
      const tagihan = tagihans.find(t => t.id === initialTagihanId)
      if (tagihan) {
        handleSelectTagihan(tagihan)
        setShowPaymentForm(true)
      }
    }
  }, [open, initialTagihanId, tagihans])

  // Mutation untuk upload bukti pembayaran
  const uploadPaymentMutation = useMutation({
    mutationFn: async (data: { tagihanId: string; file: File; notes: string; amount: number }) => {
      const formData = new FormData()
      formData.append('file', data.file)
      if (studentInfo?.id) {
        formData.append('studentId', studentInfo.id)
      }
      formData.append('tagihanId', data.tagihanId)
      formData.append('amount', data.amount.toString())
      formData.append('notes', data.notes)

      const res = await authenticatedFetch('/api-backend/payment-proofs/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Don't set Content-Type for FormData, let browser set it
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error(error || 'Gagal mengupload bukti pembayaran')
      }
      return res.json()
    },
    onSuccess: () => {
      Swal.fire({
        title: 'Berhasil!',
        text: 'Bukti pembayaran berhasil diupload!',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
      queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })
      queryClient.invalidateQueries({ queryKey: ['payment-proofs'] })
      resetForm()
      onClose()
    },
    onError: (error) => {
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Gagal upload bukti pembayaran',
        icon: 'error'
      })
    }
  })

  const resetForm = () => {
    setSelectedTagihan(null)
    setUploadFile(null)
    setPaymentNotes('')
    setShowPaymentForm(false)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          title: 'Error!',
          text: 'File harus berupa gambar',
          icon: 'error'
        })
        return
      }

      try {
        const compressed = await compressImageFile(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.8 })
        setUploadFile(compressed.file)
      } catch (err) {
        console.error('Gagal mengompres bukti pembayaran:', err)
        setUploadFile(file)
      }
    }
  }

  const handlePaymentSubmit = () => {
    if (!selectedTagihan || !uploadFile) {
      Swal.fire({
        title: 'Error!',
        text: 'Pilih tagihan dan upload bukti pembayaran',
        icon: 'error'
      })
      return
    }

    const paid = selectedTagihan.amountPaid || (selectedTagihan.status === 'LUNAS' ? selectedTagihan.amount : 0)
    const remaining = Math.max(0, selectedTagihan.amount - paid)
    const payAmount = parseFloat(customAmountInput)

    if (selectedTagihan.type.toLowerCase() === 'infaq' && payAmount < remaining) {
      Swal.fire('Error', 'Tagihan Infaq tidak dapat diangsur. Pembayaran harus lunas sekaligus.', 'error')
      return
    }

    if (isNaN(payAmount) || payAmount <= 0 || payAmount > remaining) {
      Swal.fire('Error', `Nominal angsuran tidak valid. Maksimal ${formatCurrency(remaining)}`, 'error')
      return
    }

    uploadPaymentMutation.mutate({
      tagihanId: selectedTagihan.id,
      file: uploadFile,
      notes: paymentNotes,
      amount: payAmount
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({
      title: 'Berhasil!',
      text: 'Disalin ke clipboard',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    })
  }

  const totalTagihan = tagihans.reduce((sum, t) => sum + t.amount, 0)

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose() }}>
      <DialogContent className="w-[95vw] sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-7xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="w-6 h-6 text-blue-600" />
            Tagihan Pembayaran
          </DialogTitle>
          <DialogDescription>
            {studentInfo ? (
              <>
                <span>Siswa: <strong>{studentInfo.name}</strong></span>
                <br />
                <span className="text-sm">NIS: {studentInfo.nis} | Kelas: {studentInfo.className}</span>
              </>
            ) : (
              'Pilih tagihan yang ingin dibayar dan upload bukti pembayaran'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loadingTagihans ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg text-gray-600">Memuat tagihan...</span>
            </div>
          ) : tagihans.length === 0 ? (
            <Card className="border-green-200 bg-green-50 shadow-sm">
              <CardContent className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 mb-2">Tidak Ada Tagihan</h3>
                <p className="text-green-700">Semua tagihan sudah lunas atau belum ada tagihan yang perlu dibayar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* KOLOM KIRI: Daftar Tagihan & Ringkasan */}
              <div className="lg:col-span-7 space-y-5">
                {/* Ringkasan Total */}
                <Card className="border-orange-200 bg-orange-50/80 shadow-sm hover:shadow transition-shadow">
                  <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Total Belum Dibayar</p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-black text-orange-900 tracking-tight break-words">{formatCurrency(totalTagihan)}</p>
                      </div>
                      <div className="text-left sm:text-right bg-orange-100/80 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-orange-200 shrink-0">
                        <p className="text-xl sm:text-2xl font-bold text-orange-700 leading-none">{tagihans.length}</p>
                        <p className="text-[10px] sm:text-xs font-bold text-orange-800 mt-0.5 uppercase">Tagihan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Daftar Tagihan */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    Pilih Tagihan Untuk Dibayar
                  </h3>
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {tagihans.map((tagihan) => (
                      <Card
                        key={tagihan.id}
                        className={`cursor-pointer transition-all border-2 ${
                          selectedTagihan?.id === tagihan.id
                            ? 'border-blue-500 bg-blue-50/50 shadow-md transform scale-[1.01]'
                            : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm'
                        }`}
                        onClick={() => handleSelectTagihan(tagihan)}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`${PAYMENT_TYPE_LABELS[tagihan.type]?.color || 'bg-gray-100'} px-2.5 py-0.5 text-xs font-bold border`}
                                >
                                  {PAYMENT_TYPE_LABELS[tagihan.type]?.label || tagihan.type}
                                </Badge>
                                {(tagihan.month && tagihan.year) && (
                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                    {getMonthName(tagihan.month)} {tagihan.year}
                                  </span>
                                )}
                                {parseDiscountInfo(tagihan.notes) && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 px-2 py-0.5 text-xs font-bold">
                                    Diskon {parseDiscountInfo(tagihan.notes)?.discountPercentage}%
                                  </Badge>
                                )}
                              </div>

                              {/* Price Breakdown with Discount */}
                              <div className="space-y-1">
                                {parseDiscountInfo(tagihan.notes) ? (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-slate-500 line-through">
                                        {formatCurrency(parseDiscountInfo(tagihan.notes)?.originalAmount || tagihan.amount)}
                                      </span>
                                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                        -{formatCurrency(parseDiscountInfo(tagihan.notes)?.discountAmount || 0)}
                                      </span>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight break-words">
                                      {formatCurrency(tagihan.amount)}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">
                                    {formatCurrency(tagihan.amount)}
                                  </div>
                                )}
                              </div>

                              {tagihan.dueDate && (
                                <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-md">
                                  <Calendar className="w-4 h-4" />
                                  Jatuh tempo: {formatDate(tagihan.dueDate)}
                                </div>
                              )}

                              {/* Installment Progress */}
                              {tagihan.amountPaid && tagihan.amountPaid > 0 && tagihan.status !== 'LUNAS' && (
                                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                                  <div className="flex justify-between font-medium text-amber-900">
                                    <span>Status: <strong className="text-amber-700">ANGSURAN</strong></span>
                                    <span>Sisa: <strong className="text-red-700">{formatCurrency(tagihan.amount - tagihan.amountPaid)}</strong></span>
                                  </div>
                                  <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-600 rounded-full"
                                      style={{ width: `${Math.min(100, Math.round((tagihan.amountPaid / tagihan.amount) * 100))}%` }}
                                    />
                                  </div>
                                  <p className="text-[11px] text-amber-700 text-right">Sudah terbayar {formatCurrency(tagihan.amountPaid)} dari {formatCurrency(tagihan.amount)}</p>
                                </div>
                              )}

                              {tagihan.notes && !parseDiscountInfo(tagihan.notes) && (
                                <p className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded-md border border-slate-100">{tagihan.notes}</p>
                              )}
                            </div>
                            <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 shrink-0">
                              {selectedTagihan?.id === tagihan.id ? (
                                <div className="bg-blue-600 text-white p-2 rounded-full shadow-sm">
                                  <CheckCircle2 className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full border-2 border-slate-200 bg-white" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: Form Upload & Info */}
              <div className="lg:col-span-5 space-y-5">
                {/* Info Penting & Rekening - Dipindah ke atas Form Upload */}
                <Card className="border-amber-200 bg-amber-50/80 shadow-sm">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-bold text-amber-900 mb-1.5 uppercase tracking-wide text-xs">Informasi Penting:</p>
                        <ul className="space-y-1.5 text-amber-800 font-medium leading-relaxed">
                          <li>• Pastikan nominal transfer <strong>sesuai</strong> dengan tagihan</li>
                          <li>• Upload bukti transfer yang jelas dan dapat dibaca</li>
                          <li>• Verifikasi pembayaran akan dilakukan oleh bagian keuangan</li>
                        </ul>
                      </div>
                    </div>
                    
                    {bankAccount && (bankAccount.bankName || bankAccount.bankNumber) && (
                      <>
                        <Separator className="bg-amber-200/60" />
                        <div className="pt-2">
                          <p className="font-bold text-amber-900 mb-3 flex items-center gap-2 uppercase tracking-wide text-xs">
                            <Building2 className="w-4 h-4" />
                            Transfer ke Rekening Berikut:
                          </p>
                          <div className="space-y-3 text-sm bg-white/40 p-3 rounded-xl border border-amber-100">
                            <div className="flex justify-between items-center border-b border-amber-100/50 pb-2">
                              <span className="text-amber-700 font-medium">Bank</span>
                              <span className="font-bold text-amber-900 text-right">{bankAccount.bankName || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-amber-100/50 pb-2">
                              <span className="text-amber-700 font-medium">Nomor</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-900 text-lg tracking-wide bg-amber-100/50 px-2 py-0.5 rounded-md">{bankAccount.bankNumber || '-'}</span>
                                {bankAccount.bankNumber && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(bankAccount.bankNumber)}
                                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-900 hover:bg-amber-200/50 rounded-full"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-amber-700 font-medium">A.N.</span>
                              <span className="font-bold text-amber-900 text-right">{bankAccount.bankOwner || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Form Upload Bukti Pembayaran */}
                {selectedTagihan && (
                  <Card className="border-blue-200 bg-white shadow-md flex-1">
                    <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                      <CardTitle className="flex items-center gap-2 text-blue-800 text-lg">
                        <Upload className="w-5 h-5" />
                        Upload Bukti Pembayaran
                      </CardTitle>
                      <div className="text-sm text-blue-700 bg-blue-100/50 p-2.5 rounded-lg border border-blue-200 mt-3 flex justify-between items-center">
                        <span>Tagihan terpilih:</span>
                        <div className="text-right">
                          <span className="block font-bold">{PAYMENT_TYPE_LABELS[selectedTagihan.type]?.label}</span>
                          <span className="block font-black text-blue-900 text-lg">{formatCurrency(selectedTagihan.amount)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-5">
                      {/* Nominal Pembayaran / Angsuran */}
                      {selectedTagihan && (() => {
                        const paid = selectedTagihan.amountPaid || (selectedTagihan.status === 'LUNAS' ? selectedTagihan.amount : 0)
                        const remaining = Math.max(0, selectedTagihan.amount - paid)
                        const isInfaq = selectedTagihan.type.toLowerCase() === 'infaq'

                        return (
                          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center text-xs text-slate-600">
                              <span>Nominal Tagihan: <strong>{formatCurrency(selectedTagihan.amount)}</strong></span>
                              <span>Sisa Tagihan: <strong className="text-red-600">{formatCurrency(remaining)}</strong></span>
                            </div>
                            <Label className="text-sm font-bold text-slate-700 block mt-1">
                              Nominal Yang Ditransfer / Diangsur (Rp) *
                            </Label>
                            <Input
                              type="number"
                              disabled={isInfaq}
                              placeholder="Masukkan nominal..."
                              value={customAmountInput}
                              onChange={(e) => setCustomAmountInput(e.target.value)}
                              className="bg-white font-semibold text-slate-800"
                            />
                            {isInfaq ? (
                              <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Tagihan Infaq tidak dapat diangsur. Nominal di-set lunas ({formatCurrency(remaining)}).
                              </p>
                            ) : (
                              <p className="text-xs text-slate-500">
                                Anda dapat mengangsur sebagian (misal Rp 50.000) atau melunasi sisa tagihan.
                              </p>
                            )}
                          </div>
                        )
                      })()}

                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Foto Bukti Transfer *</Label>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full h-32 border-dashed border-2 transition-all ${
                              uploadFile ? 'border-green-400 bg-green-50 hover:bg-green-100' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}
                          >
                            <div className="text-center">
                              {uploadFile ? (
                                <>
                                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                  <p className="font-bold text-green-700 truncate max-w-[200px] sm:max-w-[300px]">{uploadFile.name}</p>
                                  <p className="text-xs text-green-600 mt-1 font-medium">
                                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                                  <p className="font-medium text-slate-700">Klik untuk upload foto</p>
                                  <p className="text-xs text-slate-500 mt-1">Maks. 5MB (JPG, PNG)</p>
                                </>
                              )}
                            </div>
                          </Button>
                        </div>
                      </div>

                      {/* Catatan Tambahan */}
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-bold text-slate-700">Catatan Tambahan (Opsional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Tulis pesan untuk admin keuangan (misal: Transfer dari bank lain)"
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          className="resize-none h-20 bg-slate-50 border-slate-200 focus:bg-white"
                        />
                      </div>
                    </CardContent>
                    <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedTagihan(null)}
                        className="w-full sm:w-auto font-medium"
                      >
                        Batal
                      </Button>
                      <Button
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 font-bold shadow-md shadow-blue-200"
                        disabled={!uploadFile || uploadPaymentMutation.isPending}
                        onClick={handlePaymentSubmit}
                      >
                        {uploadPaymentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Kirim Bukti Pembayaran
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}