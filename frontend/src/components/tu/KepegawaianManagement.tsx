'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  UserPlus,
  FileCheck,
  Award,
  CalendarDays,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  FileText,
  Building,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  Edit,
  Trash2,
  Eye,
  Download,
  Filter,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import Swal from 'sweetalert2'
import { CutiPegawaiManagement } from '@/app/(dashboard)/presensi/cuti/page'

// Interfaces
interface PelamarItem {
  id: string
  nama: string
  posisi: string
  pendidikanTerakhir: string
  noHp: string
  email: string
  tanggalLamar: string
  status: 'BERKAS_MASUK' | 'SELEKSI_ADMINISTRASI' | 'WAWANCARA' | 'DITERIMA' | 'DITOLAK'
  catatan?: string
  berkasUrl?: string
}

interface PegawaiItem {
  id: string
  nipNbm: string
  nama: string
  role: string
  subRole?: string
  statusKepegawaian: 'GURU_TETAP' | 'GURU_HONORER' | 'TETAP_YAYASAN' | 'KARYAWAN_KONTRAK'
  pendidikan: string
  phone: string
  email: string
  tanggalMasuk: string
  arsipSK: string
  arsipIjazah: string
}

interface EvaluasiKinerjaItem {
  id: string
  pegawaiId: string
  pegawaiNama: string
  periode: string
  skorPedagogik: number
  skorKepribadian: number
  skorSosial: number
  skorProfesional: number
  totalSkor: number
  predikat: 'SANGAT_BAIK' | 'BAIK' | 'CUKUP' | 'PERLU_PEMBINAAN'
  evaluator: string
  catatanPembinaan?: string
  tanggalEvaluasi: string
}

// Initial Mock Datasets
const INITIAL_PELAMAR: PelamarItem[] = [
  {
    id: 'PEL-001',
    nama: 'Ahmad Fauzi, S.Pd',
    posisi: 'Guru Matematika (SMA)',
    pendidikanTerakhir: 'S1 Pendidikan Matematika - UNY',
    noHp: '081234567890',
    email: 'fauzi.mat@gmail.com',
    tanggalLamar: '2026-08-20',
    status: 'SELEKSI_ADMINISTRASI',
    catatan: 'IPK 3.82, Sertifikat Microteaching & TOEFL 520.',
    berkasUrl: '#'
  },
  {
    id: 'PEL-002',
    nama: 'Siti Aminah, M.Pd',
    posisi: 'Guru Bahasa Inggris',
    pendidikanTerakhir: 'S2 Pendidikan Bahasa Inggris - UAD',
    noHp: '085712345678',
    email: 'siti.aminah@gmail.com',
    tanggalLamar: '2026-08-18',
    status: 'WAWANCARA',
    catatan: 'Jadwal wawancara dengan Kepala Sekolah tgl 26 Aug 2026.',
    berkasUrl: '#'
  },
  {
    id: 'PEL-003',
    nama: 'Budi Santoso, A.Md.Kom',
    posisi: 'Staf IT & Laboran Komputer',
    pendidikanTerakhir: 'D3 Teknik Informatika - Vokasi UGM',
    noHp: '088293733330',
    email: 'budi.laboran@gmail.com',
    tanggalLamar: '2026-08-15',
    status: 'DITERIMA',
    catatan: 'SK Pengangkatan Kontrak sedang diproses Administrasi.',
    berkasUrl: '#'
  }
]

