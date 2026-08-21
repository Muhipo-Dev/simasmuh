'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  CalendarDays, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Trash2,
  Briefcase,
  Search,
  UploadCloud,
  FileImage,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  HeartHandshake
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'

interface CutiPegawaiItem {
  id: string
  date: string
  waktuKeluar: string
  estimasiKembali?: string
  alasan: string
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanAdmin?: string
  createdAt: string
  userId: string
  user?: {
    id: string
    name: string
    role: string
    subRole?: string
    phone?: string
  }
}

export function CutiPegawaiManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_IT' || user?.subRole === 'SUPERADMIN'
  const isSdm = user?.role === 'KEPEGAWAIAN' || user?.subRole === 'KEPEGAWAIAN' || user?.subRole2 === 'KEPEGAWAIAN' || user?.subRole3 === 'KEPEGAWAIAN' || user?.role === 'ADMIN_TU' || user?.role === 'BAU'
  const canManageAll = isSuperAdmin || isSdm

  const [myCuti, setMyCuti] = useState<CutiPegawaiItem[]>([])
  const [allCuti, setAllCuti] = useState<CutiPegawaiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form State
  const [jenisCuti, setJenisCuti] = useState<'TAHUNAN' | 'SAKIT' | 'MELAHIRKAN' | 'UMROH_HAJI' | 'ALASAN_PENTING'>('TAHUNAN')
  const [tglMulai, setTglMulai] = useState(new Date().toISOString().split('T')[0])
  const [tglSelesai, setTglSelesai] = useState(new Date().toISOString().split('T')[0])
  const [alasan, setAlasan] = useState('')
  const [lampiranBase64, setLampiranBase64] = useState<string>('')
  const [lampiranFileName, setLampiranFileName] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'APPROVE' | 'REJECT'
    cuti: CutiPegawaiItem | null
    catatan: string
    loading: boolean
  }>({
    open: false,
    type: 'APPROVE',
    cuti: null,
    catatan: '',
    loading: false,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [myRes, allRes] = await Promise.all([
        authenticatedFetch('/api-backend/izin-keluar/my'),
        canManageAll ? authenticatedFetch(`/api-backend/izin-keluar?${filterDate ? `date=${filterDate}&` : ''}category=PEGAWAI`) : Promise.resolve(null),
      ])

      if (myRes?.ok) {
        const myData = await myRes.json()
        const filtered = Array.isArray(myData) ? myData.filter((i: any) => i.alasan?.includes('[CUTI_SDM]') || i.alasan?.includes('[CUTI')) : []
        setMyCuti(filtered)
      }

      if (allRes?.ok) {
        const allData = await allRes.json()
        const filtered = Array.isArray(allData) ? allData.filter((i: any) => i.alasan?.includes('[CUTI_SDM]') || i.alasan?.includes('[CUTI')) : []
        setAllCuti(filtered)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, filterDate, activeTab])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file surat bukti adalah 5MB', 'warning')
      return
    }

    setLampiranFileName(file.name)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLampiranBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tglMulai || !tglSelesai || !alasan) {
      setMsg({ type: 'error', text: 'Tanggal cuti dan alasan wajib diisi!' })
      return
    }

    setSubmitting(true)
    setMsg(null)
    try {
      let uploadedFileUrl = ''
      if (lampiranBase64) {
        setUploadingImage(true)
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: lampiranBase64, folder: 'surat-cuti' }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedFileUrl = uploadData.url
        }
        setUploadingImage(false)
      }

      const prefixCuti = `[CUTI_SDM - ${jenisCuti.replace('_', ' ')}] Periode: ${tglMulai} s/d ${tglSelesai}\n`
      const payload: any = {
        date: tglMulai,
        waktuKeluar: '07:00',
        estimasiKembali: '15:30',
        alasan: `${prefixCuti}${alasan}`,
        lampiranUrl: uploadedFileUrl || undefined,
        tipeIzin: 'KEGIATAN',
      }

      const res = await authenticatedFetch('/api-backend/izin-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Permohonan Cuti Terkirim',
          text: 'Permohonan cuti Anda telah diteruskan ke Bagian Kepegawaian & SDM (HRD) untuk proses verifikasi dan persetujuan.',
          timer: 3000,
          showConfirmButton: false,
        })
        setAlasan('')
        setLampiranBase64('')
        setLampiranFileName('')
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Gagal mengajukan cuti.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi error. Silakan coba beberapa saat lagi.' })
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  const handleOpenActionDialog = (cuti: CutiPegawaiItem, type: 'APPROVE' | 'REJECT') => {
    setActionDialog({
      open: true,
      type,
      cuti,
      catatan: type === 'APPROVE' 
        ? 'Disetujui dan diverifikasi oleh Bagian Kepegawaian & SDM (HRD).' 
        : 'Mohon maaf, permohonan cuti belum dapat disetujui.',
      loading: false,
    })
  }

  const handleConfirmAction = async () => {
    if (!actionDialog.cuti) return
    setActionDialog(prev => ({ ...prev, loading: true }))
    try {
      const endpoint = actionDialog.type === 'APPROVE' 
        ? `/api-backend/izin-keluar/${actionDialog.cuti.id}/approve`
        : `/api-backend/izin-keluar/${actionDialog.cuti.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catatanAdmin: actionDialog.catatan }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: actionDialog.type === 'APPROVE' ? 'Cuti Disetujui SDM' : 'Cuti Ditolak',
          text: `Status cuti pegawai berhasil diperbarui dan notifikasi WhatsApp telah dikirimkan.`,
          timer: 2000,
          showConfirmButton: false,
        })
        setActionDialog({ open: false, type: 'APPROVE', cuti: null, catatan: '', loading: false })
        fetchData()
      } else {
        const err = await res.json()
        Swal.fire('Gagal', err.message || 'Gagal memproses permohonan cuti', 'error')
      }
    } catch (e) {
      Swal.fire('Error', 'Terjadi gangguan jaringan.', 'error')
    } finally {
      setActionDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleDelete = async (id: string) => {
    const confirmResult = await Swal.fire({
      title: 'Hapus Permohonan Cuti?',
      text: 'Data permohonan cuti ini akan dihapus dari sistem.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })

    if (!confirmResult.isConfirmed) return

    try {
      const res = await authenticatedFetch(`/api-backend/izin-keluar/${id}`, { method: 'DELETE' })
      if (res.ok) {
        Swal.fire('Terhapus!', 'Permohonan cuti telah dihapus.', 'success')
        fetchData()
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
    }
  }

  const parseAlasanAndLampiran = (rawAlasan: string) => {
    const lampiranMatch = rawAlasan.match(/\[LAMPIRAN_SURAT\]:\s*([^\s\n]+)/)
    const lampiranUrl = lampiranMatch ? lampiranMatch[1] : null
    const cleanAlasan = rawAlasan.replace(/\n?\[LAMPIRAN_SURAT\]:\s*[^\s\n]+/, '').trim()
    return { cleanAlasan, lampiranUrl }
  }

  const filteredAllCuti = allCuti.filter(i => {
    const nameMatch = i.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const reasonMatch = i.alasan?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return nameMatch || reasonMatch
  })

  const renderCutiCard = (cuti: CutiPegawaiItem, showActions = false) => {
    const { cleanAlasan, lampiranUrl } = parseAlasanAndLampiran(cuti.alasan)

    return (
      <div 
        key={cuti.id} 
        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-xs space-y-3.5 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                <Briefcase className="w-3.5 h-3.5" /> {cuti.user?.role || 'PEGAWAI'}
              </Badge>

              {cuti.user && (
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {cuti.user.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <CalendarDays className="w-4 h-4 text-purple-500" />
                {new Date(cuti.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cuti.status === 'DISETUJUI' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui SDM
              </span>
            ) : cuti.status === 'DITOLAK' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs">
                <XCircle className="w-3.5 h-3.5" /> Ditolak SDM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi SDM
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Rincian Pengajuan Cuti:
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-line">
            {cleanAlasan}
          </p>

          {lampiranUrl && (
            <div className="pt-2 flex items-center gap-3">
              <a 
                href={lampiranUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-colors"
              >
                <FileImage className="w-4 h-4 text-purple-600" />
                <span>Lihat Dokumen / Surat Keterangan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {cuti.catatanAdmin && (
          <div className="bg-purple-50/70 dark:bg-purple-950/40 rounded-xl p-3 border border-purple-100 dark:border-purple-900/60">
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Catatan Verifikasi SDM / Kepegawaian:
            </p>
            <p className="text-xs text-purple-800 dark:text-purple-200 font-medium">
              {cuti.catatanAdmin}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="text-[11px] text-slate-400">
            Diajukan: {new Date(cuti.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          <div className="flex items-center gap-2">
            {showActions && cuti.status === 'MENUNGGU' && canManageAll && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenActionDialog(cuti, 'APPROVE')} 
                  className="h-8 px-3 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setujui Cuti
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenActionDialog(cuti, 'REJECT')} 
                  className="h-8 px-3 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak Cuti
                </Button>
              </>
            )}

            {(cuti.userId === user?.id || isSuperAdmin) && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDelete(cuti.id)} 
                className="h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Manajemen Izin Cuti Pegawai & Guru
            </h1>
          </div>
          <p className="text-purple-100 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Pengajuan cuti tahunan, cuti sakit, cuti melahirkan, atau cuti ibadah yang diverifikasi langsung oleh Tim Kepegawaian & SDM (HRD) Sekolah.
          </p>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-purple-700 hover:bg-purple-50 font-black rounded-2xl shadow-md transition-all px-5 py-6 flex items-center gap-2 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-5 h-5" />
          Ajukan Izin Cuti
        </Button>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border font-semibold text-sm flex items-center gap-2.5 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
        }`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Formulir Permohonan Cuti */}
      {showForm && (
        <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-purple-100/60 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-900/60 pb-4">
            <CardTitle className="text-purple-900 dark:text-purple-300 flex items-center gap-2.5 text-lg font-bold">
              <CalendarDays className="w-5 h-5 text-purple-600" /> Formulir Pengajuan Izin Cuti
            </CardTitle>
            <CardDescription className="text-xs">
              Permohonan akan diverifikasi oleh Bagian Kepegawaian & SDM (HRD) sesuai hak cuti pegawai.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Jenis Cuti:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'TAHUNAN', label: '🏖️ Cuti Tahunan' },
                    { key: 'SAKIT', label: '🏥 Cuti Sakit' },
                    { key: 'MELAHIRKAN', label: '👶 Melahirkan' },
                    { key: 'UMROH_HAJI', label: '🕋 Umroh / Haji' },
                    { key: 'ALASAN_PENTING', label: '⚡ Alasan Penting' },
                  ].map((cat) => (
                    <Button
                      key={cat.key}
                      type="button"
                      variant={jenisCuti === cat.key ? 'default' : 'outline'}
                      onClick={() => setJenisCuti(cat.key as any)}
                      className={`text-xs h-10 rounded-xl font-bold ${jenisCuti === cat.key ? 'bg-purple-600 text-white' : ''}`}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal Mulai Cuti <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal Selesai Cuti <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={tglSelesai} onChange={(e) => setTglSelesai(e.target.value)} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Alasan & Keterangan Pengajuan Cuti <span className="text-rose-500">*</span></Label>
                <Textarea 
                  value={alasan} 
                  onChange={(e) => setAlasan(e.target.value)} 
                  rows={3} 
                  required 
                  placeholder="Contoh: Mengajukan cuti tahunan selama 3 hari untuk keperluan keluarga..."
                  className="rounded-xl resize-none bg-white dark:bg-slate-900 font-medium" 
                />
              </div>

              {/* Upload Surat Bukti (Dokter / Undangan / dll) */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-purple-300 dark:border-purple-800">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-purple-600" />
                    Lampiran Berkas Pendukung (Surat Dokter / Surat Keterangan) <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                  </span>
                  {lampiranFileName && (
                    <span className="text-xs text-purple-600 font-semibold">{lampiranFileName}</span>
                  )}
                </Label>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*,.pdf" 
                  className="hidden" 
                />

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl border-purple-300 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-50"
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    {lampiranBase64 ? 'Ganti Berkas' : 'Unggah Foto / PDF Surat'}
                  </Button>

                  {lampiranBase64 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">File siap diupload</span>
                      <img src={lampiranBase64} alt="Preview" className="w-10 h-10 object-cover rounded-lg border" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={submitting || uploadingImage} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan Cuti'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {canManageAll ? (
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
            <Button size="sm" variant={activeTab === 'my' ? 'default' : 'ghost'} onClick={() => setActiveTab('my')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'my' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'}`}>Cuti Saya</Button>
            <Button size="sm" variant={activeTab === 'all' ? 'default' : 'ghost'} onClick={() => setActiveTab('all')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}>Verifikasi SDM ({allCuti.length})</Button>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            Riwayat Pengajuan Cuti Saya
          </div>
        )}

        {canManageAll && activeTab === 'all' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9 rounded-xl w-36 text-xs bg-white dark:bg-slate-900" />
          </div>
        )}
      </div>

      {canManageAll && activeTab === 'all' && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input placeholder="Cari nama pegawai, alasan cuti..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-2xl bg-white dark:bg-slate-900" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" /></div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'my' 
            ? (myCuti.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Belum ada permohonan cuti yang diajukan.
                </div>
              ) : myCuti.map((i) => renderCutiCard(i, false))) 
            : (filteredAllCuti.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Tidak ada permohonan cuti pegawai ditemukan.
                </div>
              ) : filteredAllCuti.map((i) => renderCutiCard(i, true)))}
        </div>
      )}

      {/* Modal Verifikasi SDM */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !actionDialog.loading && setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{actionDialog.type === 'APPROVE' ? 'Setujui Permohonan Cuti (SDM)' : 'Tolak Permohonan Cuti'}</DialogTitle>
            <DialogDescription>
              Keputusan verifikasi cuti akan dikonfirmasikan langsung ke pegawai terkait melalui notifikasi resmi.
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            value={actionDialog.catatan} 
            onChange={(e) => setActionDialog(prev => ({ ...prev, catatan: e.target.value }))} 
            className="rounded-xl" 
            placeholder="Catatan verifikasi SDM..." 
          />
          <DialogFooter>
            <Button onClick={handleConfirmAction} className={actionDialog.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}>
              {actionDialog.loading ? 'Memproses...' : 'Konfirmasi Keputusan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CutiPegawaiPage() {
  return <CutiPegawaiManagement />
}
