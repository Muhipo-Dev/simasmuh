'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  FileText, CornerDownRight, CheckCircle2, Clock, Search, 
  ExternalLink, Eye, AlertCircle, ShieldCheck, Download,
  UserCheck, User, Calendar, Building2, Tag, RefreshCw,
  FolderArchive, Inbox, ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import Swal from 'sweetalert2'

export function DisposisiUserManagement() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userName = user?.name || ''
  const userRole = user?.role || ''
  const userSubRole = user?.subRole || ''

  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTahapan, setFilterTahapan] = useState('ALL')
  const [selectedSurat, setSelectedSurat] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Fetch surat masuk yang memiliki disposisi
  const { data: dbSuratMasuk = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['disposisi-user-list'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/surat-masuk')
      if (!res.ok) return []
      const json = await res.json()
      return json.data || []
    }
  })

  // Filter khusus untuk user yang sedang login (Guru / Pegawai)
  // Menampilkan surat jika nama user ada di instruksi/diteruskanKepada atau bagian/staf
  const myDisposisiList = useMemo(() => {
    if (!Array.isArray(dbSuratMasuk)) return []
    const isSuperOrAdmin = ['SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'BAU', 'TATA_USAHA', 'KEPALA_SEKOLAH'].includes(userRole) || ['SUPERADMIN', 'ADMIN_TU', 'BAU'].includes(userSubRole)

    return dbSuratMasuk.filter((item: any) => {
      if (!item.disposisi) return false
      
      // Jika Superadmin / Kepala Sekolah / TU -> tampilkan semua yang ada disposisi
      if (isSuperOrAdmin) return true

      const disp = item.disposisi
      const diteruskan = disp.diteruskanKepada || {}
      const targets = Array.isArray(diteruskan.targets) ? diteruskan.targets : []
      const guruNama = (diteruskan.guruNama || '').toLowerCase()
      const bagianNama = (diteruskan.bagianNama || '').toLowerCase()
      const stafNama = (diteruskan.stafNama || '').toLowerCase()
      const myNameLower = userName.toLowerCase()

      // Cek apakah ditugaskan ke nama user login atau bagian role terkait
      const matchName = 
        (guruNama && myNameLower.includes(guruNama)) ||
        (stafNama && myNameLower.includes(stafNama)) ||
        (guruNama && guruNama.includes(myNameLower)) ||
        (stafNama && stafNama.includes(myNameLower))

      const matchRole = 
        (userSubRole && targets.some((t: string) => t.toLowerCase().includes(userSubRole.toLowerCase()))) ||
        (userRole && targets.some((t: string) => t.toLowerCase().includes(userRole.toLowerCase()))) ||
        (userRole === 'GURU' && targets.includes('Guru')) ||
        (userRole === 'PEGAWAI' && targets.includes('Staf'))

      return matchName || matchRole
    })
  }, [dbSuratMasuk, userName, userRole, userSubRole])

  // Filter pencarian & tahapan
  const filteredList = useMemo(() => {
    return myDisposisiList.filter((item: any) => {
      const q = searchQuery.toLowerCase()
      const matchSearch = 
        (item.perihal || '').toLowerCase().includes(q) ||
        (item.nomorSurat || '').toLowerCase().includes(q) ||
        (item.nomorAgenda || '').toLowerCase().includes(q) ||
        (item.instansi || '').toLowerCase().includes(q)

      const matchTahapan = filterTahapan === 'ALL' || item.statusTahapan === filterTahapan
      return matchSearch && matchTahapan
    })
  }, [myDisposisiList, searchQuery, filterTahapan])

  // Handler Update Status Progres Tindak Lanjut oleh Pengguna (PROSES, DILAKSANAKAN, PENDING)
  const handleUpdateStatusProgres = async (surat: any, newStatus: 'PROSES' | 'DILAKSANAKAN' | 'PENDING') => {
    try {
      const statusTahapanMap = {
        PROSES: 'PENGECEKAN',
        DILAKSANAKAN: 'PENYELESAIAN',
        PENDING: 'DISAMPAIKAN',
      }

      const statusLabelMap = {
        PROSES: 'Sedang Diproses',
        DILAKSANAKAN: 'Telah Dilaksanakan',
        PENDING: 'Pending / Tertunda',
      }

      const res = await authenticatedFetch(`/api-backend/surat-masuk/${surat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusTahapan: statusTahapanMap[newStatus],
          statusDisposisi: newStatus,
        }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: `Status Diubah: ${statusLabelMap[newStatus]}`,
          text: `Progres disposisi surat perihal "${surat.perihal}" telah diperbarui menjadi ${statusLabelMap[newStatus]}.`,
          timer: 2000,
          showConfirmButton: false,
        })
        queryClient.invalidateQueries({ queryKey: ['disposisi-user-list'] })
        if (selectedSurat?.id === surat.id) {
          setSelectedSurat((prev: any) => ({
            ...prev,
            statusTahapan: statusTahapanMap[newStatus],
            statusDisposisi: newStatus,
          }))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-800 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <CornerDownRight className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Disposisi Tugas & Surat Masuk
              </h1>
              <p className="text-purple-100 text-xs sm:text-sm mt-1">
                Daftar arahan disposisi resmi dari <strong>Kepala Sekolah</strong> yang ditujukan kepada Anda untuk segera ditindaklanjuti.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => refetch()}
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-2xl gap-2 font-bold self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari perihal, nomor surat, nomor agenda, atau asal instansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <Select value={filterTahapan} onValueChange={(val) => setFilterTahapan(val || 'ALL')}>
          <SelectTrigger className="h-10 text-xs w-full sm:w-[200px] rounded-xl">
            <SelectValue placeholder="Status Tahapan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Tahapan</SelectItem>
            <SelectItem value="DITERIMA">Diterima</SelectItem>
            <SelectItem value="DISAMPAIKAN">Disampaikan</SelectItem>
            <SelectItem value="PENGECEKAN">Pengecekan</SelectItem>
            <SelectItem value="PENYELESAIAN">Penyelesaian</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid List Card Disposisi */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">
          Memuat data lembar disposisi Anda...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md space-y-2">
          <CornerDownRight className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            Tidak Ada Disposisi yang Ditujukan Kepada Anda
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Surat masuk yang telah disetujui Kepala Sekolah dan mencantumkan nama Anda atau bagian unit kerja Anda akan muncul di sini secara otomatis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item: any) => {
            const disp = item.disposisi || {}
            const isApproved = disp.statusEsign === 'DISETUJUI' || item.statusDisposisi === 'DISPOSISI_DISETUJUI' || item.statusDisposisi === 'DILAKSANAKAN'
            const isDone = item.statusTahapan === 'PENYELESAIAN'

            return (
              <Card key={item.id} className="border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition-all shadow-xs rounded-2xl bg-white dark:bg-slate-900 flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 text-[10px] font-bold">
                        Agenda: {item.nomorAgenda || '-'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.sifat || 'RUTIN'}
                      </Badge>
                      {isApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Disetujui Kepsek
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Menunggu E-Sign
                        </Badge>
                      )}

                      {/* Status Progres Tindak Lanjut */}
                      {item.statusDisposisi === 'DILAKSANAKAN' || isDone ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Dilaksanakan
                        </Badge>
                      ) : item.statusDisposisi === 'PROSES' || item.statusTahapan === 'PENGECEKAN' ? (
                        <Badge className="bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-spin" /> Sedang Diproses
                        </Badge>
                      ) : item.statusDisposisi === 'PENDING' ? (
                        <Badge className="bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 text-[10px] font-semibold">
                          Belum Dikonfirmasi
                        </Badge>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {item.tanggalDiterima ? new Date(item.tanggalDiterima).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {item.perihal}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Asal Surat: <strong>{item.instansi}</strong> (No: {item.nomorSurat})
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  {/* Instruksi & Catatan */}
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-purple-900 dark:text-purple-300 shrink-0">Instruksi:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {Array.isArray(disp.instruksi) ? disp.instruksi.join(', ') : 'Ditindak Lanjuti'}
                      </span>
                    </div>

                    {disp.catatan && (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400 italic">
                        <span className="font-semibold shrink-0">Catatan Pimpinan:</span>
                        <span>&ldquo;{disp.catatan}&rdquo;</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {item.fileUrl && (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Surat Asli
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedSurat(item)
                          setIsDetailModalOpen(true)
                        }}
                        className="h-7 px-2 text-[11px] font-bold text-purple-700 dark:text-purple-300 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Detail
                      </Button>
                    </div>

                    {isApproved && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant={item.statusDisposisi === 'PROSES' ? 'default' : 'outline'}
                          onClick={() => handleUpdateStatusProgres(item, 'PROSES')}
                          className={`h-7 px-2 text-[11px] font-bold rounded-lg ${item.statusDisposisi === 'PROSES' ? 'bg-blue-600 text-white' : 'text-blue-700 border-blue-200'}`}
                        >
                          Proses
                        </Button>
                        <Button
                          size="sm"
                          variant={item.statusDisposisi === 'DILAKSANAKAN' ? 'default' : 'outline'}
                          onClick={() => handleUpdateStatusProgres(item, 'DILAKSANAKAN')}
                          className={`h-7 px-2 text-[11px] font-bold rounded-lg ${item.statusDisposisi === 'DILAKSANAKAN' ? 'bg-emerald-600 text-white' : 'text-emerald-700 border-emerald-200'}`}
                        >
                          Dilaksanakan
                        </Button>
                        <Button
                          size="sm"
                          variant={item.statusDisposisi === 'PENDING' ? 'default' : 'outline'}
                          onClick={() => handleUpdateStatusProgres(item, 'PENDING')}
                          className={`h-7 px-2 text-[11px] font-bold rounded-lg ${item.statusDisposisi === 'PENDING' ? 'bg-rose-600 text-white' : 'text-rose-700 border-rose-200'}`}
                        >
                          Pending
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Detail Lembar Disposisi & Surat Asli */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-black flex items-center gap-2 text-purple-800 dark:text-purple-300">
              <CornerDownRight className="w-5 h-5 text-purple-600" /> LEMBAR DISPOSISI SURAT MASUK
            </DialogTitle>
            <DialogDescription className="text-xs">
              SMA Muhammadiyah 1 Ponorogo — Dokumen Resmi Disposisi Terverifikasi Digital
            </DialogDescription>
          </DialogHeader>

          {selectedSurat && (
            <div className="space-y-4 py-2 text-xs">
              {/* Header Naskah Surat Masuk */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-mono font-bold text-purple-700 dark:text-purple-300">
                  <span>AGENDA: {selectedSurat.nomorAgenda || '-'}</span>
                  <span>SIFAT: {selectedSurat.sifat || 'RUTIN'}</span>
                </div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {selectedSurat.perihal}
                </p>
                <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                  <p>Asal Instansi: <strong>{selectedSurat.instansi}</strong></p>
                  <p>Nomor Surat: <strong>{selectedSurat.nomorSurat}</strong></p>
                  <p>Tanggal Surat: {selectedSurat.tanggalSurat ? new Date(selectedSurat.tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                </div>

                {selectedSurat.fileUrl && (
                  <div className="pt-2 border-t mt-2">
                    <a
                      href={selectedSurat.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs"
                    >
                      <ExternalLink className="w-4 h-4" /> Buka / Unduh File Scan Foto / Dokumen Surat Asli
                    </a>
                  </div>
                )}
              </div>

              {/* Arahan Disposisi Kepala Sekolah */}
              <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2">
                <h4 className="font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider text-[11px]">
                  📌 Arahan & Instruksi Kepala Sekolah:
                </h4>
                <div className="space-y-1 text-slate-800 dark:text-slate-200">
                  <p>Instruksi: <strong>{Array.isArray(selectedSurat.disposisi?.instruksi) ? selectedSurat.disposisi.instruksi.join(', ') : 'Ditindak Lanjuti'}</strong></p>
                  {selectedSurat.disposisi?.catatan && (
                    <p className="italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border text-slate-700 dark:text-slate-300">
                      &ldquo;{selectedSurat.disposisi.catatan}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Tanda Tangan Digital & Verifikasi E-Sign */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tanda Tangan Digital Sah (E-Sign Kepsek)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Pejabat: <strong>{selectedSurat.disposisi?.signerName || 'Sugeng Riadi, M.Pd.'}</strong> ({selectedSurat.disposisi?.signerNbm || 'NBM. 974.501'})
                  </p>
                  {selectedSurat.disposisi?.eSignToken && (
                    <p className="font-mono text-[10px] text-purple-700 font-bold">
                      Token QR: {selectedSurat.disposisi.eSignToken}
                    </p>
                  )}
                </div>

                {selectedSurat.disposisi?.eSignToken && (
                  <div className="p-1 bg-white rounded-lg border shadow-2xs">
                    <QRCodeSVG
                      value={JSON.stringify({
                        issuer: 'SIMASMUH E-Sign Disposisi',
                        agenda: selectedSurat.nomorAgenda,
                        perihal: selectedSurat.perihal,
                        token: selectedSurat.disposisi.eSignToken
                      })}
                      size={60}
                      level="M"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl self-start sm:self-center">
              Tutup
            </Button>
            
            {selectedSurat && (selectedSurat.disposisi?.statusEsign === 'DISETUJUI' || selectedSurat.statusDisposisi === 'DISPOSISI_DISETUJUI' || selectedSurat.statusDisposisi === 'DILAKSANAKAN' || selectedSurat.statusDisposisi === 'PROSES' || selectedSurat.statusDisposisi === 'PENDING') && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Ubah Progres:</span>
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'PROSES' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'PROSES')}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl ${selectedSurat.statusDisposisi === 'PROSES' ? 'bg-blue-600 text-white' : 'text-blue-700 border-blue-200'}`}
                >
                  Proses
                </Button>
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'DILAKSANAKAN' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'DILAKSANAKAN')}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl ${selectedSurat.statusDisposisi === 'DILAKSANAKAN' ? 'bg-emerald-600 text-white' : 'text-emerald-700 border-emerald-200'}`}
                >
                  Dilaksanakan
                </Button>
                <Button
                  size="sm"
                  variant={selectedSurat.statusDisposisi === 'PENDING' ? 'default' : 'outline'}
                  onClick={() => handleUpdateStatusProgres(selectedSurat, 'PENDING')}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl ${selectedSurat.statusDisposisi === 'PENDING' ? 'bg-rose-600 text-white' : 'text-rose-700 border-rose-200'}`}
                >
                  Pending
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
