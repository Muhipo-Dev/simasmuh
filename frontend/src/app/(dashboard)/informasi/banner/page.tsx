'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, UploadCloud, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'
import Image from 'next/image'
import { compressImageFile } from '@/utils/imageCompressor'

export default function BannerManagerPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Ambil daftar gambar banner dari backend
  const { data: banners = { images: [] }, isLoading } = useQuery<{images: string[]}>({
    queryKey: ['carousel'],
    queryFn: () => authenticatedQuery('/api-backend/upload/carousel'),
  })

  const uploadMutation = useMutation({
    mutationFn: async (base64Str: string) => {
      const res = await authenticatedFetch('/api-backend/upload/carousel', {
        method: 'POST',
        body: JSON.stringify({ image: base64Str })
      })
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel'] })
      Swal.fire('Berhasil', 'Gambar banner berhasil diunggah', 'success')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => Swal.fire('Error', err.message || 'Gagal mengunggah gambar', 'error'),
    onSettled: () => setUploading(false)
  })

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await authenticatedFetch(`/api-backend/upload/carousel/${filename}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carousel'] })
      Swal.fire('Terhapus', 'Gambar banner berhasil dihapus', 'success')
    },
    onError: (err: any) => Swal.fire('Error', err.message || 'Gagal menghapus gambar', 'error')
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1600, maxHeight: 900, quality: 0.8 })
      uploadMutation.mutate(compressed.dataUrl)
    } catch (err) {
      console.error('Gagal mengompres gambar banner:', err)
      Swal.fire('Gagal', 'Terjadi kesalahan saat memproses gambar banner.', 'error')
      setUploading(false)
    }
  }

  const handleDelete = (url: string) => {
    const filename = url.split('/').pop()
    if (!filename) return

    Swal.fire({
      title: 'Hapus Banner?',
      text: "Gambar banner akan dihapus dari halaman depan secara permanen!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(filename)
      }
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Banner</h1>
          <p className="text-slate-500 mt-1">Kelola gambar carousel (slider) untuk halaman utama depan sekolah.</p>
        </div>
        <div className="shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUpload} 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full md:w-auto"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            Unggah Gambar Baru
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-slate-500" />
            Daftar Gambar Aktif
          </CardTitle>
          <CardDescription>
            Gambar yang ada di sini akan bergeser secara otomatis di halaman pahlawan (Hero) depan. Disarankan rasio landscape 16:9.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : !banners || !banners.images || banners.images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
              <p>Belum ada gambar yang diunggah.</p>
              <p className="text-sm">Halaman depan akan menggunakan gambar bawaan sistem.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.images.map((url, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-[16/9] bg-slate-100 flex items-center justify-center">
                  <Image 
                    src={url.startsWith('/uploads') ? `/api-backend${url}` : url.startsWith('/') ? `/api-backend${url}` : url} 
                    alt={`Banner ${i}`} 
                    fill 
                    unoptimized={true}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(url)}
                      className="shadow-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </Button>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                    # {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Tips Penggunaan Banner</p>
          <ul className="list-disc pl-4 space-y-1 opacity-90">
            <li>Gunakan format gambar JPG, PNG, atau WEBP.</li>
            <li>Usahakan resolusi gambar tinggi (minimal 1920x1080) agar tidak pecah di layar besar.</li>
            <li>Agar teks halaman depan tetap terbaca jelas, gambar akan otomatis diberi efek redup (brightness) oleh sistem.</li>
            <li>Jika semua gambar dihapus, *Hero Section* akan otomatis kembali ke gambar *default* bawaan.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
