'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle2, Clock, Calendar, BookOpen, 
  Save, RefreshCw, UserCheck, AlertCircle, FileText 
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface DailyClassTeachingQuickViewProps {
  scheduleId: string
  initialData?: any
  onClose?: () => void
}

export function DailyClassTeachingQuickView({
  scheduleId,
  initialData,
  onClose,
}: DailyClassTeachingQuickViewProps) {
  const authenticatedFetch = useAuthenticatedFetch()
  const [activeTab, setActiveTab] = useState<'presensi' | 'jurnal' | 'nilai'>('presensi')

  const schedule = initialData?.schedule
  const perangkat = initialData?.perangkat
  const students = initialData?.students || schedule?.class?.students || []
  const tps = perangkat?.tujuanPembelajarans || []

  // State Presensi
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (initialData?.attendances) {
      for (const a of initialData.attendances) {
        map[a.studentId] = a.status
      }
    }
    return map
  })
  const [isSavingPresensi, setIsSavingPresensi] = useState(false)

  // State Jurnal Mengajar
  const [selectedTpId, setSelectedTpId] = useState<string>(
    initialData?.journal?.tpId || (tps.length > 0 ? tps[0].id : '')
  )
  const [journalMaterial, setJournalMaterial] = useState<string>(
    initialData?.journal?.material || ''
  )
  const [journalNotes, setJournalNotes] = useState<string>(
    initialData?.journal?.notes || ''
  )
  const [isSavingJurnal, setIsSavingJurnal] = useState(false)

  // State Nilai Harian per TP
  const [activeScoreTpId, setActiveScoreTpId] = useState<string>(
    tps.length > 0 ? tps[0].id : ''
  )
  const [scoresMap, setScoresMap] = useState<Record<string, { formatif?: number; sumatif?: number }>>(() => {
    const map: Record<string, { formatif?: number; sumatif?: number }> = {}
    if (perangkat?.nilaiSiswaTps) {
      for (const n of perangkat.nilaiSiswaTps) {
        map[`${n.studentId}_${n.tpId}`] = {
          formatif: n.nilaiFormatif ?? undefined,
          sumatif: n.nilaiSumatif ?? undefined,
        }
      }
    }
    return map
  })
  const [isSavingNilai, setIsSavingNilai] = useState(false)

  // Helper ganti status presensi (HADIR, IZIN, SAKIT, ALPA)
  const setStatus = (studentId: string, status: string) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }))
  }

  // Set Semua Hadir Sekali Klik
  const setAllHadir = () => {
    const map: Record<string, string> = {}
    for (const s of students) {
      map[s.id] = 'HADIR'
    }
    setAttendanceMap(map)
  }

  // Simpan Presensi Harian Siswa
  const handleSavePresensi = async () => {
    setIsSavingPresensi(true)
    try {
      const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
        studentId,
        status,
        date: new Date().toISOString(),
      }))

      const res = await authenticatedFetch('/api/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          date: new Date().toISOString(),
          records,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan presensi siswa')

      Swal.fire({
        icon: 'success',
        title: 'Presensi Tersimpan',
        text: 'Kehadiran siswa kelas hari ini berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsSavingPresensi(false)
    }
  }

  // Simpan Jurnal Mengajar Harian (terhubung ke TP aktif)
  const handleSaveJurnal = async () => {
    setIsSavingJurnal(true)
    try {
      const currentTp = tps.find((t: any) => t.id === selectedTpId)
      const materialText = journalMaterial.trim() || currentTp?.deskripsiTp || currentTp?.lingkupMateri || 'Pembelajaran TP Terpadu'

      const res = await authenticatedFetch('/api/teaching-journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          date: new Date().toISOString(),
          material: materialText,
          notes: journalNotes,
          tpId: selectedTpId || undefined,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan jurnal mengajar')

      Swal.fire({
        icon: 'success',
        title: 'Jurnal Tersimpan',
        text: 'Jurnal pembelajaran telah direkam & mereferensi Tujuan Pembelajaran aktif.',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsSavingJurnal(false)
    }
  }

  // Simpan Nilai Siswa Real-Time per TP
  const handleSaveNilai = async () => {
    if (!perangkat?.id || !activeScoreTpId) {
      Swal.fire({ icon: 'warning', title: 'Pilih TP', text: 'Pilih Tujuan Pembelajaran yang akan dinilai' })
      return
    }

    setIsSavingNilai(true)
    try {
      const items = students.map((s: any) => {
        const val = scoresMap[`${s.id}_${activeScoreTpId}`] || {}
        return {
          studentId: s.id,
          nilaiFormatif: val.formatif !== undefined ? Number(val.formatif) : undefined,
          nilaiSumatif: val.sumatif !== undefined ? Number(val.sumatif) : undefined,
        }
      })

      const res = await authenticatedFetch('/api/kurikulum-merdeka/batch-nilai-tp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perangkatKurikulumId: perangkat.id,
          tpId: activeScoreTpId,
          items,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan nilai TP')

      Swal.fire({
        icon: 'success',
        title: 'Nilai TP Tersimpan',
        text: 'Penilaian real-time dan kalkulasi deskripsi rapor otomatis diperbarui.',
        timer: 1800,
        showConfirmButton: false,
      })
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message })
    } finally {
      setIsSavingNilai(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header Info Cepat Kelas */}
      <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground">
              {schedule?.class?.name || 'Kelas'}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {schedule?.subject?.name || 'Mata Pelajaran'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jam {schedule?.startTime || '07:00'} - {schedule?.endTime || '08:30'} • {students.length} Siswa
          </p>
        </div>

        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
            Tutup
          </Button>
        )}
      </div>

      {/* 3 Tab Cepat Mobile-First */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('presensi')}
          className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'presensi'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Presensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('jurnal')}
          className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'jurnal'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Jurnal KBM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nilai')}
          className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'nilai'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Daftar Nilai TP</span>
        </button>
      </div>

      {/* TAB 1: PRESENSI SISWA */}
      {activeTab === 'presensi' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={setAllHadir}
              className="h-8 text-xs font-medium"
            >
              Set Semua Hadir
            </Button>
            <Button
              size="sm"
              onClick={handleSavePresensi}
              disabled={isSavingPresensi}
              className="h-8 gap-1.5 text-xs font-medium shadow-xs"
            >
              {isSavingPresensi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Presensi
            </Button>
          </div>

          <div className="rounded-md border border-border overflow-hidden bg-card divide-y divide-border">
            {students.map((s: any, idx: number) => {
              const currentStatus = attendanceMap[s.id] || 'HADIR'
              return (
                <div key={s.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{idx + 1}. {s.name}</p>
                    <p className="text-[11px] text-muted-foreground">NIS: {s.nis}</p>
                  </div>

                  {/* Tombol Sentuh Presensi (Touch Target 40px) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[
                      { code: 'HADIR', label: 'H', bg: 'bg-emerald-600 text-white' },
                      { code: 'IZIN', label: 'I', bg: 'bg-blue-600 text-white' },
                      { code: 'SAKIT', label: 'S', bg: 'bg-amber-600 text-white' },
                      { code: 'ALPA', label: 'A', bg: 'bg-rose-600 text-white' },
                    ].map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setStatus(s.id, opt.code)}
                        className={`w-9 h-9 rounded text-xs font-bold transition-all cursor-pointer ${
                          currentStatus === opt.code
                            ? `${opt.bg} shadow-xs scale-105`
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: JURNAL MENGAJAR TERHUBUNG KE TP */}
      {activeTab === 'jurnal' && (
        <div className="space-y-3 bg-card p-4 rounded-lg border border-border">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Tujuan Pembelajaran (TP) yang Sedang Dipelajari:
            </label>
            {tps.length > 0 ? (
              <select
                value={selectedTpId}
                onChange={(e) => {
                  setSelectedTpId(e.target.value)
                  const tp = tps.find((t: any) => t.id === e.target.value)
                  if (tp) setJournalMaterial(tp.deskripsiTp)
                }}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {tps.map((tp: any) => (
                  <option key={tp.id} value={tp.id}>
                    [{tp.kodeTp}] {tp.lingkupMateri} - {tp.deskripsiTp.slice(0, 70)}...
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-600">
                Belum ada TP terdaftar untuk kelas ini. Isi materi secara manual di bawah.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Materi & Pokok Pembelajaran:
            </label>
            <Input
              value={journalMaterial}
              onChange={(e) => setJournalMaterial(e.target.value)}
              placeholder="Contoh: Analisis Struktur Algoritma Percabangan"
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Catatan KBM & Perkembangan Siswa:
            </label>
            <Textarea
              value={journalNotes}
              onChange={(e) => setJournalNotes(e.target.value)}
              placeholder="Catatan pelaksanaan kegiatan, respons siswa, atau kendala di kelas..."
              className="text-xs min-h-[90px]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSaveJurnal}
              disabled={isSavingJurnal}
              className="h-8 gap-1.5 text-xs font-medium shadow-xs"
            >
              {isSavingJurnal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Jurnal Mengajar
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3: DAFTAR NILAI TP REAL-TIME */}
      {activeTab === 'nilai' && (
        <div className="space-y-3">
          {/* Pemilih TP */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-muted/30 rounded-lg border border-border">
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                Pilih Kolom TP Dinilai:
              </label>
              <select
                value={activeScoreTpId}
                onChange={(e) => setActiveScoreTpId(e.target.value)}
                className="w-full text-xs h-8 rounded border border-input bg-background px-2 font-medium"
              >
                {tps.map((tp: any) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.kodeTp}: {tp.lingkupMateri}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              onClick={handleSaveNilai}
              disabled={isSavingNilai}
              className="h-8 gap-1.5 text-xs font-medium shrink-0 self-end sm:self-center shadow-xs"
            >
              {isSavingNilai ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Nilai TP
            </Button>
          </div>

          {/* Tabel Input Nilai Real-Time */}
          <div className="rounded-md border border-border overflow-x-auto bg-card">
            <Table className="text-xs">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10 text-center font-bold">No</TableHead>
                  <TableHead className="min-w-[160px] font-bold">Nama Siswa</TableHead>
                  <TableHead className="w-24 text-center font-bold">Formatif</TableHead>
                  <TableHead className="w-24 text-center font-bold">Sumatif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any, idx: number) => {
                  const key = `${s.id}_${activeScoreTpId}`
                  const val = scoresMap[key] || {}

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]" title={s.name}>
                        {s.name}
                      </TableCell>
                      <TableCell className="p-1.5 text-center">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={val.formatif ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? undefined : Number(e.target.value)
                            setScoresMap((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], formatif: v },
                            }))
                          }}
                          placeholder="-"
                          className="text-center text-xs h-8 w-20 mx-auto font-mono"
                        />
                      </TableCell>
                      <TableCell className="p-1.5 text-center">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={val.sumatif ?? ''}
                          onChange={(e) => {
                            const v = e.target.value === '' ? undefined : Number(e.target.value)
                            setScoresMap((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], sumatif: v },
                            }))
                          }}
                          placeholder="-"
                          className="text-center text-xs h-8 w-20 mx-auto font-mono font-semibold"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
