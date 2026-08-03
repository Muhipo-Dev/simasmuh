import Image from 'next/image';
import Link from 'next/link';
import { Calendar, LogIn, Menu, MapPin, Phone, Mail, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

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

import { getPublicApiUrl } from '@/lib/api-config';

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

  const agendaList = announcements
    .filter((a) => a.type === 'AGENDA')
    .sort((a, b) => new Date(a.eventDate || a.createdAt).getTime() - new Date(b.eventDate || b.createdAt).getTime())

  const address = settings?.address || 'Jl. Batoro Katong No. 123, Ponorogo, Jawa Timur'
  const phone = settings?.phone || '(0352) 123456'
  const email = settings?.email || 'info@smamuhipo.sch.id'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="h-20 bg-white flex items-center justify-between px-6 lg:px-12 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/pic_logo.png"
              alt="Logo"
              width={150}
              height={50}
              className="object-contain h-12 w-auto"
            />
          </Link>
        </div>
        <div className="hidden lg:flex items-center gap-8">
          <Link href="/" className="text-slate-600 hover:text-[#2B50A1] font-medium transition-colors">Beranda</Link>
          <Link href="/profil" className="text-slate-600 hover:text-[#2B50A1] font-medium transition-colors">Profil</Link>
          <Link href="/tentang" className="text-slate-600 hover:text-[#2B50A1] font-medium transition-colors">Tentang</Link>
          <Link href="/berita" className="text-slate-600 hover:text-[#2B50A1] font-medium transition-colors">Berita</Link>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
            <Link href="/login" className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white px-6 py-2.5 rounded-full font-medium flex items-center transition-colors shadow-sm">
              <LogIn className="w-4 h-4 mr-2" />
              Login SIMASMUH
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white rounded-md w-12 h-12 p-0 flex items-center justify-center">
              <Menu className="h-6 w-6" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 mt-2 bg-white p-2">
              <DropdownMenuItem>
                <Link href="/" className="w-full cursor-pointer py-3 px-4 text-base rounded-md">Beranda</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/profil" className="w-full cursor-pointer py-3 px-4 text-base rounded-md">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/tentang" className="w-full cursor-pointer py-3 px-4 text-base rounded-md">Tentang</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/berita" className="w-full cursor-pointer py-3 px-4 text-base rounded-md">Berita</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem>
                <Link href="/login" className="w-full cursor-pointer py-3 px-4 text-base font-semibold text-white bg-[#2B50A1] hover:bg-[#1f3c7a] rounded-md flex items-center justify-center">
                  <LogIn className="w-4 h-4 mr-2" />
                  Login SIMASMUH
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col py-12 px-6 lg:px-20 bg-slate-50">
        <div className="max-w-4xl mx-auto w-full">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6">
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Beranda
          </Link>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Agenda Sekolah</h1>
                <p className="text-slate-500 mt-1">Daftar agenda dan kegiatan sekolah terdekat.</p>
              </div>
            </div>

            <div className="space-y-8">
              {agendaList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-lg font-medium text-slate-900">Belum ada agenda</p>
                  <p>Tidak ada agenda sekolah yang dijadwalkan dalam waktu dekat.</p>
                </div>
              ) : (
                agendaList.map((agenda) => {
                  const eventDate = new Date(agenda.eventDate || agenda.createdAt);
                  const day = eventDate.getDate().toString().padStart(2, '0');
                  const month = eventDate.toLocaleDateString('id-ID', { month: 'short' });
                  const fullDate = eventDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  
                  return (
                    <div key={agenda.id} className="flex flex-col sm:flex-row gap-4 sm:gap-6 group bg-slate-50 p-5 sm:p-6 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors">
                      <div className="flex flex-row sm:flex-col items-center justify-center sm:w-20 px-4 sm:px-0 py-3 sm:h-20 rounded-xl bg-white text-orange-600 shrink-0 shadow-sm border border-orange-100 group-hover:bg-orange-500 group-hover:text-white transition-colors gap-2 sm:gap-0">
                        <span className="text-xl sm:text-2xl font-bold leading-none sm:mb-1">{day}</span>
                        <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">{month}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">{agenda.title}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-3 font-medium">
                          <Calendar className="w-4 h-4 text-orange-500" /> {fullDate}
                        </p>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {agenda.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
              <li><Link href="/akademik" className="hover:text-white transition-colors">Informasi Akademik</Link></li>
              <li><Link href="/ppdb" className="hover:text-white transition-colors">Penerimaan Siswa Baru</Link></li>
              <li><Link href="/kontak" className="hover:text-white transition-colors">Hubungi Kami</Link></li>
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
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                  <span>{phone}</span>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                  <span>{email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </footer>

      {/* Always-on-top Sticky/Fixed Copyright Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 text-slate-300 backdrop-blur-xl border-t border-slate-800/80 py-3.5 pb-6 sm:pb-7 px-6 lg:px-20 shadow-[0_-6px_20px_rgba(0,0,0,0.4)] transition-all duration-300">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Copyright &copy; 2026 - Muhipo Dev
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <Link href="#" className="hover:text-white hover:underline transition-all">Kebijakan Privasi</Link>
            <Link href="#" className="hover:text-white hover:underline transition-all">Syarat &amp; Ketentuan</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
