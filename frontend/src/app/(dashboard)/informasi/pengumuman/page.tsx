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
  const queryClient = useQueryClient()
  const authenticatedFetch = useAuthenticatedFetch()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', target: 'ALL', type: 'BERITA', eventDate: '', image: '' })
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

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/announcements')
      if (!res.ok) throw new Error('Gagal memuat data berita & informasi')
      return res.json()
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const authorId = (session?.user as any)?.id
      if (!authorId) throw new Error('Unauthorized')
      
      let imageUrl = data.image;
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const uploadRes = await authenticatedFetch('/api-backend/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageUrl })
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
      if (!res.ok) throw new Error('Gagal menambah pengumuman')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setOpen(false)
      setFormData({ title: '', content: '', target: 'ALL', type: 'BERITA', eventDate: '', image: '' })
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
          body: JSON.stringify({ image: imageUrl })
        });
        if (!uploadRes.ok) throw new Error('Gagal mengunggah gambar');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const payload = { ...originalPayload, image: imageUrl };
      
      // Convert eventDate if it exists to match Prisma expectations if necessary
      // It's handled backend-side in service, but we ensure string is sent
      const res = await authenticatedFetch(`/api-backend/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Gagal memperbarui pengumuman')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      setOpen(false)
      setEditingId(null)
      setFormData({ title: '', content: '', target: 'ALL', type: 'BERITA', eventDate: '', image: '' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus pengumuman')
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
      case 'ALL': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'PUBLIC': return 'bg-green-100 text-green-700 border-green-200'
      case 'INTERNAL': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'GURU': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'SISWA': return 'bg-sky-100 text-sky-700 border-sky-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getTargetLabel = (target: string) => {
    switch(target) {
      case 'ALL': return 'Semua (Beranda & Dashboard)'
      case 'PUBLIC': return 'Publik (Hanya Beranda)'
      case 'INTERNAL': return 'Internal (Semua Warga Sekolah)'
      case 'GURU': return 'Khusus Guru & Karyawan'
      case 'SISWA': return 'Khusus Siswa'
      default: return target
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            Berita & Informasi
          </h1>
          <p className="text-slate-500 mt-1">Kelola berita untuk halaman utama dan informasi internal sekolah.</p>
        </div>
        
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tulis Pengumuman
        </Button>
        <Dialog open={open} onOpenChange={(val) => {
          setOpen(val);
          if (!val) {
            setEditingId(null);
            setFormData({ title: '', content: '', target: 'ALL', type: 'BERITA', eventDate: '', image: '' });
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Berita / Pengumuman' : 'Tulis Berita / Pengumuman Baru'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Perbarui informasi pengumuman ini.' : 'Pengumuman akan langsung diterbitkan sesuai dengan target audiens yang Anda pilih.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Pengumuman</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Contoh: Pengumuman Libur Semester"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipe</Label>
                    <select 
                      id="type" 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                      <option value="BERITA">Berita</option>
                      <option value="AGENDA">Agenda</option>
                    </select>
                  </div>
                  
                  {formData.type === 'AGENDA' && (
                    <div className="space-y-2">
                      <Label htmlFor="eventDate">Tanggal Acara</Label>
                      <Input 
                        id="eventDate" 
                        type="datetime-local"
                        value={formData.eventDate} 
                        onChange={e => setFormData({...formData, eventDate: e.target.value})}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target">Target Audiens</Label>
                  <select 
                    id="target" 
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <option value="ALL">Semua (Tampil di Publik & Internal)</option>
                    <option value="PUBLIC">Publik (Hanya Halaman Depan)</option>
                    <option value="INTERNAL">Internal (Semua Guru & Siswa)</option>
                    <option value="GURU">Khusus Guru & Karyawan</option>
                    <option value="SISWA">Khusus Siswa</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">Upload Gambar (Opsional)</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="image" 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isCompressing}
                    />
                    {isCompressing && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                  </div>
                  {formData.image && (
                    <div className="mt-2 text-sm text-green-600 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-1" /> Gambar berhasil disiapkan.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Isi Pengumuman</Label>
                  <Textarea 
                    id="content" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    placeholder="Tuliskan isi informasi di sini..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setOpen(false)
                  setEditingId(null)
                  setFormData({ title: '', content: '', target: 'ALL', type: 'BERITA', eventDate: '', image: '' })
                }}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Simpan Perubahan' : 'Terbitkan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Daftar Pengumuman</CardTitle>
            <CardDescription>Semua berita dan informasi yang pernah Anda publikasikan.</CardDescription>
          </div>
          <TableSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari pengumuman (judul/isi)..."
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[40%] font-semibold text-slate-700">Judul & Isi</TableHead>
                  <TableHead className="font-semibold text-slate-700">Target Audiens</TableHead>
                  <TableHead className="font-semibold text-slate-700">Penulis</TableHead>
                  <TableHead className="font-semibold text-slate-700">Tanggal Terbit</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
                        <p>Memuat data berita...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filterDataBySearch(announcements, searchQuery)?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Megaphone className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-base font-medium text-slate-900">{searchQuery ? 'Tidak ada pengumuman yang sesuai pencarian' : 'Belum ada pengumuman'}</p>
                        {!searchQuery && <p className="text-sm">Klik &apos;Tulis Pengumuman&apos; untuk membuat informasi baru.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filterDataBySearch(announcements, searchQuery)?.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.image} alt={item.title} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${item.type === 'AGENDA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {item.type}
                              </span>
                              <span className="font-semibold text-slate-900">{item.title}</span>
                            </div>
                            <div className="text-sm text-slate-500 line-clamp-2">{item.content}</div>
                            {item.type === 'AGENDA' && item.eventDate && (
                              <div className="mt-1 text-xs font-medium text-slate-600 flex items-center">
                                <CalendarDays className="w-3.5 h-3.5 mr-1 text-orange-500" />
                                {new Date(item.eventDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTargetBadgeColor(item.target)}`}>
                          {getTargetLabel(item.target)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-900">{item.author?.name || 'Sistem'}</div>
                        <div className="text-xs text-slate-500">{item.author?.role || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-slate-600">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) {
                                deleteMutation.mutate(item.id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
