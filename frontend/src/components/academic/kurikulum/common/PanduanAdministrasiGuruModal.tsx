'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Calendar,
  ListTree,
  FileSpreadsheet,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react'

interface PanduanAdministrasiGuruModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PanduanAdministrasiGuruModal({
  open,
  onOpenChange,
}: PanduanAdministrasiGuruModalProps) {
  const steps = [
    {
      step: 1,
      badge: 'Dasar Legalitas',
      title: 'Tahap 1: Verifikasi Jadwal & SK KBM',
      desc: 'Bapak/Ibu memeriksa rombongan belajar (kelas) dan alokasi Jam Pelajaran (JP) mingguan resmi hasil SK Kurikulum/TU. Klik "Sinkron Jadwal" untuk memasukkan semua rombel otomatis.',
      icon: Calendar,
      color: 'slate',
      badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    },
    {
      step: 2,
      badge: 'Target Kompetensi',
      title: 'Tahap 2: Pemetaan Target (CP) & Alur Tujuan (ATP)',
      desc: 'Merumuskan Capaian Pembelajaran (CP) dan memecahnya menjadi Tujuan Pembelajaran (TP). Guru menyusunnya kronologis lengkap alokasi JP per topik.',
      icon: ListTree,
      color: 'blue',
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200',
    },
    {
      step: 3,
      badge: 'Alokasi Semester',
      title: 'Tahap 3: Pemetaan Promes & Prota (18 Pekan)',
      desc: 'Memetakan materi TP ke dalam 18 minggu efektif per semester. Sistem otomatis menghitung akumulasi jam agar tidak terjadi kelebihan beban JP mingguan.',
      icon: FileSpreadsheet,
      color: 'amber',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
    },
    {
      step: 4,
      badge: 'Perangkat Belajar',
      title: 'Tahap 4: Modul Ajar & Kriteria Tuntas (KKTP)',
      desc: 'Membuat Modul Ajar (pengganti RPP) dan mengaitkannya (tag) ke TP spesifik. Guru menentukan kriteria kualitatif bukti capaian murid (bukan sekadar angka KKM kaku).',
      icon: BookOpen,
      color: 'emerald',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    },
    {
      step: 5,
      badge: 'Pelaksanaan Kelas',
      title: 'Tahap 5: Eksekusi KBM & Jurnal Harian Terintegrasi',
      desc: 'Saat jam tatap muka tiba, guru membuka Jurnal Harian. Jadwal, kelas, dan mapel terisi otomatis. Guru memilih Modul/TP hari itu dan presensi kehadiran siswa.',
      icon: Clock,
      color: 'indigo',
      badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
    },
    {
      step: 6,
      badge: 'Evaluasi & Supervisi',
      title: 'Tahap 6: Asesmen, Rapor & Supervisi Pimpinan',
      desc: 'Menginput asesmen formatif/sumatif yang dikomparasi dengan KKTP. Kepala Sekolah memiliki dashboard pemantauan berjenjang: Jurnal -> Modul -> TP -> CP.',
      icon: Award,
      color: 'rose',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Panduan Lengkap Alur Kerja Administrasi Guru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Roadmap dokumen hidup dari target kompetensi awal hingga pelaksanaan kelas harian di SMA Muhammadiyah 1 Ponorogo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Prinsip Benang Merah */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-xs">
                Konsep Peta Jalan (Roadmap) Dokumen Hidup:
              </span>
              <p className="text-[11px] leading-relaxed opacity-95">
                Administrasi SIMASMUH bukan form isian statis birokratis. Setiap data saling terhubung erat dari hulu ke hilir: Target CP &rarr; TP &rarr; Alur ATP &rarr; Modul Ajar &amp; KKTP &rarr; Jurnal KBM Harian &rarr; Presensi Siswa &amp; Evaluasi Supervisi.
              </p>
            </div>
          </div>

          {/* 6 Tahapan Berurutan */}
          <div className="space-y-2.5">
            {steps.map((st) => {
              const IconComp = st.icon
              return (
                <div
                  key={st.step}
                  className="p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {st.step}
                      </div>
                      <h4 className="font-bold text-xs text-foreground">
                        {st.title}
                      </h4>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${st.badgeBg} border-0`}>
                      {st.badge}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] pl-8 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Kotak Bantuan untuk Guru Awam */}
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Tips Praktis:</strong> Cukup gunakan tombol <strong>Roadmap Guru</strong> pada ruang kerja administrasi atau <strong>Wizard Auto-Isi ATP</strong> untuk pengisian berurutan tanpa ribet.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Tutup Panduan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
