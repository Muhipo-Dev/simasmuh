'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowUp, 
  ArrowDown, 
  Layers, 
  Save, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  SlidersHorizontal,
  GraduationCap,
  Users,
  Megaphone,
  Award,
  BookOpen,
  Tv
} from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Swal from 'sweetalert2'

export interface HomeSectionItem {
  id: string
  name: string
  description: string
  iconName: string
  defaultOrder: number
}

export const ALL_HOME_SECTIONS: HomeSectionItem[] = [
  {
    id: 'partner_logos',
    name: 'Logo Keunggulan & Kemitraan',
    description: 'Running logo mitra kerjasama, sertifikasi, akreditasi, dan Cambridge/ICAS.',
    iconName: 'Award',
    defaultOrder: 1,
  },
  {
    id: 'stats',
    name: 'Statistik Sekolah Riil',
    description: 'Kartu 4 kolom jumlah Guru/Tendik, Siswa Aktif, Rombel, dan Ekstrakurikuler.',
    iconName: 'Users',
    defaultOrder: 2,
  },
  {
    id: 'news_agenda',
    name: 'Berita & Agenda Sekolah',
    description: 'Informasi pengumuman terkini publik dan jadwal agenda kegiatan sekolah.',
    iconName: 'Megaphone',
    defaultOrder: 3,
  },
  {
    id: 'why_school',
    name: 'Kenapa Harus Bersekolah di Muhipo',
    description: 'Bagian pilar keunggulan utama sekolah dan kartu karakteristik nilai institusi.',
    iconName: 'CheckCircle2',
    defaultOrder: 4,
  },
  {
    id: 'programs',
    name: 'Program Unggulan',
    description: 'Pilar program pendidikan unggulan (Tahfidz, AI, Sains, Seni Budaya, dsb).',
    iconName: 'BookOpen',
    defaultOrder: 5,
  },
  {
    id: 'media_social',
    name: 'Kanal Media Sosial & Dokumentasi',
    description: 'Video profil resmi YouTube dan galeri postingan terbaru Instagram.',
    iconName: 'Tv',
    defaultOrder: 6,
  },
]

export default function TataLetakBerandaPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()

  const [sectionOrder, setSectionOrder] = useState<string[]>(ALL_HOME_SECTIONS.map(s => s.id))

  // Ambil data settings dari backend
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings-home-layout'],
    queryFn: () => authenticatedQuery('/api-backend/settings'),
  })

  useEffect(() => {
    if (settings && settings.homeSectionOrderJson) {
      try {
        const parsed = JSON.parse(settings.homeSectionOrderJson)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Pastikan semua seksi yang ada tercover meskipun ada yang baru
          const existingIds = new Set(parsed)
          const missingIds = ALL_HOME_SECTIONS.filter(s => !existingIds.has(s.id)).map(s => s.id)
          setSectionOrder([...parsed, ...missingIds])
          return
        }
      } catch {
        // Fallback default
      }
    }
    setSectionOrder(ALL_HOME_SECTIONS.map(s => s.id))
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const res = await authenticatedFetch('/api-backend/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeSectionOrderJson: JSON.stringify(order) })
      })
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${await res.text()}`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-home-layout'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-settings'] })
      Swal.fire({
        icon: 'success',
        title: 'Urutan Beranda Tersimpan!',
        text: 'Tata letak urutan seksi di halaman utama website berhasil diperbarui.',
        confirmButtonColor: '#2563eb'
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...sectionOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setSectionOrder(newOrder)
  }

  const moveDown = (index: number) => {
    if (index === sectionOrder.length - 1) return
    const newOrder = [...sectionOrder]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setSectionOrder(newOrder)
  }

  const handleReset = () => {
    setSectionOrder(ALL_HOME_SECTIONS.map(s => s.id))
  }

  const getSectionDetail = (id: string) => {
    return ALL_HOME_SECTIONS.find(s => s.id === id) || {
      id,
      name: id,
      description: 'Seksi Halaman Beranda',
      iconName: 'Layers',
      defaultOrder: 99
    }
  }

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Award': return <Award className="w-5 h-5 text-amber-500" />
      case 'Users': return <Users className="w-5 h-5 text-blue-500" />
      case 'Megaphone': return <Megaphone className="w-5 h-5 text-orange-500" />
      case 'CheckCircle2': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-indigo-500" />
      case 'Tv': return <Tv className="w-5 h-5 text-rose-500" />
      default: return <Layers className="w-5 h-5 text-slate-500" />
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold mb-1.5 border border-blue-200/80 dark:border-blue-900/60">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>MODUL ADMIN WEB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Tata Letak &amp; Urutan Beranda
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm">
            Atur urutan tampilan setiap seksi di halaman utama website depan sekolah sesuai kebutuhan publikasi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs font-bold gap-1.5"
            title="Kembalikan urutan default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </Button>
          <Button
            onClick={() => saveMutation.mutate(sectionOrder)}
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 shadow-sm"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Urutan
          </Button>
        </div>
      </div>

      {/* Info Card Banner Hero */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-slate-900 to-blue-950 text-white">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                Pondasi Utama Halaman Depan
              </div>
              <h3 className="text-sm sm:text-base font-black">
                Header, Navbar Mengambang &amp; Hero Carousel Slider
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Seksi Hero selalu menempati posisi paling atas sebagai identitas pembuka utama sekolah.
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-extrabold text-amber-200">
              Tetap Terkunci di Puncak #1
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Seksi yang Dapat Diatur Urutannya */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Susunan Urutan Seksi Beranda
          </CardTitle>
          <CardDescription>
            Gunakan tombol Naik dan Turun untuk mengatur tata urutan tampilan dari atas ke bawah.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            sectionOrder.map((sectionId, idx) => {
              const detail = getSectionDetail(sectionId)
              const isFirst = idx === 0
              const isLast = idx === sectionOrder.length - 1

              return (
                <div
                  key={sectionId}
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700/60 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-center font-black text-xs sm:text-sm text-blue-700 dark:text-blue-300 shrink-0">
                      #{idx + 1}
                    </div>

                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {renderIcon(detail.iconName)}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {detail.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                        {detail.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isFirst}
                      onClick={() => moveUp(idx)}
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg disabled:opacity-30"
                      title="Pindahkan ke atas"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isLast}
                      onClick={() => moveDown(idx)}
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg disabled:opacity-30"
                      title="Pindahkan ke bawah"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Live Summary Bar */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold">
            Urutan aktif: {sectionOrder.map((s, i) => `${i + 1}. ${getSectionDetail(s).name}`).join(' → ')}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate(sectionOrder)}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 text-xs"
        >
          {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Sekarang'}
        </Button>
      </div>
    </div>
  )
}
