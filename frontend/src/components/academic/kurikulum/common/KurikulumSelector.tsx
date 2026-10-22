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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {AVAILABLE_CURRICULA.map((cur) => {
        const isSelected = selectedCurriculumId === cur.id
        return (
          <div
            key={cur.id}
            onClick={() => onSelect(cur.id)}
            className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
              isSelected
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-sm'
                : 'border-border/60 hover:border-border hover:bg-muted/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${cur.colorClass}`}>
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-1.5">
                    {cur.name}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      {cur.code}
                    </Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground">{cur.tagline}</p>
                </div>
              </div>
              {isSelected ? (
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  Aktif
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Pilih</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {cur.description}
            </p>
          </div>
        )
      })}
    </div>
  )
}
