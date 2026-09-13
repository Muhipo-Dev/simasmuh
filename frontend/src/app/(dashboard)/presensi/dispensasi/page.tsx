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
  FileText, 
  GraduationCap, 
  Trash2,
  Award,
  UploadCloud,
  FileImage,
  ExternalLink,
  ShieldCheck,
  Search,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'

interface DispensasiItem {
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

export default function DispensasiPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_IT' || user?.subRole === 'SUPERADMIN'
  const isBau = user?.role === 'ADMIN_TU' || user?.role === 'BAU' || user?.role === 'TATA_USAHA' || user?.subRole === 'BAU' || user?.subRole === 'ADMIN_TU'
  const isTatib = user?.role === 'KETERTIBAN' || user?.subRole === 'KETERTIBAN' || user?.subRole2 === 'KETERTIBAN' || user?.subRole3 === 'KETERTIBAN'
  const isWaliKelas = user?.subRole === 'WALI_KELAS' || user?.role === 'WALI_KELAS'
  const isGuru = user?.role === 'GURU' || user?.subRole === 'GURU' || isWaliKelas
  const isWaliMurid = user?.role === 'WALI_MURID'
  const isSiswa = user?.role === 'SISWA'

  const isKepalaSekolah = user?.role === 'KEPALA_SEKOLAH'

  // Tim Ketertiban menerbitkan dispensasi (Superadmin juga memiliki akses penuh)
  // Kepala Sekolah langsung approve/reject
  const canPublish = isTatib || isSuperAdmin
  const canManage = isKepalaSekolah

  const [allDispensasi, setAllDispensasi] = useState<DispensasiItem[]>([])
  const [allStudentsList, setAllStudentsList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [kategoriDispensasi, setKategoriDispensasi] = useState<'DISPENSASI' | 'KEGIATAN'>('DISPENSASI')
  const [lampiranBase64, setLampiranBase64] = useState<string>('')
  const [lampiranFileName, setLampiranFileName] = useState<string>('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'APPROVE' | 'REJECT'
    item: DispensasiItem | null
    catatan: string
    loading: boolean
  }>({
    open: false,
    type: 'APPROVE',
    item: null,
    catatan: '',
    loading: false,
  })

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    waktuKeluar: '08:00',
    estimasiKembali: '12:00',
    alasan: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resData, resStudents] = await Promise.all([
        authenticatedFetch(`/api-backend/izin-keluar?${filterDate ? `date=${filterDate}&` : ''}category=SISWA`),
        canPublish ? authenticatedFetch('/api-backend/students') : Promise.resolve(null)
      ])

      if (resData?.ok) {
        const raw = await resData.json()
        if (Array.isArray(raw)) {
          // Filter hanya yang kategori dispensasi & kegiatan resmi sekolah
          const filtered = raw.filter((i: any) => {
            const isDisp = i.alasan?.includes('[IZIN DISPENSASI]') || i.alasan?.includes('[DISPENSASI') || i.alasan?.includes('[IZIN KEGIATAN]')
            if (isSiswa) {
              return isDisp && (i.userId === user?.id || i.user?.id === user?.id)
            }
            return isDisp
          })
          setAllDispensasi(filtered)
        }
      }

