'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Check, X, Download, FileText, Filter, Eye, Calendar, User, CreditCard, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import Swal from 'sweetalert2'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'

export default function PaymentProofVerificationPage() {
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [verificationNotes, setVerificationNotes] = useState('')

  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const { data: paymentProofs, isLoading } = useQuery({
    queryKey: ['payment-proofs', filterStatus],
    queryFn: async () => {
      const url = filterStatus 
        ? `/api-backend/payment-proofs?status=${filterStatus}`
        : '/api-backend/payment-proofs'
      const response = await authenticatedQuery(url).catch(() => [])
      return response?.data || response || []
    },
  })

  const verifyProofMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove paymentProofId from body to avoid ValidationPipe forbidNonWhitelisted error
      const { paymentProofId, ...bodyData } = data;
      
      const res = await authenticatedFetch(`/api-backend/payment-proofs/${paymentProofId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => 'Gagal memverifikasi pembayaran');
        throw new Error(err);
      }
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-proofs'] })
      queryClient.invalidateQueries({ queryKey: ['finance-students'] })
      queryClient.invalidateQueries({ queryKey: ['student-tagihan'] })
      queryClient.invalidateQueries({ queryKey: ['finance-stats'] })
      queryClient.invalidateQueries({ queryKey: ['my-tagihans'] })
      queryClient.invalidateQueries({ queryKey: ['my-all-tagihan'] })
      const isApproved = variables.status === 'DIVERIFIKASI'
      Swal.fire({
        title: 'Berhasil!',
        text: `Bukti pembayaran ${isApproved ? 'diverifikasi' : 'ditolak'}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      setSelectedProof(null)
      setVerificationNotes('')
    },
    onError: () => {
      Swal.fire({
        title: 'Error!',
        text: 'Gagal memverifikasi pembayaran',
        icon: 'error'
      })
    }
  })

  const handleVerification = (status: 'DIVERIFIKASI' | 'DITOLAK') => {
    if (!verificationNotes.trim()) {
      Swal.fire({
        title: 'Error!',
        text: 'Catatan verifikasi wajib diisi',
        icon: 'error'
      })
      return
    }

    const actionText = status === 'DIVERIFIKASI' ? 'menyetujui' : 'menolak'
    
    Swal.fire({
      title: 'Konfirmasi',
      text: `Apakah Anda yakin ingin ${actionText} bukti pembayaran ini?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya',
      cancelButtonText: 'Batal',
      confirmButtonColor: status === 'DIVERIFIKASI' ? '#16a34a' : '#dc2626'
    }).then((result) => {
      if (result.isConfirmed) {
        verifyProofMutation.mutate({
          paymentProofId: selectedProof?.id,
          status: status,
          notes: verificationNotes,
        })
      }
    })
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_VERIFIKASI':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Menunggu</span>
      case 'DIVERIFIKASI':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-green-100 dark:bg-green-950/90 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">Diverifikasi</span>
      case 'DITOLAK':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-100 dark:bg-red-950/90 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">Ditolak</span>
      default:
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">-</span>
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-800 p-6 sm:p-8 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Verifikasi Bukti Pembayaran</h1>
          <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">Halaman ini khusus untuk tim keuangan</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
            <div className="text-xs text-blue-100">Menunggu Verifikasi</div>
            <div className="text-xl font-bold text-white">
              {(paymentProofs).filter((p: any) => p.status === 'MENUNGGU_VERIFIKASI').length || 0}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
            <div className="text-xs text-blue-100">Diverifikasi</div>
            <div className="text-xl font-bold text-green-300">
              {(paymentProofs).filter((p: any) => p.status === 'DIVERIFIKASI').length || 0}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
            <div className="text-xs text-blue-100">Ditolak</div>
            <div className="text-xl font-bold text-red-300">
              {(paymentProofs).filter((p: any) => p.status === 'DITOLAK').length || 0}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Daftar Bukti Pembayaran
          </CardTitle>
          <CardDescription className="dark:text-slate-300">Kelola dan verifikasi pembayaran siswa yang baru diajukan</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Filter */}
          <div className="flex gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-400 mt-0.5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white text-sm"
            >
              <option value="">Semua Status</option>
              <option value="MENUNGGU_VERIFIKASI">Menunggu Verifikasi</option>
              <option value="DIVERIFIKASI">Diverifikasi</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          {/* Payment Proofs List */}
          <div className="space-y-3">
            {paymentProofs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Belum ada bukti pembayaran yang perlu diverifikasi</p>
              </div>
            ) : (
              (paymentProofs).map((proof: any, idx: number) => (
                <div key={proof.id || idx} className="p-5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Header Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                              {proof.student?.name || 'Siswa Tidak Diketahui'}
                            </h4>
                            <p className="text-sm text-slate-500">
                              NIS: {proof.student?.nis} | Kelas: {proof.student?.class?.name || '-'}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(proof.status)}
                      </div>

                      {/* Payment Details */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Total Pembayaran</p>
                              <p className="font-bold text-green-600 text-lg">{formatCurrency(proof.amount)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Tanggal Upload</p>
                              <p className="font-medium text-slate-700 dark:text-slate-300">{formatDate(proof.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {proof.tagihan && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Untuk Tagihan:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                {proof.tagihan.type}
                              </Badge>
                              {proof.tagihan.month && proof.tagihan.year && (
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {new Date(proof.tagihan.year, proof.tagihan.month - 1).toLocaleDateString('id-ID', { 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {proof.notes && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              <strong>Catatan Siswa:</strong> &ldquo;{proof.notes}&rdquo;
                            </p>
                          </div>
                        )}

                        {proof.verifiedUser && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Diverifikasi oleh: <strong>{proof.verifiedUser.name}</strong>
                              {proof.notes && ` - "${proof.notes}"`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {proof.proofUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          onClick={() => window.open(proof.proofUrl, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Lihat File
                        </Button>
                      )}
                      {proof.status === 'MENUNGGU_VERIFIKASI' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProof(proof)
                            setVerificationNotes('')
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" /> Verifikasi
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* VERIFICATION DIALOG */}
      <Dialog open={!!selectedProof} onOpenChange={() => {
        setSelectedProof(null)
        setVerificationNotes('')
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6 text-blue-600" />
              Verifikasi Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-2">
              Siswa: <span className="font-semibold text-slate-800">{selectedProof?.student?.name || '-'}</span> (NIS: {selectedProof?.student?.nis} | Kelas: {selectedProof?.student?.class?.name || '-'})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Payment Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Informasi Pembayaran
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Total:</span>
                  <div className="font-bold text-green-600 text-lg">{formatCurrency(selectedProof?.amount || 0)}</div>
                </div>
                <div>
                  <span className="text-slate-500">Tanggal Upload:</span>
                  <div className="font-medium">{selectedProof?.createdAt ? formatDate(selectedProof.createdAt) : '-'}</div>
                </div>
              </div>
              
              {selectedProof?.tagihan && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-slate-500 text-sm">Untuk Tagihan:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {selectedProof.tagihan.type}
                    </Badge>
                    {selectedProof.tagihan.month && selectedProof.tagihan.year && (
                      <span className="text-sm text-slate-600">
                        {new Date(selectedProof.tagihan.year, selectedProof.tagihan.month - 1).toLocaleDateString('id-ID', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedProof?.notes && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-slate-500 text-sm">Catatan Siswa:</span>
                  <div className="italic text-slate-700 mt-1">&ldquo;{selectedProof.notes}&rdquo;</div>
                </div>
              )}
            </div>

            {/* Payment Proof Image */}
            {selectedProof?.proofUrl && (
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 border-b flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Bukti Pembayaran</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(selectedProof.proofUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Unduh
                  </Button>
                </div>
                <img 
                  src={selectedProof.proofUrl} 
                  alt="Bukti Pembayaran"
                  className="w-full h-80 object-contain bg-white dark:bg-slate-900"
                />
              </div>
            )}

            {/* Verification Notes */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Catatan Verifikasi (Wajib)
              </Label>
              <Textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Tuliskan alasan verifikasi atau penolakan..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Catatan ini akan disimpan sebagai record verifikasi dan dapat dilihat oleh admin keuangan.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProof(null)
                setVerificationNotes('')
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVerification('DITOLAK')}
              disabled={verifyProofMutation.isPending || !verificationNotes.trim()}
            >
              {verifyProofMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Tolak
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleVerification('DIVERIFIKASI')}
              disabled={verifyProofMutation.isPending || !verificationNotes.trim()}
            >
              {verifyProofMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
