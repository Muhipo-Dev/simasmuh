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
}

export const AVAILABLE_CURRICULA: CurriculumOption[] = [
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
    status: 'PLANNED',
    colorClass: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  },
  {
    id: 'KURIKULUM_NASIONAL_BARU',
    name: 'Kurikulum Nasional Terpadu',
    code: 'KURNAS',
    tagline: 'Arsitektur Modular Siap Pembaruan',
    description: 'Slot arsitektur masa depan untuk penyesuaian kurikulum baru kementerian tanpa membongkar data historis.',
    status: 'PLANNED',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  },
]

interface KurikulumSelectorProps {
  selectedCurriculumId: string
  onSelect: (curriculumId: string) => void
}

export function KurikulumSelector({ selectedCurriculumId, onSelect }: KurikulumSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 shrink-0">
          Standar Kurikulum:
        </span>
        {AVAILABLE_CURRICULA.map((cur) => {
          const isSelected = selectedCurriculumId === cur.id
          return (
            <button
              key={cur.id}
              onClick={() => onSelect(cur.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
        {AVAILABLE_CURRICULA.find((c) => c.id === selectedCurriculumId)?.tagline}
      </div>
    </div>
  )
}