      if (resStudents?.ok) {
        const stdList = await resStudents.json()
        setAllStudentsList(Array.isArray(stdList) ? stdList : [])
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
  }, [session, filterDate])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Terlalu Besar', 'Maksimal ukuran file surat tugas adalah 5MB', 'warning')
      return
    }
    setLampiranFileName(file.name)
    const reader = new FileReader()
    reader.onloadend = () => {
      setLampiranBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const toggleSelectStudent = (uid: string) => {
    if (!uid) return
    setSelectedUserIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const handleSelectAllVisible = (visibleIds: string[]) => {
    const allSelected = visibleIds.every(id => selectedUserIds.includes(id))
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.date || !form.waktuKeluar || !form.alasan || selectedUserIds.length === 0) {
      setMsg({ type: 'error', text: 'Pilih setidaknya 1 siswa, tanggal, jam pelaksanaan, dan alasan penugasan!' })
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
          body: JSON.stringify({ image: lampiranBase64, folder: 'dispensasi-siswa' }),
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          uploadedFileUrl = uploadData.url
        }
        setUploadingImage(false)
      }

      const prefixJenis = `[IZIN ${kategoriDispensasi}] `
      
      // Kirim permohonan dispensasi untuk setiap siswa terpilih
      const promises = selectedUserIds.map(targetUserId => {
        const payload = {
          date: form.date,
          waktuKeluar: form.waktuKeluar,
          estimasiKembali: form.estimasiKembali || undefined,
          alasan: `${prefixJenis}${form.alasan}`,
          lampiranUrl: uploadedFileUrl || undefined,
          tipeIzin: kategoriDispensasi,
          targetUserId,
        }
        return authenticatedFetch('/api-backend/izin-keluar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      })

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.ok).length

      if (successCount > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Surat Dispensasi Berhasil Diterbitkan',
          text: `Dispensasi resmi untuk ${successCount} siswa telah tercatat dan tersinkronkan dengan presensi jam pelajaran.`,
          timer: 3000,
          showConfirmButton: false,
        })
        const todayStr = new Date().toISOString().split('T')[0]
        setForm({
          date: todayStr,
          waktuKeluar: '08:00',
          estimasiKembali: '12:00',
          alasan: '',
        })
        setSelectedUserIds([])
        setLampiranBase64('')
        setLampiranFileName('')
        setShowForm(false)
        fetchData()
      } else {
        setMsg({ type: 'error', text: 'Gagal menerbitkan surat dispensasi siswa.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Terjadi kesalahan sistem saat menerbitkan dispensasi.' })
    } finally {
      setSubmitting(false)
      setUploadingImage(false)
    }
  }

  const handleActionDialog = async () => {
    if (!actionDialog.item) return
    setActionDialog(prev => ({ ...prev, loading: true }))
    try {
      const endpoint = actionDialog.type === 'APPROVE'
        ? `/api-backend/izin-keluar/${actionDialog.item.id}/approve`
        : `/api-backend/izin-keluar/${actionDialog.item.id}/reject`

      const res = await authenticatedFetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catatanAdmin: actionDialog.catatan }),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: actionDialog.type === 'APPROVE' ? 'Dispensasi Disetujui' : 'Dispensasi Ditolak',
          timer: 2000,
          showConfirmButton: false,
        })
        setActionDialog({ open: false, type: 'APPROVE', item: null, catatan: '', loading: false })
        fetchData()
      } else {
        const err = await res.json()
        Swal.fire('Gagal', err.message || 'Gagal memproses verifikasi', 'error')
      }
    } catch {
      Swal.fire('Error', 'Terjadi kesalahan koneksi.', 'error')
    } finally {
      setActionDialog(prev => ({ ...prev, loading: false }))
    }
  }

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Hapus Dispensasi?',
      text: 'Data dispensasi ini akan dihapus dari sistem presensi.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    })
    if (!confirm.isConfirmed) return

    try {
      const res = await authenticatedFetch(`/api-backend/izin-keluar/${id}`, { method: 'DELETE' })
      if (res.ok) {
        Swal.fire('Terhapus', 'Dispensasi berhasil dihapus.', 'success')
        fetchData()
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
    }
  }

  const handleResetAllDispensasi = async () => {
    if (allDispensasi.length === 0) {
      Swal.fire('Informasi', 'Tidak ada data dispensasi untuk direset.', 'info')
      return
    }

    const confirm = await Swal.fire({
      title: 'Reset Semua Data Dispensasi?',
      text: `Apakah Anda yakin ingin menghapus seluruh (${allDispensasi.length}) rekaman data dispensasi? Aksi ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Reset Semua',
      cancelButtonText: 'Batal'
    })
    if (!confirm.isConfirmed) return

    try {
      setLoading(true)
      await Promise.all(
        allDispensasi.map(item =>
          authenticatedFetch(`/api-backend/izin-keluar/${item.id}`, { method: 'DELETE' })
        )
      )
      Swal.fire('Berhasil Direset', 'Seluruh data dispensasi telah berhasil dikosongkan.', 'success')
      fetchData()
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan saat mereset data dispensasi.', 'error')
      setLoading(false)
    }
  }

  const parseAlasan = (raw: string) => {
    const lampiranMatch = raw.match(/\[LAMPIRAN_SURAT\]:\s*([^\s\n]+)/)
    const lampiranUrl = lampiranMatch ? lampiranMatch[1] : null
    const cleanAlasan = raw.replace(/\n?\[LAMPIRAN_SURAT\]:\s*[^\s\n]+/, '').trim()
    return { cleanAlasan, lampiranUrl }
  }

  const filteredList = allDispensasi.filter(item => {
    const sName = item.user?.name?.toLowerCase() || ''
    const sClass = item.user?.student?.class?.name?.toLowerCase() || ''
    const reason = item.alasan.toLowerCase()
    const q = searchQuery.toLowerCase()
    return sName.includes(q) || sClass.includes(q) || reason.includes(q)
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Award className="w-6 h-6 text-yellow-300" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Dispensasi Khusus Siswa
            </h1>
          </div>
          <p className="text-purple-100 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Penerbitan surat dispensasi resmi oleh <strong>Tim Ketertiban</strong>. Persetujuan langsung oleh <strong>Kepala Sekolah</strong>. Data tercatat di log absensi siswa yang dapat dipantau oleh Siswa &amp; Wali Murid.
          </p>
        </div>

        {canPublish && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {allDispensasi.length > 0 && (
              <Button
                onClick={handleResetAllDispensasi}
                variant="outline"
                className="bg-white/10 hover:bg-rose-600 hover:text-white border-white/20 text-white font-bold rounded-2xl shadow-md transition-all px-4 py-6 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Reset Data
              </Button>
            )}
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-white text-purple-800 hover:bg-purple-50 font-black rounded-2xl shadow-md transition-all px-5 py-6 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Terbitkan Dispensasi
            </Button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border font-semibold text-sm flex items-center gap-2.5 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 border-rose-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Form Terbitkan Dispensasi */}
      {showForm && canPublish && (
        <Card className="border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-purple-100/60 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-900/60 pb-4">
            <CardTitle className="text-purple-900 dark:text-purple-300 flex items-center gap-2.5 text-lg font-bold">
              <Award className="w-5 h-5 text-purple-600" />
              Formulir Penerbitan Surat Dispensasi Resmi (Tata Usaha / TU)
            </CardTitle>
            <CardDescription className="text-xs">
              Isi data siswa yang ditugaskan beserta jam dispensasi pelajaran dan lampiran surat tugas resmi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilih Siswa Multi-Select & Searchable */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Pilih Siswa Penerima Dispensasi ({selectedUserIds.length} Siswa Terpilih) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    {selectedUserIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserIds([])}
                        className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Reset Pilihan
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                      type="text" 
                      placeholder="Ketik nama siswa atau NIS..." 
                      value={studentSearch} 
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="h-10 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 font-medium"
                    />
                  </div>
                  <Select value={selectedClassFilter} onValueChange={(val) => setSelectedClassFilter(val || 'ALL')}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 font-bold">
                      <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="ALL">Semua Kelas</SelectItem>
                      {Array.from(new Set(allStudentsList.map((s: any) => s.class?.name).filter(Boolean))).sort().map((cName: any) => (
                        <SelectItem key={cName} value={cName}>Kelas {cName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Checklist Siswa */}
                {(() => {
                  const visibleStudents = allStudentsList.filter((std: any) => {
                    const matchName = std.name?.toLowerCase().includes(studentSearch.toLowerCase())
                    const matchNis = std.nis?.includes(studentSearch)
                    const matchClass = selectedClassFilter === 'ALL' || std.class?.name === selectedClassFilter
                    return (matchName || matchNis) && matchClass
                  })

                  return (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                        <span>Menampilkan {visibleStudents.length} siswa</span>
                        {visibleStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllVisible(visibleStudents.map((s: any) => s.userId || s.id))}
                            className="text-purple-600 dark:text-purple-400 hover:underline font-bold"
                          >
                            {visibleStudents.every((s: any) => selectedUserIds.includes(s.userId || s.id))
                              ? 'Batal Pilih Semua yang Tampil'
                              : 'Pilih Semua yang Tampil'}
                          </button>
                        )}
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                        {visibleStudents.length === 0 ? (
                          <div className="col-span-full py-6 text-center text-xs text-slate-400 font-medium">
                            Tidak ada siswa yang sesuai pencarian.
                          </div>
                        ) : (
                          visibleStudents.map((std: any) => {
                            const uId = std.userId || std.id
                            const isSelected = selectedUserIds.includes(uId)

                            return (
                              <div
                                key={std.id}
                                onClick={() => toggleSelectStudent(uId)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-purple-100/90 dark:bg-purple-950 border-purple-400 dark:border-purple-700 shadow-2xs' 
                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-100/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border transition-colors shrink-0 ${
                                    isSelected 
                                      ? 'bg-purple-600 text-white border-purple-600' 
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                  }`}>
                                    {isSelected && '✓'}
                                  </div>
                                  <div className="truncate">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {std.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                      {std.class?.name || 'Siswa'} &bull; NIS: {std.nis}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Kategori Dispensasi */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Kategori Dispensasi:
                </Label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <Button
                    type="button"
                    variant={kategoriDispensasi === 'DISPENSASI' ? 'default' : 'outline'}
                    onClick={() => setKategoriDispensasi('DISPENSASI')}
                    className={`text-xs h-10 rounded-xl font-bold ${kategoriDispensasi === 'DISPENSASI' ? 'bg-purple-600 text-white' : ''}`}
                  >
                    🏆 Kejuaraan / Lomba
                  </Button>
                  <Button
                    type="button"
                    variant={kategoriDispensasi === 'KEGIATAN' ? 'default' : 'outline'}
                    onClick={() => setKategoriDispensasi('KEGIATAN')}
                    className={`text-xs h-10 rounded-xl font-bold ${kategoriDispensasi === 'KEGIATAN' ? 'bg-indigo-600 text-white' : ''}`}
                  >
                    🎪 Penugasan / Dinas Sekolah
                  </Button>
                </div>
              </div>

              {/* Tanggal & Jam Pelaksanaan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900 font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Jam Mulai <span className="text-rose-500">*</span></Label>
                  <Input type="time" value={form.waktuKeluar} onChange={(e) => setForm({ ...form, waktuKeluar: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900 font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Estimasi Selesai <span className="text-rose-500">*</span></Label>
                  <Input type="time" value={form.estimasiKembali} onChange={(e) => setForm({ ...form, estimasiKembali: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900 font-semibold" />
                </div>
              </div>

              {/* Alasan & Kegiatan */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Alasan & Nama Kegiatan <span className="text-rose-500">*</span></Label>
                <Textarea 
                  value={form.alasan} 
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })} 
                  rows={3} 
                  required 
                  placeholder="Contoh: Mengikuti Kejuaraan Tapak Suci Tingkat Kabupaten / Petugas Upacara HUT RI..."
                  className="rounded-xl resize-none bg-white dark:bg-slate-900 font-medium" 
                />
              </div>

              {/* Upload Surat Tugas */}
              <div className="space-y-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-purple-300 dark:border-purple-800">
                <Label className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-purple-600" />
                    Lampiran Foto Surat Tugas / Undangan Resmi
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
                    className="h-10 px-4 rounded-xl border-purple-300 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-50"
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    {lampiranBase64 ? 'Ganti File Bukti' : 'Pilih File Surat Tugas (PDF / Foto)'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowForm(false)} 
                  className="rounded-xl font-bold"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || uploadingImage} 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menerbitkan...
                    </>
                  ) : (
                    'Terbitkan Dispensasi'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Log & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Log Riwayat Dispensasi Siswa
          </h2>
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 font-bold text-xs">
            {filteredList.length} Rekaman
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Cari siswa / kegiatan..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 rounded-xl text-xs w-48 sm:w-60 bg-white dark:bg-slate-900" 
            />
          </div>
          <Input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)} 
            className="h-10 rounded-xl text-xs w-36 bg-white dark:bg-slate-900" 
          />
        </div>
      </div>

      {/* List Dispensasi */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-sm font-semibold text-slate-500">Memuat log dispensasi siswa...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md space-y-2">
          <Award className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">Belum Ada Riwayat Dispensasi</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Dispensasi resmi yang diterbitkan oleh Tim Ketertiban untuk jam pelajaran siswa akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((item) => {
            const student = item.user?.student
            const { cleanAlasan, lampiranUrl } = parseAlasan(item.alasan)

            return (
              <div 
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-xs space-y-3.5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-purple-600 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                        <Award className="w-3.5 h-3.5" /> DISPENSASI RESMI
                      </Badge>
                      <Badge className="bg-blue-600 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                        <GraduationCap className="w-3.5 h-3.5" /> {student?.class?.name || 'Siswa'}
                      </Badge>
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        {item.user?.name} {student?.nis ? `(NIS: ${student.nis})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                        <CalendarDays className="w-4 h-4 text-purple-500" />
                        {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span>•</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                        Jam: {item.waktuKeluar} - {item.estimasiKembali || 'Selesai'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {item.status === 'DISETUJUI' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">✓ Disetujui</Badge>
                    ) : item.status === 'DITOLAK' ? (
                      <Badge className="bg-rose-100 text-rose-700 font-bold border border-rose-200">✕ Ditolak</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 font-bold border border-amber-200">Menunggu</Badge>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50/50 dark:bg-purple-950/30 rounded-xl p-3.5 border border-purple-100 dark:border-purple-900/40 space-y-2">
                  <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                    Nama Kegiatan & Keterangan Dispensasi:
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {cleanAlasan}
                  </p>

                  {lampiranUrl && (
                    <div className="pt-1">
                      <a 
                        href={lampiranUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-xs font-bold transition-colors"
                      >
                        <FileImage className="w-4 h-4 text-purple-600" />
                        <span>Lihat Lampiran Surat Tugas / Foto</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Diterbitkan: {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>

                  <div className="flex items-center gap-2">
                    {canManage && item.status === 'MENUNGGU' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => setActionDialog({ open: true, type: 'APPROVE', item, catatan: 'Dispensasi disetujui.', loading: false })}
                          className="h-8 px-3 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => setActionDialog({ open: true, type: 'REJECT', item, catatan: 'Dispensasi belum disetujui.', loading: false })}
                          className="h-8 px-3 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    )}

                    {(item.status === 'MENUNGGU' || isSuperAdmin) && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(item.id)} 
                        className="h-8 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog Aksi Approve/Reject */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg">
              {actionDialog.type === 'APPROVE' ? 'Setujui Surat Dispensasi' : 'Tolak Surat Dispensasi'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Siswa: <strong>{actionDialog.item?.user?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Catatan Verifikasi:</Label>
            <Input 
              value={actionDialog.catatan} 
              onChange={(e) => setActionDialog(prev => ({ ...prev, catatan: e.target.value }))}
              placeholder="Catatan..." 
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))} className="rounded-xl font-bold">
              Batal
            </Button>
            <Button 
              onClick={handleActionDialog} 
              disabled={actionDialog.loading}
              className={`rounded-xl font-bold text-white ${actionDialog.type === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {actionDialog.loading ? 'Memproses...' : actionDialog.type === 'APPROVE' ? 'Ya, Setujui' : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
