'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  DoorOpen, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  CalendarDays,
  Trash2,
  Briefcase,
  Search,
  Building2,
  Coffee,
  HeartHandshake
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Swal from 'sweetalert2'

interface IzinKeluarPegawai {
  id: string
  date: string
  waktuKeluar: string
  estimasiKembali?: string
  alasan: string
  status: string
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

export default function IzinKeluarPegawaiPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any

  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_IT' || user?.subRole === 'SUPERADMIN'
  const isBau = user?.role === 'ADMIN_TU' || user?.role === 'BAU' || user?.role === 'TATA_USAHA' || user?.subRole === 'BAU' || user?.subRole === 'ADMIN_TU'
  const canManageAll = isSuperAdmin || isBau

  const [myIzin, setMyIzin] = useState<IzinKeluarPegawai[]>([])
  const [allIzin, setAllIzin] = useState<IzinKeluarPegawai[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    waktuKeluar: new Date().toTimeString().slice(0, 5),
    estimasiKembali: '12:00',
    keperluan: 'DINAS_LUAR',
    alasan: '',
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
        const filtered = Array.isArray(myData) ? myData.filter((i: any) => i.user?.role !== 'SISWA') : []
        setMyIzin(filtered)
      }

      if (allRes?.ok) {
        const allData = await allRes.json()
        setAllIzin(Array.isArray(allData) ? allData : [])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.waktuKeluar || !form.alasan || !form.date) {
      setMsg({ type: 'error', text: 'Tanggal, Waktu Keluar, dan Alasan wajib diisi!' })
      return
    }

