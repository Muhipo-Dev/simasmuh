import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, LogIn, Menu, Users, GraduationCap, Award, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNavbar, AppFooter } from '@/components/layout'

export const metadata = {
  title: "Guru & Karyawan - SMA MUHIPO",
  description: "Daftar Guru dan Karyawan SMA Muhammadiyah 1 Ponorogo",
}

interface StaffMember {
  name: string
  role: string
  position?: string
}

const kepalaSekolah: StaffMember = {
  name: "Sugeng Riadi, M.A.",
  role: "Kepala",
  position: "SMA Muhammadiyah 1 Ponorogo",
}

const wakasek: StaffMember[] = [
  { name: "Anik Yulaika, M.Pd.", role: "Guru Bahasa Inggris", position: "Wakil Kepala Sekolah Bidang Kurikulum" },
  { name: "Anton Mukminin, M.Pd.", role: "Guru PAI", position: "Wakil Kepala Sekolah Bidang Sarana dan Prasarana" },
  { name: "Fahrur Roji, S.Pd.", role: "Guru PAI", position: "Wakil Kepala Sekolah ISMUBA" },
  { name: "Deny Nofita, S.Pd.", role: "Guru Sejarah", position: "Wakil Kepala Sekolah Bidang Humas dan SDM" },
  { name: "Didik, S.Pd.", role: "Guru PKN", position: "Wakil Kepala Sekolah Bidang Kesiswaan" },
]

interface GuruCategory {
  label: string
  icon: string
  members: StaffMember[]
}

const guruCategories: GuruCategory[] = [
  {
    label: "Guru Bahasa",
    icon: "📚",
    members: [
      { name: "Dina Zulfatul Laily, S.Pd.", role: "Guru Bahasa Indonesia" },
      { name: "Pambajeng Yudo H., M.Pd.", role: "Guru Bahasa Indonesia" },
      { name: "Dra. Dian Aksanti, M.Pd.", role: "Guru Bahasa Indonesia" },
      { name: "Budi Santosa, S.Pd.", role: "Guru Bahasa Inggris" },
      { name: "Noviana Kusumaningsih, S.Pd.", role: "Guru Bahasa Inggris" },
      { name: "Siti Jannatussholihah, M.Pd.", role: "Guru Bahasa Inggris" },
      { name: "Anis Syarofah, S.Pd.I.", role: "Guru Bahasa Arab" },
      { name: "Nazihah Khawa'ijul F., S.Pd.", role: "Guru Bahasa Arab" },
      { name: "Istanti Fatkhul Jannah, M.Pd.", role: "Guru Bahasa Jawa" },
      { name: "Gayuh Risdian Saputro, M.Pd.", role: "Guru Bahasa Jawa" },
    ],
  },
  {
    label: "Guru MIPA",
    icon: "🔬",
    members: [
      { name: "Fajar Andika, S.Pd.", role: "Guru Matematika" },
      { name: "Fuad Arianto, S.Pd.", role: "Guru Matematika" },
      { name: "Yuliana Nur Amini, S.Pd.", role: "Guru Matematika" },
      { name: "Endang Amaliana Fatma Y., S.Pd.", role: "Guru Fisika" },
      { name: "Ina Nurhidayati, S.Pd., M.Si.", role: "Guru Fisika" },
      { name: "Cut Aulia Nora Sakinah, S.Pd.", role: "Guru Kimia" },
      { name: "Latiful Atfiyah, M.Pd.", role: "Guru Kimia" },
      { name: "Eny Triyo Handayani, S.Pd.", role: "Guru Biologi" },
      { name: "drh. Moch Sachrur Rochman", role: "Guru Biologi" },
    ],
  },
  {
    label: "Guru IPS",
    icon: "🌍",
    members: [
      { name: "Wahyu Imam Rohmadi, S.Pd.", role: "Guru Ekonomi/PKW" },
      { name: "Yuli Nurhadi Wibawa, S.E.", role: "Guru Ekonomi" },
      { name: "Safri Chandra Waskita, S.Pd.", role: "Guru Sejarah" },
      { name: "Nofi Rohmatul Laili, S.Sos.", role: "Guru Sosiologi" },
      { name: "Ellisa Septiani Ashar, S.Pd.", role: "Guru Geografi" },
      { name: "Diaz Marisca Putry S., S.Pd.", role: "Guru IPS" },
      { name: "Rima Fridayanti, S.Sosio.", role: "Guru IPS" },
    ],
  },
  {
    label: "Bimbingan Konseling",
    icon: "🤝",
    members: [
      { name: "Dwi Siluk Maharani, S.Psi.", role: "Bimbingan dan Konseling Pendidikan (BKP)" },
      { name: "Greatta Pujalarasaty, S.Pd.", role: "Bimbingan dan Konseling Pendidikan (BKP)" },
      { name: "Shofi Firdaus, S.Psi.", role: "Bimbingan dan Konseling Pendidikan (BKP)" },
    ],
  },
  {
    label: "Guru TIK",
    icon: "💻",
    members: [
      { name: "Wijarnarko Adi Susetyo, S.Si.", role: "Guru TIK" },
      { name: "Muh. Nailar Raza, S.Kom.", role: "Guru TIK" },
    ],
  },
  {
    label: "Guru PJOK",
    icon: "⚽",
    members: [
      { name: "Bramanda Zain Atmoko, S.Pd.", role: "Guru PJOK" },
      { name: "Joko Subagyo, S.Pd.", role: "Guru PJOK" },
    ],
  },
  {
    label: "Guru Seni",
    icon: "🎨",
    members: [
      { name: "Srianing, S.Pd.", role: "Guru Seni" },
      { name: "Dyah Ayu Ambarsari, S.Sn.", role: "Guru Seni Tari & PKWU" },
      { name: "Regita Ayu Apprinidrasari, S.Pd.", role: "Guru Seni Tari" },
      { name: "Sigid Bima Wisnu, S.Sn.", role: "Guru Seni Tari" },
    ],
  },
  {
    label: "Guru PKN",
    icon: "🏛️",
    members: [
      { name: "Vaola Ari Sandi, S.Pd.", role: "Guru PKN" },
    ],
  },
  {
    label: "Kemuhammadiyahan & PAI",
    icon: "☪️",
    members: [
      { name: "Muh. Kholil, M.Pd.I", role: "Guru Al-Islam" },
      { name: "Bunan Saudah, S.Pd.", role: "Guru Kemuhammadiyahan" },
      { name: "M. Akbar Abdullah M., Lc.", role: "Guru PAI" },
    ],
  },
]

