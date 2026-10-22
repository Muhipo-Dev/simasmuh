'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, UploadCloud, Trash2, Loader2, AlertCircle, Sparkles, Save, GraduationCap, CalendarDays, Settings } from 'lucide-react'
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

  // Data Teks Hero
  const [heroData, setHeroData] = useState({
    heroBadgeText: '',
    heroBadgeLocation: '',
    heroSubheading: '',
    heroTitlePrefix: '',
    heroTitleGradient: '',
    heroDescription: '',
    heroCtaText: '',
    heroCtaLink: '',
    heroVideoText: '',
    heroVideoLink: '',
  })

  // Data Tahun Pelajaran (TP) & Semester
  const [academicData, setAcademicData] = useState({
    academicYear: '2026/2027',
    semester: 'Ganjil',
  })

  // Ambil data settings dari backend
  const { data: settings } = useQuery({
    queryKey: ['settings-hero-banner'],
    queryFn: () => authenticatedQuery('/api-backend/settings'),
  })

  useEffect(() => {
    if (settings) {
      setHeroData({
        heroBadgeText: settings.heroBadgeText || 'Terakreditasi A • Sekolah Unggul Muhammadiyah',
        heroBadgeLocation: settings.heroBadgeLocation || 'Ponorogo, Jawa Timur',
        heroSubheading: settings.heroSubheading || 'SMA MUHAMMADIYAH 1 PONOROGO (MUHIPO)',
        heroTitlePrefix: settings.heroTitlePrefix || 'EXCELLENT ISLAMIC',
        heroTitleGradient: settings.heroTitleGradient || 'WITH CHARACTER',
        heroDescription: settings.heroDescription || 'Membentuk generasi unggul yang berakhlak mulia, berwawasan global, mandiri, serta berdaya saing internasional berlandaskan nilai-nilai luhur kepesantrenan dan pendidikan berkemajuan.',
        heroCtaText: settings.heroCtaText || 'Kenapa SMA Muhipo?',
        heroCtaLink: settings.heroCtaLink || '#keunggulan',
        heroVideoText: settings.heroVideoText || 'Tonton Video Profil',
        heroVideoLink: settings.heroVideoLink || 'https://www.youtube.com/@SmaMuhipo',
      })
      setAcademicData({
        academicYear: settings.academicYear || '2026/2027',
        semester: settings.semester || 'Ganjil',
      })
    }
  }, [settings])

  const saveHeroMutation = useMutation({
    mutationFn: async (payload: typeof heroData) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-hero-banner'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Tersimpan!',
        text: 'Teks dan tombol hero halaman depan berhasil diperbarui.',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const handleSaveHeroText = () => {
    saveHeroMutation.mutate(heroData)
  }

  const saveAcademicMutation = useMutation({
    mutationFn: async (payload: typeof academicData) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-hero-banner'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['system-settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      queryClient.invalidateQueries({ queryKey: ['navbar-public-settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Tahun Pelajaran Berhasil Diperbarui!',
        text: `Acuan Tahun Pelajaran ${academicData.academicYear} (${academicData.semester}) berhasil diterapkan di seluruh sistem SIMASMUH.`,
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const handleSaveAcademic = () => {
    saveAcademicMutation.mutate(academicData)
  }

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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Banner & Hero Beranda
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Kelola gambar carousel slider, teks headline, badge akreditasi, dan tombol aksi pada wajah depan website.
          </p>
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

      {/* Pengaturan Tahun Pelajaran (TP) & Semester Utama SIMASMUH */}
      <Card className="border border-blue-200/80 dark:border-blue-900/60 shadow-xs bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-blue-950/40 dark:via-slate-900/80 dark:to-indigo-950/30 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-blue-100 dark:border-blue-900/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Tahun Pelajaran (TP) &amp; Semester Aktif
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                  Pengaturan tunggal ini berlaku serentak di navbar portal publik dan seluruh modul sistem SIMASMUH.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Aktif: {academicData.academicYear} ({academicData.semester})
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bannerAcademicYear" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Tahun Pelajaran (TP) Utama *
              </Label>
              <Input
                id="bannerAcademicYear"
                value={academicData.academicYear}
                onChange={(e) => setAcademicData({ ...academicData, academicYear: e.target.value })}
                placeholder="Contoh: 2026/2027"
                required
                className="bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Format baku: <span className="font-mono font-bold">2026/2027</span>. Tampil di navbar publik dan acuan akademik.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bannerSemester" className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Semester Utama *
              </Label>
              <select
                id="bannerSemester"
                value={academicData.semester}
                onChange={(e) => setAcademicData({ ...academicData, semester: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="Ganjil" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Ganjil (Semester 1)</option>
                <option value="Genap" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Genap (Semester 2)</option>
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih semester yang sedang berjalan aktif di tahun pelajaran bersangkutan.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveAcademic}
              disabled={saveAcademicMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 rounded-xl shadow-xs px-5 py-2.5"
            >
              {saveAcademicMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Terapkan Tahun Pelajaran ke Seluruh SIMASMUH
            </Button>
          </div>
        </CardContent>
      </Card>

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
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Teks & Konten Hero Depan */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Kustomisasi Teks & Tombol Depan
                  </CardTitle>
                  <CardDescription>
                    Sesuaikan badge akreditasi, judul utama (headline), deskripsi, dan tombol aksi pada hero beranda.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Badge 1 (Akreditasi / Status)</Label>
                  <Input 
                    value={heroData.heroBadgeText}
                    onChange={(e) => setHeroData({ ...heroData, heroBadgeText: e.target.value })}
                    placeholder="Terakreditasi A • Sekolah Unggul Muhammadiyah"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Badge 2 (Lokasi / Wilayah)</Label>
                  <Input 
                    value={heroData.heroBadgeLocation}
                    onChange={(e) => setHeroData({ ...heroData, heroBadgeLocation: e.target.value })}
                    placeholder="Ponorogo, Jawa Timur"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Subheading / Nama Lembaga Kecil</Label>
                <Input 
                  value={heroData.heroSubheading}
                  onChange={(e) => setHeroData({ ...heroData, heroSubheading: e.target.value })}
                  placeholder="SMA MUHAMMADIYAH 1 PONOROGO (MUHIPO)"
                  className="text-xs uppercase font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Judul Utama Baris 1 (Putih Tebal)</Label>
                  <Input 
                    value={heroData.heroTitlePrefix}
                    onChange={(e) => setHeroData({ ...heroData, heroTitlePrefix: e.target.value })}
                    placeholder="EXCELLENT ISLAMIC"
                    className="text-xs font-black uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Judul Utama Baris 2 (Gradien Emas)</Label>
                  <Input 
                    value={heroData.heroTitleGradient}
                    onChange={(e) => setHeroData({ ...heroData, heroTitleGradient: e.target.value })}
                    placeholder="WITH CHARACTER"
                    className="text-xs font-black uppercase text-amber-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Deskripsi / Visi Singkat Hero</Label>
                <textarea 
                  rows={3}
                  value={heroData.heroDescription}
                  onChange={(e) => setHeroData({ ...heroData, heroDescription: e.target.value })}
                  placeholder="Membentuk generasi unggul yang berakhlak mulia, berwawasan global, mandiri..."
                  className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Teks Tombol Aksi 1 (Emas)</Label>
                  <Input 
                    value={heroData.heroCtaText}
                    onChange={(e) => setHeroData({ ...heroData, heroCtaText: e.target.value })}
                    placeholder="Kenapa SMA Muhipo?"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Tautan Aksi 1 (Anchor / URL)</Label>
                  <Input 
                    value={heroData.heroCtaLink}
                    onChange={(e) => setHeroData({ ...heroData, heroCtaLink: e.target.value })}
                    placeholder="#keunggulan"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Teks Tombol Aksi 2 (Video Profil)</Label>
                  <Input 
                    value={heroData.heroVideoText}
                    onChange={(e) => setHeroData({ ...heroData, heroVideoText: e.target.value })}
                    placeholder="Tonton Video Profil"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Tautan Video Profil (YouTube / URL)</Label>
                  <Input 
                    value={heroData.heroVideoLink}
                    onChange={(e) => setHeroData({ ...heroData, heroVideoLink: e.target.value })}
                    placeholder="https://www.youtube.com/@SmaMuhipo"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button 
                  onClick={handleSaveHeroText}
                  disabled={saveHeroMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2"
                >
                  {saveHeroMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Perubahan Teks Hero
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Ringkas Teks Hero */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-slate-950 text-white">
            <CardHeader className="border-b border-white/10 pb-3">
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Pratinjau Langsung (Preview)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 relative">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1.5">
                  <GraduationCap className="w-3 h-3 text-amber-300" />
                  {heroData.heroBadgeText || 'Terakreditasi A • Sekolah Unggul Muhammadiyah'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-600/60 border border-blue-400/30 text-[10px] font-semibold text-blue-100">
                  {heroData.heroBadgeLocation || 'Ponorogo, Jawa Timur'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200">
                  {heroData.heroSubheading || 'SMA MUHAMMADIYAH 1 PONOROGO (MUHIPO)'}
                </p>
                <div className="text-xl sm:text-2xl font-black leading-tight">
                  <div>{heroData.heroTitlePrefix || 'EXCELLENT ISLAMIC'}</div>
                  <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                    {heroData.heroTitleGradient || 'WITH CHARACTER'}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 font-medium leading-relaxed line-clamp-3">
                {heroData.heroDescription || 'Membentuk generasi unggul yang berakhlak mulia, berwawasan global, mandiri, serta berdaya saing internasional berlandaskan nilai-nilai luhur kepesantrenan dan pendidikan berkemajuan.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[11px]">
                  {heroData.heroCtaText || 'Kenapa SMA Muhipo?'}
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white font-bold text-[11px]">
                  {heroData.heroVideoText || 'Tonton Video Profil'}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold mb-1">Tips Penggunaan Banner & Hero</p>
              <ul className="list-disc pl-4 space-y-1 opacity-90">
                <li>Gunakan gambar format JPG, PNG, atau WEBP rasio 16:9 resolusi tinggi.</li>
                <li>Teks dan tombol akan langsung terupdate di halaman depan setelah Anda menekan tombol simpan.</li>
                <li>Tautan Aksi 1 secara bawaan mengarah ke anchor <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">#keunggulan</code> beranda.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
