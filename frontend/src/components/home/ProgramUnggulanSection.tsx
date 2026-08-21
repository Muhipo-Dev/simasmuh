'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, BookOpen, Globe, Cpu, Briefcase, Music, Microscope,
  Sparkles, CheckCircle2, Dumbbell, Heart, Moon, GraduationCap
} from 'lucide-react'
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
      fullContent: 'Program Kelas Tahfidz SMA MUHIPO Bekerja Sama dengan Pondok Aisyah Quranic Boarding Shool dan PPTQ Ahmad Dahlan, dirancang khusus bagi siswa yang mendalami dan menghafal Al-Qur\'an tanpa mengesampingkan prestasi akademik sekolah. Pembinaan dilakukan secara terstruktur dengan metode talaqqi dan murojaah harian.',
      features: [
        'Dibimbing oleh Bimbingan Ustadz & Ustadzah tersertifikasi',
        'Siswa Siswi diluar Kerjasama PTQ Aisyiyah dan PPTQ Ahmad Dahlan, bermukim di Mahad Al-Kahfi',
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
        'Kurikulum Internasilan ACT Global Solution',
        'Pembiasaan Bilingual Class (English & Bahasa Indonesia)',
        'Program Student Exchange & Sister School Partnership',
        'Pendampingan khusus persiapan beasiswa kuliah ke luar negeri',
        'Program khusus Englishcamp dan bimbingan Toefl'
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
        'Fasilitas Laboratorium Komputer',
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
      title: 'Seni Budaya',
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
    },
    {
      id: 'olahraga',
      title: 'Kelas Olahraga',
      subtitle: 'Meraih Prestasi Olahraga Tingkat Nasional & Internasional',
      description: 'Program pembinaan atlet muda berprestasi yang mengintegrasikan latihan fisik terstruktur dengan pendidikan akademik berkualitas secara seimbang.',
      fullContent: 'Kelas Olahraga SMA MUHIPO hadir sebagai wadah bagi siswa berbakat di bidang olahraga untuk mengembangkan potensi atletis mereka secara maksimal. Program ini menggabungkan pelatihan fisik intensif di bawah bimbingan pelatih profesional bersertifikat dengan kegiatan akademik yang tetap terstruktur, sehingga siswa dapat berprestasi di keduanya.',
      features: [
        'Pelatih profesional bersertifikat nasional di berbagai cabang olahraga',
        'Fasilitas lapangan & sarana olahraga yang lengkap dan modern',
        'Program pembinaan fisik & mental atlet berprestasi',
        'Pendampingan menuju kejuaraan daerah, nasional, dan internasional',
        'Kerjasama dengan KONI & Induk Organisasi Olahraga',
        'Dukungan nutrisi & pemulihan atletik siswa'
      ],
      icon: Dumbbell,
      badgeColor: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
      iconBg: 'bg-lime-50 dark:bg-lime-950/60 text-lime-600 dark:text-lime-400 group-hover:bg-lime-600 group-hover:text-white',
      iconText: 'text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300',
      buttonText: 'text-lime-600 dark:text-lime-400'
    },
    {
      id: 'inklusi',
      title: 'Layanan Inklusi',
      subtitle: 'Pendidikan Berkeadilan untuk Semua – Tanpa Terkecuali',
      description: 'Layanan pendidikan inklusif yang memastikan setiap siswa, termasuk mereka yang berkebutuhan khusus, mendapat hak belajar yang setara dan bermartabat.',
      fullContent: 'Layanan Inklusi SMA MUHIPO mewujudkan komitmen sekolah dalam menghadirkan pendidikan yang berkeadilan dan humanis. Program ini dirancang untuk mendampingi siswa berkebutuhan khusus agar dapat belajar, berkembang, dan berprestasi bersama teman-teman sebayanya dalam lingkungan yang supportif dan bebas diskriminasi.',
      features: [
        'Guru Pendamping Khusus (GPK) tersertifikasi',
        'Asesmen awal & program belajar individual (PPI) yang dipersonalisasi',
        'Lingkungan belajar yang ramah dan aksesibel (barrier-free)',
        'Kerjasama dengan psikolog & tenaga ahli pendidikan luar biasa',
        'Sosialisasi nilai toleransi & keberagaman kepada seluruh warga sekolah',
        'Laporan perkembangan berkala kepada orang tua/wali'
      ],
      icon: Heart,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
      iconText: 'text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300',
      buttonText: 'text-rose-500 dark:text-rose-400'
    },
    {
      id: 'mahad',
      title: 'Mahad Al-Kahfi',
      subtitle: 'Pembinaan Karakter Islami dalam Lingkungan Pesantren Modern',
      description: 'Asrama boarding school berbasis pesantren modern yang membentuk karakter siswa melalui pembiasaan nilai-nilai Islam dalam keseharian yang terprogram.',
      fullContent: 'Mahad Al-Kahfi adalah fasilitas asrama (boarding) SMA MUHIPO yang dirancang sebagai pesantren modern di dalam lingkungan sekolah. Siswa yang bermukim di Mahad mendapatkan pembinaan karakter Islami secara menyeluruh melalui program harian yang terstruktur, mulai dari shalat berjamaah, kajian kitab, tahsin Al-Qur\'an, hingga kegiatan pengembangan diri.',
      features: [
        'Pembinaan karakter Islami 24 jam oleh Musyrif/Musyrifah',
        'Program tahsin, tahfidz, dan kajian kitab harian',
        'Fasilitas asrama bersih, nyaman, dan terpisah putra-putri',
        'Kegiatan ekstra kepesantrenan (Muhadharah, Mufradat, dsb.)',
        'Pembiasaan disiplin, kemandirian, dan hidup bersih',
        'Bimbingan akademik malam hari (halaqah belajar)'
      ],
      icon: Moon,
      badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
      iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white',
      iconText: 'text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300',
      buttonText: 'text-violet-600 dark:text-violet-400'
    },
    {
      id: 'pascasma',
      title: 'Program Persiapan Pasca SMA',
      subtitle: 'Mempersiapkan Siswa Menuju Dunia Perguruan Tinggi & Karier',
      description: 'Program komprehensif yang membekali siswa dengan strategi, keterampilan, dan mental untuk sukses memasuki jenjang pendidikan tinggi maupun dunia kerja.',
      fullContent: 'Program Persiapan Pasca SMA SMA MUHIPO hadir untuk memastikan setiap lulusan siap menghadapi tahap kehidupan berikutnya dengan percaya diri. Program ini mencakup bimbingan intensif seleksi perguruan tinggi (SNBP, SNBT, jalur mandiri), konseling karier, pembekalan soft skill profesional, serta pendampingan pengajuan beasiswa dalam dan luar negeri.',
      features: [
        'Bimbingan intensif SNBP, SNBT, dan jalur mandiri PTN/PTS',
        'Konseling karier & pemetaan minat-bakat berbasis asesmen',
        'Pelatihan wawancara, public speaking, & etika profesional',
        'Pendampingan penulisan esai & portofolio beasiswa',
        'Kerjasama dengan BKK (Bursa Kerja Khusus) untuk lulusan',
        'Sesi temu alumni & inspirasi dari tokoh profesional'
      ],
      icon: GraduationCap,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
      iconText: 'text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
      buttonText: 'text-amber-500 dark:text-amber-400'
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  }

  return (
    <section className="pt-16 sm:pt-20 pb-16 md:pb-24 px-4 sm:px-8 lg:px-12 bg-transparent transition-colors duration-300 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-72 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-10 sm:mb-14 space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-extrabold shadow-sm backdrop-blur-md transition-transform hover:scale-105">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
            Keunggulan Pendidikan SMA MUHIPO
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight drop-shadow-xs">
            Program Unggulan
          </h2>
          <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto text-base sm:text-lg text-center font-medium">
            Berbagai program pendidikan terbaik untuk mencetak generasi yang cerdas, mandiri, berprestasi, dan mendunia.
          </p>
        </motion.div>

        {/* Animated Staggered Grid: 2 col mobile → 3 col md → 5 col lg */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5"
        >
          {programs.map((prog) => {
            const IconComp = prog.icon
            return (
              <motion.div
                key={prog.id}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  transition: { duration: 0.25, ease: 'easeOut' }
                }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-2xl border border-white/50 dark:border-white/10 hover:border-blue-400/60 dark:hover:border-blue-500/50 transition-colors duration-300 group flex flex-col justify-between min-h-[230px] overflow-hidden"
              >
                {/* Glowing border highlight on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-indigo-500/0 to-blue-500/5 dark:to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Top shine line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md ${prog.iconBg}`}>
                    <IconComp className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {prog.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-4 font-medium">
                    {prog.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProgram(prog)}
                  className={`mt-4 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer relative z-10 group/btn ${prog.buttonText}`}
                >
                  <span>Selengkapnya</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1.5" />
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <Dialog open={!!selectedProgram} onOpenChange={(open) => !open && setSelectedProgram(null)}>
          <DialogContent className="w-[96vw] sm:w-[90vw] max-w-xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10">

            {/* Header */}
            <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3 sm:gap-5">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 ${selectedProgram.iconBg}`}>
                  {(() => {
                    const IconComponent = selectedProgram.icon
                    return <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-1.5 ${selectedProgram.badgeColor}`}>
                    Program Unggulan
                  </span>
                  <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {selectedProgram.title}
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                {selectedProgram.subtitle}
              </DialogDescription>
            </DialogHeader>

            {/* Body: single col mobile, 2-col desktop */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_380px] gap-5 lg:gap-8 pt-4 items-start">

              {/* Left: Deskripsi */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5">Deskripsi Program</h4>
                <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed text-justify">
                  {selectedProgram.fullContent}
                </p>
              </div>

              {/* Right: Features */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
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
            </div>

            {/* Footer */}
            <div className="pt-4 mt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedProgram(null)} className="font-bold rounded-xl px-7">
                Tutup
              </Button>
            </div>

          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