const INITIAL_PEGAWAI: PegawaiItem[] = [
  {
    id: 'PEG-001',
    nipNbm: '19850412 201001 1 003',
    nama: 'Drs. H. Muhammad Nailar, M.Pd',
    role: 'GURU',
    subRole: 'KEPEGAWAIAN',
    statusKepegawaian: 'GURU_TETAP',
    pendidikan: 'S2 Manajemen Pendidikan',
    phone: '088293733330',
    email: 'nailar@simasmuh.sch.id',
    tanggalMasuk: '2010-07-15',
    arsipSK: 'SK_GTY_2010_Nailar.pdf',
    arsipIjazah: 'Ijazah_S2_Nailar.pdf'
  },
  {
    id: 'PEG-002',
    nipNbm: '19920815 201803 2 005',
    nama: 'Rina Wulandari, S.Si',
    role: 'GURU',
    subRole: 'WAKAKA_KURIKULUM',
    statusKepegawaian: 'GURU_TETAP',
    pendidikan: 'S1 Biologi - UGM',
    phone: '081398765432',
    email: 'rina.w@simasmuh.sch.id',
    tanggalMasuk: '2018-03-01',
    arsipSK: 'SK_GTY_2018_Rina.pdf',
    arsipIjazah: 'Ijazah_S1_Rina.pdf'
  },
  {
    id: 'PEG-003',
    nipNbm: 'NBM. 1298453',
    nama: 'Eko Prasetyo, S.Kom',
    role: 'ADMIN_TU',
    subRole: 'BAU',
    statusKepegawaian: 'TETAP_YAYASAN',
    pendidikan: 'S1 Sistem Informasi',
    phone: '085643210987',
    email: 'eko.tu@simasmuh.sch.id',
    tanggalMasuk: '2020-01-10',
    arsipSK: 'SK_Karyawan_Eko.pdf',
    arsipIjazah: 'Ijazah_S1_Eko.pdf'
  }
]

const INITIAL_EVALUASI: EvaluasiKinerjaItem[] = [
  {
    id: 'EV-001',
    pegawaiId: 'PEG-001',
    pegawaiNama: 'Drs. H. Muhammad Nailar, M.Pd',
    periode: 'Semester Genap 2025/2026',
    skorPedagogik: 92,
    skorKepribadian: 95,
    skorSosial: 90,
    skorProfesional: 94,
    totalSkor: 92.75,
    predikat: 'SANGAT_BAIK',
    evaluator: 'Kepala Sekolah & Tim Asesor',
    catatanPembinaan: 'Kinerja kepemimpinan dan pengajaran sangat memuaskan.',
    tanggalEvaluasi: '2026-06-20'
  },
  {
    id: 'EV-002',
    pegawaiId: 'PEG-002',
    pegawaiNama: 'Rina Wulandari, S.Si',
    periode: 'Semester Genap 2025/2026',
    skorPedagogik: 88,
    skorKepribadian: 90,
    skorSosial: 87,
    skorProfesional: 89,
    totalSkor: 88.5,
    predikat: 'BAIK',
    evaluator: 'Tim Asesor Kurikulum',
    catatanPembinaan: 'Pertahankan inovasi pembelajaran berbasis laboratorium.',
    tanggalEvaluasi: '2026-06-18'
  }
]

