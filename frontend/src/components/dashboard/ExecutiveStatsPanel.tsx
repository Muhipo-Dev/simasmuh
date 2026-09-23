'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, UserSquare2, CalendarDays, ClipboardCheck,
  Briefcase, BookOpen, UserCheck, GraduationCap, Award,
  Sparkles, ChevronDown, TrendingUp, Landmark, Activity,
  CheckCircle2, FileText, ShieldAlert, BarChart3, Clock,
  ArrowRight, ShieldCheck, Mail, HeartHandshake,
  PieChart, DollarSign, Wallet, RefreshCw, X
} from 'lucide-react'

interface ExecutiveStatsPanelProps {
  execStats: any
  studentsCount?: number
  classesCount?: number
  totalPegawai?: number
  onClose?: () => void
}

export function ExecutiveStatsPanel({
  execStats,
  studentsCount = 0,
  classesCount = 0,
  totalPegawai = 0,
  onClose
}: ExecutiveStatsPanelProps) {
  const [selectedStatCategory, setSelectedStatCategory] = useState<string>('SEMUA')

  const ov = execStats?.overview || {}
  const pr = execStats?.presensi || {}
  const fin = execStats?.keuangan || {}
  const dist = execStats?.studentDistribution || []
  const demo = execStats?.demografis || { gender: [], program: [], jalur: [], gelombang: [] }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount || 0)

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 shadow-md space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Header Panel Statistika */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Analisis & Statistika Eksekutif Sekolah
              </h3>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 text-[9.5px] font-bold">
                Real-Time Data
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Pusat pemantauan dinamika presensi, keuangan, kedisiplinan, akademik, dan demografi sekolah.
            </p>
          </div>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2.5 text-xs text-slate-500 hover:text-rose-600 rounded-xl gap-1 self-start sm:self-auto"
          >
            <X className="w-4 h-4" />
            <span>Tutup Panel</span>
          </Button>
        )}
      </div>

      {/* Filter Kategori Tab */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'SEMUA', label: '📊 Semua' },
          { id: 'PRESENSI', label: '⏱️ Presensi' },
          { id: 'KEDISIPLINAN', label: '🛡️ Tata Tertib & Adab' },
          { id: 'KEUANGAN', label: '💰 Keuangan' },
          { id: 'AKADEMIK', label: '📚 Akademik' },
          { id: 'DEMOGRAFIS', label: '👥 Demografi Siswa' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatCategory(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedStatCategory === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Ringkasan Populasi */}
      {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && (
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Populasi & Ekosistem Terdata
          </span>
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Siswa Aktif</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
                {ov.totalSiswa ?? studentsCount}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Guru / Pendidik</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {ov.totalGuru ?? 0}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Staf / Pegawai</span>
              <span className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5 block">
                {ov.totalPegawai ?? totalPegawai}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Wali Murid</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
                {ov.totalWaliMurid ?? 0}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Rombel / Kelas</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                {ov.totalKelas ?? classesCount}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Mata Pelajaran</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                {ov.totalMapel ?? 0}
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Sektor Presensi & Kehadiran */}
      {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'PRESENSI') && (
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Kehadiran Hari Ini
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Presensi Siswa */}
            <Card className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">Presensi Siswa</span>
                <span className="text-xs font-black text-blue-600">{pr.siswaPersen ?? 0}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Hadir</span>
                  <span className="font-black text-emerald-600">{pr.siswaHadir ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Izin</span>
                  <span className="font-black text-blue-600">{pr.siswaIzin ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Sakit</span>
                  <span className="font-black text-amber-600">{pr.siswaSakit ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Alfa</span>
                  <span className="font-black text-rose-600">{pr.siswaAlfa ?? 0}</span>
                </div>
              </div>
            </Card>

            {/* Presensi Guru */}
            <Card className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Presensi Guru</span>
                <span className="text-xs font-black text-emerald-600">{pr.guruPersen ?? 0}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Hadir</span>
                  <span className="font-black text-emerald-600">{pr.guruHadir ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Izin</span>
                  <span className="font-black text-blue-600">{pr.guruIzin ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Sakit</span>
                  <span className="font-black text-amber-600">{pr.guruSakit ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Alfa</span>
                  <span className="font-black text-rose-600">{pr.guruAlfa ?? 0}</span>
                </div>
              </div>
            </Card>

            {/* Presensi Pegawai */}
            <Card className="p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200">Presensi Pegawai</span>
                <span className="text-xs font-black text-teal-600">{pr.pegawaiPersen ?? 0}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Hadir</span>
                  <span className="font-black text-emerald-600">{pr.pegawaiHadir ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Izin</span>
                  <span className="font-black text-blue-600">{pr.pegawaiIzin ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Sakit</span>
                  <span className="font-black text-amber-600">{pr.pegawaiSakit ?? 0}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px]">
                  <span className="text-slate-400 block">Alfa</span>
                  <span className="font-black text-rose-600">{pr.pegawaiAlfa ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. Sektor Keuangan */}
      {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEUANGAN') && (
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Neraca & Arus Kas
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Kas Bersih</span>
              <span className="text-base font-black text-emerald-600 mt-0.5 block">
                {formatCurrency(fin.saldoKasSekolah ?? 0)}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pemasukan Lunas</span>
              <span className="text-base font-black text-blue-600 mt-0.5 block">
                {formatCurrency(fin.totalPemasukanLunas ?? 0)}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Piutang Siswa</span>
              <span className="text-base font-black text-amber-600 mt-0.5 block">
                {formatCurrency(fin.totalPiutangSiswa ?? 0)}
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pengeluaran</span>
              <span className="text-base font-black text-rose-600 mt-0.5 block">
                {formatCurrency(fin.totalPengeluaran ?? 0)}
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* 4. Sektor Kedisiplinan & Tata Tertib */}
      {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'KEDISIPLINAN') && (
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Kedisiplinan, Adab & Ibadah Siswa
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pelanggaran Ringan</span>
              <span className="text-lg font-black text-rose-600 mt-0.5 block">
                {execStats?.kedisiplinan?.pelanggaranRingan ?? 0} Kasus
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pelanggaran Berat / SP</span>
              <span className="text-lg font-black text-rose-700 mt-0.5 block">
                {execStats?.kedisiplinan?.pelanggaranBerat ?? 0} Kasus
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Sholat Dzuhur Berjamaah</span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                {execStats?.kedisiplinan?.dzuhurRate ?? 96}% Hadir
              </span>
            </Card>
            <Card className="p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Bimbingan Konseling</span>
              <span className="text-lg font-black text-purple-600 mt-0.5 block">
                {execStats?.kedisiplinan?.bimbinganKonseling ?? 0} Siswa
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* 5. Demografi Siswa */}
      {(selectedStatCategory === 'SEMUA' || selectedStatCategory === 'DEMOGRAFIS') && demo.gender?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block">
            Komposisi Gender & Program
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gender</span>
              <div className="space-y-1">
                {demo.gender?.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {g.name === 'L' ? 'Laki-Laki' : g.name === 'P' ? 'Perempuan' : g.name}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white">{g.count} Siswa</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Program Belajar</span>
              <div className="space-y-1">
                {demo.program?.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{p.name}</span>
                    <span className="font-black text-slate-900 dark:text-white">{p.count} Siswa</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
