import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Code, Sparkles, Terminal, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar, AppFooter } from '@/components/layout'

export const metadata = {
  title: "Tentang Developer - SMA MUHIPO",
  description: "Informasi Tim Pengembang SIMASMUH",
}

export default function TentangPage() {
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
      <div className="fixed inset-0 bg-slate-100/70 dark:bg-slate-950/80 backdrop-blur-[1.5px] -z-20 pointer-events-none" />

      {/* Navbar Induk Terpadu */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100 dark:border-blue-900/50">
            <Terminal className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/80 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Muhipo Tech Ecosystem</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Tim Pengembang SIMASMUH
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
            Sistem Informasi Manajemen Sekolah Terpadu dikembangkan dan dikelola oleh <span className="font-semibold text-slate-900 dark:text-white">Muhipo Dev</span> untuk mendukung digitalisasi administrasi pendidikan modern di SMA Muhammadiyah 1 Ponorogo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="w-full sm:w-auto">
              <Button className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white font-bold px-6 py-2.5 rounded-full w-full sm:w-auto shadow-md hover:shadow-lg transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
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
