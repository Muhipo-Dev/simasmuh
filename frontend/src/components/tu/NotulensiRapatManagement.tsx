'use client'

import React, { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, Plus, Search, Calendar, Clock, MapPin, Users, 
  CheckCircle2, Download, Printer, FileSpreadsheet, Sparkles, 
  Trash2, Edit, Eye, Filter, UserCheck, CheckSquare, AlertCircle, 
  Share2, BookOpen, Send, Loader2, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

export interface NotulensiItem {
  id: string
  nomorNotulensi?: string
  judulRapat: string
  agenda?: string
  kategori: string
  tanggal: string
  waktuMulai?: string
  waktuSelesai?: string
  tempat: string
  pemimpinRapat: string
  notulis: string
  pesertaHadirCount: number
  pesertaTotalCount: number
  daftarPeserta?: string
  poinPembahasan?: string
  keputusanHasil: string
  tindakLanjut?: string
  fotoDokumentasi?: string
  fileLampiran?: string
  status: string
  createdAt?: string
}

export function NotulensiRapatManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const user = session?.user as any

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedNotulensi, setSelectedNotulensi] = useState<NotulensiItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const [formState, setFormState] = useState({
    judulRapat: '',
    agenda: '',
    kategori: 'RAPAT_DINAS',
    tanggal: new Date().toISOString().split('T')[0],
    waktuMulai: '08:00',
    waktuSelesai: '11:00',
    tempat: 'Aula Utama Sekolah',
    pemimpinRapat: '',
    notulis: user?.name || 'Humas & SDM',
    pesertaHadirCount: 30,
    pesertaTotalCount: 30,
    daftarPeserta: '',
    poinPembahasan: '',
    keputusanHasil: '',
    tindakLanjut: '',
    fotoDokumentasi: '',
    fileLampiran: '',
    status: 'FINAL'
  })

  // 1. Query Data Notulensi Rapat dari Database Backend
  const {
    data: notulensiList = [],
    isLoading,
    isRefetching,
    refetch
  } = useQuery<NotulensiItem[]>({
    queryKey: ['notulensi-rapat', selectedKategori, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedKategori !== 'ALL') params.append('kategori', selectedKategori)
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus)
      const res = await authenticatedFetch(`/api-backend/notulensi-rapat?${params.toString()}`)
      if (!res.ok) throw new Error('Gagal mengambil data notulensi rapat')
      return res.json()
    }
  })

  // 2. Mutation Tambah Notulensi
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formState) => {
      const res = await authenticatedFetch('/api-backend/notulensi-rapat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menyimpan notulensi rapat')
      }
      return res.json()
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: ['notulensi-rapat'] })
      setIsAddModalOpen(false)
      setFormState({
        judulRapat: '',
        agenda: '',
        kategori: 'RAPAT_DINAS',
        tanggal: new Date().toISOString().split('T')[0],
        waktuMulai: '08:00',
        waktuSelesai: '11:00',
        tempat: 'Aula Utama Sekolah',
        pemimpinRapat: '',
        notulis: user?.name || 'Humas & SDM',
        pesertaHadirCount: 30,
        pesertaTotalCount: 30,
        daftarPeserta: '',
        poinPembahasan: '',
        keputusanHasil: '',
        tindakLanjut: '',
        fotoDokumentasi: '',
        fileLampiran: '',
        status: 'FINAL'
      })
      Swal.fire({
        icon: 'success',
        title: 'Notulensi Tersimpan',
        text: `Dokumen notulensi ${newRecord.nomorNotulensi || ''} resmi tersimpan di database.`,
        timer: 2000,
        showConfirmButton: false
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // 3. Mutation Hapus Notulensi
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/notulensi-rapat/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus notulensi')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notulensi-rapat'] })
      Swal.fire('Terhapus', 'Notulensi rapat telah dihapus dari database.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  // Handler Submit Form
  const handleCreateNotulensi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.judulRapat || !formState.keputusanHasil || !formState.pemimpinRapat) {
      Swal.fire('Peringatan', 'Judul rapat, pemimpin rapat, dan keputusan hasil wajib diisi!', 'warning')
      return
    }
    createMutation.mutate(formState)
  }

  // Handler Hapus
  const handleDeleteNotulensi = (id: string, judul: string) => {
    Swal.fire({
      title: 'Hapus Notulensi?',
      text: `Hapus arsip notulensi "${judul}" dari basis data?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#d33'
    }).then(result => {
      if (result.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })
  }

  // Export Excel
  const handleExportExcel = () => {
    if (notulensiList.length === 0) {
      Swal.fire('Peringatan', 'Tidak ada data notulensi rapat untuk diekspor.', 'info')
      return
    }

    const exportData = notulensiList.map((n, i) => ({
      No: i + 1,
      ID: n.nomorNotulensi || n.id,
      Tanggal: typeof n.tanggal === 'string' ? n.tanggal.split('T')[0] : n.tanggal,
      Waktu: `${n.waktuMulai || '-'} s/d ${n.waktuSelesai || '-'}`,
      'Judul Rapat': n.judulRapat,
      Agenda: n.agenda || '-',
      Kategori: n.kategori.replace(/_/g, ' '),
      Tempat: n.tempat,
      'Pemimpin Rapat': n.pemimpinRapat,
      Notulis: n.notulis,
      'Kehadiran (Hadir/Total)': `${n.pesertaHadirCount} / ${n.pesertaTotalCount}`,
      'Poin Pembahasan': n.poinPembahasan || '-',
      'Keputusan / Hasil': n.keputusanHasil,
      'Tindak Lanjut': n.tindakLanjut || '-',
      Status: n.status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Notulensi Rapat')
    XLSX.writeFile(wb, `Notulensi_Rapat_SIMASMUH_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Filter Data Lokal Search
  const filteredData = useMemo(() => {
    return notulensiList.filter(item => {
      const matchQuery = 
        item.judulRapat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.agenda && item.agenda.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.pemimpinRapat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notulis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nomorNotulensi && item.nomorNotulensi.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchQuery
    })
  }, [notulensiList, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header Banner Notulensi Rapat */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-purple-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-[11px]">
                Administrasi & Tata Kelola Rapat
              </Badge>
              <span className="text-xs text-purple-300">Akses Humas & SDM serta Admin TU</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pusat Notulensi & Hasil Rapat Sekolah
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl">
              Pencatatan terpadu agenda rapat kedinasan, koordinasi SDM & Humas, daftar hadir, poin pembahasan, hingga penetapan keputusan hasil rapat resmi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl font-bold gap-1.5 h-9"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl font-bold gap-1.5 shadow-sm h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Notulensi Baru</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative shrink-0 w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Cari nomor / judul / agenda / pimpinan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedKategori} onValueChange={(val: string | null) => setSelectedKategori(val || 'ALL')}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Kategori Rapat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              <SelectItem value="RAPAT_DINAS">Rapat Dinas</SelectItem>
              <SelectItem value="RAPAT_GURU">Rapat Guru & Tendik</SelectItem>
              <SelectItem value="RAPAT_KOORDINASI_SDM">Koordinasi SDM & Humas</SelectItem>
              <SelectItem value="RAPAT_PIMPINAN">Rapat Pimpinan</SelectItem>
              <SelectItem value="RAPAT_WALI_MURID">Rapat Wali Murid</SelectItem>
              <SelectItem value="RAPAT_KOMITE">Rapat Komite Sekolah</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={(val: string | null) => setSelectedStatus(val || 'ALL')}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="FINAL">Final</SelectItem>
              <SelectItem value="DIVERIFIKASI">Diverifikasi</SelectItem>
              <SelectItem value="DRAF">Draf</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-2.5 rounded-xl border-slate-200 dark:border-slate-800"
            title="Refresh Data Notulensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid Card Notulensi Rapat */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <span className="text-xs">Memuat data notulensi rapat dari basis data...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 text-xs">
          Belum ada arsip notulensi rapat yang tersimpan di basis data. Klik tombol <strong>"Tulis Notulensi Baru"</strong> untuk mengarsipkan rapat pertama.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredData.map(item => {
            const formattedDate = typeof item.tanggal === 'string' ? item.tanggal.split('T')[0] : item.tanggal

            return (
              <Card key={item.id} className="border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-900 transition-all rounded-2xl shadow-xs">
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                        {item.nomorNotulensi || item.id.substring(0, 8)}
                      </Badge>
                      <Badge className={`text-[10px] font-bold ${
                        item.status === 'DIVERIFIKASI' ? 'bg-emerald-500/10 text-emerald-600' :
                        item.status === 'FINAL' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {item.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                      {item.judulRapat}
                    </CardTitle>
                    {item.agenda && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium line-clamp-1">
                        {item.agenda}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{formattedDate} ({item.waktuMulai || '-'} - {item.waktuSelesai || '-'})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate">{item.tempat}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Hadir: {item.pesertaHadirCount}/{item.pesertaTotalCount} Org</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">Notulis: {item.notulis}</span>
                    </div>
                  </div>

                  <div className="bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/40 text-[11px] space-y-1">
                    <span className="font-bold text-purple-950 dark:text-purple-300 block">Poin Keputusan Utama:</span>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic">
                      "{item.keputusanHasil}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">Pimpinan: <strong className="text-slate-700 dark:text-slate-200">{item.pemimpinRapat}</strong></span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedNotulensi(item)
                          setIsDetailModalOpen(true)
                        }}
                        className="h-7 text-[10px] rounded-lg gap-1 border-slate-200"
                      >
                        <Eye className="w-3 h-3 text-purple-600" />
                        <span>Detail</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeleteNotulensi(item.id, item.judulRapat)}
                        className="h-7 text-[10px] rounded-lg text-rose-600 hover:bg-rose-50 border-slate-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL TAMBAH NOTULENSI KE DATABASE */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Tulis Notulensi Rapat Resmi
            </DialogTitle>
            <DialogDescription className="text-xs">
              Arsipkan jalannya rapat kedinasan, koordinasi Humas & SDM, serta keputusan hasil rapat langsung ke basis data sekolah.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNotulensi} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Judul / Perihal Rapat *</Label>
              <Input
                placeholder="Contoh: Rapat Pleno Koordinasi Awal Semester"
                value={formState.judulRapat}
                onChange={(e) => setFormState({ ...formState, judulRapat: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Kategori Rapat</Label>
                <Select
                  value={formState.kategori}
                  onValueChange={(val: any) => setFormState({ ...formState, kategori: val || 'RAPAT_DINAS' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAPAT_DINAS">Rapat Dinas</SelectItem>
                    <SelectItem value="RAPAT_GURU">Rapat Guru & Tendik</SelectItem>
                    <SelectItem value="RAPAT_KOORDINASI_SDM">Koordinasi SDM & Humas</SelectItem>
                    <SelectItem value="RAPAT_PIMPINAN">Rapat Pimpinan</SelectItem>
                    <SelectItem value="RAPAT_WALI_MURID">Rapat Wali Murid</SelectItem>
                    <SelectItem value="RAPAT_KOMITE">Rapat Komite Sekolah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Agenda Utama</Label>
                <Input
                  placeholder="Contoh: Evaluasi KBM dan Program Kerja"
                  value={formState.agenda}
                  onChange={(e) => setFormState({ ...formState, agenda: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-bold">Tanggal</Label>
                <Input
                  type="date"
                  value={formState.tanggal}
                  onChange={(e) => setFormState({ ...formState, tanggal: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Waktu Mulai</Label>
                <Input
                  type="time"
                  value={formState.waktuMulai}
                  onChange={(e) => setFormState({ ...formState, waktuMulai: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Waktu Selesai</Label>
                <Input
                  type="time"
                  value={formState.waktuSelesai}
                  onChange={(e) => setFormState({ ...formState, waktuSelesai: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Tempat Pelaksanaan</Label>
                <Input
                  placeholder="Aula Utama / Ruang Rapat"
                  value={formState.tempat}
                  onChange={(e) => setFormState({ ...formState, tempat: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Pemimpin Rapat *</Label>
                <Input
                  placeholder="Kepala Sekolah / Waka Humas & SDM"
                  value={formState.pemimpinRapat}
                  onChange={(e) => setFormState({ ...formState, pemimpinRapat: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold">Notulis *</Label>
                <Input
                  value={formState.notulis}
                  onChange={(e) => setFormState({ ...formState, notulis: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Peserta Hadir (Org)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formState.pesertaHadirCount}
                  onChange={(e) => setFormState({ ...formState, pesertaHadirCount: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Total Undangan</Label>
                <Input
                  type="number"
                  min="0"
                  value={formState.pesertaTotalCount}
                  onChange={(e) => setFormState({ ...formState, pesertaTotalCount: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Daftar Peserta / Unsur yang Hadir</Label>
              <Input
                placeholder="Dewan Guru, Staf TU, Waka, Komite..."
                value={formState.daftarPeserta}
                onChange={(e) => setFormState({ ...formState, daftarPeserta: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Poin-poin Pembahasan</Label>
              <Textarea
                placeholder="Tuliskan poin pembahasan jalannya diskusi rapat..."
                value={formState.poinPembahasan}
                onChange={(e) => setFormState({ ...formState, poinPembahasan: e.target.value })}
                className="mt-1 rounded-xl text-xs h-18"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Keputusan & Hasil Rapat *</Label>
              <Textarea
                placeholder="Tuliskan keputusan mutlak dan hasil resmi rapat..."
                value={formState.keputusanHasil}
                onChange={(e) => setFormState({ ...formState, keputusanHasil: e.target.value })}
                className="mt-1 rounded-xl text-xs h-20"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Tindak Lanjut & Rekomendasi (Action Plan)</Label>
              <Input
                placeholder="Langkah tindak lanjut dan penanggung jawab..."
                value={formState.tindakLanjut}
                onChange={(e) => setFormState({ ...formState, tindakLanjut: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <div>
                <Label className="text-xs font-bold text-purple-900 dark:text-purple-300">
                  Foto Dokumentasi Rapat (URL / Link Foto)
                </Label>
                <Input
                  placeholder="https://... atau /uploads/dokumentasi-rapat.jpg"
                  value={formState.fotoDokumentasi}
                  onChange={(e) => setFormState({ ...formState, fotoDokumentasi: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs bg-white dark:bg-slate-900"
                />
                <span className="text-[10px] text-slate-500">Bukti visual kehadiran fisik peserta rapat</span>
              </div>

              <div>
                <Label className="text-xs font-bold text-purple-900 dark:text-purple-300">
                  File Lampiran / Materi (URL / Drive)
                </Label>
                <Input
                  placeholder="Link dokumen PDF materi atau berkas..."
                  value={formState.fileLampiran}
                  onChange={(e) => setFormState({ ...formState, fileLampiran: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs bg-white dark:bg-slate-900"
                />
                <span className="text-[10px] text-slate-500">Materi presentasi / berkas pendukung</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1">
                {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Simpan ke Database</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL NOTULENSI */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedNotulensi && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] font-mono bg-purple-50 text-purple-700 border-purple-200">
                    {selectedNotulensi.nomorNotulensi || selectedNotulensi.id}
                  </Badge>
                  <Badge className="bg-purple-500/10 text-purple-600 text-[10px]">
                    {selectedNotulensi.kategori.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-extrabold">
                  {selectedNotulensi.judulRapat}
                </DialogTitle>
                {selectedNotulensi.agenda && (
                  <DialogDescription className="text-xs text-purple-700 dark:text-purple-300">
                    Agenda: {selectedNotulensi.agenda}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tanggal:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {typeof selectedNotulensi.tanggal === 'string' ? selectedNotulensi.tanggal.split('T')[0] : selectedNotulensi.tanggal}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Waktu:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedNotulensi.waktuMulai || '-'} - {selectedNotulensi.waktuSelesai || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tempat:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedNotulensi.tempat}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kehadiran:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedNotulensi.pesertaHadirCount} dari {selectedNotulensi.pesertaTotalCount} Org</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Pimpinan Rapat & Notulis:</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border">
                      Pemimpin: <strong>{selectedNotulensi.pemimpinRapat}</strong> | Notulis: <strong>{selectedNotulensi.notulis}</strong>
                    </p>
                  </div>

                  {selectedNotulensi.daftarPeserta && (
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Daftar Unsur Peserta Hadir:</h4>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border">
                        {selectedNotulensi.daftarPeserta}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Poin Pembahasan:</h4>
                    <div className="text-slate-600 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border whitespace-pre-line">
                      {selectedNotulensi.poinPembahasan || '-'}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-purple-900 dark:text-purple-300 text-xs">Keputusan & Hasil Rapat:</h4>
                    <div className="text-purple-950 dark:text-purple-200 font-medium text-[11px] bg-purple-50 dark:bg-purple-950/40 p-3 rounded-lg border border-purple-200 dark:border-purple-900 whitespace-pre-line">
                      {selectedNotulensi.keputusanHasil}
                    </div>
                  </div>

                  {selectedNotulensi.tindakLanjut && (
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Tindak Lanjut (Action Plan):</h4>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border">
                        {selectedNotulensi.tindakLanjut}
                      </div>
                    </div>
                  )}

                  {/* Foto Dokumentasi Visual Rapat */}
                  {selectedNotulensi.fotoDokumentasi && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                        <span>Dokumentasi Foto Rapat:</span>
                      </h4>
                      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 max-h-60 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={selectedNotulensi.fotoDokumentasi} 
                          alt="Dokumentasi Rapat" 
                          className="w-full h-auto max-h-60 object-contain rounded-lg"
                          onError={(e: any) => { e.target.style.display = 'none' }}
                        />
                      </div>
                      <a 
                        href={selectedNotulensi.fotoDokumentasi} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:underline block truncate"
                      >
                        Buka Foto Asli ({selectedNotulensi.fotoDokumentasi})
                      </a>
                    </div>
                  )}

                  {/* File Lampiran Materi */}
                  {selectedNotulensi.fileLampiran && (
                    <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-semibold">Berkas Lampiran / Materi:</span>
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-300 truncate block">
                          {selectedNotulensi.fileLampiran}
                        </span>
                      </div>
                      <a 
                        href={selectedNotulensi.fileLampiran} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shrink-0"
                      >
                        Buka Berkas
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl text-xs">
                  Tutup
                </Button>
                <Button 
                  onClick={() => {
                    window.print()
                  }} 
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
