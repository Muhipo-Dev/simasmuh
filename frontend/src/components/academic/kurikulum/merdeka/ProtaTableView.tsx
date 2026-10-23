'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarRange, BookOpen, Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface ProtaTableViewProps {
  perangkat: any
}

export function ProtaTableView({ perangkat }: ProtaTableViewProps) {
  const tps = (perangkat?.tujuanPembelajarans || []) as any[]
  const totalJpSemester = perangkat?.totalJpSemester || ((perangkat?.mingguEfektifCount || 18) * (perangkat?.jpPerMinggu || 2))
  const jpPerWeek = perangkat?.jpPerMinggu || 2
  const mingguEfektif = perangkat?.mingguEfektifCount || 18

  // Estimasi total tahunan (2 semester)
  const totalJpTahunan = totalJpSemester * 2
  const totalMingguTahunan = mingguEfektif * 2

  // Total JP teralokasi di TP aktif
  const totalJpTerdistribusi = tps.reduce((acc, curr) => acc + (Number(curr.alokasiJp) || 0), 0)
  const persentaseAlokasi = totalJpSemester > 0 ? Math.min(100, Math.round((totalJpTerdistribusi / totalJpSemester) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Kartu Ringkasan Indikator Prota */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-card rounded-xl border border-border shadow-2xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Target JP Tahunan
          </span>
          <span className="text-xl font-black text-foreground mt-0.5 block font-mono">
            {totalJpTahunan} <span className="text-xs font-normal text-muted-foreground">JP</span>
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            2 Semester ({totalMingguTahunan} Pekan KBM)
          </span>
        </div>

        <div className="p-3.5 bg-card rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/10 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
            Beban Semester Ini
          </span>
          <span className="text-xl font-black text-teal-700 dark:text-teal-300 mt-0.5 block font-mono">
            {totalJpSemester} <span className="text-xs font-normal text-muted-foreground">JP</span>
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 mt-1 block font-mono">
            {mingguEfektif} Pekan x {jpPerWeek} JP
          </span>
        </div>

        <div className="p-3.5 bg-card rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/10 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            JP Terdistribusi (TP)
          </span>
          <span className="text-xl font-black text-sky-700 dark:text-sky-300 mt-0.5 block font-mono">
            {totalJpTerdistribusi} <span className="text-xs font-normal text-muted-foreground">JP</span>
          </span>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 block">
            {tps.length} Butir Materi Pokok
          </span>
        </div>

        <div className="p-3.5 bg-card rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            Ketuntasan Alokasi
          </span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5 block font-mono">
            {persentaseAlokasi}%
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
            {totalJpTerdistribusi >= totalJpSemester ? 'Tercukupi Penuh' : `Kurang ${totalJpSemester - totalJpTerdistribusi} JP`}
          </span>
        </div>
      </div>

      {/* Tabel Rincian Program Tahunan */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-2xs">
        <div className="p-3.5 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-amber-600" />
            <h5 className="text-xs font-bold text-foreground">
              Distribusi Capaian &amp; Alokasi Program Tahunan (Prota)
            </h5>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold font-mono">
              Tahun Ajaran {perangkat?.academicYear || '2025/2026'}
            </Badge>
            <Badge className="text-[10px] font-semibold bg-amber-600 text-white">
              Semester {perangkat?.semester || 'GANJIL'}
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 text-center font-bold">No</TableHead>
                <TableHead className="w-24 text-center font-bold">Semester</TableHead>
                <TableHead className="w-24 text-center font-bold">Kode TP</TableHead>
                <TableHead className="min-w-[200px] max-w-[280px] font-bold">Lingkup Materi Pokok</TableHead>
                <TableHead className="min-w-[280px] font-bold">Rumusan Tujuan Pembelajaran (TP)</TableHead>
                <TableHead className="w-24 text-center font-bold">Alokasi Waktu</TableHead>
                <TableHead className="w-24 text-center font-bold">Porsi Tahunan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                      <p className="text-xs font-medium">Belum ada Tujuan Pembelajaran (TP) yang tercatat.</p>
                      <p className="text-[11px] text-muted-foreground">
                        Tambahkan butir TP pada Tahap 2 (Alur Tujuan Pembelajaran) untuk menyusun alokasi Program Tahunan.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {tps.map((tp, idx) => {
                    const jp = Number(tp.alokasiJp) || 0
                    const porsi = totalJpTahunan > 0 ? ((jp / totalJpTahunan) * 100).toFixed(1) : '0'
                    return (
                      <TableRow key={tp.id || idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center font-mono font-medium text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                            {perangkat?.semester || 'GANJIL'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-primary">
                          {tp.kodeTp || `TP-${idx + 1}`}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {tp.lingkupMateri || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground leading-relaxed">
                          {tp.deskripsi || tp.rumusan || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-foreground">
                          {jp} JP
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {porsi}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-muted/60 font-bold border-t-2 border-border">
                    <TableCell colSpan={5} className="text-right pr-4">
                      Total Alokasi Terdistribusi:
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-foreground">
                      {totalJpTerdistribusi} JP
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-foreground">
                      {totalJpTahunan > 0 ? ((totalJpTerdistribusi / totalJpTahunan) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