const staffList: StaffMember[] = [
  { name: "Agung Tribowo, S.E.", role: "Kepala Biro Administrasi Keuangan (BAK)" },
  { name: "Mulyani, S.Kom.", role: "Kepala Biro Administrasi Umum (BAU)/Operator Sekolah" },
  { name: "Rudi Setyono", role: "Kepala Biro Kerumahtanggaan" },
  { name: "Ervina Maghdalena, S.Pd.", role: "Staf Biro Administrasi Keuangan (BAK)" },
  { name: "Yuli Budi Arsih, A.Md.", role: "Staf Biro Administrasi Keuangan (BAK)" },
  { name: "Muhammad Afifurrouf, ST.", role: "Staf Biro Administrasi Umum (BAU)" },
  { name: "Uun Yulianti", role: "Staf Biro Administrasi Umum (BAU)" },
  { name: "Joko Susanto", role: "Staf Biro Administrasi Umum (BAU)" },
  { name: "Anis Rochani, S.Si.", role: "Staf Laboratorium IPA" },
  { name: "Mamba'un Ni'am K. F., S.Kom", role: "Staf Lab. Komputer & Dokumentasi" },
  { name: "Naza Nur 'Ulummi", role: "Staf Perpustakaan" },
  { name: "Imam Mudzakar, S.Pd.I.", role: "Ust. Ma'had Al-Kahfi" },
  { name: "Suprajitno", role: "Petugas Piket Akademik" },
  { name: "Tri Restu Handayani", role: "Karyawan Muhipo Mart" },
  { name: "Nelly Wahyuningtyas", role: "Karyawan Muhipo Mart" },
  { name: "Moh. Agus Hardianto", role: "Tenaga Kebersihan" },
  { name: "Ahmad Darmawan", role: "Tenaga Kebersihan" },
  { name: "Eka Wahyu Agung", role: "Tenaga Kebersihan" },
  { name: "Sartono", role: "Tenaga Kebersihan" },
  { name: "Sutrisno", role: "Tenaga Kebersihan" },
]

function getInitials(name: string) {
  return name
    .replace(/,.*$/, '')
    .replace(/S\.Pd\.|M\.Pd\.|S\.Psi\.|M\.A\.|S\.E\.|S\.Si\.|S\.Sn\.|M\.Si\.|S\.Sos\.|S\.Pd\.I\.|M\.Pd\.I|Dra\.|drh\.|S\.Kom\.|ST\.|A\.Md\.|Lc\.|S\.Sosio\./g, '')
    .trim()
    .split(' ')
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

const avatarColors = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-pink-600',
  'from-lime-500 to-green-600',
  'from-red-500 to-rose-600',
  'from-teal-500 to-emerald-600',
]

const categoryColors = [
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-violet-600 to-purple-600',
  'from-cyan-600 to-sky-600',
  'from-lime-600 to-green-600',
  'from-rose-500 to-pink-600',
  'from-red-600 to-rose-600',
  'from-teal-600 to-emerald-600',
]

const totalGuru = guruCategories.reduce((sum, cat) => sum + cat.members.length, 0)

