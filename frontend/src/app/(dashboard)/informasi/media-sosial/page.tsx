'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Play, 
  Save, 
  Loader2, 
  ExternalLink, 
  CheckCircle2,
  Tv,
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowUpToLine,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'

interface InstagramPostItem {
  id: string
  url: string
  caption: string
  date?: string
  imageUrl?: string
}

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  )
}

export default function MediaSosialManagerPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [formData, setFormData] = useState({
    youtubeChannelUrl: 'https://www.youtube.com/@SmaMuhipo',
    youtubeVideoEmbedUrl: 'https://www.youtube.com/watch?v=McKO7tTyIHQ',
    instagramUrl: 'https://www.instagram.com/smamuhipo.official/',
    instagramFeedUrl: 'https://www.instagram.com/smamuhipo.official/',
  })

  const [postsList, setPostsList] = useState<InstagramPostItem[]>([
    {
      id: 'default-1',
      url: 'https://www.instagram.com/smamuhipo.official/',
      caption: 'Dokumentasi Kegiatan, Prestasi Siswa & Informasi Terkini SMA Muhammadiyah 1 Ponorogo',
      date: 'Aktual'
    }
  ])

  const [newPostUrl, setNewPostUrl] = useState('')
  const [newPostCaption, setNewPostCaption] = useState('')
  const [newPostImageUrl, setNewPostImageUrl] = useState('')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings-media-sosial'],
    queryFn: () => authenticatedQuery('/api-backend/settings')
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        youtubeChannelUrl: settings.youtubeChannelUrl || 'https://www.youtube.com/@SmaMuhipo',
        youtubeVideoEmbedUrl: settings.youtubeVideoEmbedUrl || 'https://www.youtube.com/watch?v=McKO7tTyIHQ',
        instagramUrl: settings.instagramUrl || 'https://www.instagram.com/smamuhipo.official/',
        instagramFeedUrl: settings.instagramFeedUrl || 'https://www.instagram.com/smamuhipo.official/',
      })

      if (settings.instagramPostsJson) {
        try {
          const parsed = JSON.parse(settings.instagramPostsJson)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPostsList(parsed)
          }
        } catch {
          // fallback
        }
      }
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error('Gagal menyimpan pengaturan media sosial')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-media-sosial'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Pengaturan Disimpan',
        text: 'Tautan media sosial, video profil & daftar post Instagram beranda berhasil disimpan.',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan data', 'error')
    }
  })

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const payload = {
      ...formData,
      instagramPostsJson: JSON.stringify(postsList)
    }
    mutation.mutate(payload)
  }

  const handleAddPost = () => {
    if (!newPostUrl.trim()) {
      Swal.fire('Perhatian', 'Harap masukkan tautan post Instagram (contoh: https://www.instagram.com/p/XXXX/)', 'warning')
      return
    }

    const newItem: InstagramPostItem = {
      id: `ig-post-${Date.now()}`,
      url: newPostUrl.trim(),
      caption: newPostCaption.trim() || 'Sorotan Kegiatan & Prestasi Siswa SMA MUHIPO',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      imageUrl: newPostImageUrl.trim() || undefined
    }

    setPostsList([newItem, ...postsList])
    setNewPostUrl('')
    setNewPostCaption('')
    setNewPostImageUrl('')

    Swal.fire({
      icon: 'success',
      title: 'Post Ditambahkan',
      text: 'Post Instagram berhasil dimasukkan ke daftar. Klik "Simpan Perubahan" untuk mempublikasikannya ke beranda.',
      timer: 1800,
      showConfirmButton: false
    })
  }

  const handleDeletePost = (id: string) => {
    setPostsList(postsList.filter(item => item.id !== id))
  }

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return
    const updated = [...postsList]
    const [target] = updated.splice(index, 1)
    updated.unshift(target)
    setPostsList(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const updated = [...postsList]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setPostsList(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index >= postsList.length - 1) return
    const updated = [...postsList]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setPostsList(updated)
  }

  // Format YouTube embed preview helper
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    if (url.includes('youtube.com/embed/')) return url
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`
    }
    return url
  }

  const activeEmbedUrl = getEmbedUrl(formData.youtubeVideoEmbedUrl)

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2 border border-blue-200/80 dark:border-blue-900/60">
            <Tv className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            PUBLIKASI &amp; MEDIA DIGITAL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Media Sosial &amp; Postingan Beranda
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola tautan video profil YouTube dan daftar link postingan Instagram sekolah yang langsung ditampilkan di beranda publik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleSubmit()}
            disabled={mutation.isPending || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Seksi YouTube & Video Profil */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                <YoutubeIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Kanal YouTube &amp; Video Profil Beranda
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Konfigurasi tautan kanal resmi dan sematan video profil yang tampil di beranda
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="youtubeChannelUrl" className="text-xs sm:text-sm font-bold">
                  Tautan Kanal YouTube Resmi
                </Label>
                {formData.youtubeChannelUrl && (
                  <a
                    href={formData.youtubeChannelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold hover:underline"
                  >
                    <span>Uji Buka Kanal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <Input
                id="youtubeChannelUrl"
                type="url"
                placeholder="https://www.youtube.com/@SmaMuhipo"
                value={formData.youtubeChannelUrl}
                onChange={(e) => setFormData({ ...formData, youtubeChannelUrl: e.target.value })}
                className="bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label htmlFor="youtubeVideoEmbedUrl" className="text-xs sm:text-sm font-bold">
                  Tautan Video Profil (Watch / Embed YouTube)
                </Label>
                <span className="text-[11px] text-slate-400">Aktif di Beranda</span>
              </div>
              <Input
                id="youtubeVideoEmbedUrl"
                type="text"
                placeholder="https://www.youtube.com/watch?v=McKO7tTyIHQ"
                value={formData.youtubeVideoEmbedUrl}
                onChange={(e) => setFormData({ ...formData, youtubeVideoEmbedUrl: e.target.value })}
                className="bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Video profil ini otomatis tersemat di area video beranda dan dibuka saat pengunjung menekan tombol &quot;Tonton Video Profil&quot;.
              </p>
            </div>

            {/* Preview Video Player jika URL tersedia */}
            {activeEmbedUrl && (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                  <span>Preview Video Profil Terpasang di Beranda:</span>
                </div>
                <div className="aspect-video w-full max-w-md rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-black">
                  <iframe
                    src={activeEmbedUrl}
                    title="Preview Video Profil"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seksi Kelola Post Instagram Beranda */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center text-pink-600 shrink-0">
                  <InstagramIcon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Kelola Postingan Instagram Beranda
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Tambah dan kelola link postingan / reels Instagram resmi yang tampil langsung di kartu beranda
                  </CardDescription>
                </div>
              </div>
              {formData.instagramUrl && (
                <a
                  href={formData.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline"
                >
                  <span>Buka Akun IG</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Form Tambah Link Post Baru */}
            <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/50 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-pink-950 dark:text-pink-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-pink-600" />
                Tambah Link Postingan Instagram Baru
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newPostUrl" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tautan Postingan / Reels Instagram
                  </Label>
                  <Input
                    id="newPostUrl"
                    type="url"
                    placeholder="https://www.instagram.com/p/XXXXX/"
                    value={newPostUrl}
                    onChange={(e) => setNewPostUrl(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPostCaption" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Judul / Keterangan Postingan
                  </Label>
                  <Input
                    id="newPostCaption"
                    type="text"
                    placeholder="Contoh: Launching SPMB 2026/2027"
                    value={newPostCaption}
                    onChange={(e) => setNewPostCaption(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPostImageUrl" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    URL Gambar Khusus (Opsional)
                  </Label>
                  <Input
                    id="newPostImageUrl"
                    type="url"
                    placeholder="Otomatis dari IG jika kosong"
                    value={newPostImageUrl}
                    onChange={(e) => setNewPostImageUrl(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-xs h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleAddPost}
                  size="sm"
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl px-4 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan ke Daftar</span>
                </Button>
              </div>
            </div>

            {/* Daftar Postingan Terpasang */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Daftar Postingan yang Tampil di Beranda ({postsList.length}):</span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-extrabold text-[10px] border border-pink-200 dark:border-pink-800">
                    Maks. 6 Tampil di Beranda
                  </span>
                </Label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  Gunakan tombol panah untuk mengatur urutan prioritas paling atas
                </span>
              </div>

              {postsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  Belum ada link post khusus yang ditambahkan. Beranda akan menggunakan tautan akun utama Instagram.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60">
                  {postsList.map((item, idx) => {
                    const cleanUrl = item.url ? item.url.split('?')[0].replace(/\/+$/, '') : ''
                    const rawPreview = item.imageUrl || (item.url && (item.url.includes('/p/') || item.url.includes('/reel/')) ? `${cleanUrl}/media/?size=m` : null)
                    const previewThumb = rawPreview ? `/api/instagram-proxy?url=${encodeURIComponent(rawPreview)}` : null
                    const isDisplayedOnHome = idx < 6

                    return (
                      <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Thumbnail Preview */}
                          <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 relative flex items-center justify-center shadow-xs">
                            {previewThumb ? (
                              <img
                                src={previewThumb}
                                alt={item.caption}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <InstagramIcon className="w-6 h-6 text-pink-400" />
                            )}
                            <span className={`absolute top-0.5 left-0.5 text-[9px] font-black px-1 rounded ${isDisplayedOnHome ? 'bg-pink-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {item.caption}
                              </p>
                              {isDisplayedOnHome ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                  Tampil di Beranda
                                </span>
                              ) : (
                                <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                  Arsip Antrean
                                </span>
                              )}
                            </div>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-pink-600 dark:text-pink-400 font-medium hover:underline truncate block font-mono"
                            >
                              {item.url}
                            </a>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              Tanggal: {item.date || 'Terkini'}
                            </span>
                          </div>
                        </div>

                        {/* Action Toolbar: Urutkan Paling Atas, Naik, Turun, Buka, Hapus */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* Tombol Paling Atas */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => handleMoveToTop(idx)}
                            className="h-8 px-2 text-[10px] font-bold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-950/30 rounded-lg cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Urutkan ke Paling Atas (Prioritas Utama Beranda)"
                          >
                            <ArrowUpToLine className="w-3.5 h-3.5 text-pink-600" />
                            <span className="hidden sm:inline">Paling Atas</span>
                          </Button>

                          {/* Tombol Naik 1 Tingkat */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => handleMoveUp(idx)}
                            className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Geser Naik"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>

                          {/* Tombol Turun 1 Tingkat */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === postsList.length - 1}
                            onClick={() => handleMoveDown(idx)}
                            className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Geser Turun"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-pink-600 transition-colors"
                            title="Buka Tautan Post"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePost(item.id)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            title="Hapus Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Petunjuk */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Sinkronisasi Dinamis ke Beranda:</p>
            <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
              Link post Instagram yang Anda tambahkan di atas akan langsung tampil dan dapat diklik oleh publik pada kartu Instagram di halaman depan SMA MUHIPO.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