    setSubmitting(true)
    setMsg(null)
    try {
      const prefixKeperluan = `[IZIN KELUAR - ${form.keperluan.replace('_', ' ')}] `
      const payload = {
        date: form.date,
        waktuKeluar: form.waktuKeluar,
        estimasiKembali: form.estimasiKembali || undefined,
        alasan: `${prefixKeperluan}${form.alasan}`,
      }

      const res = await authenticatedFetch('/api-backend/izin-keluar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Izin Keluar Tercatat',
          text: 'Izin keluar Anda telah otomatis tercatat ke sistem presensi sekolah.',
          timer: 2500,
          showConfirmButton: false,
        })
        setForm({
          date: new Date().toISOString().split('T')[0],
          waktuKeluar: new Date().toTimeString().slice(0, 5),
          estimasiKembali: '12:00',
          keperluan: 'DINAS_LUAR',
          alasan: '',
        })
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Gagal mencatat izin keluar.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi error. Silakan coba beberapa saat lagi.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmResult = await Swal.fire({
      title: 'Hapus Catatan Izin Keluar?',
      text: 'Log izin keluar ini akan dihapus dari sistem.',
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
        Swal.fire('Terhapus!', 'Catatan izin keluar telah dihapus.', 'success')
        fetchData()
      }
    } catch {
      Swal.fire('Gagal', 'Terjadi kesalahan sistem.', 'error')
    }
  }

  const filteredAllIzin = allIzin.filter(i => {
    const nameMatch = i.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    const reasonMatch = i.alasan?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    return nameMatch || reasonMatch
  })

  const renderIzinCard = (izin: IzinKeluarPegawai) => {
    return (
      <div 
        key={izin.id} 
        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md shadow-xs space-y-3 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 px-2.5 py-0.5 rounded-md">
                <Briefcase className="w-3.5 h-3.5" /> {izin.user?.role || 'PEGAWAI'} • OTOMATIS TERCATAT
              </Badge>

              {izin.user && (
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {izin.user.name}
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
                Keluar: {izin.waktuKeluar} {izin.estimasiKembali ? `s/d ${izin.estimasiKembali}` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Langsung Tercatat
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Keperluan & Alasan Izin Keluar:
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {izin.alasan}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="text-[11px] text-slate-400">
            Dicatat: {new Date(izin.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>

          {(izin.userId === user?.id || isSuperAdmin) && (
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
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <DoorOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Izin Keluar Pegawai & Guru
            </h1>
          </div>
          <p className="text-emerald-100 mt-2 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Pencatatan izin keluar kantor/sekolah untuk keperluan dinas luar atau urusan mendesak. Izin keluar pegawai langsung otomatis tercatat ke sistem presensi tanpa perlu menunggu verifikasi.
          </p>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl shadow-md transition-all px-5 py-6 flex items-center gap-2 shrink-0 self-start sm:self-center"
        >
          <Plus className="w-5 h-5" />
          Catat Izin Keluar
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

      {/* Formulir Izin Keluar Pegawai */}
      {showForm && (
        <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-emerald-100/60 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-900/60 pb-4">
            <CardTitle className="text-emerald-900 dark:text-emerald-300 flex items-center gap-2.5 text-lg font-bold">
              <DoorOpen className="w-5 h-5 text-emerald-600" /> Formulir Izin Keluar Pegawai
            </CardTitle>
            <CardDescription className="text-xs">
              Izin keluar saat jam kerja berlangsung. Langsung tercatat otomatis ke sistem presensi.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Jenis Keperluan:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'DINAS_LUAR', label: '🏛️ Dinas Luar / Tugas', icon: Building2 },
                    { key: 'MENGHADIRI_ACARA', label: '🎪 Rapat / Undangan', icon: Briefcase },
                    { key: 'URUSAN_MENDESAK', label: '⚡ Urusan Mendesak', icon: Coffee },
                    { key: 'LAINNYA', label: '📋 Keperluan Lain', icon: HeartHandshake },
                  ].map((cat) => (
                    <Button
                      key={cat.key}
                      type="button"
                      variant={form.keperluan === cat.key ? 'default' : 'outline'}
                      onClick={() => setForm({ ...form, keperluan: cat.key })}
                      className={`text-xs h-10 rounded-xl font-bold ${form.keperluan === cat.key ? 'bg-emerald-600 text-white' : ''}`}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Jam Keluar <span className="text-rose-500">*</span></Label>
                  <Input type="time" value={form.waktuKeluar} onChange={(e) => setForm({ ...form, waktuKeluar: e.target.value })} required className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Estimasi Kembali</Label>
                  <Input type="time" value={form.estimasiKembali} onChange={(e) => setForm({ ...form, estimasiKembali: e.target.value })} className="h-11 rounded-xl bg-white dark:bg-slate-900" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Keterangan / Alasan Keluar <span className="text-rose-500">*</span></Label>
                <Textarea 
                  value={form.alasan} 
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })} 
                  rows={3} 
                  required 
                  placeholder="Contoh: Menghadiri rapat koordinasi MGMP Matematika di Dinas Pendidikan..."
                  className="rounded-xl resize-none bg-white dark:bg-slate-900 font-medium" 
                />
              </div>

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                  {submitting ? 'Menyimpan...' : 'Simpan Izin Keluar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab Switcher & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {canManageAll ? (
          <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
            <Button size="sm" variant={activeTab === 'my' ? 'default' : 'ghost'} onClick={() => setActiveTab('my')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'my' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}>Izin Saya</Button>
            <Button size="sm" variant={activeTab === 'all' ? 'default' : 'ghost'} onClick={() => setActiveTab('all')} className={`rounded-xl font-extrabold text-xs px-4 h-9 ${activeTab === 'all' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'}`}>Semua Pegawai ({allIzin.length})</Button>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-emerald-600" />
            Riwayat Izin Keluar Saya
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
          <Input placeholder="Cari nama pegawai, keperluan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-2xl bg-white dark:bg-slate-900" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" /></div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'my' 
            ? (myIzin.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Belum ada catatan izin keluar pegawai.
                </div>
              ) : myIzin.map((i) => renderIzinCard(i))) 
            : (filteredAllIzin.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border text-slate-400 text-sm">
                  Tidak ada catatan izin keluar ditemukan.
                </div>
              ) : filteredAllIzin.map((i) => renderIzinCard(i)))}
        </div>
      )}
    </div>
  )
}
