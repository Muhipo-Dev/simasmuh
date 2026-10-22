import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  GraduationCap,
  Users,
  Building2,
  LogIn,
  Menu,
  Calendar,
  BookOpen,
  Trophy,
  MapPin,
  Phone,
  Mail,
  Globe,
  Cpu,
  Music,
  Briefcase,
  Microscope,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Award,
  ShieldCheck,
  Play
} from 'lucide-react';

function YoutubeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PublicNavbar, AppFooter } from '@/components/layout';
import HeroCarousel from '@/components/home/HeroCarousel';
import ProgramUnggulanSection from '@/components/home/ProgramUnggulanSection';
import { getPublicApiUrl } from '@/lib/api-config';
import { AutoContrastLogo } from '@/components/common/AutoContrastLogo';

export const metadata: Metadata = {
  title: "SIMASMUH by. Muhipo Dev",
  description: "Sistem Informasi Manajemen SMA Muhammadiyah 1 Ponorogo",
};

async function getSettings() {
  try {
    const res = await fetch(getPublicApiUrl('/settings/public'), {
      cache: 'no-store',
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55' }
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
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55' }
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
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55' }
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function getPublicPrograms() {
  try {
    const res = await fetch(getPublicApiUrl('/settings/public/programs'), {
      cache: 'no-store',
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'nailar-muhipo55' }
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function Home() {
  const settings = await getSettings()
  const announcements = await getAnnouncements()
  const stats = await getStats()
  const initialPrograms = await getPublicPrograms()

  const beritaList = announcements.filter((a) => a.type === 'BERITA')
  const agendaList = announcements.filter((a) => a.type === 'AGENDA').sort((a, b) => new Date(a.eventDate || a.createdAt).getTime() - new Date(b.eventDate || b.createdAt).getTime())

  const schoolName = settings?.schoolName || 'SMA Muhammadiyah 1 Ponorogo'
  const address = settings?.address || 'Jl. Batoro Katong No. 123, Ponorogo, Jawa Timur'
  const phone = settings?.phone || '(0352) 123456'
  const email = settings?.email || 'info@smamuhipo.sch.id'
  const youtubeChannelUrl = settings?.youtubeChannelUrl || 'https://www.youtube.com/@SmaMuhipo'
  const youtubeVideoEmbedUrl = settings?.youtubeVideoEmbedUrl || 'https://www.youtube.com/@SmaMuhipo'
  const instagramUrl = settings?.instagramUrl || 'https://www.instagram.com/smamuhipo.official/'
  const instagramFeedUrl = settings?.instagramFeedUrl || 'https://www.instagram.com/smamuhipo.official/'

  const teacherCount = stats?.teachers || 0
  const studentCount = stats?.students || 0
  const classCount = stats?.classes || 0
  const extracurricularCount = stats?.extracurriculars || 0
  const programsCount = initialPrograms?.length || 5

  let parsedPartnerLogos: Array<{ id: string; title: string; subtitle?: string; imageUrl: string; linkUrl?: string }> = []
  try {
    if (settings?.partnerLogos) {
      parsedPartnerLogos = JSON.parse(settings.partnerLogos)
    }
  } catch {
    parsedPartnerLogos = []
  }

  let parsedInstagramPosts: Array<{ id: string; url: string; caption: string; date?: string; imageUrl?: string }> = []
  try {
    if (settings?.instagramPostsJson) {
      parsedInstagramPosts = JSON.parse(settings.instagramPostsJson)
    }
  } catch {
    parsedInstagramPosts = []
  }

  const formatPostDate = (dateVal?: string) => {
    if (!dateVal) return 'Terbaru'
    // Cek apakah dateVal adalah format tanggal standar
    const parsed = new Date(dateVal)
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }
    // Jika format teks seperti "16 Okt 2026", gunakan langsung
    return dateVal
  }

  const whySchoolTitle = settings?.whySchoolTitle || 'Kenapa Harus Bersekolah di SMA Muhipo?'
  const whySchoolSubtitle = settings?.whySchoolSubtitle || 'SMA Muhammadiyah 1 Ponorogo berkomitmen memberikan lingkungan belajar holistik yang memadukan keunggulan akademik, adab Islam, teknologi masa depan, dan prestasi global.'

  let parsedWhySchoolFeatures: Array<{
    id: string
    number?: string
    title: string
    description: string
    tag?: string
    icon?: string
    color?: string
  }> = []

  try {
    if (settings?.whySchoolFeaturesJson) {
      const parsed = JSON.parse(settings.whySchoolFeaturesJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedWhySchoolFeatures = parsed
      }
    }
  } catch {
    parsedWhySchoolFeatures = []
  }

  // Pengaturan urutan seksi beranda dinamis dari Admin Web
  const DEFAULT_SECTIONS_ORDER = ['partner_logos', 'stats', 'news_agenda', 'why_school', 'programs', 'media_social']
  let activeSectionOrder = DEFAULT_SECTIONS_ORDER

  try {
    if (settings?.homeSectionOrderJson) {
      const parsedOrder = JSON.parse(settings.homeSectionOrderJson)
      if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
        // Gabungkan dengan default untuk memastikan tidak ada seksi yang hilang
        const existingSet = new Set(parsedOrder)
        const missing = DEFAULT_SECTIONS_ORDER.filter(s => !existingSet.has(s))
        activeSectionOrder = [...parsedOrder, ...missing]
      }
    }
  } catch {
    activeSectionOrder = DEFAULT_SECTIONS_ORDER
  }

  return (
    <div className="min-h-screen flex flex-col relative transition-colors duration-300 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Background Wallpaper with Smooth Glass Overlay */}
      <div className="fixed inset-0 -z-30 w-full h-full overflow-hidden pointer-events-none">
        {settings?.backgroundUrl && (settings.backgroundUrl.startsWith('http') || settings.backgroundUrl.startsWith('data:')) ? (
          <img
            src={settings.backgroundUrl}
            alt="Latar Belakang SMA MUHIPO"
            className="object-cover object-center w-full h-full scale-105"
          />
        ) : (
          <Image
            src={settings?.backgroundUrl || "/muhipo-log.jpg"}
            alt="Latar Belakang SMA MUHIPO"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center w-full h-full scale-105"
          />
        )}
      </div>
      <div className="fixed inset-0 bg-slate-100/75 dark:bg-slate-950/85 backdrop-blur-[1.5px] -z-20 pointer-events-none" />

      {/* Hero Section with Full-Bleed Background & Floating Navbar */}
      <div className="relative w-full">
        {/* Floating Navbar directly overlaying the top of the Hero */}
        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
          <PublicNavbar academicYear={settings?.academicYear} semester={settings?.semester} />
        </div>

        <HeroCarousel 
          schoolName={schoolName} 
          videoProfileUrl={youtubeVideoEmbedUrl}
          heroBadgeText={settings?.heroBadgeText}
          heroBadgeLocation={settings?.heroBadgeLocation}
          heroSubheading={settings?.heroSubheading}
          heroTitlePrefix={settings?.heroTitlePrefix}
          heroTitleGradient={settings?.heroTitleGradient}
          heroDescription={settings?.heroDescription}
          heroCtaText={settings?.heroCtaText}
          heroCtaLink={settings?.heroCtaLink}
          heroVideoText={settings?.heroVideoText}
          heroVideoLink={settings?.heroVideoLink}
        />
      </div>

      <main className="flex-1 flex flex-col">
        {activeSectionOrder.map((sectionKey) => {
          if (sectionKey === 'partner_logos') {
            const displayLogos = (parsedPartnerLogos && parsedPartnerLogos.length > 0) ? parsedPartnerLogos : [
              {
                id: 'logo-muhipo-dikdasmen',
                title: 'SMA Muhammadiyah 1 Ponorogo',
                subtitle: 'Majelis Dikdasmen & PNF',
                imageUrl: '/logos/pic_logo.png',
                linkUrl: 'https://smamuhipo.sch.id'
              },
              {
                id: 'logo-sekolah-penggerak',
                title: 'Sekolah Penggerak',
                subtitle: 'Kemendikbudristek RI',
                imageUrl: '/logos/pic_logo.png',
                linkUrl: ''
              },
              {
                id: 'logo-icas-assessment',
                title: 'ICAS Assessments',
                subtitle: 'International Competitions',
                imageUrl: '/logos/pic_logo.png',
                linkUrl: ''
              },
              {
                id: 'logo-cambridge-associate',
                title: 'Cambridge Assessment',
                subtitle: 'International Education Associate',
                imageUrl: '/logos/pic_logo.png',
                linkUrl: ''
              },
              {
                id: 'logo-iso-certification',
                title: 'ISO 9001:2015',
                subtitle: 'Sistem Manajemen Mutu',
                imageUrl: '/logos/pic_logo.png',
                linkUrl: ''
              }
            ]

            const marqueeList = [...displayLogos, ...displayLogos, ...displayLogos]

            return (
              <div key="partner_logos" className="relative z-20 my-4 sm:my-6 px-4 sm:px-8 max-w-6xl mx-auto w-full">
                <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xl backdrop-blur-xl overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

                  <div className="animate-marquee-left gap-8 sm:gap-12 py-2 items-center">
                    {marqueeList.map((item, idx) => {
                      const CardWrapper = item.linkUrl ? 'a' : 'div'
                      const wrapperProps = item.linkUrl 
                        ? { href: item.linkUrl, target: '_blank', rel: 'noopener noreferrer' } 
                        : {}

                      return (
                        <CardWrapper
                          key={`${item.id || 'logo'}-${idx}`}
                          {...wrapperProps}
                          title={item.title + (item.subtitle ? ` - ${item.subtitle}` : '')}
                          className="h-12 sm:h-14 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                        >
                          <AutoContrastLogo
                            src={item.imageUrl.startsWith('/uploads') ? `/api-backend${item.imageUrl}` : item.imageUrl}
                            alt={item.title}
                            className="max-h-full w-auto object-contain"
                          />
                        </CardWrapper>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          }

          if (sectionKey === 'stats') {
            return (
              <div key="stats" className="relative z-20 my-4 sm:my-6 px-4 sm:px-8 max-w-6xl mx-auto w-full">
                <div className="bg-[#122854] dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl border border-blue-400/30 dark:border-blue-900/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/15 dark:divide-blue-800/40 gap-y-4 md:gap-y-0">
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center text-center sm:text-left px-2 sm:px-4 pt-2 md:pt-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                          {teacherCount}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                          Guru &amp; Tendik
                        </p>
                        <p className="hidden md:block text-[11px] text-white/80 mt-0.5 font-medium">
                          Tenaga Pendidik
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center text-center sm:text-left px-2 sm:px-4 pt-2 md:pt-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-md">
                        <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                          {studentCount}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                          Siswa Aktif
                        </p>
                        <p className="hidden md:block text-[11px] text-white/80 mt-0.5 font-medium">
                          Peserta Didik
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center text-center sm:text-left px-2 sm:px-4 pt-3 md:pt-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                          {classCount}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                          Rombel
                        </p>
                        <p className="hidden md:block text-[11px] text-white/80 mt-0.5 font-medium">
                          Kelas Belajar
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center text-center sm:text-left px-2 sm:px-4 pt-3 md:pt-0">
                      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <div className="text-white">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none mb-1 text-white drop-shadow-sm">
                          {extracurricularCount}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-black tracking-wider text-white uppercase">
                          Ekstrakurikuler
                        </p>
                        <p className="hidden md:block text-[11px] text-white/80 mt-0.5 font-medium">
                          Pengembangan Bakat
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          if (sectionKey === 'news_agenda') {
            return (
              <section key="news_agenda" className="py-8 sm:py-12 px-4 sm:px-8 lg:px-20 bg-transparent transition-colors duration-300 relative">
                <div className="max-w-6xl mx-auto space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold mb-2 border border-blue-200/80 dark:border-blue-900/60 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                            INFORMASI TERKINI
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Berita Terbaru</h2>
                        </div>
                        <Link
                          href="/berita"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-slate-900/70 border border-white/40 dark:border-white/10 hover:border-blue-300 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-xs backdrop-blur-md"
                        >
                          Lihat Semua Berita &rarr;
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {beritaList.length === 0 ? (
                          <div className="col-span-2 text-center py-12 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/70 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-3xl backdrop-blur-md">
                            Belum ada berita terbaru.
                          </div>
                        ) : (
                          beritaList.slice(0, 2).map((news) => (
                            <Link key={news.id} href="/berita" className="group flex flex-col bg-white/85 dark:bg-slate-900/70 rounded-3xl border border-white/40 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all duration-300 backdrop-blur-xl">
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
                                  <p className="text-slate-600 dark:text-slate-400 line-clamp-3 text-xs sm:text-sm leading-relaxed font-medium">
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

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50/80 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 text-xs font-extrabold mb-2 border border-orange-200/80 dark:border-orange-900/60 backdrop-blur-md">
                              <Calendar className="w-3.5 h-3.5 text-orange-600" />
                              JADWAL ACARA
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Agenda</h2>
                          </div>
                          <Link
                            href="/agenda"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 bg-white/80 dark:bg-slate-900/70 border border-white/40 dark:border-white/10 hover:border-orange-300 transition-all shadow-xs backdrop-blur-md"
                          >
                            Semua &rarr;
                          </Link>
                        </div>

                        <div className="space-y-3">
                          {agendaList.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/70 border border-dashed border-slate-200/80 dark:border-slate-800 rounded-3xl backdrop-blur-md text-xs">
                              Belum ada agenda terbaru.
                            </div>
                          ) : (
                            agendaList.slice(0, 2).map((agenda) => {
                              const eventDate = new Date(agenda.eventDate || agenda.createdAt);
                              const day = eventDate.getDate().toString().padStart(2, '0');
                              const month = eventDate.toLocaleDateString('id-ID', { month: 'short' });

                              return (
                                <Link
                                  key={agenda.id}
                                  href="/agenda"
                                  className="flex gap-3.5 p-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/70 border border-white/40 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-800/80 shadow-xs hover:shadow-md transition-all duration-300 group cursor-pointer backdrop-blur-xl"
                                >
                                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                                    <span className="text-base font-black leading-none">{day}</span>
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider">{month}</span>
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-0.5 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate text-xs sm:text-sm">
                                      {agenda.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed font-medium">
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
                  </div>
                </div>
              </section>
            )
          }

          if (sectionKey === 'why_school') {
            return (
              <section key="why_school" id="keunggulan" className="py-12 sm:py-16 px-4 sm:px-8 lg:px-20 relative">
                <div className="max-w-6xl mx-auto space-y-10">
                  <div className="text-center max-w-3xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>KEUNGGULAN UTAMA SEKOLAH</span>
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {whySchoolTitle}
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {whySchoolSubtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(parsedWhySchoolFeatures.length > 0 ? parsedWhySchoolFeatures : [
                      {
                        id: 'def-1',
                        number: '1',
                        title: 'Sudah Terakreditasi A',
                        description: 'Predikat akreditasi Unggul "A" dari Badan Akreditasi Nasional Sekolah/Madrasah (BAN-S/M) dengan standar mutu pendidikan dan tata kelola teruji secara terstandar.',
                        tag: 'Mutu Terjamin & Berkelanjutan',
                        icon: 'CheckCircle2',
                        color: 'blue'
                      },
                      {
                        id: 'def-2',
                        number: '2',
                        title: 'Sekolah Unggul Muhammadiyah',
                        description: 'Pusat keunggulan pendidikan Islami berkemajuan yang membentuk karakter akhlakul karimah, kepemimpinan Hizbul Wathan, dan tradisi prestasi santri berdaya saing tinggi.',
                        tag: 'Karakter Islami Berkemajuan',
                        icon: 'Award',
                        color: 'amber'
                      },
                      {
                        id: 'def-3',
                        number: '3',
                        title: 'Kerjasama Nasional & Internasional',
                        description: 'Koneksi kemitraan luas dengan perguruan tinggi ternama, lembaga industri, sekolah sahabat luar negeri, dan jaringan muhammadiyah internasional untuk mobilitas siswa.',
                        tag: 'Jaringan Terbuka Global',
                        icon: 'Globe',
                        color: 'emerald'
                      },
                      {
                        id: 'def-4',
                        number: '4',
                        title: 'Pembelajaran Berbasis ICT',
                        description: 'Didukung sistem SIMASMUH, Smart Classroom, CBT terintegrasi, laboratorium komputer modern, serta pembelajaran interaktif yang mempersiapkan siswa era digital.',
                        tag: 'Digital Campus & Inovasi',
                        icon: 'Cpu',
                        color: 'cyan'
                      },
                      {
                        id: 'def-5',
                        number: '5',
                        title: 'Jumlah Program Siswa & Bakat Minat Lengkap',
                        description: `Tersedia ${programsCount} Program Peminatan Siswa serta ${extracurricularCount} cabang ekstrakulikuler aktif (Sains, Robotika, Seni Budaya, Olahraga, Keagamaan, Kepanduan HW, Tapak Suci, hingga Jurnalistik) yang mewadahi bakat setiap individu.`,
                        tag: `${programsCount} Program Unggulan • ${extracurricularCount} Ekstrakulikuler Aktif`,
                        icon: 'BookOpen',
                        color: 'purple'
                      }
                    ]).map((item, idx, arr) => {
                      const isLastSpanned = (arr.length % 3 === 2 && idx === arr.length - 1) || (arr.length === 5 && idx === 4)

                      let IconComponent = Award
                      if (item.icon === 'CheckCircle2') IconComponent = CheckCircle2
                      else if (item.icon === 'Globe') IconComponent = Globe
                      else if (item.icon === 'Cpu') IconComponent = Cpu
                      else if (item.icon === 'BookOpen') IconComponent = BookOpen
                      else if (item.icon === 'ShieldCheck') IconComponent = ShieldCheck

                      const colorMap: Record<string, { iconBg: string; textHover: string; borderHover: string; tagBadge: string }> = {
                        blue: {
                          iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
                          textHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
                          borderHover: 'hover:border-blue-400',
                          tagBadge: 'text-blue-600 dark:text-blue-400'
                        },
                        amber: {
                          iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white',
                          textHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
                          borderHover: 'hover:border-amber-400',
                          tagBadge: 'text-amber-600 dark:text-amber-400'
                        },
                        emerald: {
                          iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
                          textHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
                          borderHover: 'hover:border-emerald-400',
                          tagBadge: 'text-emerald-600 dark:text-emerald-400'
                        },
                        cyan: {
                          iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900/50 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white',
                          textHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
                          borderHover: 'hover:border-cyan-400',
                          tagBadge: 'text-cyan-600 dark:text-cyan-400'
                        },
                        purple: {
                          iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
                          textHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
                          borderHover: 'hover:border-purple-400',
                          tagBadge: 'text-purple-600 dark:text-purple-400'
                        },
                        rose: {
                          iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white',
                          textHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
                          borderHover: 'hover:border-rose-400',
                          tagBadge: 'text-rose-600 dark:text-rose-400'
                        }
                      }

                      const style = colorMap[item.color || 'blue'] || colorMap.blue

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-white/50 dark:border-slate-800 shadow-sm hover:shadow-xl ${style.borderHover} transition-all duration-300 group flex flex-col justify-between backdrop-blur-xl ${
                            isLastSpanned ? 'md:col-span-2 lg:col-span-2' : ''
                          }`}
                        >
                          <div className="space-y-3">
                            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all shadow-xs ${style.iconBg}`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <h3 className={`text-lg font-black text-slate-900 dark:text-white ${style.textHover} transition-colors`}>
                              {item.number ? `${item.number}. ` : ''}{item.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                              {item.description}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className={`text-[11px] font-bold ${style.tagBadge}`}>
                              {item.tag || 'Keunggulan Terstandar'}
                            </span>
                            {idx === arr.length - 1 && (
                              <a href="#program" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                Lihat Program &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          }

          if (sectionKey === 'programs') {
            return (
              <div key="programs" id="program" className="my-4 sm:my-8">
                <ProgramUnggulanSection initialPrograms={initialPrograms} />
              </div>
            )
          }

          if (sectionKey === 'media_social') {
            return (
              <section key="media_social" className="py-12 sm:py-16 px-4 sm:px-8 lg:px-20 bg-transparent transition-colors duration-300 relative">
                <div className="max-w-6xl mx-auto space-y-12">
                  <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold mb-1.5 border border-slate-200 dark:border-slate-700">
                          <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                          MEDIA &amp; DOKUMENTASI RESMI
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          Publikasi &amp; Kanal Digital SMA Muhipo
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Informasi kegiatan, liputan prestasi, video profil, dan dokumentasi akademik siswa secara berkala.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <a
                          href={youtubeChannelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs"
                        >
                          <YoutubeIcon className="w-4 h-4" />
                          <span>YouTube</span>
                        </a>
                        <a
                          href={instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-slate-700/60 shadow-xs"
                        >
                          <InstagramIcon className="w-4 h-4" />
                          <span>Instagram</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-600 shrink-0">
                              <YoutubeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                Video Profil SMA Muhipo
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                @SmaMuhipo • Kanal YouTube Resmi
                              </p>
                            </div>
                          </div>
                          <a
                            href={youtubeChannelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline"
                          >
                            <span>Buka Kanal</span>
                            <span aria-hidden="true">&rarr;</span>
                          </a>
                        </div>

                        {(() => {
                          let embedSrc = 'https://www.youtube.com/embed/McKO7tTyIHQ'
                          if (youtubeVideoEmbedUrl) {
                            if (youtubeVideoEmbedUrl.includes('youtube.com/embed/')) {
                              embedSrc = youtubeVideoEmbedUrl
                            } else {
                              const match = youtubeVideoEmbedUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
                              if (match && match[2].length === 11) {
                                embedSrc = `https://www.youtube.com/embed/${match[2]}`
                              }
                            }
                          }
                          return (
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-950 shadow-inner">
                              <iframe
                                src={embedSrc}
                                title="Video Profil SMA Muhammadiyah 1 Ponorogo"
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-pink-600/10 border border-pink-500/20 flex items-center justify-center text-pink-600 shrink-0">
                              <InstagramIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                                Postingan Instagram Terbaru
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                @smamuhipo.official • Akun Instagram Resmi
                              </p>
                            </div>
                          </div>
                          <a
                            href={parsedInstagramPosts.length > 0 ? parsedInstagramPosts[0].url : (instagramFeedUrl || instagramUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline"
                          >
                            <span>Lihat di IG</span>
                            <span aria-hidden="true">&rarr;</span>
                          </a>
                        </div>

                        {(() => {
                          const displayPosts = parsedInstagramPosts.length > 0
                            ? parsedInstagramPosts.slice(0, 6)
                            : [
                                {
                                  id: 'default-ig-1',
                                  url: instagramFeedUrl || instagramUrl || 'https://www.instagram.com/smamuhipo.official/',
                                  caption: 'Dokumentasi Kegiatan & Informasi Terkini SMA Muhammadiyah 1 Ponorogo',
                                  date: 'Terbaru',
                                  imageUrl: undefined
                                }
                              ]

                          const gridColsClass = displayPosts.length === 1
                            ? 'grid-cols-1'
                            : displayPosts.length === 2
                            ? 'grid-cols-1 sm:grid-cols-2'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

                          return (
                            <div className="space-y-3">
                              <div className={`grid ${gridColsClass} gap-2.5`}>
                                {displayPosts.map((post, idx) => {
                                  const cleanIgUrl = post.url.split('?')[0].replace(/\/+$/, '')
                                  const rawThumb = post.imageUrl || (post.url.includes('/p/') || post.url.includes('/reel/') ? `${cleanIgUrl}/media/?size=m` : null)
                                  const thumbnailSrc = rawThumb ? `/api/instagram-proxy?url=${encodeURIComponent(rawThumb)}` : null

                                  return (
                                    <a
                                      key={post.id || `ig-item-${idx}`}
                                      href={post.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group/post relative rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 overflow-hidden hover:border-pink-500/50 hover:shadow-md transition-all flex flex-col justify-between"
                                    >
                                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                        {thumbnailSrc ? (
                                          <img
                                            src={thumbnailSrc}
                                            alt={post.caption}
                                            className="w-full h-full object-cover object-center group-hover/post:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-pink-600 via-purple-700 to-indigo-900 flex items-center justify-center p-3 text-center">
                                            <InstagramIcon className="w-8 h-8 text-white/70" />
                                          </div>
                                        )}

                                        <div className="absolute top-2 right-2 pointer-events-none">
                                          <span className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                                            <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
                                          </span>
                                        </div>
                                      </div>

                                      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover/post:text-pink-600 dark:group-hover/post:text-pink-400 transition-colors">
                                          {post.caption}
                                        </p>

                                        <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-[10px]">
                                          <span className="text-slate-400 font-mono truncate max-w-[120px]">
                                            smamuhipo
                                          </span>
                                          <span className="font-extrabold text-pink-600 dark:text-pink-400 inline-flex items-center gap-0.5">
                                            <span>Buka</span>
                                            <span aria-hidden="true">&rarr;</span>
                                          </span>
                                        </div>
                                      </div>
                                    </a>
                                  )
                                })}
                              </div>

                              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-medium">
                                  {parsedInstagramPosts.length > 0 ? `${parsedInstagramPosts.length} Postingan Disinkronkan` : 'Akun Resmi Instagram'}
                                </span>
                                <a
                                  href={instagramUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-slate-700 dark:text-slate-300 hover:text-pink-600 dark:hover:text-pink-400 inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>Kunjungi Profil @smamuhipo.official</span>
                                  <span aria-hidden="true">&rarr;</span>
                                </a>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          }

          return null
        })}
      </main>

      {/* Footer Links Section */}
      <footer className="bg-slate-900 text-slate-300 pt-12 sm:pt-16 pb-12 px-4 sm:px-8 lg:px-20 border-t-4 border-[#F58F2A]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <Image src="/logos/pic_logo.png" alt="Logo" width={150} height={50} className="object-contain bg-white p-2 rounded-xl mb-5 shadow-xs" />
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400 mb-4">
              Mewujudkan generasi Islami yang cerdas, berkarakter, dan siap menghadapi tantangan global melalui pendidikan yang berkemajuan.
            </p>
            {/* Social Icons in Footer */}
            <div className="flex items-center gap-2.5">
              <a
                href="https://www.youtube.com/@SmaMuhipo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white flex items-center justify-center transition-colors border border-red-500/30"
                title="YouTube @SmaMuhipo"
              >
                <YoutubeIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/smamuhipo.official/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white flex items-center justify-center transition-colors border border-pink-500/30"
                title="Instagram @smamuhipo.official"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            </div>
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
