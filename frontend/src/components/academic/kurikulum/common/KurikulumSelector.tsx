'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Sparkles, Layers, ShieldCheck, ArrowRight } from 'lucide-react'

export interface CurriculumOption {
  id: string
  name: string
  code: string
  tagline: string
  description: string
  status: 'ACTIVE' | 'PLANNED' | 'LEGACY'
  colorClass: string
  isCustom?: boolean
}

export const BUILTIN_CURRICULA: CurriculumOption[] = [
  {
    id: 'KURIKULUM_MERDEKA',
    name: 'Kurikulum Merdeka',
    code: 'IKM',
    tagline: 'Fase Capaian (E/F) & Modul Ajar CP-TP-ATP',
    description: 'Format baku Kurikulum Merdeka Kemendikbudristek dengan CP, TP, ATP, Promes Matriks 18 Minggu, dan Asesmen Formatif/Sumatif.',
    status: 'ACTIVE',
    colorClass: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'KURIKULUM_2013',
    name: 'Kurikulum 2013 (K-13)',
    code: 'K13',
    tagline: 'Kompetensi Inti & Dasar (KI-KD)',
    description: 'Format administrasi silabus dan RPP berbasis KI 1-4 dan KD 3-4 dengan model saintifik 5M dan penilaian autentik.',
    status: 'ACTIVE',
    colorClass: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'KURIKULUM_NASIONAL_BARU',
    name: 'Kurikulum Nasional Terpadu',
    code: 'KURNAS',
    tagline: 'Arsitektur Modular Siap Kebijakan Baru',
    description: 'Slot arsitektur masa depan untuk penyesuaian regulasi baru kementerian pendidikan tanpa membongkar data historis.',
    status: 'ACTIVE',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'KURIKULUM_CAMBRIDGE',
    name: 'Kurikulum Cambridge International',
    code: 'CIE',
    tagline: 'IGCSE, AS & A Level International Standard',
    description: 'Standar kurikulum internasional Cambridge dengan silabus global dan penilaian berbasis evaluasi eksternal.',
    status: 'ACTIVE',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300',
  },
  {
    id: 'KURIKULUM_IB',
    name: 'International Baccalaureate (IB)',
    code: 'IB',
    tagline: 'Inquiry-Based & Learner Profile',
    description: 'Framework pendidikan global dengan pendekatan inkuiri, CAS, dan Theory of Knowledge (TOK).',
    status: 'ACTIVE',
    colorClass: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300',
  },
  {
    id: 'KURIKULUM_ISMUBA',
    name: 'Kurikulum ISMUBA Muhammadiyah',
    code: 'ISMUBA',
    tagline: 'Al-Islam, Kemuhammadiyahan, & Bahasa Arab',
    description: 'Kurikulum ciri khusus Majelis Dikdasmen PNF PP Muhammadiyah penguatan akhlak, tarikh, dan kepemimpinan Islam berkemajuan.',
    status: 'ACTIVE',
    colorClass: 'border-teal-500/30 bg-teal-500/5 text-teal-700 dark:text-teal-300',
  },
  {
    id: 'KURIKULUM_KTSP_2006',
    name: 'Kurikulum KTSP 2006',
    code: 'KTSP',
    tagline: 'Standar Isi (SI) & SKL Berbasis Sekolah',
    description: 'Arsip kurikulum tingkat satuan pendidikan berbasis standar kompetensi lulusan dan silabus sekolah.',
    status: 'LEGACY',
    colorClass: 'border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300',
  },
  {
    id: 'KURIKULUM_KBK_2004',
    name: 'Kurikulum Berbasis Kompetensi (KBK)',
    code: 'KBK',
    tagline: 'Kompetensi Siswa Terukur',
    description: 'Kurikulum historis berbasis kompetensi awal tahun 2000-an.',
    status: 'LEGACY',
    colorClass: 'border-stone-500/30 bg-stone-500/5 text-stone-700 dark:text-stone-300',
  },
  {
    id: 'KURIKULUM_VOCATIONAL_SMK',
    name: 'Kurikulum Link & Match Industri',
    code: 'VOKASI',
    tagline: 'Teaching Factory & Sertifikasi Profesi',
    description: 'Format perangkat ajar vokasi berbasis uji kompetensi keahlian dan kemitraan dunia usaha/dunia industri (DUDI).',
    status: 'ACTIVE',
    colorClass: 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-300',
  },
  {
    id: 'KURIKULUM_PESANTREN_MUHIPO',
    name: 'Kurikulum Kepesantrenan MBS Muhipo',
    code: 'TREN',
    tagline: 'Kajian Kitab Kuning, Nahwu Shorof & Tahfidz',
    description: 'Muatan kurikulum kepesantrenan terpadu pondok pesantren Muhammadiyah.',
    status: 'ACTIVE',
    colorClass: 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300',
  },
  {
    id: 'KURIKULUM_DARURAT',
    name: 'Kurikulum Kondisi Khusus / Darurat',
    code: 'KDARURAT',
    tagline: 'Penyederhanaan Kompetensi Esensial',
    description: 'Modul kurikulum ringkas untuk situasi bencana, pandemi, atau pembelajaran jarak jauh intensif.',
    status: 'ACTIVE',
    colorClass: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
  },
]

export const AVAILABLE_CURRICULA = BUILTIN_CURRICULA

interface KurikulumSelectorProps {
  selectedCurriculumId: string
  onSelect: (curriculumId: string) => void
  activeCurriculaIds?: string[]
  customCurricula?: CurriculumOption[]
}

export function KurikulumSelector({
  selectedCurriculumId,
  onSelect,
  activeCurriculaIds,
  customCurricula = [],
}: KurikulumSelectorProps) {
  // Gabungkan builtin + custom
  const combinedList = [...BUILTIN_CURRICULA, ...customCurricula]

  // Filter hanya kurikulum yang diaktifkan oleh Waka Kurikulum di Pengaturan (Maksimal 2 aktif)
  // Jika activeCurriculaIds belum ada atau kosong, default ke KURIKULUM_MERDEKA
  const displayCurricula = combinedList.filter((c) => {
    if (!activeCurriculaIds || activeCurriculaIds.length === 0) {
      return c.id === 'KURIKULUM_MERDEKA'
    }
    return activeCurriculaIds.includes(c.id)
  })

  // Pastikan minimal ada 1 kurikulum yang tampil
  const finalCurricula = displayCurricula.length > 0 ? displayCurricula : [BUILTIN_CURRICULA[0]]

  // Jika kurikulum aktif sekolah hanya 1 (misalnya Kurikulum Merdeka saja), sembunyikan kotak baris penuh agar antarmuka ringkas, tidak memakan tempat, dan nyaman untuk guru awam
  if (finalCurricula.length <= 1) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 shrink-0">
          Kurikulum Aktif Sekolah:
        </span>
        {finalCurricula.map((cur) => {
          const isSelected = selectedCurriculumId === cur.id
          return (
            <button
              key={cur.id}
              onClick={() => onSelect(cur.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{cur.name}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {cur.code}
              </span>
            </button>
          )
        })}
      </div>
      <div className="text-[11px] text-muted-foreground hidden lg:block px-2">
        {combinedList.find((c) => c.id === selectedCurriculumId)?.tagline}
      </div>
    </div>
  )
}
