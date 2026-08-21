import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar, AppFooter } from '@/components/layout'

export const metadata = {
  title: "Profil Sekolah - SMA MUHIPO",
  description: "Profil Resmi SMA Muhammadiyah 1 Ponorogo",
}

export default function ProfilPage() {
  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      {/* Background Wallpaper with Smooth Glass Overlay */}
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
      <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-950/90 backdrop-blur-[3px] -z-20 pointer-events-none" />

      {/* Navbar Induk Terpadu */}
      <PublicNavbar />

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
      <AppFooter />
    </div>
  )
}
