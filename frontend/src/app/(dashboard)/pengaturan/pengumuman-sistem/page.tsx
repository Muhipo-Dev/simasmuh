'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Plus, Loader2, Trash2, ShieldAlert, Clock, ImageIcon, Pencil, Info, BellRing, Server, AlertCircle, X } from 'lucide-react'
import { compressImageFile } from '@/utils/imageCompressor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import Swal from 'sweetalert2'

interface Announcement {
  id: string
  title: string
  content: string
  target: string
  type: string
  eventDate?: string
  image?: string
  isUrgent?: boolean
  createdAt: string
  author: {
    name: string
    role: string
  }
}

export default function PengumumanSistemPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const allRoles = [user?.role, user?.subRole, user?.subRole2, user?.subRole3, user?.subRole4, user?.subRole5].filter(Boolean) as string[]
  const isSuperadminOrIT = allRoles.includes('SUPERADMIN') || allRoles.includes('ADMIN_IT')

  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PENGUMUMAN' | 'INFORMASI' | 'URGENT'>('ALL')
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target: 'SEMUA',
    type: 'PENGUMUMAN',
    image: '',
    isUrgent: false
  })
  const [isCompressing, setIsCompressing] = useState(false)

  const resetForm = () => {
    setEditingId(null)
    setFormData({ title: '', content: '', target: 'SEMUA', type: 'PENGUMUMAN', image: '', isUrgent: false })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsCompressing(true)
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
      setFormData(prev => ({ ...prev, image: compressed.dataUrl }))
    } catch (error) {
      console.error('Error compressing image:', error)
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengompres Gambar',
        text: 'Format atau ukuran file gambar tidak didukung.',
      })
    } finally {
      setIsCompressing(false)
    }
  }

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['system-announcements'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/system-announcements')
      if (!res.ok) throw new Error('Gagal memuat data pengumuman sistem')
      return res.json()
    }
  })

  // Filter khusus Pengumuman Sistem & Informasi Keamanan/Update
  const systemAnnouncements = (announcements || []).filter(
    (item) => item.type === 'PENGUMUMAN' || item.type === 'INFORMASI'
  )

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authorId = (session?.user as any)?.id
      if (!authorId) throw new Error('Sesi login tidak valid. Silakan muat ulang halaman.')

      let imageUrl = data.image
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl, folder: 'thumbnails' })
        })
        if (!uploadRes.ok) throw new Error('Gagal mengunggah lampiran gambar ke server.')
        const uploadData = await uploadRes.json()
        imageUrl = uploadData.url
      }

      const payload = {
        title: data.title,
        content: data.content,
        target: data.target || 'SEMUA',
        type: data.type || 'PENGUMUMAN',
        image: imageUrl || null,
        isUrgent: data.isUrgent === true,
        authorId,
      }

      const res = await authenticatedFetch('/api-backend/system-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.message || 'Gagal menambah pengumuman sistem')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['system-announcements-dashboard'] })
      setOpen(false)
      resetForm()
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Diterbitkan!',
        text: 'Informasi sistem berhasil dipublikasikan dan disiarkan.',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menerbitkan',
        text: err?.message || 'Terjadi kesalahan saat memproses data.',
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...originalPayload } = data

      let imageUrl = originalPayload.image
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl, folder: 'thumbnails' })
        })
        if (!uploadRes.ok) throw new Error('Gagal mengunggah lampiran gambar baru ke server.')
        const uploadData = await uploadRes.json()
        imageUrl = uploadData.url
      }

      const payload = {
        title: originalPayload.title,
        content: originalPayload.content,
        target: originalPayload.target,
        type: originalPayload.type,
        image: imageUrl || null,
        isUrgent: originalPayload.isUrgent === true,
      }

      const res = await authenticatedFetch(`/api-backend/system-announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.message || 'Gagal memperbarui pengumuman sistem')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['system-announcements-dashboard'] })
      setOpen(false)
      resetForm()
      Swal.fire({
        icon: 'success',
        title: 'Perubahan Disimpan!',
        text: 'Data pengumuman sistem berhasil diperbarui.',
        timer: 2000,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan saat memperbarui data.',
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/system-announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus pengumuman sistem')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] })
      queryClient.invalidateQueries({ queryKey: ['system-announcements-dashboard'] })
      Swal.fire({
        icon: 'success',
        title: 'Pengumuman Dihapus!',
        timer: 1500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: err?.message || 'Terjadi kesalahan saat menghapus data.',
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      updateMutation.mutate({ ...formData, id: editingId })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getTargetBadgeColor = (target: string) => {
    switch (target) {
      case 'ALL':
      case 'SEMUA': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'PUBLIC': return 'bg-green-100 text-green-700 border-green-200'
      case 'INTERNAL': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'GURU': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'SISWA': return 'bg-sky-100 text-sky-700 border-sky-200'
      case 'WALI_MURID': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'ALL':
      case 'SEMUA': return 'Semua (Publik & Internal)'
      case 'PUBLIC': return 'Publik (Halaman Depan)'
      case 'INTERNAL': return 'Internal (Guru, Siswa, Wali)'
      case 'GURU': return 'Khusus Guru & Karyawan'
      case 'SISWA': return 'Khusus Siswa'
      case 'WALI_MURID': return 'Khusus Wali Murid'
      default: return target
    }
  }

  const filteredByTab = systemAnnouncements.filter(item => {
    if (selectedTab === 'ALL') return true
    if (selectedTab === 'URGENT') return item.isUrgent === true
    return item.type === selectedTab
  })

  const finalFilteredData = filterDataBySearch(filteredByTab, searchQuery)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Pengumuman & Informasi Sistem
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Panel penerbitan resmi Admin Sistem & IT untuk keamanan, pembaruan versi, jadwal maintenance, dan instruksi penting kepada pengguna.
          </p>
        </div>

        {isSuperadminOrIT && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all rounded-xl text-xs sm:text-sm"
            onClick={() => {
              resetForm()
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Terbitkan Info Sistem
          </Button>
        )}

        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val)
          if (!val) {
            resetForm()
          }
        }}>
          <DialogContent className="sm:max-w-[540px] rounded-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Pengumuman Sistem' : 'Terbitkan Informasi Sistem Baru'}</DialogTitle>
                <DialogDescription className="text-xs">
                  Informasi ini akan langsung tampil di widget Informasi Sistem dashboard pengguna dan dikirimkan notifikasinya.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold">Judul Pengumuman / Info</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Pemeliharaan Sistem & Update Keamanan Server"
                    required
                    className="rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-xs font-bold">Kategori Informasi</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-medium"
                    >
                      <option value="PENGUMUMAN">📢 Pengumuman Resmi Sistem</option>
                      <option value="INFORMASI">🛡️ Update, Fitur & Keamanan</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="target" className="text-xs font-bold">Sasaran Audiens</Label>
                    <select
                      id="target"
                      value={formData.target}
                      onChange={e => setFormData({ ...formData, target: e.target.value })}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 font-medium"
                    >
                      <option value="SEMUA">🌐 Semua (Publik & Internal)</option>
                      <option value="INTERNAL">🏫 Seluruh Akun Internal (Guru, Siswa, Wali)</option>
                      <option value="GURU">👨‍🏫 Khusus Guru & Karyawan</option>
                      <option value="SISWA">🎓 Khusus Siswa</option>
                      <option value="WALI_MURID">👨‍👩‍👦 Khusus Wali Murid</option>
                      <option value="PUBLIC">🌍 Publik Saja</option>
                    </select>
                  </div>
                </div>

                {/* Pilihan Metode Penayangan (Hanya Widget vs Popup Mendesak Otomatis) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                  <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Format Penayangan di Dashboard
                  </Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Tentukan bagaimana informasi ini ditampilkan kepada pengguna saat mereka masuk ke dashboard.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isUrgent: false })}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        !formData.isUrgent
                          ? 'bg-white dark:bg-slate-900 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                          : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        !formData.isUrgent ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                      }`}>
                        {!formData.isUrgent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          📌 Widget Standar
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          Tampil di kotak widget Informasi Sistem tanpa memotong aktivitas.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isUrgent: true })}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        formData.isUrgent
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-600 ring-2 ring-rose-600/20 shadow-xs'
                          : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        formData.isUrgent ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-400'
                      }`}>
                        {formData.isUrgent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          ⚡ Popup Mendesak
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
                          Langsung muncul sebagai popup otomatis setelah pengguna login.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-xs font-bold">Cover / Dokumen Lampiran Gambar (Opsional)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing}
                      className="rounded-xl text-xs h-9"
                    />
                    {isCompressing && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />}
                  </div>
                  {formData.image && (
                    <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.image}
                          alt="Cover Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                          Gambar cover terlampir
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs rounded-lg shrink-0"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, image: '' }))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Hapus Cover
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-xs font-bold">Rincian Instruksi / Isi Informasi</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Tuliskan detail informasi sistem, perubahan prosedur, jadwal downtime, atau pengumuman keamanan..."
                    className="min-h-[110px] rounded-xl text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => {
                  setOpen(false)
                  resetForm()
                }}>Batal</Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {editingId ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 flex-wrap">
        {[
          { id: 'ALL', label: 'Semua Info Sistem' },
          { id: 'PENGUMUMAN', label: '📢 Pengumuman Sistem' },
          { id: 'INFORMASI', label: '🛡️ Update & Keamanan' },
          { id: 'URGENT', label: '⚡ Popup Mendesak' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              Log & Daftar Pengumuman Sistem
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              Menampilkan seluruh pengumuman dan catatan update sistem yang aktif di dashboard pengguna.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari info sistem..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40">
                <TableRow>
                  <TableHead className="w-[42%] font-semibold text-slate-700 dark:text-slate-300 text-xs">Informasi & Kategori</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Mode Tayang</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Target Audiens</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Penerbit Sistem</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Waktu</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                        <p className="text-xs">Memuat data pengumuman sistem...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : finalFilteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Server className="h-9 w-9 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {searchQuery ? 'Tidak ada pengumuman sistem yang cocok' : 'Belum ada pengumuman sistem yang diterbitkan'}
                        </p>
                        {!searchQuery && <p className="text-xs text-slate-400 mt-0.5">Klik tombol &apos;Terbitkan Info Sistem&apos; untuk mempublikasikan pengumuman baru.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  finalFilteredData?.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.image} alt={item.title} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                              <BellRing className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                item.type === 'INFORMASI'
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300'
                              }`}>
                                {item.type === 'INFORMASI' ? '🛡️ Update & Keamanan' : '📢 Pengumuman Sistem'}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">{item.title}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.content}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.isUrgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                            Popup Mendesak
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            Widget Standar
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTargetBadgeColor(item.target)}`}>
                          {getTargetLabel(item.target)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.author?.name || 'Superadmin'}</div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">{item.author?.role || 'SUPERADMIN'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSuperadminOrIT && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                              onClick={() => {
                                setEditingId(item.id)
                                setFormData({
                                  title: item.title,
                                  content: item.content,
                                  target: item.target,
                                  type: item.type || 'PENGUMUMAN',
                                  image: item.image || '',
                                  isUrgent: item.isUrgent === true
                                })
                                setOpen(true)
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                              onClick={() => {
                                if (confirm('Apakah Anda yakin ingin menghapus pengumuman sistem ini?')) {
                                  deleteMutation.mutate(item.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
