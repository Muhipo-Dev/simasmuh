'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Link from 'next/link'
import {
  FileText, CornerDownRight, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ShieldCheck, ExternalLink, Sparkles, Building2, Tag,
  ChevronRight, Check, RefreshCw, PenTool, X, MessageSquare, Send, Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Swal from 'sweetalert2'

export function DisposisiAlertBanner() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userId = user?.id
  const role = user?.role || ''
  const subRole = user?.subRole || ''
  const isKepalaSekolah = role === 'KEPALA_SEKOLAH' || subRole === 'KEPALA_SEKOLAH'
  const isTU = ['ADMIN_TU', 'BAU', 'TATA_USAHA'].includes(role) || ['ADMIN_TU', 'BAU'].includes(subRole)

  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const [selectedSuratForAction, setSelectedSuratForAction] = useState<any | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [tindakLanjutNote, setTindakLanjutNote] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'PROSES' | 'DILAKSANAKAN'>('PROSES')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Siswa dan Wali Murid tidak mendapatkan tugas lembar disposisi persuratan
  const isEligible = role !== 'SISWA' && role !== 'WALI_MURID'

  // Fetch surat masuk dengan disposisi khusus pengguna saat ini
  const { data: suratList = [] } = useQuery<any[]>({
    queryKey: ['disposisi-alert-banner', userId, role, subRole],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/surat-masuk?forUser=true')
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json.data) ? json.data : []
    },
    enabled: !!isEligible && !!userId,
    refetchInterval: 30000,
  })

  // Fetch surat keluar yang memerlukan E-Sign (khusus Kepala Sekolah)
  const { data: pendingSuratKeluar = [] } = useQuery<any[]>({
    queryKey: ['surat-keluar-esign-banner', userId],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/surat-keluar?status=MENUNGGU_TTD')
      if (!res.ok) return []
      const json = await res.json()
      return Array.isArray(json.data) ? json.data : []
    },
    enabled: !!isKepalaSekolah,
    refetchInterval: 30000,
  })

  // Filter disposisi aktif yang butuh perhatian/tindak lanjut
  const activeDisposisiList = useMemo(() => {
    if (!Array.isArray(suratList) || suratList.length === 0) return []

    if (isKepalaSekolah) {
      // Kepala Sekolah: Fokus pada lembar disposisi surat masuk yang menunggu verifikasi & E-Sign
      return suratList.filter((item: any) => {
        return (
          item.statusDisposisi === 'MENUNGGU_VERIFIKASI' ||
          item.disposisi?.statusEsign === 'MENUNGGU_VERIFIKASI'
        )
      })
    }

    if (isTU) {
      // Tata Usaha: Fokus pada surat masuk yang belum diproses disposisinya
      return suratList.filter((item: any) => {
        return (
          item.statusDisposisi === 'BELUM_DISPOSISI' ||
          item.statusDisposisi === 'MENUNGGU_VERIFIKASI'
        )
      })
    }

    // Guru, Pegawai, Staf, Wakasek (Pihak Penerima Disposisi):
    // HANYA surat yang SUDAH diverifikasi & ditandatangani E-Sign Kepala Sekolah (DISPOSISI_DISETUJUI)
    return suratList.filter((item: any) => {
      if (!item.disposisi) return false
      const isDone =
        item.statusDisposisi === 'DILAKSANAKAN' ||
        item.statusDisposisi === 'SELESAI' ||
        item.statusTahapan === 'PENYELESAIAN'

      if (isDone) return false

      // Mutlak hanya setelah ditandatangani oleh Kepala Sekolah
      return (
        item.statusDisposisi === 'DISPOSISI_DISETUJUI' ||
        item.disposisi.statusEsign === 'DISETUJUI' ||
        item.statusTahapan === 'DISAMPAIKAN' ||
        item.statusTahapan === 'PENGECEKAN' ||
        item.statusDisposisi === 'PROSES' ||
        item.statusDisposisi === 'PENDING'
      )
    })
  }, [suratList, isKepalaSekolah, isTU])

  // Hitung total berkas yang membutuhkan aksi pengguna
  const totalPendingKepsek = activeDisposisiList.length + pendingSuratKeluar.length
  const shouldRender = isKepalaSekolah
    ? totalPendingKepsek > 0
    : activeDisposisiList.length > 0

  // Jika tidak ada disposisi aktif atau dokumen antrian, jangan tampilkan apapun (Clean Zero Placeholder)
  if (!isEligible || !shouldRender) {
    return null
  }

  // Handler Submit Cepat Progres Tindak Lanjut dari Dashboard
  const handleQuickSubmitProgress = async () => {
    if (!selectedSuratForAction) return
    setIsSubmitting(true)
    try {
      const statusTahapanMap = {
        PROSES: 'PENGECEKAN',
        DILAKSANAKAN: 'PENYELESAIAN',
      }

      const res = await authenticatedFetch(`/api-backend/surat-masuk/${selectedSuratForAction.id}/status-tindak-lanjut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusDisposisi: selectedStatus,
          statusTahapan: statusTahapanMap[selectedStatus],
          catatanTindakLanjut: tindakLanjutNote || undefined,
        }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: selectedStatus === 'DILAKSANAKAN' ? 'Selesai & Diarsipkan' : 'Progres Tercatat',
          text: `Progres disposisi agenda "${selectedSuratForAction.nomorAgenda}" berhasil diperbarui. Notifikasi telah terkirim ke pimpinan.`,
          timer: 2000,
          showConfirmButton: false,
        })
        queryClient.invalidateQueries({ queryKey: ['disposisi-alert-banner'] })
        queryClient.invalidateQueries({ queryKey: ['disposisi-user-list'] })
        queryClient.invalidateQueries({ queryKey: ['persuratan-surat-masuk-list'] })
        setIsActionModalOpen(false)
        setSelectedSuratForAction(null)
        setTindakLanjutNote('')
      } else {
        Swal.fire('Gagal', 'Tidak dapat memperbarui status disposisi.', 'error')
      }
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'Terjadi kesalahan sistem saat memperbarui status.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const alertTitle = isKepalaSekolah
    ? 'Antrian Verifikasi & Tanda Tangan Digital (E-Sign) Kepala Sekolah'
    : isTU
    ? 'Surat Masuk Baru Menunggu Pembuatan Lembar Disposisi'
    : 'Tugas Disposisi Resmi (Telah Ditandatangani Kepala Sekolah)'

  const targetLink = isKepalaSekolah || isTU
    ? '/fitur/persuratan?tab=surat-masuk'
    : '/fitur/disposisi'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 shadow-sm p-3.5 sm:p-4">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/15 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Header Alert */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-400/40 shadow-2xs">
              {isKepalaSekolah ? <ShieldCheck className="w-4 h-4" /> : <CornerDownRight className="w-4 h-4" />}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-200">
                  {alertTitle}
                </h3>
                {isKepalaSekolah ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeDisposisiList.length > 0 && (
                      <Badge className="bg-amber-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                        {activeDisposisiList.length} Disposisi Menunggu E-Sign
                      </Badge>
                    )}
                    {pendingSuratKeluar.length > 0 && (
                      <Badge className="bg-indigo-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                        {pendingSuratKeluar.length} Surat Keluar Menunggu E-Sign
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-amber-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                    {activeDisposisiList.length} Disposisi Aktif
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
                {isKepalaSekolah
                  ? `Terdapat ${activeDisposisiList.length > 0 ? `${activeDisposisiList.length} lembar disposisi` : ''}${activeDisposisiList.length > 0 && pendingSuratKeluar.length > 0 ? ' dan ' : ''}${pendingSuratKeluar.length > 0 ? `${pendingSuratKeluar.length} surat keluar` : ''} yang membutuhkan verifikasi & penandatanganan digital (E-Sign) Anda.`
                  : isTU
                  ? 'Daftar surat masuk yang belum dibuatkan lembar disposisi pimpinan.'
                  : 'Kepala Sekolah telah menyetujui dan menandatangani lembar disposisi resmi berikut untuk segera Anda tindak lanjuti.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Link href={targetLink}>
              <Button
                size="sm"
                className="h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs gap-1.5"
              >
                <span>{isKepalaSekolah || isTU ? 'Kelola Antrian Persuratan' : 'Buka Semua Disposisi'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* List Berkas Antrian / Tugas (Tampilan Compact Card Responsif) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Card untuk Disposisi Surat Masuk */}
          {activeDisposisiList.slice(0, isKepalaSekolah ? 2 : 3).map((item: any) => {
            const disp = item.disposisi || {}
            const sifat = disp.sifat || item.sifat || 'RUTIN'
            const sifatColor =
              sifat === 'RAHASIA'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                : sifat === 'PENTING'
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'

            const instruksiList = Array.isArray(disp.instruksi) ? disp.instruksi : []

            return (
              <div
                key={`disp-${item.id}`}
                className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/90 dark:border-amber-900/60 shadow-2xs hover:shadow-xs transition-all space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-[10px] text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                      Agenda: {item.nomorAgenda || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      {isKepalaSekolah && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Disposisi Masuk
                        </span>
                      )}
                      {!isKepalaSekolah && disp.eSignToken && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          E-Sign: {disp.eSignToken}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[9.5px] font-bold px-1.5 py-0 ${sifatColor}`}>
                        {sifat}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h4
                      className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-2 hover:line-clamp-none transition-all"
                      title={item.perihal}
                    >
                      {item.perihal}
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {item.instansi || 'Instansi Pengirim'} &bull; No: {item.nomorSurat || '-'}
                    </p>
                  </div>

                  {instruksiList.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {instruksiList.slice(0, 2).map((ins: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        >
                          📌 {ins}
                        </span>
                      ))}
                      {instruksiList.length > 2 && (
                        <span className="text-[9.5px] font-bold text-slate-400 self-center">
                          +{instruksiList.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {disp.catatan && (
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 italic line-clamp-1">
                      Arahan: &quot;{disp.catatan}&quot;
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {isKepalaSekolah
                      ? 'Menunggu E-Sign Kepsek'
                      : item.statusDisposisi === 'PROSES'
                      ? 'Sedang Diproses'
                      : item.statusDisposisi === 'DISPOSISI_DISETUJUI'
                      ? 'Telah Ditandatangani Kepsek'
                      : item.statusDisposisi}
                  </span>

                  {!isKepalaSekolah && !isTU ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSuratForAction(item)
                          setSelectedStatus('PROSES')
                          setTindakLanjutNote('')
                          setIsActionModalOpen(true)
                        }}
                        className="h-7 text-[10.5px] font-bold rounded-lg border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 gap-1 px-2"
                      >
                        <MessageSquare className="w-3 h-3 text-amber-600" />
                        <span>Laporkan Progres</span>
                      </Button>
                      <Link href="/fitur/disposisi">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10.5px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 p-1 px-1.5"
                          title="Buka Lembar Disposisi"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Link href="/fitur/persuratan?tab=surat-masuk">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10.5px] font-bold border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 p-1 px-2 gap-1 rounded-lg"
                      >
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                        <span>{isKepalaSekolah ? 'Tinjau & E-Sign' : 'Buka Detail'}</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {/* Card untuk Surat Keluar yang Menunggu E-Sign (khusus Kepala Sekolah) */}
          {isKepalaSekolah && pendingSuratKeluar.slice(0, 2).map((sk: any) => (
            <div
              key={`sk-${sk.id}`}
              className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200/90 dark:border-indigo-900/60 shadow-2xs hover:shadow-xs transition-all space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-[10px] text-indigo-900 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                    No: {sk.nomorSurat}
                  </span>
                  <Badge className="bg-indigo-600 text-white text-[9.5px] font-bold px-1.5 py-0">
                    Surat Keluar
                  </Badge>
                </div>

                <div>
                  <h4
                    className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-2 hover:line-clamp-none transition-all"
                    title={sk.perihal}
                  >
                    {sk.perihal}
                  </h4>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    Kepada: <strong>{sk.tujuanPenerima}</strong> {sk.instansiPenerima ? `(${sk.instansiPenerima})` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {sk.jenisSurat?.replace(/_/g, ' ') || 'SURAT RESMI'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold">
                  Menunggu E-Sign Kepsek
                </span>

                <Link href="/fitur/persuratan?tab=surat-keluar">
                  <Button
                    size="sm"
                    className="h-7 text-[10.5px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white p-1 px-2.5 gap-1 rounded-lg shadow-xs"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>E-Sign Surat Keluar</span>
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Cepat Tindak Lanjut Disposisi Langsung di Dashboard */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <CornerDownRight className="w-4 h-4 text-amber-600" />
              Laporkan Progres Tindak Lanjut Disposisi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Agenda: {selectedSuratForAction?.nomorAgenda} &bull; {selectedSuratForAction?.perihal}
            </DialogDescription>
          </DialogHeader>

          {selectedSuratForAction && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Status Progres:
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('PROSES')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      selectedStatus === 'PROSES'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-300 ring-2 ring-amber-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block text-xs">Sedang Diproses</span>
                    <span className="text-[10px] font-normal block text-slate-500">Tindak lanjut sedang berjalan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('DILAKSANAKAN')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                      selectedStatus === 'DILAKSANAKAN'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block text-xs">Selesai Dilaksanakan</span>
                    <span className="text-[10px] font-normal block text-slate-500">Tuntas & masuk arsip</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Tindak Lanjut / Laporan Eksekusi:
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Contoh: Telah dikoordinasikan dengan tim terkait dan berkas telah siap..."
                  value={tindakLanjutNote}
                  onChange={(e) => setTindakLanjutNote(e.target.value)}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleQuickSubmitProgress}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan & Kirim Laporan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
