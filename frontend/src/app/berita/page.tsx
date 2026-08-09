'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Search, Calendar, User, Newspaper, ArrowLeft, LogIn, Menu, Eye, Tag, ChevronRight, X, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

type Announcement = {
  id: string
  title: string
  content: string
  type: string
  target: string
  eventDate?: string
  image?: string
  createdAt: string
  author?: { name: string }
}

export default function BeritaPage() {
  const authenticatedFetch = useAuthenticatedFetch()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null)

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['public-announcements-all'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/announcements/public')
      if (!res.ok) throw new Error('Gagal memuat berita')
      return res.json()
    }
  })

  // Filter items based on category and search
  const filteredList = announcements.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.type === activeCategory
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredNews = announcements.find(a => a.type === 'BERITA' && a.image) || announcements[0]

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        <Image
          src="/muhipo-log.jpg"
          alt="Latar Belakang SMA MUHIPO"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105"
        />
      </div>
      <div className="fixed inset-0 bg-slate-100/85 dark:bg-slate-950/90 backdrop-blur-[3px] -z-20 pointer-events-none" />

      {/* Navbar */}
      <nav className="h-16 sm:h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 lg:px-12 shadow-xs border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-30 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/pic_logo.png"
              alt="Logo SMA MUHIPO"
              width={150}
              height={50}
              priority
              className="object-contain h-9 sm:h-12 w-auto"
            />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-8">
          <Link href="/" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Beranda</Link>
          <Link href="/profil" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Profil</Link>
          <Link href="/tentang" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Tentang</Link>
          <Link href="/berita" className="text-[#2B50A1] dark:text-blue-400 font-bold transition-colors">Berita</Link>

          <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-8">
            <ThemeToggle />
            <Link href="/login" className="bg-[#2B50A1] hover:bg-[#1f3c7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center transition-all shadow-sm">
              <LogIn className="w-4 h-4 mr-2" />
              Login SIMASMUH
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center gap-2.5">
          <ThemeToggle size="sm" />
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white rounded-xl w-10 h-10 p-0 flex items-center justify-center shadow-xs">
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-2 text-slate-900 dark:text-slate-100 shadow-xl rounded-xl">
              <DropdownMenuItem>
                <Link href="/" className="w-full cursor-pointer py-2.5 px-3 text-sm font-semibold rounded-lg">Beranda</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/profil" className="w-full cursor-pointer py-2.5 px-3 text-sm font-semibold rounded-lg">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/tentang" className="w-full cursor-pointer py-2.5 px-3 text-sm font-semibold rounded-lg">Tentang</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/berita" className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-[#2B50A1] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-lg">Berita</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem>
                <Link href="/login" className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-white bg-[#2B50A1] hover:bg-[#1f3c7a] rounded-lg flex items-center justify-center shadow-xs">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login SIMASMUH
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-[#1e3b7a] via-[#2b50a1] to-[#1e3b7a] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-blue-100">
              <Newspaper className="w-3.5 h-3.5" />
              Portal Berita &amp; Informasi Publik
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
              Kabar SMA MUHIPO
            </h1>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed font-medium">
              Seputar kegiatan, pengumuman resmi, prestasi, dan agenda SMA Muhammadiyah 1 Ponorogo.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-80 z-10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Cari berita atau pengumuman..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-0 shadow-md rounded-2xl h-11 text-sm focus-visible:ring-2 focus-visible:ring-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          {[
            { id: 'ALL', label: 'Semua Kategori' },
            { id: 'BERITA', label: 'Berita Terbaru' },
            { id: 'PENGUMUMAN', label: 'Pengumuman Resmi' },
            { id: 'AGENDA', label: 'Agenda Kegiatan' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeCategory === tab.id
                  ? 'bg-[#2B50A1] dark:bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Featured News Hero Card (If available and no search term) */}
        {!searchTerm && activeCategory === 'ALL' && featuredNews && (
          <div 
            onClick={() => setSelectedNews(featuredNews)}
            className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-0 transition-all duration-300"
          >
            {featuredNews.image ? (
              <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[340px] overflow-hidden">
                <Image
                  src={featuredNews.image}
                  alt={featuredNews.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="lg:col-span-7 bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center min-h-[200px] p-8 text-white">
                <Newspaper className="w-16 h-16 opacity-40" />
              </div>
            )}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Sorotan Utama
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(featuredNews.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {featuredNews.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
                  {featuredNews.content}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                <span>Oleh: {featuredNews.author?.name || 'Admin Web'}</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center group-hover:translate-x-1 transition-transform">
                  Baca Selengkapnya <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* News Grid */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" />
            Daftar Berita &amp; Informasi Terbaru
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-900 rounded-2xl h-80 animate-pulse border border-slate-200 dark:border-slate-800" />
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-semibold">Tidak ada berita atau informasi yang ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedNews(item)}
                  className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {item.image ? (
                      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gradient-to-tr from-slate-800 to-blue-900 flex items-center justify-center text-white">
                        <Newspaper className="w-10 h-10 opacity-30" />
                      </div>
                    )}

                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase">
                          {item.type}
                        </span>
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {item.author?.name || 'Admin'}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center group-hover:translate-x-1 transition-transform">
                      Selengkapnya <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail News Modal */}
      {selectedNews && (
        <Dialog open={!!selectedNews} onOpenChange={(open) => !open && setSelectedNews(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
            <DialogHeader className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                  {selectedNews.type}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedNews.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedNews.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dipublikasikan oleh: <strong className="text-slate-700 dark:text-slate-300">{selectedNews.author?.name || 'Admin Web'}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {selectedNews.image && (
                <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden shadow-sm">
                  <Image
                    src={selectedNews.image}
                    alt={selectedNews.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                {selectedNews.content}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Footer Copyright Bar */}
      <footer className="bg-slate-950 text-slate-400 py-4 px-6 text-center text-xs font-semibold border-t border-slate-800">
        <p>Copyright &copy; 2026 - Muhipo Dev</p>
      </footer>
    </div>
  )
}
