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
  const isWaliKelas = user?.subRole === 'WALI_KELAS' || user?.role === 'WALI_KELAS'
  const isGuru = user?.role === 'GURU' || user?.subRole === 'GURU' || isWaliKelas
  const isTatib = user?.role === 'KETERTIBAN' || user?.subRole === 'KETERTIBAN' || user?.subRole2 === 'KETERTIBAN' || user?.subRole3 === 'KETERTIBAN' || user?.subRole4 === 'KETERTIBAN' || user?.subRole5 === 'KETERTIBAN'
  const isBk = user?.role === 'BK_BP' || user?.role === 'BK' || user?.subRole === 'BK_BP' || user?.subRole === 'BK' || user?.subRole2 === 'BK_BP' || user?.subRole3 === 'BK_BP' || user?.subRole4 === 'BK_BP' || user?.subRole5 === 'BK_BP'
  const isWaliMurid = user?.role === 'WALI_MURID'
  const isSiswa = user?.role === 'SISWA'
  
  // Tim Ketertiban (TATIB) & Tim BK/BP & Wali Kelas memverifikasi semua izin siswa & melakukan pengecekan secara berkala
  // TU tidak memiliki akses ke modul ini
  // Kepala Sekolah & Siswa & Wali Murid hanya lihat log absensi masing-masing
  const canManageAll = isSuperAdmin || isTatib || isBk || isWaliKelas
  // Pengaju Izin Siswa: Khusus Wali Murid & Wali Kelas (Wali Kelas dapat menginputkan izin siswa secara sah jika izin di luar sistem)
  const canCreate = isWaliMurid || isWaliKelas || isSuperAdmin

  const [myIzin, setMyIzin] = useState<IzinSiswaItem[]>([])
  const [allIzin, setAllIzin] = useState<IzinSiswaItem[]>([])
  const [myStudents, setMyStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>(isWaliMurid ? 'my' : 'all')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form State (Khusus Izin Siswa: Sakit & Keperluan Keluarga)
  const [jenisIzin, setJenisIzin] = useState<'SAKIT' | 'KELUARGA'>('SAKIT')
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
    endDate: new Date().toISOString().split('T')[0],
    alasan: '',
    targetUserId: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [myRes, allRes, studentsRes, allStudentsRes, classesRes] = await Promise.all([
        authenticatedFetch('/api-backend/izin-keluar/my'),
        // Tatib & Wali Kelas fetch semua izin siswa; Siswa/WaliMurid/KepSek hanya via /my
        canManageAll ? authenticatedFetch(`/api-backend/izin-keluar?${filterDate ? `date=${filterDate}&` : ''}category=SISWA`) : Promise.resolve(null),
        isWaliMurid ? authenticatedFetch('/api-backend/parents/my-students') : Promise.resolve(null),
        isWaliKelas || isSuperAdmin ? authenticatedFetch('/api-backend/students') : Promise.resolve(null),
        isWaliKelas ? authenticatedFetch('/api-backend/classes') : Promise.resolve(null),
      ])

      if (myRes?.ok) {
        const myData = await myRes.json()
        const filtered = Array.isArray(myData) ? myData.filter((i: any) => {
          const notDisp = !i.alasan?.includes('[IZIN DISPENSASI]') && !i.alasan?.includes('[DISPENSASI')
          return notDisp && (i.user?.role === 'SISWA' || isWaliMurid)
        }) : []
        setMyIzin(filtered)
      }

      if (allRes?.ok) {
        const allData = await allRes.json()
        const filteredAll = Array.isArray(allData) ? allData.filter((i: any) => {
          return !i.alasan?.includes('[IZIN DISPENSASI]') && !i.alasan?.includes('[DISPENSASI')
        }) : []
        setAllIzin(filteredAll)
      }

      if (studentsRes?.ok) {
        const stdData = await studentsRes.json()
        if (isWaliMurid) {
          setMyStudents(Array.isArray(stdData) ? stdData : [])
          if (stdData.length > 0 && !form.targetUserId) {
            const firstUid = stdData[0]?.userId || stdData[0]?.student?.userId || stdData[0]?.id || ''
            setForm(prev => ({ ...prev, targetUserId: firstUid }))
          }
        }
      }

      if (allStudentsRes?.ok) {
        const rawStudents = await allStudentsRes.json()
        if (Array.isArray(rawStudents) && (isWaliKelas || isSuperAdmin)) {
          let homeroomClassId = ''
          if (classesRes?.ok) {
            const classesData = await classesRes.json()
            const myClass = classesData.find((c: any) => c.homeroomTeacher?.userId === user?.id || c.homeroomTeacher?.user?.id === user?.id)
            if (myClass) homeroomClassId = myClass.id
          }

          const filteredStd = homeroomClassId
            ? rawStudents.filter((s: any) => s.classId === homeroomClassId || s.class?.id === homeroomClassId)
            : rawStudents

          const mapped = filteredStd.map((s: any) => ({
            id: s.id,
            userId: s.userId || s.user?.id || s.id,
            name: s.name,
            nis: s.nis,
            className: s.class?.name || '',
          }))
          setMyStudents(mapped)
          if (mapped.length > 0 && !form.targetUserId) {
            setForm(prev => ({ ...prev, targetUserId: mapped[0].userId }))
          }
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
    if (!form.alasan || !form.date) {
      setMsg({ type: 'error', text: 'Tanggal dan Alasan wajib diisi!' })
      return
    }

    if (!form.targetUserId) {
      setMsg({ type: 'error', text: 'Pilih siswa/anak yang diajukan izin!' })
      return
    }

    if (!lampiranBase64) {
      Swal.fire({
        icon: 'warning',
        title: 'Bukti Lampiran Wajib Disertakan',
        text: jenisIzin === 'SAKIT' 
          ? 'Mohon lampirkan foto Surat Keterangan Sakit dari Dokter/Klinik/Puskesmas.' 
          : 'Mohon lampirkan foto Surat Keterangan / Bukti Keperluan Keluarga.',
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

      const isMultiDay = form.endDate && form.endDate !== form.date
      const rentangPeriodeText = isMultiDay ? ` (Periode: ${form.date} s/d ${form.endDate})` : ''
      const prefixJenis = `[IZIN ${jenisIzin}]${rentangPeriodeText} `
      
      const payload: any = {
        date: form.date,
        waktuKeluar: '07:00',
        estimasiKembali: isMultiDay ? `s/d ${form.endDate}` : '15:30',
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
        const todayStr = new Date().toISOString().split('T')[0]
        setForm({
          date: todayStr,
          endDate: todayStr,
          alasan: '',
          targetUserId: myStudents.length > 0 ? (myStudents[0]?.userId || myStudents[0]?.student?.userId || '') : '',
        })
        setLampiranBase64('')
        setLampiranFileName('')
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Gagal mengajukan izin siswa.' })
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Terjadi kesalahan server saat mengajukan izin.' })
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  const handleOpenActionDialog = (izin: IzinSiswaItem, type: 'APPROVE' | 'REJECT') => {
    const roleVerifierText = isBk 
      ? 'Disetujui dan diverifikasi oleh Guru Bimbingan Konseling (BK/BP).' 
      : isTatib 
        ? 'Disetujui dan diverifikasi langsung oleh Tim Ketertiban Sekolah.' 
        : 'Disetujui dan diverifikasi oleh pihak sekolah.'

    setActionDialog({
      open: true,
      type,
      izin,
      catatan: type === 'APPROVE' 
        ? roleVerifierText 
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

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                {new Date(izin.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                {isDispensasi 
                  ? `Jam: ${izin.waktuKeluar} - ${izin.estimasiKembali || 'Selesai'}` 
                  : (izin.estimasiKembali?.startsWith('s/d ') ? `Periode: ${new Date(izin.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${izin.estimasiKembali}` : 'Izin Penuh 1 Hari')}
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
              {isWaliKelas ? 'Izin Siswa & Dispensasi Kelas' : 'Sistem Izin Siswa (Wali Murid)'}
            </h1>
          </div>
          <p className="text-blue-100 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {isWaliKelas 
              ? 'Kelola, verifikasi permohonan izin siswa perwalian, atau tambahkan izin secara sah bagi siswa yang melapor di luar sistem SIMASMUH.'
              : 'Pengajuan izin sakit dan keperluan keluarga dapat dilakukan via sistem aplikasi dan WhatsApp Chatbot resmi sekolah (+62 882-9373-3330). Seluruh data tersimpan aman dan terintegrasi otomatis.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <a
            href="https://wa.me/6288293733330?text=IZIN"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Lapor via WhatsApp
          </a>

          {canCreate && (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-white text-blue-700 hover:bg-blue-50 font-black rounded-2xl shadow-md transition-all px-4 py-5 flex items-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              {isWaliKelas ? 'Tambahkan Izin Siswa' : 'Ajukan di Web'}
            </Button>
          )}
        </div>
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
      {showForm && canCreate && (
        <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-blue-100/60 dark:bg-blue-950/60 border-b border-blue-200 dark:border-blue-900/60 pb-4">
            <CardTitle className="text-blue-900 dark:text-blue-300 flex items-center gap-2.5 text-lg font-bold">
              <Plus className="w-5 h-5 text-blue-600" />
              Formulir Permohonan Izin Siswa (Wali Murid)
            </CardTitle>
            <CardDescription className="text-xs">
              Pernyataan izin ketidakhadiran siswa karena sakit atau keperluan keluarga resmi oleh orang tua/wali murid.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilihan Siswa */}
              {isWaliMurid && myStudents.length === 1 ? (
                // JIKA HANYA 1 SISWA TERHUBUNG: Tampilkan info siswa langsung tanpa dropdown
                (() => {
                  const singleStudent = myStudents[0]
                  const studentName = singleStudent.name || singleStudent.student?.name || 'Siswa'
                  const studentClass = singleStudent.className || singleStudent.student?.class?.name || '-'
                  const studentNis = singleStudent.nis || singleStudent.student?.nis || '-'
                  return (
                    <div className="space-y-1.5">
                      <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        Siswa yang Diizinkan:
                      </Label>
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-800 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                            {studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {studentName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              Kelas: <strong>{studentClass}</strong> &bull; NIS: <strong>{studentNis}</strong>
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700">
                          ✓ Terverifikasi
                        </Badge>
                      </div>
                    </div>
                  )
                })()
              ) : (
                // JIKA LEBIH DARI 1 SISWA ATAU TIM TATIB / ADMIN: Tampilkan dropdown pilihan dengan nama jelas
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {isWaliMurid ? 'Pilih Anak / Siswa yang Diizinkan:' : 'Pilih Siswa:'}
                  </Label>
                  <Select 
                    value={form.targetUserId} 
                    onValueChange={(val) => setForm({ ...form, targetUserId: val || '' })}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-slate-900 font-bold border-2 border-blue-200 dark:border-blue-800 shadow-xs text-left">
                      <div className="truncate">
                        {(() => {
                          const selected = myStudents.find(
                            (s: any) => (s.userId || s.student?.userId || s.id) === form.targetUserId
                          )
                          if (selected) {
                            const sName = selected.name || selected.student?.name || 'Siswa'
                            const sClass = selected.className || selected.student?.class?.name || '-'
                            const sNis = selected.nis || selected.student?.nis || '-'
                            return `${sName} - Kelas ${sClass} (NIS: ${sNis})`
                          }
                          return <span className="text-slate-400 font-normal">Pilih Anak / Siswa...</span>
                        })()}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 p-1.5 shadow-2xl">
                      {myStudents.map((rel: any, idx: number) => {
                        const studentUserId = rel.userId || rel.student?.userId || rel.id || ''
                        const studentName = rel.name || rel.student?.name || 'Siswa'
                        const studentClass = rel.className || rel.student?.class?.name || '-'
                        const studentNis = rel.nis || rel.student?.nis || '-'
                        return (
                          <SelectItem key={studentUserId || idx} value={studentUserId} className="rounded-xl py-2.5 px-3 font-semibold text-xs cursor-pointer">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white text-xs">{studentName}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  Kelas: {studentClass} &bull; NIS: {studentNis}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Kategori Izin Siswa */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Jenis Izin Siswa:
                </Label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
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
                </div>
              </div>

              {/* Rentang Tanggal Izin Siswa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center justify-between">
                    <span>Dari Tanggal <span className="text-rose-500">*</span></span>
                    <span className="text-xs text-slate-400 font-normal">Mulai Izin</span>
                  </Label>
                  <Input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => {
                      const newStart = e.target.value
                      setForm(prev => ({
                        ...prev,
                        date: newStart,
                        endDate: prev.endDate < newStart ? newStart : prev.endDate
                      }))
                    }} 
                    required 
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 font-semibold" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center justify-between">
                    <span>Sampai Tanggal <span className="text-rose-500">*</span></span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {form.endDate === form.date ? '1 Hari' : `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.date).getTime()) / (1000 * 3600 * 24)) + 1} Hari`}
                    </span>
                  </Label>
                  <Input 
                    type="date" 
                    min={form.date}
                    value={form.endDate} 
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })} 
                    required 
                    className="h-11 rounded-xl bg-white dark:bg-slate-900 font-semibold" 
                  />
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
                      : 'Bukti Foto Surat Keterangan / Keperluan Keluarga'} <span className="text-rose-500">*Wajib</span>
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
            {(isWaliMurid || isSiswa) && (
              <Button size="sm" variant={activeTab === 'my' ? 'default' : 'ghost'} onClick={() => setActiveTab('my')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'}`}>Izin Saya</Button>
            )}
            <Button size="sm" variant={activeTab === 'all' ? 'default' : 'ghost'} onClick={() => setActiveTab('all')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'}`}>
              {(isTatib || isBk) ? `Verifikasi Izin Siswa (${allIzin.length})` : `Semua Izin Siswa (${allIzin.length})`}
            </Button>
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

