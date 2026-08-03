'use client'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ClipboardList, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  CalendarDays,
  Trash2,
  ShieldCheck
} from 'lucide-react'

interface IzinKeluar {
  id: string
  date: string
  waktuKeluar: string
  estimasiKembali?: string
  alasan: string
  status: 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  catatanAdmin?: string
  createdAt: string
  user?: { name: string; role: string }
}

export default function IzinKeluarPage() {
  const authenticatedFetch = useAuthenticatedFetch();
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdmin = user?.role === 'SUPERADMIN' || user?.subRole === 'ADMIN WEB' || user?.subRole2 === 'ADMIN WEB'

  const [myIzin, setMyIzin] = useState<IzinKeluar[]>([])
  const [allIzin, setAllIzin] = useState<IzinKeluar[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [filterDate, setFilterDate] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    waktuKeluar: '',
    estimasiKembali: '',
    alasan: '',
  })

  const getApiUrl = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001`
  }

  const getToken = () => (session as any)?.accessToken || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const apiUrl = getApiUrl()
      const token = getToken()
      const [myRes, allRes] = await Promise.all([
        authenticatedFetch(`${apiUrl}/izin-keluar/my`, { headers: { Authorization: `Bearer ${token}` } }),
        isAdmin ? authenticatedFetch(`${apiUrl}/izin-keluar${filterDate ? `?date=${filterDate}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
      ])
      const myData = await myRes.json()
      setMyIzin(Array.isArray(myData) ? myData : [])
      if (allRes) {
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
  }, [session, filterDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.waktuKeluar || !form.alasan || !form.date) {
      setMsg({ type: 'error', text: 'Tanggal, Waktu Keluar, dan Alasan wajib diisi!' })
      return
    }
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await authenticatedFetch(`${getApiUrl()}/izin-keluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMsg({ type: 'success', text: 'Izin keluar berhasil diajukan! Menunggu persetujuan.' })
        setForm({ date: new Date().toISOString().split('T')[0], waktuKeluar: '', estimasiKembali: '', alasan: '' })
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        setMsg({ type: 'error', text: err.message || 'Gagal mengajukan izin.' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Koneksi error. Coba lagi.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: string) => {
    await authenticatedFetch(`${getApiUrl()}/izin-keluar/${id}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    fetchData()
  }

  const handleReject = async (id: string, catatan?: string) => {
    await authenticatedFetch(`${getApiUrl()}/izin-keluar/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ catatanAdmin: catatan || 'Ditolak oleh admin' }),
    })
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengajuan izin ini?')) return
    await authenticatedFetch(`${getApiUrl()}/izin-keluar/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    fetchData()
  }

  const statusBadge = (status: string) => {
    if (status === 'DISETUJUI') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
      </span>
    )
    if (status === 'DITOLAK') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3.5 h-3.5" /> Ditolak
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Clock className="w-3.5 h-3.5" /> Menunggu
      </span>
    )
  }

  const renderIzinCard = (izin: IzinKeluar, showActions = false) => (
    <div key={izin.id} className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          {showActions && izin.user && (
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{izin.user.name}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {new Date(izin.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Keluar: {izin.waktuKeluar}</span>
            {izin.estimasiKembali && <span className="text-blue-600 dark:text-blue-400 font-bold ml-2">• Kembali: {izin.estimasiKembali}</span>}
          </p>
        </div>
        {statusBadge(izin.status)}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Alasan</p>
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{izin.alasan}</p>
      </div>
      {izin.catatanAdmin && (
        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3 border border-blue-100 dark:border-blue-900">
          <p className="text-xs font-semibold text-blue-500 uppercase mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Catatan Admin</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">{izin.catatanAdmin}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <span className="text-[11px] text-slate-400">Diajukan: {new Date(izin.createdAt).toLocaleDateString('id-ID')}</span>
        <div className="flex gap-2">
          {showActions && izin.status === 'MENUNGGU' && (
            <>
              <Button size="sm" onClick={() => handleApprove(izin.id)} className="h-8 px-3 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Setujui
              </Button>
              <Button size="sm" onClick={() => handleReject(izin.id)} className="h-8 px-3 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
              </Button>
            </>
          )}
          {!showActions && izin.status === 'MENUNGGU' && (
            <Button size="sm" variant="ghost" onClick={() => handleDelete(izin.id)} className="h-8 px-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-amber-500" />
            Izin Keluar Sekolah
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
            Pengajuan izin meninggalkan sekolah pada jam kerja.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajukan Izin
        </Button>
      </div>

      {/* Pesan Sukses/Error */}
      {msg && (
        <div className={`p-4 rounded-xl border font-semibold text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Form Pengajuan */}
      {showForm && (
        <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-amber-100/80 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 pb-4">
            <CardTitle className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Formulir Pengajuan Izin Keluar
            </CardTitle>
            <CardDescription className="text-amber-700/80 dark:text-amber-400">Isi detail permohonan izin Anda dengan lengkap dan benar.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Tanggal <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Waktu Keluar <span className="text-rose-500">*</span></Label>
                  <Input type="time" value={form.waktuKeluar} onChange={(e) => setForm({ ...form, waktuKeluar: e.target.value })} required className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Estimasi Kembali</Label>
                  <Input type="time" value={form.estimasiKembali} onChange={(e) => setForm({ ...form, estimasiKembali: e.target.value })} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 dark:text-slate-200 text-sm">Alasan / Keperluan <span className="text-rose-500">*</span></Label>
                <Textarea
                  placeholder="Tuliskan alasan meninggalkan sekolah secara jelas..."
                  value={form.alasan}
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                  rows={3}
                  required
                  className="rounded-xl resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Mengirim...</> : 'Kirim Pengajuan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigasi (Admin) */}
      {isAdmin && (
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit">
          <Button size="sm" variant={activeTab === 'my' ? 'default' : 'ghost'} onClick={() => setActiveTab('my')} className={`rounded-lg font-bold text-xs px-4 h-8 ${activeTab === 'my' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
            Izin Saya
          </Button>
          <Button size="sm" variant={activeTab === 'all' ? 'default' : 'ghost'} onClick={() => setActiveTab('all')} className={`rounded-lg font-bold text-xs px-4 h-8 ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
            Semua Izin
          </Button>
        </div>
      )}

      {/* Filter tanggal (Admin: semua izin) */}
      {isAdmin && activeTab === 'all' && (
        <div className="flex items-center gap-3">
          <Label className="font-bold text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">Filter Tanggal:</Label>
          <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-10 rounded-xl w-48" />
          {filterDate && (
            <Button size="sm" variant="ghost" onClick={() => setFilterDate('')} className="text-xs text-slate-500 rounded-xl">Reset</Button>
          )}
        </div>
      )}

      {/* Daftar Izin */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'my' ? (
            myIzin.length === 0 ? (
              <div className="text-center py-14 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="font-bold">Belum ada pengajuan izin</p>
                <p className="text-xs mt-1">Klik "Ajukan Izin" untuk membuat permohonan baru.</p>
              </div>
            ) : (
              myIzin.map((izin) => renderIzinCard(izin, false))
            )
          ) : (
            allIzin.length === 0 ? (
              <div className="text-center py-14 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.5]" />
                <p className="font-bold">Tidak ada pengajuan izin</p>
              </div>
            ) : (
              allIzin.map((izin) => renderIzinCard(izin, true))
            )
          )}
        </div>
      )}
    </div>
  )
}
