import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ChevronLeft, CalendarDays, Plus } from 'lucide-react';
import { PublicNavbar, AppFooter } from '@/components/layout';
import { FullCalendarView } from '@/components/calendar/FullCalendarView';
import { AgendaActionButton } from '@/components/calendar/AgendaActionButton';
import { getPublicApiUrl } from '@/lib/api-config';

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

const getSettings = async () => {
  try {
    const res = await fetch(getPublicApiUrl('/settings/public'), { 
      next: { revalidate: 60 },
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'siakad_secret_api_key_2026' }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const getAnnouncements = async (): Promise<Announcement[]> => {
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

export default async function AgendaPage() {
  const settings = await getSettings()
  const announcements = await getAnnouncements()

  const address = settings?.address || 'Jl. Batoro Katong No. 123, Ponorogo, Jawa Timur'
  const phone = settings?.phone || '(0352) 123456'
  const email = settings?.email || 'info@smamuhipo.sch.id'

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
      <PublicNavbar academicYear={settings?.academicYear} semester={settings?.semester} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col py-4 sm:py-6 lg:py-8 px-3 sm:px-6 lg:px-12 bg-slate-50/90 dark:bg-slate-950/80">
        <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700">
              <ChevronLeft className="w-4 h-4 mr-1" /> Beranda
            </Link>
            <div className="flex items-center gap-2">
              <AgendaActionButton />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                    Kalender Akademik &amp; Agenda
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                    Penanggalan Masehi, Hijriah (KHGT), Libur Nasional, dan Agenda Sekolah.
                  </p>
                </div>
              </div>
            </div>

            {/* Full Interactive Dual Calendar */}
            <FullCalendarView initialAnnouncements={announcements} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 pt-12 pb-28 sm:pb-32 px-6 lg:px-20 border-t-4 border-[#F58F2A]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Image src="/pic_logo.png" alt="Logo" width={150} height={50} className="object-contain bg-white p-2 rounded-lg mb-6" />
            <p className="text-sm leading-relaxed mb-6">
              Mewujudkan generasi Islami yang cerdas, berkarakter, dan siap menghadapi tantangan global melalui pendidikan yang berkemajuan.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Tautan Cepat</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/profil" className="hover:text-white transition-colors">Profil Sekolah</Link></li>
              <li><Link href="/berita" className="hover:text-white transition-colors">Informasi &amp; Berita</Link></li>
              <li><Link href="/tentang" className="hover:text-white transition-colors">Tentang Kami</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Fasilitas</h4>
            <ul className="space-y-3 text-sm">
              <li><span className="hover:text-white transition-colors">Masjid Sekolah</span></li>
              <li><span className="hover:text-white transition-colors">Perpustakaan Digital</span></li>
              <li><span className="hover:text-white transition-colors">Laboratorium Sains &amp; Komputer</span></li>
              <li><span className="hover:text-white transition-colors">Asrama (Boarding)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Kontak Kami</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-slate-400">{address}</span>
              </li>
              {phone && (
                <li className="flex items-center gap-3">
                  <span className="text-slate-400">{phone}</span>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3">
                  <span className="text-slate-400">{email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </footer>

      {/* Copyright Bar */}
      <AppFooter />
    </div>
  );
}