export function KepegawaianManagement() {
  const authenticatedFetch = useAuthenticatedFetch()
  const { data: session } = useSession()
  const user = session?.user as any

  // Tab Active State
  const [activeTab, setActiveTab] = useState<'database' | 'rekrutmen' | 'cuti' | 'evaluasi'>('database')

  // Datasets
  const [pelamarList, setPelamarList] = useState<PelamarItem[]>(INITIAL_PELAMAR)
  const [pegawaiList, setPegawaiList] = useState<PegawaiItem[]>(INITIAL_PEGAWAI)
  const [evaluasiList, setEvaluasiList] = useState<EvaluasiKinerjaItem[]>(INITIAL_EVALUASI)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog States
  const [showAddPelamarModal, setShowAddPelamarModal] = useState(false)
  const [showAddPegawaiModal, setShowAddPegawaiModal] = useState(false)
  const [showAddEvaluasiModal, setShowAddEvaluasiModal] = useState(false)

  // Form States - Pelamar Baru
  const [formPelamar, setFormPelamar] = useState({
    nama: '',
    posisi: '',
    pendidikanTerakhir: '',
    noHp: '',
    email: '',
    catatan: ''
  })

  // Form States - Pegawai Baru
  const [formPegawai, setFormPegawai] = useState({
    nipNbm: '',
    nama: '',
    role: 'GURU',
    subRole: 'TENAGA_PENDIDIK',
    statusKepegawaian: 'GURU_TETAP' as PegawaiItem['statusKepegawaian'],
    pendidikan: '',
    phone: '',
    email: '',
    tanggalMasuk: new Date().toISOString().split('T')[0]
  })

  // Form States - Evaluasi Kinerja
  const [formEvaluasi, setFormEvaluasi] = useState({
    pegawaiId: '',
    periode: 'Semester Ganjil 2026/2027',
    skorPedagogik: 85,
    skorKepribadian: 85,
    skorSosial: 85,
    skorProfesional: 85,
    catatanPembinaan: ''
  })

  // Handler Pelamar Baru
  const handleAddPelamar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPelamar.nama || !formPelamar.posisi) {
      Swal.fire('Peringatan', 'Nama pelamar dan posisi wajib diisi!', 'warning')
      return
    }

    const newPelamar: PelamarItem = {
      id: `PEL-${String(pelamarList.length + 1).padStart(3, '0')}`,
      nama: formPelamar.nama,
      posisi: formPelamar.posisi,
      pendidikanTerakhir: formPelamar.pendidikanTerakhir || 'S1 Pendidikan',
      noHp: formPelamar.noHp || '088293733330',
      email: formPelamar.email || 'pelamar@gmail.com',
      tanggalLamar: new Date().toISOString().split('T')[0],
      status: 'BERKAS_MASUK',
      catatan: formPelamar.catatan || 'Berkas lamaran diterima digital.'
    }

    setPelamarList([newPelamar, ...pelamarList])
    setShowAddPelamarModal(false)
    setFormPelamar({ nama: '', posisi: '', pendidikanTerakhir: '', noHp: '', email: '', catatan: '' })
    Swal.fire({
      icon: 'success',
      title: 'Pelamar Ditambahkan',
      text: `Berkas ${newPelamar.nama} berhasil terdaftar dalam alur rekrutmen.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  // Update Status Pelamar
  const handleUpdateStatusPelamar = (id: string, newStatus: PelamarItem['status']) => {
    setPelamarList(prev =>
      prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
    )
    Swal.fire({
      icon: 'success',
      title: 'Status Disimpan',
      text: `Status rekrutmen diperbarui menjadi ${newStatus.replace('_', ' ')}.`,
      timer: 1500,
      showConfirmButton: false
    })
  }

  // Terima Pelamar Jadi Pegawai
  const handlePromotePelamarToPegawai = (pelamar: PelamarItem) => {
    Swal.fire({
      title: 'Terima Sebagai Pegawai?',
      text: `Terima ${pelamar.nama} sebagai pegawai resmi sekolah?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Terima & Buat SK',
      cancelButtonText: 'Batal'
    }).then(result => {
      if (result.isConfirmed) {
        const newPegawai: PegawaiItem = {
          id: `PEG-${String(pegawaiList.length + 1).padStart(3, '0')}`,
          nipNbm: `NBM. ${Math.floor(100000 + Math.random() * 900000)}`,
          nama: pelamar.nama,
          role: pelamar.posisi.toLowerCase().includes('guru') ? 'GURU' : 'PEGAWAI',
          subRole: 'STAFF',
          statusKepegawaian: 'KARYAWAN_KONTRAK',
          pendidikan: pelamar.pendidikanTerakhir,
          phone: pelamar.noHp,
          email: pelamar.email,
          tanggalMasuk: new Date().toISOString().split('T')[0],
          arsipSK: `SK_Penerimaan_${pelamar.nama.replace(/\s+/g, '_')}.pdf`,
          arsipIjazah: `Ijazah_${pelamar.nama.replace(/\s+/g, '_')}.pdf`
        }

        setPegawaiList([newPegawai, ...pegawaiList])
        handleUpdateStatusPelamar(pelamar.id, 'DITERIMA')
        Swal.fire('Berhasil', `${pelamar.nama} resmi ditambahkan ke Database Pegawai Aktif.`, 'success')
      }
    })
  }

  // Handler Pegawai Baru
  const handleAddPegawai = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPegawai.nama || !formPegawai.nipNbm) {
      Swal.fire('Peringatan', 'Nama dan NIP/NBM wajib diisi!', 'warning')
      return
    }

    const newPegawai: PegawaiItem = {
      id: `PEG-${String(pegawaiList.length + 1).padStart(3, '0')}`,
      nipNbm: formPegawai.nipNbm,
      nama: formPegawai.nama,
      role: formPegawai.role,
      subRole: formPegawai.subRole,
      statusKepegawaian: formPegawai.statusKepegawaian,
      pendidikan: formPegawai.pendidikan || 'S1 Terapan',
      phone: formPegawai.phone || '088293733330',
      email: formPegawai.email || 'pegawai@simasmuh.sch.id',
      tanggalMasuk: formPegawai.tanggalMasuk,
      arsipSK: `SK_Pegawai_${formPegawai.nama.replace(/\s+/g, '_')}.pdf`,
      arsipIjazah: `Ijazah_${formPegawai.nama.replace(/\s+/g, '_')}.pdf`
    }

    setPegawaiList([newPegawai, ...pegawaiList])
    setShowAddPegawaiModal(false)
    setFormPegawai({
      nipNbm: '',
      nama: '',
      role: 'GURU',
      subRole: 'TENAGA_PENDIDIK',
      statusKepegawaian: 'GURU_TETAP',
      pendidikan: '',
      phone: '',
      email: '',
      tanggalMasuk: new Date().toISOString().split('T')[0]
    })

    Swal.fire({
      icon: 'success',
      title: 'Pegawai Ditambahkan',
      text: `Data ${newPegawai.nama} tersimpan di Database Kepegawaian.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  // Handler Evaluasi Kinerja Baru
  const handleAddEvaluasi = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEvaluasi.pegawaiId) {
      Swal.fire('Peringatan', 'Pilih pegawai yang dievaluasi!', 'warning')
      return
    }

    const pegawaiTarget = pegawaiList.find(p => p.id === formEvaluasi.pegawaiId)
    const total = (Number(formEvaluasi.skorPedagogik) + Number(formEvaluasi.skorKepribadian) + Number(formEvaluasi.skorSosial) + Number(formEvaluasi.skorProfesional)) / 4

    let predikat: EvaluasiKinerjaItem['predikat'] = 'CUKUP'
    if (total >= 90) predikat = 'SANGAT_BAIK'
    else if (total >= 80) predikat = 'BAIK'
    else if (total >= 70) predikat = 'CUKUP'
    else predikat = 'PERLU_PEMBINAAN'

    const newEv: EvaluasiKinerjaItem = {
      id: `EV-${String(evaluasiList.length + 1).padStart(3, '0')}`,
      pegawaiId: formEvaluasi.pegawaiId,
      pegawaiNama: pegawaiTarget?.nama || 'Pegawai SIMASMUH',
      periode: formEvaluasi.periode,
      skorPedagogik: Number(formEvaluasi.skorPedagogik),
      skorKepribadian: Number(formEvaluasi.skorKepribadian),
      skorSosial: Number(formEvaluasi.skorSosial),
      skorProfesional: Number(formEvaluasi.skorProfesional),
      totalSkor: Number(total.toFixed(2)),
      predikat: predikat,
      evaluator: user?.name || 'Superadmin SDM & Kepegawaian',
      catatanPembinaan: formEvaluasi.catatanPembinaan || 'Pertahankan performa dan tingkatkan disiplin.',
      tanggalEvaluasi: new Date().toISOString().split('T')[0]
    }

    setEvaluasiList([newEv, ...evaluasiList])
    setShowAddEvaluasiModal(false)
    Swal.fire({
      icon: 'success',
      title: 'Evaluasi Kinerja Tersimpan',
      text: `Penilaian kinerja ${newEv.pegawaiNama} meraih predikat ${newEv.predikat.replace('_', ' ')}.`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  // Filter List
  const filteredPegawai = pegawaiList.filter(p =>
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nipNbm.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPelamar = pelamarList.filter(p =>
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.posisi.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEvaluasi = evaluasiList.filter(e =>
    e.pegawaiNama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.periode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Banner Ringkas Dashboard Kepegawaian */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-purple-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-[11px]">
                SDM & HRD Terintegrasi
              </Badge>
              <span className="text-xs text-purple-300">Badan Administrasi Umum (BAU)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pusat Layanan & Manajemen Kepegawaian
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/80 max-w-2xl">
              Integrasi penuh 4 pilar SDM: Rekrutmen Digital, Database Arsip Pegawai, Cuti & Perizinan, serta Evaluasi Kinerja Pendidik & Karyawan.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-amber-300">{pelamarList.length}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Pelamar</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-emerald-400">{pegawaiList.length}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Pegawai</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-purple-300">Active</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Cuti System</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
              <div className="text-lg font-black text-cyan-300">{evaluasiList.length}</div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Evaluasi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons Tab Utama Kepegawaian */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="bg-transparent h-auto p-0 gap-1 grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`rounded-xl py-2 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'database'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Database Pegawai</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rekrutmen')}
              className={`rounded-xl py-2 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'rekrutmen'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Rekrutmen</span>
              {pelamarList.filter(p => p.status === 'BERKAS_MASUK').length > 0 && (
                <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px]">
                  {pelamarList.filter(p => p.status === 'BERKAS_MASUK').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cuti')}
              className={`rounded-xl py-2 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'cuti'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Cuti & Izin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('evaluasi')}
              className={`rounded-xl py-2 px-3.5 text-xs font-bold transition-all flex items-center gap-1.5 justify-center ${
                activeTab === 'evaluasi'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Evaluasi Kinerja</span>
            </button>
          </div>

          {/* Search Quick Input */}
          <div className="relative shrink-0 w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Cari pegawai / pelamar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        {/* TAB 1: DATABASE PEGAWAI */}
        {activeTab === 'database' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Arsip & Database Pegawai Aktif
                </h3>
                <p className="text-xs text-slate-500">
                  Penyimpanan terpusat SK Pengangkatan, ijazah, NIP/NBM, dan biodata tenaga pendidik serta kependidikan.
                </p>
              </div>
              <Button
                onClick={() => setShowAddPegawaiModal(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pegawai</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPegawai.map(peg => (
                <Card key={peg.id} className="border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-900 transition-all rounded-2xl shadow-xs">
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono mb-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                        {peg.nipNbm}
                      </Badge>
                      <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {peg.nama}
                      </CardTitle>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{peg.role} {peg.subRole ? `(${peg.subRole})` : ''}</span>
                      </div>
                    </div>
                    <Badge className={`text-[10px] uppercase font-bold shrink-0 ${
                      peg.statusKepegawaian.includes('GURU') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {peg.statusKepegawaian.replace('_', ' ')}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pendidikan:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{peg.pendidikan}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kontak WA:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{peg.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        <span>SK & Ijazah Digital</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 border-slate-200">
                          <Eye className="w-3 h-3 text-purple-600" />
                          <span>SK</span>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 border-slate-200">
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>Ijazah</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: REKRUTMEN PEGAWAI */}
        {activeTab === 'rekrutmen' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  Alur Seleksi & Rekrutmen Calon Pegawai
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola berkas lamaran, tahapan seleksi berkas, wawancara, hingga pengangkatan resmi.
                </p>
              </div>
              <Button
                onClick={() => setShowAddPelamarModal(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Input Pelamar Baru</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPelamar.map(pel => (
                <Card key={pel.id} className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono mb-1 bg-slate-100 dark:bg-slate-800 text-slate-600">
                        {pel.id} - {pel.tanggalLamar}
                      </Badge>
                      <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {pel.nama}
                      </CardTitle>
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">
                        {pel.posisi}
                      </div>
                    </div>

                    <Select
                      value={pel.status}
                      onValueChange={(val) => handleUpdateStatusPelamar(pel.id, val as any)}
                    >
                      <SelectTrigger className="h-8 text-[11px] font-bold w-40 rounded-xl bg-purple-50 dark:bg-purple-950/40 border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BERKAS_MASUK">BERKAS MASUK</SelectItem>
                        <SelectItem value="SELEKSI_ADMINISTRASI">SELEKSI ADMIN</SelectItem>
                        <SelectItem value="WAWANCARA">WAWANCARA</SelectItem>
                        <SelectItem value="DITERIMA">DITERIMA (SK)</SelectItem>
                        <SelectItem value="DITOLAK">DITOLAK</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 text-xs space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                      <div><span className="text-slate-400">Pendidikan:</span> <span className="font-semibold">{pel.pendidikanTerakhir}</span></div>
                      <div><span className="text-slate-400">Kontak/WA:</span> <span className="font-semibold">{pel.noHp} ({pel.email})</span></div>
                      {pel.catatan && (
                        <div className="text-purple-800 dark:text-purple-300 pt-1 italic border-t border-slate-200/50 mt-1">
                          "{pel.catatan}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">Tahap Terkini: <strong className="text-purple-700 dark:text-purple-300">{pel.status.replace('_', ' ')}</strong></span>
                      {pel.status !== 'DITERIMA' && (
                        <Button
                          onClick={() => handlePromotePelamarToPegawai(pel)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-7 gap-1 font-bold"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Terima Jadi Pegawai</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CUTI & IZIN KERJA (INTEGRASI FULL DENGAN MODUL CUTI PEGAWAI) */}
        {activeTab === 'cuti' && (
          <div className="mt-4 space-y-4">
            <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-purple-950 dark:text-purple-200 text-sm sm:text-base flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  Pusat Pengajuan & Verifikasi Cuti / Izin Pegawai
                </h3>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                  Pengajuan cuti khusus role Pegawai/Guru & Verifikasi SDM TU terhubung penuh secara real-time.
                </p>
              </div>
            </div>

            <CutiPegawaiManagement />
          </div>
        )}

        {/* TAB 4: EVALUASI KINERJA PEGAWAI */}
        {activeTab === 'evaluasi' && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Penilaian Kinerja Pendidik & Tenaga Kependidikan
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluasi kompetensi pedagogik, kepribadian, sosial, dan profesional berkala.
                </p>
              </div>
              <Button
                onClick={() => setShowAddEvaluasiModal(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Input Evaluasi Kinerja</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvaluasi.map(ev => (
                <Card key={ev.id} className="border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <Badge variant="outline" className="text-[10px] font-mono mb-1 bg-purple-50 text-purple-700 border-purple-200">
                        {ev.periode}
                      </Badge>
                      <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {ev.pegawaiNama}
                      </CardTitle>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Evaluator: {ev.evaluator} ({ev.tanggalEvaluasi})
                      </div>
                    </div>

                    <Badge className={`text-[10px] font-black ${
                      ev.predikat === 'SANGAT_BAIK' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300' :
                      ev.predikat === 'BAIK' ? 'bg-blue-500/10 text-blue-600 border-blue-300' : 'bg-amber-500/10 text-amber-600 border-amber-300'
                    }`}>
                      {ev.predikat.replace('_', ' ')}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 text-xs space-y-3">
                    <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400">Pedagogik</div>
                        <div className="text-xs font-black text-purple-700">{ev.skorPedagogik}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400">Kepribadian</div>
                        <div className="text-xs font-black text-purple-700">{ev.skorKepribadian}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400">Sosial</div>
                        <div className="text-xs font-black text-purple-700">{ev.skorSosial}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400">Profesional</div>
                        <div className="text-xs font-black text-purple-700">{ev.skorProfesional}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Skor Akhir Rata-rata:</span>
                      <span className="font-extrabold text-sm text-purple-600 dark:text-purple-400">{ev.totalSkor} / 100</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL INPUT PELAMAR */}
      <Dialog open={showAddPelamarModal} onOpenChange={setShowAddPelamarModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-600" />
              Input Berkas Pelamar Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan calon pegawai baru ke dalam alur rekrutmen SDM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPelamar} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Nama Lengkap & Gelar</Label>
              <Input
                placeholder="Contoh: Ahmad Fauzi, S.Pd"
                value={formPelamar.nama}
                onChange={(e) => setFormPelamar({ ...formPelamar, nama: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Posisi / Formasi</Label>
              <Input
                placeholder="Contoh: Guru Matematika / Staf Administrasi"
                value={formPelamar.posisi}
                onChange={(e) => setFormPelamar({ ...formPelamar, posisi: e.target.value })}
                className="mt-1 h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">No. WhatsApp</Label>
                <Input
                  placeholder="081234567890"
                  value={formPelamar.noHp}
                  onChange={(e) => setFormPelamar({ ...formPelamar, noHp: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Pendidikan Terakhir</Label>
                <Input
                  placeholder="S1 Pendidikan Matematika"
                  value={formPelamar.pendidikanTerakhir}
                  onChange={(e) => setFormPelamar({ ...formPelamar, pendidikanTerakhir: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Catatan Kualifikasi / Berkas</Label>
              <Textarea
                placeholder="Ringkasan berkas, IPK, sertifikat pendukung..."
                value={formPelamar.catatan}
                onChange={(e) => setFormPelamar({ ...formPelamar, catatan: e.target.value })}
                className="mt-1 rounded-xl text-xs h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddPelamarModal(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                Simpan Pelamar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL INPUT PEGAWAI */}
      <Dialog open={showAddPegawaiModal} onOpenChange={setShowAddPegawaiModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Tambah Data Pegawai Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan pegawai/guru baru ke database kepegawaian sekolah.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPegawai} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">NIP / NBM</Label>
                <Input
                  placeholder="19850412 201001 1 003"
                  value={formPegawai.nipNbm}
                  onChange={(e) => setFormPegawai({ ...formPegawai, nipNbm: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Nama Lengkap & Gelar</Label>
                <Input
                  placeholder="Drs. H. Muhammad Nailar, M.Pd"
                  value={formPegawai.nama}
                  onChange={(e) => setFormPegawai({ ...formPegawai, nama: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">Jabatan Utama (Role)</Label>
                <Select
                  value={formPegawai.role}
                  onValueChange={(val: string | null) => setFormPegawai({ ...formPegawai, role: val || 'GURU' })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GURU">GURU / PENDIDIK</SelectItem>
                    <SelectItem value="ADMIN_TU">ADMIN TATA USAHA</SelectItem>
                    <SelectItem value="PEGAWAI">PEGAWAI / STAF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Status Kepegawaian</Label>
                <Select
                  value={formPegawai.statusKepegawaian}
                  onValueChange={(val) => setFormPegawai({ ...formPegawai, statusKepegawaian: val as any })}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GURU_TETAP">GURU TETAP (GTY)</SelectItem>
                    <SelectItem value="GURU_HONORER">GURU HONORER (GTT)</SelectItem>
                    <SelectItem value="TETAP_YAYASAN">TETAP YAYASAN</SelectItem>
                    <SelectItem value="KARYAWAN_KONTRAK">KONTRAK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">No. WhatsApp</Label>
                <Input
                  placeholder="088293733330"
                  value={formPegawai.phone}
                  onChange={(e) => setFormPegawai({ ...formPegawai, phone: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Pendidikan Terakhir</Label>
                <Input
                  placeholder="S2 Manajemen Pendidikan"
                  value={formPegawai.pendidikan}
                  onChange={(e) => setFormPegawai({ ...formPegawai, pendidikan: e.target.value })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddPegawaiModal(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                Simpan Pegawai
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EVALUASI KINERJA */}
      <Dialog open={showAddEvaluasiModal} onOpenChange={setShowAddEvaluasiModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Input Penilaian Evaluasi Kinerja
            </DialogTitle>
            <DialogDescription className="text-xs">
              Beri nilai 1-100 pada tiap kompetensi pegawai.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEvaluasi} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Pilih Pegawai</Label>
              <Select
                value={formEvaluasi.pegawaiId}
                onValueChange={(val: string | null) => setFormEvaluasi({ ...formEvaluasi, pegawaiId: val || '' })}
              >
                <SelectTrigger className="mt-1 h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Pilih Pegawai / Guru..." />
                </SelectTrigger>
                <SelectContent>
                  {pegawaiList.map(peg => (
                    <SelectItem key={peg.id} value={peg.id}>
                      {peg.nama} ({peg.nipNbm})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">Skor Pedagogik (1-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formEvaluasi.skorPedagogik}
                  onChange={(e) => setFormEvaluasi({ ...formEvaluasi, skorPedagogik: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Skor Kepribadian (1-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formEvaluasi.skorKepribadian}
                  onChange={(e) => setFormEvaluasi({ ...formEvaluasi, skorKepribadian: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold">Skor Sosial (1-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formEvaluasi.skorSosial}
                  onChange={(e) => setFormEvaluasi({ ...formEvaluasi, skorSosial: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Skor Profesional (1-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formEvaluasi.skorProfesional}
                  onChange={(e) => setFormEvaluasi({ ...formEvaluasi, skorProfesional: Number(e.target.value) })}
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Catatan Pembinaan & Rekomendasi</Label>
              <Textarea
                placeholder="Catatan rekomendasi pengembangan profesi..."
                value={formEvaluasi.catatanPembinaan}
                onChange={(e) => setFormEvaluasi({ ...formEvaluasi, catatanPembinaan: e.target.value })}
                className="mt-1 rounded-xl text-xs h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddEvaluasiModal(false)} className="rounded-xl text-xs">
                Batal
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                Simpan Penilaian
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
