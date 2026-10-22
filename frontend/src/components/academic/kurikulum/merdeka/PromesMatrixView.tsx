'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Save, RefreshCw, Calendar, Check, AlertCircle, Info } from 'lucide-react'
import Swal from 'sweetalert2'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface PromesMatrixViewProps {
  perangkat: any
  onSaveSuccess?: () => void
}

export function PromesMatrixView({ perangkat, onSaveSuccess }: PromesMatrixViewProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [isSaving, setIsSaving] = useState(false)

  // Bulan semester ganjil (1-6: Juli - Des) atau genap (1-6: Jan - Juni)
  const isGanjil = perangkat?.semester === 'GANJIL'
  const months = useMemo(() => {
    return isGanjil
      ? [
          { idx: 1, name: 'Juli', weeks: [1, 2, 3, 4] },
          { idx: 2, name: 'Agustus', weeks: [1, 2, 3, 4] },
          { idx: 3, name: 'September', weeks: [1, 2, 3, 4] },
          { idx: 4, name: 'Oktober', weeks: [1, 2, 3, 4] },
          { idx: 5, name: 'November', weeks: [1, 2, 3, 4] },
          { idx: 6, name: 'Desember', weeks: [1, 2, 3, 4] },
        ]
      : [
          { idx: 1, name: 'Januari', weeks: [1, 2, 3, 4] },
          { idx: 2, name: 'Februari', weeks: [1, 2, 3, 4] },
          { idx: 3, name: 'Maret', weeks: [1, 2, 3, 4] },
          { idx: 4, name: 'April', weeks: [1, 2, 3, 4] },
          { idx: 5, name: 'Mei', weeks: [1, 2, 3, 4] },
          { idx: 6, name: 'Juni', weeks: [1, 2, 3, 4] },
        ]
  }, [isGanjil])

  // Total 18 minggu efektif
  const totalWeeks = 18

  // State alokasi matriks: Map<string, number> di mana key = `${tpId}_${weekAbsolut}` -> JP
  const [matrixState, setMatrixState] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (perangkat?.promesAllocations) {
      for (const a of perangkat.promesAllocations) {
        initial[`${a.tpId}_${a.mingguAbsolut}`] = a.alokasiJp
      }
    }
    return initial
  })

  const tps = perangkat?.tujuanPembelajarans || []
  const jpPerWeek = perangkat?.jpPerMinggu || 2

  // Toggle/Atur JP pada blok minggu untuk TP tertentu
  const toggleWeek = (tpId: string, weekAbsolut: number, currentJp: number) => {
    const key = `${tpId}_${weekAbsolut}`
    setMatrixState((prev) => {
      const next = { ...prev }
      if (next[key] && next[key] > 0) {
        delete next[key]
      } else {
        next[key] = jpPerWeek
      }
      return next
    })
  }

  // Hitung total JP yang sudah diplot per TP
  const getTpPlottedJp = (tpId: string) => {
    let sum = 0
    for (let w = 1; w <= totalWeeks; w++) {
      sum += matrixState[`${tpId}_${w}`] || 0
    }
    return sum
  }

  // Hitung total JP per minggu
  const getWeekTotalJp = (weekAbsolut: number) => {
    let sum = 0
    for (const tp of tps) {
      sum += matrixState[`${tp.id}_${weekAbsolut}`] || 0
    }
    return sum
  }

  // Simpan Matriks ke Backend
  const handleSaveMatrix = async () => {
    setIsSaving(true)
    try {
      const allocations: any[] = []
      let currentWeekCount = 1

      for (const m of months) {
        for (const w of m.weeks) {
          if (currentWeekCount > totalWeeks) break
          const weekAbs = currentWeekCount

          for (const tp of tps) {
            const jp = matrixState[`${tp.id}_${weekAbs}`]
            if (jp && jp > 0) {
              allocations.push({
                tpId: tp.id,
                bulanIndex: m.idx,
                namaBulan: m.name,
                mingguKe: w,
                mingguAbsolut: weekAbs,
                alokasiJp: jp,
                keterangan: 'KBM',
              })
            }
          }
          currentWeekCount++
        }
      }

      const res = await authenticatedFetch('/api/kurikulum-merdeka/promes-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: perangkat.id,
          allocations,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan matriks promes')

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Distribusi alokasi Program Semester (Promes) telah tersimpan dengan aman.',
        timer: 1800,
        showConfirmButton: false,
      })

      if (onSaveSuccess) onSaveSuccess()
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem saat menyimpan data',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Baris Kontrol Ringkas & Indikator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-primary/10 text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Distribusi Visual Matriks Promes</h4>
            <p className="text-xs text-muted-foreground">
              Klik kotak blok minggu untuk mengalokasikan JP tatap muka ({jpPerWeek} JP/pertemuan)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSaveMatrix}
            disabled={isSaving}
            className="h-8 gap-1.5 px-3 font-medium text-xs shadow-sm"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Promes
          </Button>
        </div>
      </div>

      {/* Tabel Grid Matriks Minggu Efektif */}
      <div className="rounded-md border border-border overflow-x-auto bg-card shadow-xs">
        <Table className="w-full text-xs">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead rowSpan={2} className="w-10 text-center font-bold">No</TableHead>
              <TableHead rowSpan={2} className="min-w-[180px] max-w-[280px] font-bold">Tujuan Pembelajaran (TP)</TableHead>
              <TableHead rowSpan={2} className="w-16 text-center font-bold">Target</TableHead>
              <TableHead rowSpan={2} className="w-16 text-center font-bold">Diplot</TableHead>

              {/* Header Bulan */}
              {months.map((m) => (
                <TableHead
                  key={m.idx}
                  colSpan={m.weeks.length}
                  className="text-center font-bold border-l border-border bg-muted/40 py-1"
                >
                  {m.name}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {/* Header Minggu (1 s.d. 18) */}
              {months.flatMap((m, mIdx) =>
                m.weeks.map((w, wIdx) => {
                  const absW = mIdx * 4 + wIdx + 1
                  if (absW > totalWeeks) return null
                  return (
                    <TableHead
                      key={`${m.idx}-${w}`}
                      className="w-8 text-center text-[10px] p-1 font-semibold border-l border-border"
                      title={`Minggu ke-${w} ${m.name} (Minggu Efektif ${absW})`}
                    >
                      M{w}
                    </TableHead>
                  )
                })
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {tps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalWeeks + 4} className="h-28 text-center text-muted-foreground">
                  Belum ada Tujuan Pembelajaran (TP). Tambahkan TP terlebih dahulu pada tab Manajemen ATP.
                </TableCell>
              </TableRow>
            ) : (
              tps.map((tp: any, idx: number) => {
                const plottedJp = getTpPlottedJp(tp.id)
                const isComplete = plottedJp === tp.alokasiJp
                const isOver = plottedJp > tp.alokasiJp

                let weekCounter = 1

                return (
                  <TableRow key={tp.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">
                          {tp.kodeTp}
                        </span>
                        <span className="truncate max-w-[200px]" title={tp.lingkupMateri}>
                          {tp.lingkupMateri}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={tp.deskripsiTp}>
                        {tp.deskripsiTp}
                      </p>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-muted-foreground">
                      {tp.alokasiJp} JP
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={isComplete ? 'default' : isOver ? 'destructive' : 'secondary'}
                        className="text-[10px] px-1.5 py-0 font-mono"
                      >
                        {plottedJp} JP
                      </Badge>
                    </TableCell>

                    {/* Matriks Tombol Blok Minggu */}
                    {months.flatMap((m, mIdx) =>
                      m.weeks.map((w, wIdx) => {
                        const absW = mIdx * 4 + wIdx + 1
                        if (absW > totalWeeks) return null
                        const key = `${tp.id}_${absW}`
                        const currentVal = matrixState[key] || 0
                        const isAllocated = currentVal > 0

                        return (
                          <TableCell
                            key={key}
                            className="p-1 text-center border-l border-border/70"
                          >
                            <button
                              type="button"
                              onClick={() => toggleWeek(tp.id, absW, currentVal)}
                              className={`w-7 h-7 mx-auto rounded flex items-center justify-center font-bold text-[11px] transition-all cursor-pointer ${
                                isAllocated
                                  ? 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
                                  : 'bg-muted/20 hover:bg-muted text-transparent hover:text-muted-foreground border border-dashed border-border'
                              }`}
                              title={`Plot ${jpPerWeek} JP pada Minggu ${absW} (${m.name})`}
                            >
                              {isAllocated ? currentVal : '+'}
                            </button>
                          </TableCell>
                        )
                      })
                    )}
                  </TableRow>
                )
              })
            )}

            {/* Baris Total Beban JP per Minggu */}
            {tps.length > 0 && (
              <TableRow className="bg-muted/40 font-bold border-t-2 border-border">
                <TableCell colSpan={4} className="text-right py-2 text-xs text-foreground font-semibold">
                  Total JP Tatap Muka per Minggu:
                </TableCell>
                {months.flatMap((m, mIdx) =>
                  m.weeks.map((w, wIdx) => {
                    const absW = mIdx * 4 + wIdx + 1
                    if (absW > totalWeeks) return null
                    const weekTotal = getWeekTotalJp(absW)
                    const isExceed = weekTotal > jpPerWeek

                    return (
                      <TableCell
                        key={`total-${absW}`}
                        className={`text-center p-1 text-[11px] border-l border-border font-mono ${
                          weekTotal === 0
                            ? 'text-muted-foreground/40'
                            : isExceed
                            ? 'text-amber-600 font-bold bg-amber-500/10'
                            : 'text-primary font-bold'
                        }`}
                        title={`Total alokasi minggu ${absW}: ${weekTotal} JP`}
                      >
                        {weekTotal > 0 ? weekTotal : '-'}
                      </TableCell>
                    )
                  })
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legenda Keterangan */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-primary inline-block" />
          <span>Terplot {jpPerWeek} JP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border border-dashed border-border inline-block" />
          <span>Belum Ada KBM</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-500/20 text-amber-700 font-bold text-[10px] flex items-center justify-center">!</span>
          <span>Beban Lebih dari {jpPerWeek} JP/Minggu</span>
        </div>
      </div>
    </div>
  )
}
