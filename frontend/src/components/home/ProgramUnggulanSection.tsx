'use client'

import { useState } from 'react'
import { ArrowRight, BookOpen, Globe, Cpu, Briefcase, Music, Microscope, Sparkles, CheckCircle2, X, PhoneCall } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Program = {
  id: string
  title: string
  subtitle: string
  description: string
  fullContent: string
  features: string[]
  icon: any
  badgeColor: string
  iconBg: string
  iconText: string
  buttonText: string
}

export default function ProgramUnggulanSection() {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  const programs: Program[] = [
    {
      id: 'tahfidz',
      title: 'Kelas Tahfidz',
      subtitle: 'Mencetak Generasi Penghafal Al-Qur\'an Berakhlak Mulia',
      description: 'Program intensif menghafal Al-Qur\'an yang terintegrasi dengan pembelajaran, didukung pembinaan khusus dan peluang beasiswa di perguruan tinggi Muhammadiyah.',
      fullContent: 'Program Kelas Tahfidz SMA MUHIPO dirancang khusus bagi siswa yang ingin mendalami dan menghafal Al-Qur\'an tanpa mengesampingkan prestasi akademik sekolah. Pembinaan dilakukan secara terstruktur dengan metode talaqqi dan murojaah harian.',
      features: [
        'Target hafalan 5 hingga 30 Juz Al-Qur\'an',
        'Bimbingan Ustadz & Ustadzah tersertifikasi Sanad',
        'Karantina Tahfidz & Tasmi\' publik berkala',
        'Jalur Beasiswa khusus ke PTN & Perguruan Tinggi Muhammadiyah'
      ],
      icon: BookOpen,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      iconBg: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
      iconText: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
      buttonText: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'mic',
      title: 'Muhipo International Class (MIC)',
      subtitle: 'Pendidikan Berwawasan Global dengan Kurikulum Internasional',
      description: 'Pembelajaran berwawasan global dengan kurikulum internasional, fokus pada Bahasa Inggris, pertukaran budaya, dan studi ke luar negeri.',
      fullContent: 'MIC menyiapkan siswa memiliki daya saing internasional. Siswa dibiasakan berkomunikasi dalam Bahasa Inggris aktif, mengikuti simulasi internasional, serta dibimbing untuk meraih skor TOEFL/IELTS tinggi.',
      features: [
        'Mentoring intensif bersama Native Speaker',
        'Pembiasaan Bilingual Class (English & Bahasa Indonesia)',
        'Program Student Exchange & Sister School Partnership',
        'Pendampingan khusus persiapan beasiswa kuliah ke luar negeri'
      ],
      icon: Globe,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
      iconText: 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300',
      buttonText: 'text-indigo-500 dark:text-indigo-400'
    },
    {
      id: 'ai',
      title: 'Artificial Intelligence (AI)',
      subtitle: 'Mengeksplorasi Teknologi Masa Depan & Pemrograman Kecerdasan Buatan',
      description: 'Program modern yang menjawab tantangan era digital dengan membekali siswa konsep pemrograman dan aplikasi praktis kecerdasan buatan.',
      fullContent: 'Program AI SMA MUHIPO mengenalkan siswa pada dunia logika komputasi, dasar algoritma, bahasa pemrograman Python, serta penerapan praktis machine learning untuk menyelesaikan masalah kehidupan nyata.',
      features: [
        'Praktik Coding & Pengembangan Aplikasi berbasis AI',
        'Fasilitas Laboratorium Komputer spesifikasi tinggi',
        'Pembinaan khusus Olimpiade Sains Nasional (OSN) bidang Informatika',
        'Pelatihan Etika & Penggunaan Generative AI secara bijak'
      ],
      icon: Cpu,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
      iconText: 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300',
      buttonText: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'entrepreneur',
      title: 'Kelas Entrepreneur',
      subtitle: 'Membangun Jiwa Wirausaha Muda yang Mandiri & Inovatif',
      description: 'Mencetak jiwa kewirausahaan siswa melalui praktik bisnis nyata, pembekalan strategi usaha, dan kemandirian finansial sejak dini.',
      fullContent: 'Melalui Kelas Entrepreneur, siswa diajak mengalami perjalanan berbisnis mulai dari ideasi produk, analisa pasar, branding, pemasaran digital, hingga manajemen keuangan usaha.',
      features: [
        'Praktik Business Plan & Product Pitching',
        'Mentoring langsung dari pengusaha & praktisi UMKM sukses',
        'Pameran karya siswa (Muhipo Business Expo)',
        'Pengelolaan Business Unit Sekolah'
      ],
      icon: Briefcase,
      badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
      iconBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white',
      iconText: 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300',
      buttonText: 'text-orange-500 dark:text-orange-400'
    },
    {
      id: 'tari',
      title: 'Seni Tari & Budaya',
      subtitle: 'Melestarikan Budaya Bangsa Melalui Karya Seni Pertunjukan',
      description: 'Wadah pengembangan bakat seni tari tradisional hingga modern, melestarikan budaya dan berprestasi di kancah nasional maupun internasional.',
      fullContent: 'Ponorogo terkenal dengan kaya akan seni budaya. Program Seni Tari SMA MUHIPO memfasilitasi ekspresi bakat siswa dalam bidang tari tradisional (termasuk Reog Ponorogo), tari kreasi baru, dan seni pertunjukan.',
      features: [
        'Koreografer & Pelatih Seni profesional',
        'Fasilitas Studio Seni Tari khusus yang memadai',
        'Keikutsertaan dalam Festival Seni & Lomba Tingkat Nasional',
        'Pengembangan karakter percaya diri dan apresiasi budaya'
      ],
      icon: Music,
      badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
      iconBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-500 dark:text-pink-400 group-hover:bg-pink-500 group-hover:text-white',
      iconText: 'text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300',
      buttonText: 'text-pink-500 dark:text-pink-400'
    },
    {
      id: 'saintek',
      title: 'Kelas Saintek & Soshum',
      subtitle: 'Pembinaan Akademik Intensif Menuju PTN Impian (SNBP & SNBT)',
      description: 'Program peminatan komprehensif yang menyiapkan siswa masuk ke perguruan tinggi favorit melalui pembinaan intensif akademik sains dan sosial.',
      fullContent: 'Fokus utama Kelas Saintek & Soshum adalah menghantarkan siswa lulus ke Perguruan Tinggi Negeri (PTN) favorit. Materi dirancang mendalam sesuai standar UTBK SNBT dan asesmen universitas.',
      features: [
        'Try Out UTBK-SNBT rutin bekerjasama dengan Bimbel Nasional',
        'Konsultasi pemetaan minat & strategi lolos PTN',
        'Klinik Belajar & Pemantapan Soal Harian',
        'Bimbingan Lomba OSN MIPA & Penelitian Remaja (KIR)'
      ],
      icon: Microscope,
      badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white',
      iconText: 'text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300',
      buttonText: 'text-cyan-500 dark:text-cyan-400'
    }
  ]

  return (
    <section className="pt-16 sm:pt-20 pb-16 md:pb-24 px-4 sm:px-8 lg:px-20 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-extrabold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Keunggulan Pendidikan SMA MUHIPO
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Program Unggulan
          </h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto text-base sm:text-lg">
            Berbagai program pendidikan terbaik untuk mencetak generasi yang cerdas, mandiri, berprestasi, dan mendunia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {programs.map((prog) => {
            const IconComp = prog.icon
            return (
              <div 
                key={prog.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-100 dark:border-slate-700/60 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-xs ${prog.iconBg}`}>
                    <IconComp className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {prog.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm sm:text-base leading-relaxed">
                    {prog.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProgram(prog)}
                  className={`font-bold text-sm flex items-center transition-colors cursor-pointer group-hover:translate-x-0.5 ${prog.buttonText}`}
                >
                  Pelajari Lebih Lanjut <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <Dialog open={!!selectedProgram} onOpenChange={(open) => !open && setSelectedProgram(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
            <DialogHeader className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedProgram.iconBg}`}>
                  {(() => {
                    const IconComponent = selectedProgram.icon
                    return <IconComponent className="w-6 h-6" />
                  })()}
                </div>
                <div>
                  <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase ${selectedProgram.badgeColor}`}>
                    Program Unggulan
                  </span>
                  <DialogTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedProgram.title}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {selectedProgram.subtitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
                {selectedProgram.fullContent}
              </p>

              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  Fasilitas &amp; Keunggulan Utama
                </h4>
                <ul className="space-y-2.5">
                  {selectedProgram.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedProgram(null)} className="w-full sm:w-auto font-bold rounded-xl">
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
