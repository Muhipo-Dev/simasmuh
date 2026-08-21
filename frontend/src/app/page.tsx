import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, GraduationCap, Users, Building2, LogIn, Menu, Calendar, BookOpen, Trophy, MapPin, Phone, Mail, Globe, Cpu, Music, Briefcase, Microscope, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PublicNavbar, AppFooter } from '@/components/layout';
import HeroCarousel from '@/components/home/HeroCarousel';
import ProgramUnggulanSection from '@/components/home/ProgramUnggulanSection';
import { getPublicApiUrl } from '@/lib/api-config';

export const metadata = {
  title: "SIMASMUH",
  description: "Portal Resmi SMA Muhammadiyah 1 Ponorogo - Cerdas, Mandiri, Berprestasi, Mendunia.",
};

async function getSettings() {
  try {
    const res = await fetch(getPublicApiUrl('/settings/public'), {
      cache: 'no-store',
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026' }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  target: string;
  eventDate?: string | Date;
  image?: string;
  createdAt: string | Date;
  author?: { name: string };
}

async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch(getPublicApiUrl('/announcements/public'), {
      cache: 'no-store',
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026' }
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getStats() {
  try {
    const res = await fetch(getPublicApiUrl('/settings/public/stats'), {
      cache: 'no-store',
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026' }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function Home() {
  const settings = await getSettings()
  const announcements = await getAnnouncements()
  const stats = await getStats()

  const beritaList = announcements.filter((a) => a.type === 'BERITA')
  const agendaList = announcements.filter((a) => a.type === 'AGENDA').sort((a, b) => new Date(a.eventDate || a.createdAt).getTime() - new Date(b.eventDate || b.createdAt).getTime())

  const schoolName = settings?.schoolName || 'SMA Muhammadiyah 1 Ponorogo'
  const address = settings?.address || 'Jl. Batoro Katong No. 123, Ponorogo, Jawa Timur'
  const phone = settings?.phone || '(0352) 123456'
  const email = settings?.email || 'info@smamuhipo.sch.id'

  const teacherCount = stats?.teachers || 0
  const studentCount = stats?.students || 0
  const classCount = stats?.classes || 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Navbar Induk Terpadu */}
      <PublicNavbar academicYear={settings?.academicYear} semester={settings?.semester} />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <HeroCarousel schoolName={schoolName} />

        {/* Enhanced High-Contrast Royal Blue Stats (Data Count) Section */}
        <div className="relative z-20 mt-4 sm:-mt-10 px-4 sm:px-8 max-w-6xl mx-auto w-full">
          <div className="bg-[#1e3b7a] dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl border border-blue-400/30 dark:border-blue-900/50">
            <div className="grid grid-cols-3 divide-x divide-white/20 dark:divide-blue-800/40">
              {/* GTK Count */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 justify-center text-center sm:text-left px-2 sm:px-4">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Users className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-white">
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                    {teacherCount}
                  </h3>
                  <p className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wider sm:tracking-widest text-blue-100 uppercase drop-shadow-xs">
                    GTK
                  </p>
                  <p className="hidden md:block text-[11px] text-blue-200/90 mt-0.5 font-semibold">
                    Guru &amp; Staf Kependidikan
                  </p>
                </div>
              </div>

              {/* Siswa Count */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 justify-center text-center sm:text-left px-2 sm:px-4">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-md">
                  <GraduationCap className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-white">
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                    {studentCount}
                  </h3>
                  <p className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wider sm:tracking-widest text-blue-100 uppercase drop-shadow-xs">
                    SISWA
                  </p>
                  <p className="hidden md:block text-[11px] text-blue-200/90 mt-0.5 font-semibold">
                    Peserta Didik Aktif
                  </p>
                </div>
              </div>

              {/* Rombel / Kelas Count */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6 justify-center text-center sm:text-left px-2 sm:px-4">
                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Building2 className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-white">
                  <h3 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                    {classCount}
                  </h3>
                  <p className="text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wider sm:tracking-widest text-blue-100 uppercase drop-shadow-xs">
                    Kelas
                  </p>
                  <p className="hidden md:block text-[11px] text-blue-200/90 mt-0.5 font-semibold">
                    Rombongan Belajar
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Program Unggulan Section */}
        <ProgramUnggulanSection />

        {/* Berita & Agenda Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-8 lg:px-20 bg-slate-50/60 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 transition-colors duration-300 relative">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">

            {/* Kolom Berita Utama (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold mb-2 border border-blue-100 dark:border-blue-900/60">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                    INFORMASI TERKINI
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Berita Terbaru</h2>
                </div>
                <Link
                  href="/berita"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/50 transition-all shadow-xs"
                >
                  Lihat Semua Berita &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {beritaList.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    Belum ada berita terbaru.
                  </div>
                ) : (
                  beritaList.slice(0, 2).map((news) => (
                    <Link key={news.id} href="/berita" className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-300">
                      {news.image ? (
                        <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <Image
                            src={news.image}
                            alt={news.title}
                            fill
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-white/40 shadow-xs">
                            {news.target === 'ALL' || news.target === 'SEMUA' ? 'Publik' : news.target}
                          </div>
                        </div>
                      ) : (
                        <div className="h-28 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-end text-white font-bold text-xs uppercase tracking-wider">
                          Informasi Sekolah
                        </div>
                      )}
                      
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(news.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                            {news.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 line-clamp-3 text-xs sm:text-sm leading-relaxed">
                            {news.content}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span>Oleh: {news.author?.name || 'Super Admin'}</span>
                          <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-bold">
                            Baca &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Kolom Agenda Kegiatan (1/3 width) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 text-xs font-extrabold mb-2 border border-orange-100 dark:border-orange-900/60">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    JADWAL ACARA
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Agenda</h2>
                </div>
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-300 transition-all shadow-xs"
                >
                  Semua &rarr;
                </Link>
              </div>

              <div className="space-y-3.5">
                {agendaList.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    Belum ada agenda terbaru.
                  </div>
                ) : (
                  agendaList.slice(0, 3).map((agenda) => {
                    const eventDate = new Date(agenda.eventDate || agenda.createdAt);
                    const day = eventDate.getDate().toString().padStart(2, '0');
                    const month = eventDate.toLocaleDateString('id-ID', { month: 'short' });

                    return (
                      <Link
                        key={agenda.id}
                        href="/agenda"
                        className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-orange-300 dark:hover:border-orange-800/80 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer"
                      >
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                          <span className="text-lg font-black leading-none">{day}</span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider">{month}</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate text-sm sm:text-base">
                            {agenda.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                            {agenda.content}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer Links Section */}
      <footer className="bg-slate-900 text-slate-300 pt-12 sm:pt-16 pb-12 px-4 sm:px-8 lg:px-20 border-t-4 border-[#F58F2A]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <Image src="/pic_logo.png" alt="Logo" width={150} height={50} className="object-contain bg-white p-2 rounded-xl mb-5 shadow-xs" />
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              Mewujudkan generasi Islami yang cerdas, berkarakter, dan siap menghadapi tantangan global melalui pendidikan yang berkemajuan.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Tautan Cepat</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/profil" className="hover:text-white transition-colors">Profil Sekolah</Link></li>
              <li><Link href="/berita" className="hover:text-white transition-colors">Informasi &amp; Berita</Link></li>
              <li><Link href="/tentang" className="hover:text-white transition-colors">Tentang</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Fasilitas</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><span className="hover:text-white transition-colors">Dua Masjid Sekolah</span></li>
              <li><span className="hover:text-white transition-colors">Kantin &amp; Koperasi Sekolah</span></li>
              <li><span className="hover:text-white transition-colors">Laboratorium Sains &amp; Komputer</span></li>
              <li><span className="hover:text-white transition-colors">Asrama (Boarding)</span></li>
            </ul>
          </div>

          {/* Kontak dari Pengaturan Superadmin */}
          <div>
            <h4 className="text-white font-bold text-base sm:text-lg mb-4 sm:mb-6">Kontak Kami</h4>
            <ul className="space-y-3.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{address}</span>
              </li>
              {phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-300">{phone}</span>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-300">{email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </footer>

      {/* Copyright Bar Induk */}
      <AppFooter />
    </div>
  );
}
