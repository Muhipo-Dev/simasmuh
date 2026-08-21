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
  ClipboardList, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  CalendarDays,
  Trash2,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Search,
  UploadCloud,
  FileImage,
  ExternalLink,
  Award,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'

interface IzinSiswaItem {
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
    student?: {
      id: string
      name: string
      nis: string
      nisn: string
      phone?: string
      parentPhone?: string
      class?: { name: string }
    }
  }
}

export function IzinSiswaManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_IT' || user?.subRole === 'SUPERADMIN'
  const isBau = user?.role === 'ADMIN_TU' || user?.role === 'BAU' || user?.role === 'TATA_USAHA' || user?.subRole === 'BAU' || user?.subRole === 'ADMIN_TU'
  const isGuru = user?.role === 'GURU' || user?.subRole === 'GURU' || user?.subRole === 'WALI_KELAS'
  const isTatib = user?.role === 'KETERTIBAN' || user?.subRole === 'KETERTIBAN' || user?.subRole2 === 'KETERTIBAN' || user?.subRole3 === 'KETERTIBAN'
  const isWaliMurid = user?.role === 'WALI_MURID' || user?.role === 'ORANG_TUA' || user?.role === 'PARENT'
  const isSiswa = user?.role === 'SISWA'
  
  const canManageAll = isSuperAdmin || isBau || isGuru || isTatib

  const [myIzin, setMyIzin] = useState<IzinSiswaItem[]>([])
  const [allIzin, setAllIzin] = useState<IzinSiswaItem[]>([])
  const [myStudents, setMyStudents] = useState<any[]>([])
  const [allStudentsList, setAllStudentsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form State
  const [jenisIzin, setJenisIzin] = useState<'SAKIT' | 'KEGIATAN' | 'DISPENSASI' | 'KELUARGA' | 'LAINNYA'>('SAKIT')
  const [lampiranBase64, setLampiranBase64] = useState<string>('')
  const [lampiranFileName, setLampiranFileName] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'APPROVE' | 'REJECT'
    izin: IzinSiswaItem | null
    catatan: string
    loading: boolean
  }>({
    open: false,
    type: 'APPROVE',
    izin: null,
    catatan: '',
    loading: false,
  })

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    waktuKeluar: '07:00',
    estimasiKembali: '15:30',
    alasan: '',
    targetUserId: '',
  })

  useEffect(() => {
    if (isTatib || isSuperAdmin) {
      setJenisIzin('DISPENSASI')
    } else {
      setJenisIzin('SAKIT')
    }
  }, [isTatib, isSuperAdmin])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [myRes, allRes, studentsRes] = await Promise.all([
        authenticatedFetch('/api-backend/izin-keluar/my'),
        canManageAll ? authenticatedFetch(`/api-backend/izin-keluar?${filterDate ? `date=${filterDate}&` : ''}category=SISWA`) : Promise.resolve(null),
        isWaliMurid ? authenticatedFetch('/api-backend/parents/my-students') : (canManageAll ? authenticatedFetch('/api-backend/students') : Promise.resolve(null)),
      ])

      if (myRes?.ok) {
        const myData = await myRes.json()
        const filtered = Array.isArray(myData) ? myData.filter((i: any) => i.user?.role === 'SISWA' || isWaliMurid) : []
        setMyIzin(filtered)
      }

      if (allRes?.ok) {
        const allData = await allRes.json()
        setAllIzin(Array.isArray(allData) ? allData : [])
      }

      if (studentsRes?.ok) {
        const stdData = await studentsRes.json()
        if (isWaliMurid) {
          setMyStudents(Array.isArray(stdData) ? stdData : [])
          if (stdData.length > 0 && !form.targetUserId) {
            setForm(prev => ({ ...prev, targetUserId: stdData[0]?.student?.userId || '' }))
          }
        } else {
          setAllStudentsList(Array.isArray(stdData) ? stdData : [])
        }
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
    if (!form.waktuKeluar || !form.alasan || !form.date) {
      setMsg({ type: 'error', text: 'Tanggal, Waktu, dan Alasan wajib diisi!' })
      return
    }

    if (isWaliMurid && !form.targetUserId) {
      setMsg({ type: 'error', text: 'Pilih siswa/anak yang diajukan izin!' })
      return
    }

    if ((jenisIzin === 'DISPENSASI' || isTatib) && !form.targetUserId) {
      setMsg({ type: 'error', text: 'Pilih siswa penerima surat dispensasi!' })
      return
    }

    if (!lampiranBase64) {
      Swal.fire({
        icon: 'warning',
        title: 'Bukti Lampiran Wajib Disertakan',
        text: jenisIzin === 'SAKIT' 
          ? 'Mohon lampirkan foto Surat Keterangan Sakit dari Dokter/Klinik/Puskesmas.' 
          : jenisIzin === 'DISPENSASI' 
          ? 'Mohon lampirkan Surat Tugas / Surat Dispensasi Resmi atau foto kegiatan lomba.' 
          : 'Mohon lampirkan foto Surat Keterangan atau Foto Bukti Kegiatan yang sedang berlangsung.',
      })
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
          body: JSON.stringify({ image: lampiranBase64, folder: 'surat-izin' }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedFileUrl = uploadData.url
        }
        setUploadingImage(false)
      }

      const prefixJenis = `[IZIN ${jenisIzin}] `
      const payload: any = {
        date: form.date,
        waktuKeluar: form.waktuKeluar,
        estimasiKembali: form.estimasiKembali || undefined,
        alasan: `${prefixJenis}${form.alasan}`,
        lampiranUrl: uploadedFileUrl || undefined,
        tipeIzin: jenisIzin,
        targetUserId: form.targetUserId,
      }

      const res = await authenticatedFetch('/api-backend/izin-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Izin Siswa Berhasil Diajukan',
          text: 'Permohonan izin sakit / dispensasi siswa telah terkirim dan tercatat di sistem presensi.',
          timer: 2500,
          showConfirmButton: false,
        })
        setForm({
          date: new Date().toISOString().split('T')[0],
          waktuKeluar: '07:00',
          estimasiKembali: '15:30',
          alasan: '',
          targetUserId: myStudents.length > 0 ? (myStudents[0]?.student?.userId || '') : '',
        })
        setLampiranBase64('')
        setLampiranFileName('')
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Gagal mengajukan izin.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi error. Silakan coba beberapa saat lagi.' })
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  const handleOpenActionDialog = (izin: IzinSiswaItem, type: 'APPROVE' | 'REJECT') => {
    setActionDialog({
      open: true,
      type,
      izin,
      catatan: type === 'APPROVE' 
        ? (isTatib ? 'Disetujui dan diverifikasi langsung oleh Tim Ketertiban Sekolah.' : 'Disetujui dan diverifikasi oleh pihak sekolah.') 
        : 'Mohon maaf, permohonan izin siswa belum dapat disetujui.',
      loading: false,
    })
  }

  const handleConfirmAction = async () => {
    if (!actionDialog.izin) return
    setActionDialog(prev => ({ ...prev, loading: true }))
    try {
      const endpoint = actionDialog.type === 'APPROVE' 
        ? `/api-backend/izin-keluar/${actionDialog.izin.id}/approve`
        : `/api-backend/izin-keluar/${actionDialog.izin.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catatanAdmin: actionDialog.catatan }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: actionDialog.type === 'APPROVE' ? 'Izin Siswa Terverifikasi' : 'Izin Ditolak',
          text: `Status izin siswa diperbarui dan notifikasi WhatsApp resmi telah dikirimkan ke orang tua.`,
          timer: 2000,
          showConfirmButton: false,
        })
        setActionDialog({ open: false, type: 'APPROVE', izin: null, catatan: '', loading: false })
        fetchData()
      } else {
        const err = await res.json()
        Swal.fire('Gagal', err.message || 'Gagal memproses persetujuan izin', 'error')
      }
    } catch (e) {
      Swal.fire('Error', 'Terjadi gangguan jaringan.', 'error')
    } finally {
      setActionDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleDelete = async (id: string) => {
    const confirmResult = await Swal.fire({
      title: 'Hapus Izin Siswa?',
      text: 'Data izin ini akan dihapus dari sistem presensi.',
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
        Swal.fire('Terhapus!', 'Pengajuan izin siswa telah dihapus.', 'success')
        fetchData()
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'DISETUJUI') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui & Terverifikasi
      </span>
    )
    if (status === 'DITOLAK') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs">
        <XCircle className="w-3.5 h-3.5" /> Ditolak
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
        <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi
      </span>
    )
  }

  const parseAlasanAndLampiran = (rawAlasan: string) => {
    const lampiranMatch = rawAlasan.match(/\[LAMPIRAN_SURAT\]:\s*([^\s\n]+)/)
    const lampiranUrl = lampiranMatch ? lampiranMatch[1] : null
    const cleanAlasan = rawAlasan.replace(/\n?\[LAMPIRAN_SURAT\]:\s*[^\s\n]+/, '').trim()
    return { cleanAlasan, lampiranUrl }
  }

  const filteredAllIzin = allIzin.filter(i => {
    const nameMatch = i.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const reasonMatch = i.alasan?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const classMatch = i.user?.student?.class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return nameMatch || reasonMatch || classMatch
  })

  const renderIzinCard = (izin: IzinSiswaItem, showActions = false) => {
    const studentInfo = izin.user?.student
    const { cleanAlasan, lampiranUrl } = parseAlasanAndLampiran(izin.alasan)

    const isDispensasi = izin.alasan.includes('[IZIN DISPENSASI]') || izin.alasan.includes('[DISPENSASI')
    const isSakit = izin.alasan.includes('[IZIN SAKIT]')

    return (
      <div 
        key={izin.id} 
        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-xs space-y-3.5 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                <GraduationCap className="w-3.5 h-3.5" /> SISWA {studentInfo?.class?.name ? `• ${studentInfo.class.name}` : ''}
              </Badge>

              {isDispensasi && (
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                  <Award className="w-3.5 h-3.5" /> DISPENSASI RESMI (TIM TATIB)
                </Badge>
              )}

              {isSakit && (
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                  🤒 IZIN SAKIT
                </Badge>
              )}

              {izin.user && (
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {izin.user.name} {studentInfo?.nis ? `(NIS: ${studentInfo.nis})` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                {new Date(izin.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                Waktu: {izin.waktuKeluar} {izin.estimasiKembali ? `s/d ${izin.estimasiKembali}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusBadge(izin.status)}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Alasan & Keterangan:
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {cleanAlasan}
          </p>

          {lampiranUrl && (
            <div className="pt-2 flex items-center gap-3">
              <a 
                href={lampiranUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors"
              >
                <FileImage className="w-4 h-4 text-blue-600" />
                <span>
                  {isSakit ? 'Lihat Foto Surat Sakit' : isDispensasi ? 'Lihat Bukti Dispensasi / Kegiatan' : 'Lihat Surat / Foto Kegiatan'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {izin.catatanAdmin && (
          <div className="bg-blue-50/70 dark:bg-blue-950/40 rounded-xl p-3 border border-blue-100 dark:border-blue-900/60">
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Catatan Verifikasi Sekolah / Tim Tata Tertib:
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              {izin.catatanAdmin}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="text-[11px] text-slate-400">
            Diajukan: {new Date(izin.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          <div className="flex items-center gap-2">
            {(showActions || canManageAll) && izin.status === 'MENUNGGU' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenActionDialog(izin, 'APPROVE')} 
                  className="h-8 px-3 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verifikasi & Setujui
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleOpenActionDialog(izin, 'REJECT')} 
                  className="h-8 px-3 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
                </Button>
              </>
            )}

            {(izin.status === 'MENUNGGU' || isSuperAdmin) && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleDelete(izin.id)} 
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sistem Izin Siswa & Dispensasi
            </h1>
          </div>
          <p className="text-blue-100 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Pengajuan izin sakit & keperluan keluarga siswa oleh Wali Murid serta dispensasi resmi yang diverifikasi langsung oleh Tim Tata Tertib Sekolah.
          </p>
        </div>

        {!isSiswa && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl shadow-md transition-all px-5 py-6 flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <Plus className="w-5 h-5" />
            {isTatib ? 'Terbitkan Dispensasi Siswa' : 'Ajukan Izin Siswa'}
          </Button>
        )}
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border font-semibold text-sm flex items-center gap-2.5 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <XCircle className="w-5 h-5 shrink-0 text-rose-600" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Formulir Pengajuan Izin Siswa */}
      {showForm && (
        <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-blue-100/60 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900/60 pb-4">
            <CardTitle className="text-blue-900 dark:text-blue-300 flex items-center gap-2.5 text-lg font-bold">
              <Plus className="w-5 h-5 text-blue-600" />
              {isTatib ? 'Formulir Penerbitan Dispensasi Siswa (Tim Tata Tertib)' : 'Formulir Permohonan Izin Siswa (Wali Murid)'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isTatib 
                ? 'Dispensasi khusus untuk kegiatan lomba atau penugasan resmi sekolah yang diverifikasi Tim Ketertiban.' 
                : 'Izin sakit atau keperluan keluarga wajib menyertakan foto surat keterangan untuk validasi presensi siswa.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilihan Siswa */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {isWaliMurid ? 'Pilih Anak / Siswa yang Diizinkan:' : 'Pilih Siswa Penerima Dispensasi:'}
                </Label>
                <Select value={form.targetUserId} onValueChange={(val) => setForm({ ...form, targetUserId: val || '' })}>
                  <SelectTrigger className="h-11 rounded-xl bg-white dark:bg-slate-900 font-bold">
                    <SelectValue placeholder="Pilih Siswa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isWaliMurid ? myStudents.map((rel: any) => (
                      <SelectItem key={rel.student?.userId} value={rel.student?.userId || ''}>
                        {rel.student?.name} - {rel.student?.class?.name} (NIS: {rel.student?.nis})
                      </SelectItem>
                    )) : (
                      allStudentsList.map((std: any) => (
                        <SelectItem key={std.id} value={std.userId || std.id}>
                          {std.name} - {std.class?.name || 'Siswa'} (NIS: {std.nis})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori Izin Siswa */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Jenis Izin Siswa:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {isTatib || isSuperAdmin ? (
                    <>
                      <Button
                        type="button"
                        variant={jenisIzin === 'DISPENSASI' ? 'default' : 'outline'}
                        onClick={() => setJenisIzin('DISPENSASI')}
                        className={`text-xs h-10 rounded-xl font-bold ${jenisIzin === 'DISPENSASI' ? 'bg-purple-600 text-white' : ''}`}
                      >
                        🏆 Dispensasi Lomba / Event
                      </Button>
                      <Button
                        type="button"
                        variant={jenisIzin === 'KEGIATAN' ? 'default' : 'outline'}
                        onClick={() => setJenisIzin('KEGIATAN')}
                        className={`text-xs h-10 rounded-xl font-bold ${jenisIzin === 'KEGIATAN' ? 'bg-blue-600 text-white' : ''}`}
                      >
                        🎪 Izin Kegiatan Sekolah
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant={jenisIzin === 'SAKIT' ? 'default' : 'outline'}
                        onClick={() => setJenisIzin('SAKIT')}
                        className={`text-xs h-10 rounded-xl font-bold ${jenisIzin === 'SAKIT' ? 'bg-amber-600 text-white' : ''}`}
                      >
                        🤒 Izin Sakit
                      </Button>
                      <Button
                        type="button"
                        variant={jenisIzin === 'KELUARGA' ? 'default' : 'outline'}
                        onClick={() => setJenisIzin('KELUARGA')}
                        className={`text-xs h-10 rounded-xl font-bold ${jenisIzin === 'KELUARGA' ? 'bg-indigo-600 text-white' : ''}`}
                      >
                        🏡 Keperluan Keluarga
                      </Button>
                      <Button
                        type="button"
                        variant={jenisIzin === 'KEGIATAN' ? 'default' : 'outline'}
                        onClick={() => setJenisIzin('KEGIATAN')}
                        className={`text-xs h-10 rounded-xl font-bold ${jenisIzin === 'KEGIATAN' ? 'bg-blue-600 text-white' : ''}`}
                      >
                        🎪 Kegiatan Luar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Jam Mulai <span className="text-rose-500">*</span></Label>
                  <Input type="time" value={form.waktuKeluar} onChange={(e) => setForm({ ...form, waktuKeluar: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Estimasi Selesai / Kembali</Label>
                  <Input type="time" value={form.estimasiKembali} onChange={(e) => setForm({ ...form, estimasiKembali: e.target.value })} className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Alasan & Keterangan Lengkap <span className="text-rose-500">*</span></Label>
                <Textarea 
                  value={form.alasan} 
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })} 
                  rows={3} 
                  required 
                  placeholder={jenisIzin === 'SAKIT' ? 'Contoh: Demam tinggi, disarankan istirahat oleh dokter...' : 'Contoh: Mengikuti Kejuaraan Tapak Suci Tingkat Provinsi di GOR Ponorogo...'}
                  className="rounded-xl resize-none bg-white dark:bg-slate-900 font-medium" 
                />
              </div>

              {/* Upload Bukti Lampiran Wajib */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-blue-300 dark:border-blue-800">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    {jenisIzin === 'SAKIT' 
                      ? 'Lampiran Foto Surat Keterangan Sakit Dokter / Klinik' 
                      : jenisIzin === 'DISPENSASI'
                      ? 'Surat Dispensasi Resmi / Foto Dokumentasi Kegiatan'
                      : 'Bukti Surat Keterangan / Foto Kegiatan Sedang Berlangsung'} <span className="text-rose-500">*Wajib</span>
                  </span>
                  {lampiranFileName && (
                    <span className="text-xs text-emerald-600 font-semibold">{lampiranFileName}</span>
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
                    className="h-10 px-4 rounded-xl border-blue-300 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-50"
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    {lampiranBase64 
                      ? 'Ganti File Lampiran' 
                      : (jenisIzin === 'SAKIT' ? 'Unggah Foto Surat Sakit' : 'Unggah Surat / Foto Kegiatan')}
                  </Button>

                  {lampiranBase64 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Bukti siap dikirim</span>
                      <img src={lampiranBase64} alt="Preview" className="w-10 h-10 object-cover rounded-lg border" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={submitting || uploadingImage} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  {submitting ? 'Menyimpan & Mengirim...' : 'Kirim Izin Siswa'}
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
            <Button size="sm" variant={activeTab === 'my' ? 'default' : 'ghost'} onClick={() => setActiveTab('my')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'}`}>Izin Saya</Button>
            <Button size="sm" variant={activeTab === 'all' ? 'default' : 'ghost'} onClick={() => setActiveTab('all')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}>Semua Izin Siswa ({allIzin.length})</Button>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            {isWaliMurid ? 'Riwayat Izin Anak / Siswa' : 'Riwayat Izin Terintegrasi'}
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
          <Input placeholder="Cari nama siswa, kelas, alasan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-2xl bg-white dark:bg-slate-900" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" /></div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'my' 
            ? (myIzin.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Belum ada catatan izin siswa yang diajukan.
                </div>
              ) : myIzin.map((i) => renderIzinCard(i, isWaliMurid))) 
            : (filteredAllIzin.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Tidak ada catatan izin siswa ditemukan.
                </div>
              ) : filteredAllIzin.map((i) => renderIzinCard(i, true)))}
        </div>
      )}

      {/* Modal Dialog Verifikasi */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !actionDialog.loading && setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle>{actionDialog.type === 'APPROVE' ? 'Verifikasi & Setujui Izin Siswa' : 'Tolak Izin Siswa'}</DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'APPROVE' 
                ? 'Persetujuan izin akan otomatis mengubah presensi siswa hari ini menjadi IZIN dan mengirimkan notifikasi WhatsApp resmi ke orang tua.' 
                : 'Berikan catatan penolakan untuk disampaikan kepada orang tua siswa.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            value={actionDialog.catatan} 
            onChange={(e) => setActionDialog(prev => ({ ...prev, catatan: e.target.value }))} 
            className="rounded-xl" 
            placeholder="Catatan verifikasi..." 
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

export default function IzinSiswaPage() {
  return <IzinSiswaManagement />
}

