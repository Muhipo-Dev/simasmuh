'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, BookOpen, Globe, Cpu, Briefcase, Music, Microscope, CheckCircle2, Dumbbell, Heart, Moon, GraduationCap, Award,
  Code, Layers, Compass, Rocket, Shield, Star
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const ICON_MAP: Record<string, any> = {
  BookOpen,
  Globe,
  Cpu,
  Briefcase,
  Music,
  Microscope,
  Dumbbell,
  Heart,
  Moon,
  GraduationCap,
  Award,
  Layers,
  Compass,
  Rocket,
  Shield,
  Star,
}

const COLOR_STYLES: Record<string, { badge: string; iconBg: string; iconText: string; buttonText: string }> = {
  blue: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    iconBg: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
    iconText: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
    buttonText: 'text-blue-600 dark:text-blue-400',
  },
  indigo: {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
    iconText: 'text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300',
    buttonText: 'text-indigo-500 dark:text-indigo-400',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
    iconText: 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300',
    buttonText: 'text-emerald-600 dark:text-emerald-400',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    iconBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white',
    iconText: 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300',
    buttonText: 'text-orange-500 dark:text-orange-400',
  },
  pink: {
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    iconBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-500 dark:text-pink-400 group-hover:bg-pink-500 group-hover:text-white',
    iconText: 'text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300',
    buttonText: 'text-pink-500 dark:text-pink-400',
  },
  cyan: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white',
    iconText: 'text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300',
    buttonText: 'text-cyan-500 dark:text-cyan-400',
  },
  lime: {
    badge: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
    iconBg: 'bg-lime-50 dark:bg-lime-950/60 text-lime-600 dark:text-lime-400 group-hover:bg-lime-600 group-hover:text-white',
    iconText: 'text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300',
    buttonText: 'text-lime-600 dark:text-lime-400',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
    iconText: 'text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300',
    buttonText: 'text-rose-500 dark:text-rose-400',
  },
  violet: {
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    iconBg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white',
    iconText: 'text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300',
    buttonText: 'text-violet-600 dark:text-violet-400',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
    iconText: 'text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
    buttonText: 'text-amber-500 dark:text-amber-400',
  },
}

export type RawProgramConfig = {
  id: string
  code: string
  name: string
  subtitle?: string | null
  description?: string | null
  fullContent?: string | null
  features?: string | null
  fasilitasList?: string | null
  keunggulanList?: string | null
  iconName?: string | null
  logoUrl?: string | null
  badgeColor?: string | null
  order?: number
  isVisible?: boolean
}

type ProcessedProgram = {
  id: string
  code: string
  title: string
  subtitle: string
  description: string
  fullContent: string
  features: string[]
  fasilitas: string[]
  keunggulan: string[]
  icon: any
  logoUrl?: string | null
  badgeColor: string
  iconBg: string
  iconText: string
  buttonText: string
}

export default function ProgramUnggulanSection({
  initialPrograms = [],
}: {
  initialPrograms?: RawProgramConfig[]
}) {
  const [selectedProgram, setSelectedProgram] = useState<ProcessedProgram | null>(null)

  const { data: rawPrograms = initialPrograms } = useQuery<RawProgramConfig[]>({
    queryKey: ['public-programs'],
    queryFn: async () => {
      const res = await fetch('/api-backend/settings/public/programs')
      if (!res.ok) return initialPrograms
      return res.json()
    },
    initialData: initialPrograms,
    staleTime: 60000,
  })

  const parseJsonOrLines = (val?: string | null): string[] => {
    if (!val) return []
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
      return [String(parsed)]
    } catch {
      return val.split('\n').map((s) => s.trim()).filter(Boolean)
    }
  }

  const programs = useMemo<ProcessedProgram[]>(() => {
    const list = rawPrograms && rawPrograms.length > 0 ? rawPrograms : initialPrograms
    return list.map((item, idx) => {
      const parsedGeneral = parseJsonOrLines(item.features)
      const parsedFasilitas = parseJsonOrLines(item.fasilitasList)
      const parsedKeunggulan = parseJsonOrLines(item.keunggulanList)

      const colorKey = item.badgeColor || 'blue'
      const colors = COLOR_STYLES[colorKey] || COLOR_STYLES.blue
      const IconComponent = (item.iconName && ICON_MAP[item.iconName]) ? ICON_MAP[item.iconName] : BookOpen

      return {
        id: item.id || item.code || String(idx),
        code: item.code,
        title: item.name,
        subtitle: item.subtitle || `Program Unggulan ${item.name}`,
        description: item.description || `Layanan program pendidikan ${item.name} di SMA Muhammadiyah 1 Ponorogo.`,
        fullContent: item.fullContent || item.description || `Program ${item.name} merupakan bagian dari kurikulum pembinaan unggulan di SMA Muhammadiyah 1 Ponorogo.`,
        features: parsedGeneral.length > 0 ? parsedGeneral : [
          `Kurikulum komprehensif terintegrasi di ${item.name}`,
          'Fasilitas dan pendampingan tenaga pendidik berpengalaman',
        ],
        fasilitas: parsedFasilitas,
        keunggulan: parsedKeunggulan,
        icon: IconComponent,
        logoUrl: item.logoUrl || null,
        badgeColor: colors.badge,
        iconBg: colors.iconBg,
        iconText: colors.iconText,
        buttonText: colors.buttonText,
      }
    })
  }, [rawPrograms, initialPrograms])

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
        type: 'spring' as const,
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-extrabold shadow-sm backdrop-blur-md">
            <Award className="w-4 h-4 text-amber-500 shrink-0" />
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
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md overflow-hidden ${prog.iconBg}`}>
                    {prog.logoUrl ? (
                      <img src={prog.logoUrl} alt={prog.title} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <IconComp className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:rotate-6" />
                    )}
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
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${selectedProgram.iconBg}`}>
                  {selectedProgram.logoUrl ? (
                    <img src={selectedProgram.logoUrl} alt={selectedProgram.title} className="w-full h-full object-contain p-2" />
                  ) : (
                    (() => {
                      const IconComponent = selectedProgram.icon
                      return <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                    })()
                  )}
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
              <div className="space-y-5">
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2.5">Deskripsi Program</h4>
                  <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed text-justify">
                    {selectedProgram.fullContent}
                  </p>
                </div>

                {/* Fasilitas Khusus jika ada */}
                {selectedProgram.fasilitas && selectedProgram.fasilitas.length > 0 && (
                  <div className="bg-blue-50/60 dark:bg-blue-950/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-200/60 dark:border-blue-900/40">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-2.5">
                      Fasilitas Program
                    </h4>
                    <ul className="space-y-2">
                      {selectedProgram.fasilitas.map((fas, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <span>{fas}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right: Keunggulan Utama */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                    Keunggulan Utama
                  </h4>
                  <ul className="space-y-2.5">
                    {(selectedProgram.keunggulan && selectedProgram.keunggulan.length > 0
                      ? selectedProgram.keunggulan
                      : selectedProgram.features
                    ).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