export default function GuruKaryawanPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Navbar Induk Terpadu */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Header */}
        <section className="relative bg-gradient-to-br from-[#1e3b7a] via-[#2B50A1] to-[#1e3b7a] py-16 sm:py-24 px-4 sm:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0zMHY2aC02VjRoNnptMCAxMHY2aC02di02aDZ6bTAgMTB2NmgtNnYtNmg2em0tMTAgMHY2aC02di02aDZ6bS0xMCAwdjZINnYtNmg2em0yMCAwdjZoLTZ2LTZoNnptMTAgMHY2aC02di02aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-bold mb-6">
              <Users className="w-4 h-4" />
              SMA Muhammadiyah 1 Ponorogo
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4">
              Guru & Karyawan
            </h1>
            <p className="text-blue-100/80 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-6">
              Tenaga pendidik dan kependidikan yang berdedikasi tinggi dalam mewujudkan pendidikan berkualitas di SMA Muhammadiyah 1 Ponorogo.
            </p>
            <div className="flex items-center justify-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span className="font-bold">{totalGuru} Guru</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/40" />
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="font-bold">{staffList.length} Staff & Karyawan</span>
              </div>
            </div>
          </div>
        </section>

        {/* Kepala Sekolah Section */}
        <section className="py-12 sm:py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-xs font-extrabold mb-3 border border-amber-100 dark:border-amber-900/60">
                <Award className="w-3.5 h-3.5" />
                PIMPINAN SEKOLAH
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Kepala Sekolah & Wakil Kepala Sekolah
              </h2>
            </div>

            {/* Kepala Sekolah Card */}
            <div className="flex justify-center mb-10">
              <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 max-w-sm w-full">
                <div className="h-40 bg-gradient-to-br from-[#1e3b7a] via-[#2B50A1] to-blue-600 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute -bottom-1 left-0 right-0 h-8 bg-white dark:bg-slate-900 rounded-t-[2rem]" />
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-full bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                      Kepala Sekolah
                    </span>
                  </div>
                </div>
                <div className="relative -mt-16 flex flex-col items-center px-6 pb-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-amber-500/20 ring-4 ring-white dark:ring-slate-900 mb-4">
                    {getInitials(kepalaSekolah.name)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">{kepalaSekolah.name}</h3>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">{kepalaSekolah.role}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{kepalaSekolah.position}</p>
                </div>
              </div>
            </div>

            {/* Wakil Kepala Sekolah Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {wakasek.map((waka, index) => (
                <div key={index} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  <div className="h-3 bg-gradient-to-r from-[#2B50A1] to-blue-600" />
                  <div className="p-5 flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColors[index % avatarColors.length]} text-white flex items-center justify-center text-lg font-black shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      {getInitials(waka.name)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{waka.name}</h3>
                    <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1.5 italic">{waka.role}</p>
                    <div className="mt-3 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 leading-tight">{waka.position}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Separator */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Guru Section - Categorized */}
        <section className="py-12 sm:py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-extrabold mb-3 border border-blue-100 dark:border-blue-900/60">
                <GraduationCap className="w-3.5 h-3.5" />
                TENAGA PENDIDIK
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Daftar Guru
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {totalGuru} Guru Pengajar SMA Muhammadiyah 1 Ponorogo
              </p>
            </div>

            <div className="space-y-10">
              {guruCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${categoryColors[catIndex % categoryColors.length]} text-white flex items-center justify-center text-lg shadow-md`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{category.label}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{category.members.length} orang</p>
                    </div>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800 ml-3" />
                  </div>

                  {/* Category Members Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
                    {category.members.map((guru, index) => (
                      <div key={index} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                        <div className="p-4 flex flex-col items-center text-center">
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${avatarColors[(catIndex * 3 + index) % avatarColors.length]} text-white flex items-center justify-center text-base sm:text-lg font-black shadow-md group-hover:scale-110 transition-transform duration-300 mb-3`}>
                            {getInitials(guru.name)}
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">{guru.name}</h3>
                          <p className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1.5 italic leading-tight">{guru.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Separator */}
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="border-t border-slate-200 dark:border-slate-800" />
        </div>

        {/* Staff & Karyawan Section */}
        <section className="py-12 sm:py-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold mb-3 border border-emerald-100 dark:border-emerald-900/60">
                <Briefcase className="w-3.5 h-3.5" />
                TENAGA KEPENDIDIKAN
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Staff & Karyawan
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {staffList.length} Tenaga Kependidikan SMA Muhammadiyah 1 Ponorogo
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {staffList.map((staff, index) => (
                <div key={index} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
                  <div className="p-4 flex flex-col items-center text-center">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${avatarColors[index % avatarColors.length]} text-white flex items-center justify-center text-base sm:text-lg font-black shadow-md group-hover:scale-110 transition-transform duration-300 mb-3`}>
                      {getInitials(staff.name)}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">{staff.name}</h3>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 italic leading-tight">{staff.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Back Button */}
        <section className="pb-12 sm:pb-16 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto flex justify-center">
            <Link href="/">
              <Button className="bg-[#2B50A1] hover:bg-[#1f3c7a] text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Copyright Bar */}
      <AppFooter />
    </div>
  )
}
