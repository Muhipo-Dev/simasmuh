'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Plus, Loader2, Trash2, Megaphone, Clock, ImageIcon, CalendarDays, Pencil } from 'lucide-react'
import { compressImageFile } from '@/utils/imageCompressor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Announcement {
  id: string
  title: string
  content: string
  target: string
  type: string
  eventDate?: string
  image?: string
  createdAt: string
  author: {
    name: string
    role: string
  }
}

export default function AnnouncementsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ''
  const userSubRole = (session?.user as any)?.subRole || ''
  const isSuperadminOrIT = ['SUPERADMIN', 'ADMIN_IT'].includes(userRole) || ['SUPERADMIN', 'ADMIN_IT'].includes(userSubRole)
  const isAdminWeb = ['ADMIN_WEB', 'WAKA_HUMAS_SDM', 'HUMAS_SDM'].includes(userRole) || ['ADMIN_WEB', 'WAKA_HUMAS_SDM', 'HUMAS_SDM'].includes(userSubRole)
  const isKepalaSekolah = userRole === 'KEPALA_SEKOLAH' || userSubRole === 'KEPALA_SEKOLAH'
  const defaultType = isAdminWeb && !isSuperadminOrIT ? 'BERITA' : 'PENGUMUMAN'

  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', target: 'SEMUA', type: defaultType, eventDate: '', image: '' })
  const [isCompressing, setIsCompressing] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      setFormData(prev => ({ ...prev, image: compressed.dataUrl }));
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Gagal mengompres gambar.');
    } finally {
      setIsCompressing(false);
    }
  };

  const { data: rawAnnouncements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/announcements')
      if (!res.ok) throw new Error('Gagal memuat data berita & agenda')
      return res.json()
    }
  })

  // Khusus Berita & Artikel serta Agenda Kegiatan
  const announcements = (rawAnnouncements || []).filter(
    (item) => item.type === 'BERITA' || item.type === 'AGENDA'
  )

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authorId = (session?.user as any)?.id
      if (!authorId) throw new Error('Unauthorized')
      
      let imageUrl = data.image;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl, folder: 'thumbnails' })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah gambar');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const payload = { ...data, image: imageUrl, authorId }
      const res = await authenticatedFetch('/api-backend/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal menambah data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setOpen(false)
      setFormData({ title: '', content: '', target: 'SEMUA', type: defaultType, eventDate: '', image: '' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...originalPayload } = data;
      
      let imageUrl = originalPayload.image;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl, folder: 'thumbnails' })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah gambar');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const payload = { ...originalPayload, image: imageUrl };
      
      const res = await authenticatedFetch(`/api-backend/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setOpen(false)
      setEditingId(null)
      setFormData({ title: '', content: '', target: 'SEMUA', type: defaultType, eventDate: '', image: '' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus data')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
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
    switch(target) {
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
    switch(target) {
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BERITA':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">Berita & Artikel</span>
      case 'AGENDA':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-200">Agenda Kegiatan</span>
      case 'PENGUMUMAN':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">Pengumuman Sistem</span>
      case 'INFORMASI':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">Update & Keamanan</span>
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">{type}</span>
    }
  }

  // Filter based on Tab
  const categoryFilteredAnnouncements = (announcements || []).filter((item) => {
    if (selectedCategoryTab === 'ALL') return true
    if (selectedCategoryTab === 'BERITA_AGENDA') return item.type === 'BERITA' || item.type === 'AGENDA'
    if (selectedCategoryTab === 'SISTEM') return item.type === 'PENGUMUMAN' || item.type === 'INFORMASI'
    return item.type === selectedCategoryTab
  })

  const filteredData = filterDataBySearch(categoryFilteredAnnouncements, searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            Berita & Agenda Kegiatan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Panel publikasi Berita, Artikel, dan Agenda Kegiatan Sekolah untuk portal utama dan sistem SIMASMUH.
          </p>
        </div>
        
        {!isKepalaSekolah && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all rounded-xl text-xs sm:text-sm" onClick={() => {
            setEditingId(null);
            setFormData({ title: '', content: '', target: 'SEMUA', type: 'BERITA', eventDate: '', image: '' });
            setOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Tulis Berita / Agenda
          </Button>
        )}
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingId(null);
            setFormData({ title: '', content: '', target: 'SEMUA', type: 'BERITA', eventDate: '', image: '' });
          }
        }}>
          <DialogContent className="sm:max-w-[540px] rounded-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Konten Publikasi' : 'Penerbitan Berita / Agenda Baru'}</DialogTitle>
                <DialogDescription className="text-xs">
                  Konten ini akan dipublikasikan ke portal publik serta widget Berita & Kalender Kegiatan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold">Judul Konten</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder={formData.type === 'AGENDA' ? 'Contoh: Workshop Pembelajaran Digital' : 'Contoh: Siswa SMA MUHIPO Raih Juara 1 Olimpiade'}
                    required
                    className="rounded-xl text-xs sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="type" className="text-xs font-bold">Kategori</Label>
                    <select 
                      id="type" 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-medium"
                    >
                      <option value="BERITA">📰 Berita & Artikel</option>
                      <option value="AGENDA">📅 Agenda Kegiatan</option>
                    </select>
                  </div>
                  
                  {formData.type === 'AGENDA' ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="eventDate" className="text-xs font-bold">Tanggal & Waktu Acara</Label>
                      <Input 
                        id="eventDate" 
                        type="datetime-local"
                        value={formData.eventDate} 
                        onChange={e => setFormData({...formData, eventDate: e.target.value})}
                        required
                        className="rounded-xl text-xs h-9"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="target" className="text-xs font-bold">Target Penerima</Label>
                      <select 
                        id="target" 
                        value={formData.target}
                        onChange={e => setFormData({...formData, target: e.target.value})}
                        className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-medium"
                      >
                        <option value="SEMUA">🌐 Semua (Publik & Internal)</option>
                        <option value="PUBLIC">🌍 Publik (Portal Beranda)</option>
                        <option value="INTERNAL">🏫 Internal (Guru, Siswa, Wali)</option>
                        <option value="GURU">👨‍🏫 Khusus Guru & Karyawan</option>
                        <option value="SISWA">🎓 Khusus Siswa</option>
                        <option value="WALI_MURID">👨‍👩‍👦 Khusus Wali Murid</option>
                      </select>
                    </div>
                  )}
                </div>

                {formData.type === 'AGENDA' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="target" className="text-xs font-bold">Target Audiens Agenda</Label>
                    <select 
                      id="target" 
                      value={formData.target}
                      onChange={e => setFormData({...formData, target: e.target.value})}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-medium"
                    >
                      <option value="SEMUA">🌐 Semua (Publik & Internal)</option>
                      <option value="PUBLIC">🌍 Publik (Portal Beranda)</option>
                      <option value="INTERNAL">🏫 Internal (Guru, Siswa, Wali)</option>
                      <option value="GURU">👨‍🏫 Khusus Guru & Karyawan</option>
                      <option value="SISWA">🎓 Khusus Siswa</option>
                      <option value="WALI_MURID">👨‍👩‍👦 Khusus Wali Murid</option>
                    </select>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Label htmlFor="image" className="text-xs font-bold">Banner / Gambar Lampiran (Opsional)</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="image" 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing}
                      className="rounded-xl text-xs h-9"
                    />
                    {isCompressing && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
                  </div>
                  {formData.image && (
                    <div className="mt-1 text-xs text-emerald-600 flex items-center font-medium">
                      <ImageIcon className="w-3.5 h-3.5 mr-1" /> Gambar cover siap diunggah.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="content" className="text-xs font-bold">Isi Pesan / Informasi</Label>
                  <Textarea 
                    id="content" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="Tuliskan isi rincian berita, instruksi pengumuman, atau jadwal kegiatan di sini..."
                    className="min-h-[100px] rounded-xl text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => {
                  setOpen(false)
                  setEditingId(null)
                  setFormData({ title: '', content: '', target: 'SEMUA', type: defaultType, eventDate: '', image: '' })
                }}>Batal</Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 rounded-xl text-xs">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {editingId ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'Semua (Berita & Agenda)' },
          { id: 'BERITA', label: '📰 Berita & Artikel' },
          { id: 'AGENDA', label: '📅 Agenda Kegiatan' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategoryTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategoryTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Daftar Konten & Informasi</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              Daftar berita, agenda acara, dan pengumuman sistem yang telah dipublikasikan.
            </CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari judul/isi pesan..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40">
                <TableRow>
                  <TableHead className="w-[42%] font-semibold text-slate-700 dark:text-slate-300 text-xs">Konten & Kategori</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Target Audiens</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Penerbit</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Waktu</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                        <p className="text-xs">Memuat data publikasi...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Megaphone className="h-9 w-9 text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{searchQuery ? 'Tidak ada konten yang sesuai pencarian' : 'Belum ada konten publikasi'}</p>
                        {!searchQuery && <p className="text-xs text-slate-400 mt-0.5">Klik tombol penerbitan untuk membuat postingan baru.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData?.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.image} alt={item.title} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
                              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getTypeBadge(item.type)}
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">{item.title}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.content}</div>
                            {item.type === 'AGENDA' && item.eventDate && (
                              <div className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1 pt-0.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                Acara: {new Date(item.eventDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getTargetBadgeColor(item.target)}`}>
                          {getTargetLabel(item.target)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.author?.name || 'Sistem'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.author?.role || '-'}</div>
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
                        {!isKepalaSekolah ? (
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                              onClick={() => {
                                setEditingId(item.id)
                                setFormData({
                                  title: item.title,
                                  content: item.content,
                                  target: item.target,
                                  type: item.type,
                                  eventDate: item.eventDate ? new Date(item.eventDate).toISOString().slice(0, 16) : '',
                                  image: item.image || ''
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
                                if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
                                  deleteMutation.mutate(item.id)
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Read-Only</span>
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
