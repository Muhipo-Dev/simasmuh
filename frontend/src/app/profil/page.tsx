import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Clock, Sparkles, LogIn, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'

export const metadata = {
  title: "Profil Sekolah - SMA MUHIPO",
  description: "Profil Resmi SMA Muhammadiyah 1 Ponorogo",
}

export default function ProfilPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
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
          <Link href="/profil" className="text-[#2B50A1] dark:text-blue-400 font-bold transition-colors">Profil</Link>
          <Link href="/tentang" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Tentang</Link>
          <Link href="/berita" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-semibold transition-colors">Berita</Link>
          <Link href="/spmb" className="text-slate-600 dark:text-slate-300 hover:text-[#2B50A1] dark:hover:text-blue-400 font-bold transition-colors">SPMB Online</Link>

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
                <Link href="/profil" className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-[#2B50A1] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-lg">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/tentang" className="w-full cursor-pointer py-2.5 px-3 text-sm font-semibold rounded-lg">Tentang</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/berita" className="w-full cursor-pointer py-2.5 px-3 text-sm font-semibold rounded-lg">Berita</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/spmb" className="w-full cursor-pointer py-2.5 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">SPMB Online</Link>
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Profil Sekolah SMA MUHIPO
          </div>

          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Coming Soon
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              Halaman Profil SMA Muhammadiyah 1 Ponorogo sedang dalam tahap penyempurnaan konten &amp; dokumentasi. Informasi lengkap mengenai Visi, Misi, Sejarah, dan Struktur Organisasi akan segera hadir.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/">
              <Button className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white font-bold px-6 py-2.5 rounded-full shadow-md w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
            <Link href="/berita">
              <Button variant="outline" className="font-bold px-6 py-2.5 rounded-full w-full sm:w-auto">
                Baca Berita Sekolah
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Copyright Bar */}
      <footer className="bg-slate-950 text-slate-400 py-4 px-6 text-center text-xs font-semibold border-t border-slate-800">
        <p>Copyright &copy; 2026 - Muhipo Dev</p>
      </footer>
    </div>
  )
}
