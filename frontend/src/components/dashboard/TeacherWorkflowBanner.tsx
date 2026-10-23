'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Layers, BookOpen, FileText, CalendarDays, Clock, Award, ShieldCheck,
  Sparkles, ArrowRight, CheckCircle2, ChevronRight, Zap, HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PanduanAdministrasiGuruModal } from '@/components/academic/kurikulum/common/PanduanAdministrasiGuruModal'

interface TeacherWorkflowBannerProps {
  teacherName?: string
}

export function TeacherWorkflowBanner({ teacherName }: TeacherWorkflowBannerProps) {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [openPanduan, setOpenPanduan] = useState<boolean>(false)

  const steps = [
    {
      num: 1,
      badge: 'SK Kurikulum',
      title: 'Jadwal Mengajar KBM',
      desc: 'Verifikasi jam tatap muka ruang kelas, alokasi JP mingguan, dan SK KBM resmi.',
      href: '/akademik/perangkat-ajar?subTab=jadwal',
      actionText: 'Jadwal & SK KBM',
      icon: CalendarDays,
      color: 'slate',
      borderColor: 'border-slate-200 dark:border-slate-800',
      bgLight: 'bg-slate-50/60 dark:bg-slate-900/40',
      badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      btnBg: 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600',
    },
    {
      num: 2,
      badge: 'Awal Semester',
      title: 'Alur Tujuan (CP & ATP)',
      desc: 'Penyusunan Capaian Pembelajaran, ruang lingkup materi, dan butir TP fase.',
      href: '/akademik/perangkat-ajar?subTab=atp&quickSetup=true',
      actionText: 'Input CP & ATP',
      icon: BookOpen,
      color: 'blue',
      borderColor: 'border-blue-200 dark:border-blue-900/60',
      bgLight: 'bg-blue-50/50 dark:bg-blue-950/20',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      num: 3,
      badge: 'Alokasi Semester',
      title: 'Matriks Promes & Prota',
      desc: 'Distribusi plot jam tatap muka 18 minggu efektif per semester dan tahunan.',
      href: '/akademik/perangkat-ajar?subTab=promes',
      actionText: 'Matriks Promes',
      icon: Layers,
      color: 'amber',
      borderColor: 'border-amber-200 dark:border-amber-900/60',
      bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
      badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    {
      num: 4,
      badge: 'Persiapan KBM',
      title: 'Modul Ajar & Bank Soal',
      desc: 'Pembuatan modul ajar diferensiasi, LKPD, kisi-kisi, dan paket soal tes.',
      href: '/akademik/perangkat-ajar?subTab=generator',
      actionText: 'Modul Ajar & Soal',
      icon: FileText,
      color: 'emerald',
      borderColor: 'border-emerald-200 dark:border-emerald-900/60',
      bgLight: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    {
      num: 5,
      badge: 'Pelaksanaan KBM',
      title: 'Presensi & Jurnal Kelas',
      desc: 'Isi materi KBM tiap jam tatap muka, catat presensi siswa & dokumentasi.',
      href: '/akademik/jurnal-mengajar',
      actionText: 'Isi Jurnal KBM',
      icon: Clock,
      color: 'purple',
      borderColor: 'border-purple-200 dark:border-purple-900/60',
      bgLight: 'bg-purple-50/50 dark:bg-purple-950/20',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
      btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    {
      num: 6,
      badge: 'Asesmen & Mutu',
      title: 'Penilaian, Rapor & Supervisi',
      desc: 'Input nilai formatif/STS/SAS, ledger rapor, dan hasil supervisi akademik.',
      href: '/akademik/penilaian',
      actionText: 'Nilai & Supervisi',
      icon: Award,
      color: 'rose',
      borderColor: 'border-rose-200 dark:border-rose-900/60',
      bgLight: 'bg-rose-50/50 dark:bg-rose-950/20',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
  ]

  return (
    <div className="rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-2xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-3.5 sm:p-4 border-b border-indigo-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Alur Kerja Administrasi Guru Terpadu
              </h3>
              <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                6 Tahap Mandiri
              </Badge>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-snug">
              Panduan terstruktur bagi Bapak/Ibu Guru dari perencanaan KBM awal semester hingga e-rapor & supervisi.
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat: Panduan Penggunaan & Quick Setup */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setOpenPanduan(true)}
            className="h-8.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-2xs active:scale-95 transition-all"
            title="Buka tutorial panduan alur kerja administrasi guru lengkap"
          >
            <HelpCircle className="w-3.5 h-3.5 text-white" />
            <span>Panduan Alur Guru</span>
          </Button>

          <Link href="/akademik/perangkat-ajar?subTab=atp&quickSetup=true">
            <Button
              size="sm"
              variant="outline"
              className="h-8.5 px-3.5 rounded-xl border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 font-bold text-xs gap-1.5 active:scale-95 transition-all"
              title="Buka Quick Setup Auto-Isi CP & ATP Jenjang Kelas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Setup</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid 6 Tahapan Alur Kerja */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {steps.map((st) => {
            const IconComponent = st.icon
            return (
              <div
                key={st.num}
                className={`p-3 rounded-xl border ${st.borderColor} ${st.bgLight} flex flex-col justify-between gap-2.5 transition-all hover:shadow-xs`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${st.badgeBg}`}>
                      Tahap {st.num}
                    </span>
                    <IconComponent className="w-3.5 h-3.5 opacity-80" />
                  </div>

                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1" title={st.title}>
                    {st.title}
                  </h4>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2" title={st.desc}>
                    {st.desc}
                  </p>
                </div>

                <Link href={st.href} className="w-full mt-1">
                  <Button
                    size="sm"
                    className={`w-full ${st.btnBg} font-bold text-[11px] h-7.5 rounded-lg shadow-2xs gap-1 px-2`}
                  >
                    <span className="truncate">{st.actionText}</span>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL PANDUAN LENGKAP ADMINISTRASI GURU */}
      <PanduanAdministrasiGuruModal
        open={openPanduan}
        onOpenChange={setOpenPanduan}
      />
    </div>
  )
}
