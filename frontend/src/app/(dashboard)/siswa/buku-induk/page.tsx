'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { 
  Printer, BookMarked, Lock, User, Sparkles, RefreshCw, Eye,
  Upload, Loader2, Save, ShieldAlert, Activity, MapPin,
  GraduationCap, Users, Image as ImageIcon, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { BukuIndukPrintDialog } from '@/components/academic/BukuIndukPrintDialog'
import { BukuIndukData } from '@/components/academic/BukuIndukSheet'
import { compressImageFile } from '@/utils/imageCompressor'
import Swal from 'sweetalert2'

interface StudentProfile {
  id: string
  nis: string
  nisn?: string | null
  gender?: string | null
  program?: string | null
  classId?: string | null
  gelombang?: string | null
  jalurPendaftaran?: string | null
  bioData?: any
  class?: {
    id: string
    name: string
  } | null
  user?: {
    id: string
    name: string
    avatarUrl?: string | null
    address?: string | null
    phone?: string | null
  } | null
}

const defaultBioData = {
  // A. KETERANGAN TENTANG DIRI PESERTA DIDIK
  namaPanggilan: '',
  tempatLahir: '',
  tglLahir: '',
  agama: 'Islam',
  kewarganegaraan: 'WNI',
  anakKe: '',
  jmlSaudaraKandung: '0',
  jmlSaudaraTiri: '0',
  jmlSaudaraAngkat: '0',
  statusYatim: '-',
  bahasa: 'Bahasa Indonesia',

  // B. KETERANGAN TEMPAT TINGGAL
  alamat: '',
  telp: '',
  tinggalDengan: 'Orang Tua',
  jarakSekolah: '',

  // C. KETERANGAN KESEHATAN
  golDarah: '-',
  penyakitPernah: 'Tidak Ada',
  kelainanJasmani: 'Tidak Ada',
  tinggiBadan: '',
  beratBadan: '',

  // D. KETERANGAN PENDIDIKAN
  lulusanDari: '',
  tamatanDari: '',
  tglIjazahSmp: '',
  noIjazahSmp: '',
  noSttb: '',
  tglSttb: '',
  tglStlSmp: '',
  noStlSmp: '',
  noSkhun: '',
  tglSkhun: '',
  lamaBelajar: '3',
  pindahanDariSekolah: '',
  alasanPindah: '',
  diterimaDiKelas: '',
  kelompokProgStudi: '',
  tglDiterima: '',

  // E. KETERANGAN TENTANG AYAH KANDUNG
  namaAyah: '',
  ttlAyah: '',
  tempatLahirAyah: '',
  tglLahirAyah: '',
  agamaAyah: 'Islam',
  kewarganegaraanAyah: 'WNI',
  pendidikanAyah: '',
  pekerjaanAyah: '',
  pengeluaranAyah: '',
  penghasilanAyah: '',
  alamatAyah: '',
  telpAyah: '',
  statusAyah: 'Masih Hidup',

  // F. KETERANGAN TENTANG IBU KANDUNG
  namaIbu: '',
  ttlIbu: '',
  tempatLahirIbu: '',
  tglLahirIbu: '',
  agamaIbu: 'Islam',
  kewarganegaraanIbu: 'WNI',
  pendidikanIbu: '',
  pekerjaanIbu: '',
  pengeluaranIbu: '',
  penghasilanIbu: '',
  alamatIbu: '',
  telpIbu: '',
  statusIbu: 'Masih Hidup',

  // G. KETERANGAN TENTANG WALI
  namaWali: '',
  ttlWali: '',
  tempatLahirWali: '',
  tglLahirWali: '',
  agamaWali: '',
  kewarganegaraanWali: '',
  pendidikanWali: '',
  pekerjaanWali: '',
  pengeluaranWali: '',
  penghasilanWali: '',
  alamatWali: '',
  telpWali: '',
  hubunganKeluarga: '',

  // H. KEGEMARAN PESERTA DIDIK
  kesenian: '',
  olahraga: '',
  organisasi: '',
  lainLain: '',

  // I. KETERANGAN PERKEMBANGAN PESERTA DIDIK
  beasiswa: '',
  meninggalkanSekolahTgl: '',
  meninggalkanSekolahAlasan: '',
  akhirPendidikanTamat: '',
  akhirPendidikanIjazahNo: '',
  akhirPendidikanSttbNo: '',

  // J. SETELAH SELESAI PENDIDIKAN
  melanjutkanKe: '',
  bekerjaDi: '',
  bekerjaTglMulai: '',
  bekerjaPenghasilan: '',

  // 4 FOTO PERIODE
  fotoMendaftar: '',
  fotoDiterima: '',
  fotoTamat: '',
  fotoMeninggalkan: '',
}

export default function SiswaBukuIndukPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H_I_J' | 'FOTO'>('A')
  const [formData, setFormData] = useState<any>(defaultBioData)
  const [isPrintOpen, setIsPrintOpen] = useState(false)
  const [isUploading, setIsUploading] = useState<string | null>(null)

  const userId = (session?.user as any)?.id

  // 1. Fetch data profil siswa
  const { data: student, isLoading, refetch } = useQuery<StudentProfile | null>({
    queryKey: ['student-buku-induk-profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const res = await authenticatedQuery(`/api-backend/students/by-user/${userId}`)
      return res
    },
    enabled: !!userId,
  })

  // Sinkronisasi data ke state formulir saat student dimuat
  useEffect(() => {
    if (student) {
      let parsedBio = {}
      if (student.bioData) {
        try {
          parsedBio = typeof student.bioData === 'string' ? JSON.parse(student.bioData) : student.bioData
        } catch (e) {
          console.error('Error parsing student bioData:', e)
        }
      }

      setFormData({
        ...defaultBioData,
        ...parsedBio,
        alamat: (parsedBio as any).alamat || student.user?.address || '',
        telp: (parsedBio as any).telp || student.user?.phone || '',
        fotoDiterima: (parsedBio as any).fotoDiterima || student.user?.avatarUrl || '',
      })
    }
  }, [student])

  // Hitung persentase kelengkapan data
  const completeness = useMemo(() => {
    const totalFields = 25
    let filled = 0
    if (formData.namaPanggilan) filled++
    if (formData.tempatLahir) filled++
    if (formData.tglLahir) filled++
    if (formData.agama) filled++
    if (formData.anakKe) filled++
    if (formData.bahasa) filled++
    if (formData.alamat) filled++
    if (formData.tinggalDengan) filled++
    if (formData.golDarah && formData.golDarah !== '-') filled++
    if (formData.tinggiBadan) filled++
    if (formData.beratBadan) filled++
    if (formData.lulusanDari) filled++
    if (formData.noIjazahSmp) filled++
    if (formData.tglIjazahSmp) filled++
    if (formData.namaAyah) filled++
    if (formData.pekerjaanAyah) filled++
    if (formData.penghasilanAyah) filled++
    if (formData.namaIbu) filled++
    if (formData.pekerjaanIbu) filled++
    if (formData.penghasilanIbu) filled++
    if (formData.kesenian || formData.olahraga || formData.organisasi) filled++
    if (formData.fotoDiterima || student?.user?.avatarUrl) filled++
    if (formData.jarakSekolah) filled++
    if (formData.pendidikanAyah) filled++
    if (formData.pendidikanIbu) filled++

    return Math.min(100, Math.round((filled / totalFields) * 100))
  }, [formData, student])

  // Handler input perubahan data
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  // Handler upload pasfoto
  const handleImageUpload = async (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(field)
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 800, quality: 0.8 })
      const formPayload = new FormData()
      formPayload.append('file', compressed.file)

      const res = await authenticatedFetch('/api-backend/upload', {
        method: 'POST',
        body: formPayload,
      })

      if (!res.ok) throw new Error('Gagal mengunggah foto')
      const data = await res.json()
      const url = data.url || data.secure_url || data.filePath

      setFormData((prev: any) => ({ ...prev, [field]: url }))

      Swal.fire({
        icon: 'success',
        title: 'Foto Berhasil Diunggah',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Gagal',
        text: err.message || 'Terjadi kesalahan saat mengunggah foto.',
      })
    } finally {
      setIsUploading(null)
    }
  }

  // Mutation simpan biodata
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!student?.id) throw new Error('Data siswa tidak ditemukan')
      const res = await authenticatedFetch(`/api-backend/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bioData: formData,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan perubahan buku induk')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-buku-induk-profile', userId] })
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disimpan',
        text: 'Data buku induk Anda telah diperbarui dan tersimpan di sistem.',
        confirmButtonColor: '#10b981',
      })
    },
    onError: (err: any) => {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan pada server.',
      })
    },
  })

  // Format data untuk BukuIndukPrintDialog & BukuIndukSheet
  const printData: BukuIndukData | null = useMemo(() => {
    if (!student) return null
    return {
      name: student.user?.name || student.nis || '-',
      nisn: student.nisn || student.nis || '-',
      nis: student.nis || '-',
      gender: student.gender === 'L' || student.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
      className: student.class?.name || '-',
      program: student.program || null,
      userAvatar: formData.fotoDiterima || student.user?.avatarUrl || null,
      ...formData,
      namaAyah: formData.namaAyah || '',
      namaIbu: formData.namaIbu || '',
    }
  }, [student, formData])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600">Memuat data Buku Induk Siswa...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Data Siswa Tidak Ditemukan</h2>
        <p className="text-sm text-slate-600 mt-1 mb-4">
          Akun Anda belum terhubung dengan data profil siswa aktif di SIMASMUH. Silakan hubungi bagian Tata Usaha (TU).
        </p>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Buku Induk Saya</h1>
              <p className="text-xs text-slate-500">
                Lengkapi dan perbarui data lembar Buku Induk Siswa resmi (57 butir isian standar nasional).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsPrintOpen(true)}
            className="flex-1 sm:flex-none gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Lembar F4</span>
          </Button>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 sm:flex-none gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Perubahan</span>
          </Button>
        </div>
      </div>

      {/* Banner Ringkasan Profil Resmi Siswa & Indikator Kelengkapan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Kartu Identitas Resmi Terproteksi */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-16 h-20 bg-slate-700 rounded-xl border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-md">
                {formData.fotoDiterima || student.user?.avatarUrl ? (
                  <img
                    src={formData.fotoDiterima || student.user?.avatarUrl || ''}
                    alt={student.user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 p-1 rounded-full text-white shadow">
                <Lock className="w-3 h-3" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white truncate">{student.user?.name}</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terproteksi
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-slate-300">
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">NIS</p>
                  <p className="font-semibold text-white mt-0.5">{student.nis || '-'}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">NISN</p>
                  <p className="font-semibold text-white mt-0.5">{student.nisn || '-'}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Kelas</p>
                  <p className="font-semibold text-emerald-300 mt-0.5">{student.class?.name || '-'}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Gender</p>
                  <p className="font-semibold text-white mt-0.5">
                    {student.gender === 'L' || student.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kartu Progress Kelengkapan & Bantuan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Kelengkapan Biodata</span>
              <span className="text-sm font-bold text-emerald-600">{completeness}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              {completeness >= 90
                ? 'Biodata Buku Induk Anda hampir lengkap sempurna. Pastikan seluruh tanggal dan nomor dokumen akurat.'
                : 'Mohon lengkapi data tempat tanggal lahir, asal sekolah, nama & pekerjaan orang tua, serta pasfoto.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> Data Resmi Terverifikasi
            </span>
            <span>Standar Dikdasmen</span>
          </div>
        </div>
      </div>

      {/* Tab Navigasi Form 57 Butir */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 p-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setActiveTab('A')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'A'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>A. Diri Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('B')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'B'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>B. Tempat Tinggal</span>
            </button>

            <button
              onClick={() => setActiveTab('C')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'C'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>C. Kesehatan</span>
            </button>

            <button
              onClick={() => setActiveTab('D')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'D'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>D. Pendidikan Asal</span>
            </button>

            <button
              onClick={() => setActiveTab('E')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'E'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>E. Ayah Kandung</span>
            </button>

            <button
              onClick={() => setActiveTab('F')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'F'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>F. Ibu Kandung</span>
            </button>

            <button
              onClick={() => setActiveTab('G')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'G'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>G. Wali</span>
            </button>

            <button
              onClick={() => setActiveTab('H_I_J')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'H_I_J'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>H, I, J. Perkembangan</span>
            </button>

            <button
              onClick={() => setActiveTab('FOTO')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'FOTO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>4 Pasfoto Periode</span>
            </button>
          </div>
        </div>

        {/* Form Content Berdasarkan Tab Aktif */}
        <div className="p-6">
          {/* TAB A: KETERANGAN TENTANG DIRI PESERTA DIDIK */}
          {activeTab === 'A' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  A. Keterangan Tentang Diri Peserta Didik
                </h3>
                <p className="text-xs text-slate-500">Butir 1 s.d. 11 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">1. Nama Lengkap (Sesuai Ijazah)</Label>
                  <div className="relative mt-1">
                    <Input
                      value={student.user?.name || ''}
                      disabled
                      className="bg-slate-50 font-medium text-slate-600 border-slate-200 cursor-not-allowed pr-8"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Terkunci resmi oleh Tata Usaha</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nama Panggilan</Label>
                  <Input
                    value={formData.namaPanggilan || ''}
                    onChange={(e) => handleInputChange('namaPanggilan', e.target.value)}
                    placeholder="Contoh: Budi / Siti"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">2. Jenis Kelamin</Label>
                  <Input
                    value={student.gender === 'L' || student.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    disabled
                    className="bg-slate-50 font-medium text-slate-600 border-slate-200 cursor-not-allowed mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">3. Tempat Lahir</Label>
                    <Input
                      value={formData.tempatLahir || ''}
                      onChange={(e) => handleInputChange('tempatLahir', e.target.value)}
                      placeholder="Contoh: Ponorogo"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tanggal Lahir</Label>
                    <Input
                      value={formData.tglLahir || ''}
                      onChange={(e) => handleInputChange('tglLahir', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">4. Agama</Label>
                  <Select
                    value={formData.agama || 'Islam'}
                    onValueChange={(val) => handleInputChange('agama', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Kristen">Kristen</SelectItem>
                      <SelectItem value="Katolik">Katolik</SelectItem>
                      <SelectItem value="Hindu">Hindu</SelectItem>
                      <SelectItem value="Buddha">Buddha</SelectItem>
                      <SelectItem value="Konghucu">Konghucu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">5. Kewarganegaraan</Label>
                  <Input
                    value={formData.kewarganegaraan || 'WNI'}
                    onChange={(e) => handleInputChange('kewarganegaraan', e.target.value)}
                    placeholder="WNI"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">6. Anak Keberapa</Label>
                  <Input
                    value={formData.anakKe || ''}
                    onChange={(e) => handleInputChange('anakKe', e.target.value)}
                    placeholder="Contoh: 1, 2, dst"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">7. Sdr Kandung</Label>
                    <Input
                      value={formData.jmlSaudaraKandung || '0'}
                      onChange={(e) => handleInputChange('jmlSaudaraKandung', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Sdr Tiri</Label>
                    <Input
                      value={formData.jmlSaudaraTiri || '0'}
                      onChange={(e) => handleInputChange('jmlSaudaraTiri', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Sdr Angkat</Label>
                    <Input
                      value={formData.jmlSaudaraAngkat || '0'}
                      onChange={(e) => handleInputChange('jmlSaudaraAngkat', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">8. Anak Yatim / Piatu / Yatim Piatu</Label>
                  <Select
                    value={formData.statusYatim || '-'}
                    onValueChange={(val) => handleInputChange('statusYatim', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- (Lengkap)</SelectItem>
                      <SelectItem value="Yatim">Yatim (Ayah Wafat)</SelectItem>
                      <SelectItem value="Piatu">Piatu (Ibu Wafat)</SelectItem>
                      <SelectItem value="Yatim Piatu">Yatim Piatu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">9. Bahasa Sehari-hari</Label>
                  <div className="space-y-1.5 mt-1">
                    <Select
                      value={(() => {
                        const b = (formData.bahasa || '').trim()
                        if (b === 'Bahasa Indonesia' || b === 'Bahasa Inggris' || b === 'Bahasa Arab') return b
                        if (b) return 'DAERAH'
                        return 'Bahasa Indonesia'
                      })()}
                      onValueChange={(val) => {
                        if (val === 'DAERAH') {
                          handleInputChange('bahasa', formData.bahasa && !['Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Arab'].includes(formData.bahasa) ? formData.bahasa : 'Bahasa Jawa')
                        } else {
                          handleInputChange('bahasa', val)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Bahasa Sehari-hari" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bahasa Indonesia">Bahasa Indonesia</SelectItem>
                        <SelectItem value="DAERAH">Bahasa Daerah (Dapat Diisi Manual)</SelectItem>
                        <SelectItem value="Bahasa Inggris">Bahasa Inggris</SelectItem>
                        <SelectItem value="Bahasa Arab">Bahasa Arab</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Jika memilih Bahasa Daerah / Kustom, input manual muncul */}
                    {(!['Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Arab'].includes((formData.bahasa || '').trim())) && (
                      <Input
                        value={formData.bahasa || ''}
                        onChange={(e) => handleInputChange('bahasa', e.target.value)}
                        placeholder="Ketik nama bahasa daerah (contoh: Bahasa Jawa / Sunda)"
                        className="text-xs mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: KETERANGAN TEMPAT TINGGAL */}
          {activeTab === 'B' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  B. Keterangan Tempat Tinggal
                </h3>
                <p className="text-xs text-slate-500">Butir 12 s.d. 15 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">10. Alamat Lengkap Tempat Tinggal</Label>
                  <Input
                    value={formData.alamat || ''}
                    onChange={(e) => handleInputChange('alamat', e.target.value)}
                    placeholder="Contoh: Jl. Ahmad Dahlan No. 10, RT 01 / RW 02, Ponorogo"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">11. No. Telepon / HP / WhatsApp</Label>
                  <Input
                    value={formData.telp || ''}
                    onChange={(e) => handleInputChange('telp', e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">12. Tinggal Dengan</Label>
                  <Select
                    value={formData.tinggalDengan || 'Orang Tua'}
                    onValueChange={(val) => handleInputChange('tinggalDengan', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                      <SelectItem value="Wali / Saudara">Wali / Saudara</SelectItem>
                      <SelectItem value="Asrama / Pondok">Asrama / Pondok Pesantren</SelectItem>
                      <SelectItem value="Kost / Sendiri">Kost / Sendiri</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">13. Jarak Tempat Tinggal ke Sekolah</Label>
                  <Input
                    value={formData.jarakSekolah || ''}
                    onChange={(e) => handleInputChange('jarakSekolah', e.target.value)}
                    placeholder="Contoh: 2 Km / Kurang dari 1 Km"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB C: KETERANGAN KESEHATAN */}
          {activeTab === 'C' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  C. Keterangan Kesehatan
                </h3>
                <p className="text-xs text-slate-500">Butir 16 s.d. 19 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">14. Golongan Darah</Label>
                  <Select
                    value={formData.golDarah || '-'}
                    onValueChange={(val) => handleInputChange('golDarah', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Golongan Darah" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- (Belum Tahu)</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="AB">AB</SelectItem>
                      <SelectItem value="O">O</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">15. Penyakit yang Pernah Diderita</Label>
                  <Input
                    value={formData.penyakitPernah || 'Tidak Ada'}
                    onChange={(e) => handleInputChange('penyakitPernah', e.target.value)}
                    placeholder="Contoh: Asma, Tipes, atau Tidak Ada"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">16. Kelainan Jasmani</Label>
                  <Input
                    value={formData.kelainanJasmani || 'Tidak Ada'}
                    onChange={(e) => handleInputChange('kelainanJasmani', e.target.value)}
                    placeholder="Contoh: Tidak Ada / Minus"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">17. Tinggi Badan (cm)</Label>
                    <Input
                      value={formData.tinggiBadan || ''}
                      onChange={(e) => handleInputChange('tinggiBadan', e.target.value)}
                      placeholder="Contoh: 165"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Berat Badan (kg)</Label>
                    <Input
                      value={formData.beratBadan || ''}
                      onChange={(e) => handleInputChange('beratBadan', e.target.value)}
                      placeholder="Contoh: 55"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB D: KETERANGAN PENDIDIKAN ASAL */}
          {activeTab === 'D' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  D. Keterangan Pendidikan Sebelumnya
                </h3>
                <p className="text-xs text-slate-500">Butir 20 s.d. 22 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">18. Lulusan / Tamatan Dari (SMP/MTs)</Label>
                  <Input
                    value={formData.lulusanDari || ''}
                    onChange={(e) => handleInputChange('lulusanDari', e.target.value)}
                    placeholder="Contoh: SMP Muhammadiyah 1 Ponorogo / MTsN 1 Ponorogo"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tanggal Ijazah / STTB SMP</Label>
                  <Input
                    value={formData.tglIjazahSmp || ''}
                    onChange={(e) => handleInputChange('tglIjazahSmp', e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nomor Ijazah / STTB SMP</Label>
                  <Input
                    value={formData.noIjazahSmp || ''}
                    onChange={(e) => handleInputChange('noIjazahSmp', e.target.value)}
                    placeholder="Contoh: DN-05/D-SMP/13/0012345"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tanggal SKHUN / STL</Label>
                  <Input
                    value={formData.tglSkhun || ''}
                    onChange={(e) => handleInputChange('tglSkhun', e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nomor SKHUN / STL</Label>
                  <Input
                    value={formData.noSkhun || ''}
                    onChange={(e) => handleInputChange('noSkhun', e.target.value)}
                    placeholder="Nomor SKHUN"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Lama Belajar di SMP/MTs (Tahun)</Label>
                  <Input
                    value={formData.lamaBelajar || '3'}
                    onChange={(e) => handleInputChange('lamaBelajar', e.target.value)}
                    placeholder="3"
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Jika Siswa Pindahan:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Pindahan Dari Sekolah</Label>
                      <Input
                        value={formData.pindahanDariSekolah || ''}
                        onChange={(e) => handleInputChange('pindahanDariSekolah', e.target.value)}
                        placeholder="Nama SMA/SMK asal jika pindahan"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600">Alasan Pindah</Label>
                      <Input
                        value={formData.alasanPindah || ''}
                        onChange={(e) => handleInputChange('alasanPindah', e.target.value)}
                        placeholder="Contoh: Mengikuti domisili orang tua"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB E: KETERANGAN TENTANG AYAH KANDUNG */}
          {activeTab === 'E' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  E. Keterangan Tentang Ayah Kandung
                </h3>
                <p className="text-xs text-slate-500">Butir 23 s.d. 35 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">20. Nama Lengkap Ayah Kandung</Label>
                  <Input
                    value={formData.namaAyah || ''}
                    onChange={(e) => handleInputChange('namaAyah', e.target.value)}
                    placeholder="Nama lengkap Ayah"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">21. Tempat Lahir Ayah</Label>
                    <Input
                      value={formData.tempatLahirAyah || ''}
                      onChange={(e) => handleInputChange('tempatLahirAyah', e.target.value)}
                      placeholder="Tempat Lahir"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tanggal Lahir Ayah</Label>
                    <Input
                      value={formData.tglLahirAyah || ''}
                      onChange={(e) => handleInputChange('tglLahirAyah', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">22. Agama Ayah</Label>
                  <Input
                    value={formData.agamaAyah || 'Islam'}
                    onChange={(e) => handleInputChange('agamaAyah', e.target.value)}
                    placeholder="Islam"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">23. Kewarganegaraan Ayah</Label>
                  <Input
                    value={formData.kewarganegaraanAyah || 'WNI'}
                    onChange={(e) => handleInputChange('kewarganegaraanAyah', e.target.value)}
                    placeholder="WNI"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">24. Pendidikan Tertinggi Ayah</Label>
                  <Select
                    value={formData.pendidikanAyah || ''}
                    onValueChange={(val) => handleInputChange('pendidikanAyah', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Pendidikan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD / Sederajat">SD / Sederajat</SelectItem>
                      <SelectItem value="SMP / Sederajat">SMP / Sederajat</SelectItem>
                      <SelectItem value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</SelectItem>
                      <SelectItem value="Diploma (D1-D3)">Diploma (D1-D3)</SelectItem>
                      <SelectItem value="Sarjana (S1)">Sarjana (S1)</SelectItem>
                      <SelectItem value="Magister (S2)">Magister (S2)</SelectItem>
                      <SelectItem value="Doktor (S3)">Doktor (S3)</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">25. Pekerjaan Ayah</Label>
                  <Input
                    value={formData.pekerjaanAyah || ''}
                    onChange={(e) => handleInputChange('pekerjaanAyah', e.target.value)}
                    placeholder="Contoh: PNS / Wiraswasta / Petani / Karyawan Swasta"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">26. Penghasilan Per Bulan</Label>
                  <Input
                    value={formData.penghasilanAyah || ''}
                    onChange={(e) => handleInputChange('penghasilanAyah', e.target.value)}
                    placeholder="Contoh: Rp 3.000.000 - Rp 5.000.000"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">27. Status Keberadaan Ayah</Label>
                  <Select
                    value={formData.statusAyah || 'Masih Hidup'}
                    onValueChange={(val) => handleInputChange('statusAyah', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                      <SelectItem value="Meninggal Dunia">Meninggal Dunia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">28. Alamat & No. HP Ayah</Label>
                  <Input
                    value={formData.alamatAyah || ''}
                    onChange={(e) => handleInputChange('alamatAyah', e.target.value)}
                    placeholder="Alamat domisili ayah jika berbeda dengan siswa"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB F: KETERANGAN TENTANG IBU KANDUNG */}
          {activeTab === 'F' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  F. Keterangan Tentang Ibu Kandung
                </h3>
                <p className="text-xs text-slate-500">Butir 36 s.d. 48 Lembar Buku Induk</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">29. Nama Lengkap Ibu Kandung</Label>
                  <Input
                    value={formData.namaIbu || ''}
                    onChange={(e) => handleInputChange('namaIbu', e.target.value)}
                    placeholder="Nama lengkap Ibu"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">30. Tempat Lahir Ibu</Label>
                    <Input
                      value={formData.tempatLahirIbu || ''}
                      onChange={(e) => handleInputChange('tempatLahirIbu', e.target.value)}
                      placeholder="Tempat Lahir"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tanggal Lahir Ibu</Label>
                    <Input
                      value={formData.tglLahirIbu || ''}
                      onChange={(e) => handleInputChange('tglLahirIbu', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">31. Agama Ibu</Label>
                  <Input
                    value={formData.agamaIbu || 'Islam'}
                    onChange={(e) => handleInputChange('agamaIbu', e.target.value)}
                    placeholder="Islam"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">32. Kewarganegaraan Ibu</Label>
                  <Input
                    value={formData.kewarganegaraanIbu || 'WNI'}
                    onChange={(e) => handleInputChange('kewarganegaraanIbu', e.target.value)}
                    placeholder="WNI"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">33. Pendidikan Tertinggi Ibu</Label>
                  <Select
                    value={formData.pendidikanIbu || ''}
                    onValueChange={(val) => handleInputChange('pendidikanIbu', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Pendidikan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SD / Sederajat">SD / Sederajat</SelectItem>
                      <SelectItem value="SMP / Sederajat">SMP / Sederajat</SelectItem>
                      <SelectItem value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</SelectItem>
                      <SelectItem value="Diploma (D1-D3)">Diploma (D1-D3)</SelectItem>
                      <SelectItem value="Sarjana (S1)">Sarjana (S1)</SelectItem>
                      <SelectItem value="Magister (S2)">Magister (S2)</SelectItem>
                      <SelectItem value="Doktor (S3)">Doktor (S3)</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">34. Pekerjaan Ibu</Label>
                  <Input
                    value={formData.pekerjaanIbu || ''}
                    onChange={(e) => handleInputChange('pekerjaanIbu', e.target.value)}
                    placeholder="Contoh: Ibu Rumah Tangga / PNS / Wiraswasta"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">35. Penghasilan Per Bulan</Label>
                  <Input
                    value={formData.penghasilanIbu || ''}
                    onChange={(e) => handleInputChange('penghasilanIbu', e.target.value)}
                    placeholder="Contoh: Tidak Berpenghasilan / Rp 2.000.000"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">36. Status Keberadaan Ibu</Label>
                  <Select
                    value={formData.statusIbu || 'Masih Hidup'}
                    onValueChange={(val) => handleInputChange('statusIbu', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih Status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                      <SelectItem value="Meninggal Dunia">Meninggal Dunia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">37. Alamat & No. HP Ibu</Label>
                  <Input
                    value={formData.alamatIbu || ''}
                    onChange={(e) => handleInputChange('alamatIbu', e.target.value)}
                    placeholder="Alamat domisili ibu jika berbeda dengan siswa"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB G: KETERANGAN TENTANG WALI */}
          {activeTab === 'G' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  G. Keterangan Tentang Wali
                </h3>
                <p className="text-xs text-slate-500">Opsional jika tinggal bersama wali / keluarga</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">38. Nama Lengkap Wali</Label>
                  <Input
                    value={formData.namaWali || ''}
                    onChange={(e) => handleInputChange('namaWali', e.target.value)}
                    placeholder="Nama Lengkap Wali (kosongkan jika bersama orang tua)"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">39. Hubungan Keluarga</Label>
                  <Input
                    value={formData.hubunganKeluarga || ''}
                    onChange={(e) => handleInputChange('hubunganKeluarga', e.target.value)}
                    placeholder="Contoh: Paman / Kakek / Kakak Kandung"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tempat Lahir Wali</Label>
                    <Input
                      value={formData.tempatLahirWali || ''}
                      onChange={(e) => handleInputChange('tempatLahirWali', e.target.value)}
                      placeholder="Tempat Lahir"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tanggal Lahir Wali</Label>
                    <Input
                      value={formData.tglLahirWali || ''}
                      onChange={(e) => handleInputChange('tglLahirWali', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">40. Pendidikan Tertinggi Wali</Label>
                  <Input
                    value={formData.pendidikanWali || ''}
                    onChange={(e) => handleInputChange('pendidikanWali', e.target.value)}
                    placeholder="Contoh: S1 / SMA"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">41. Pekerjaan Wali</Label>
                  <Input
                    value={formData.pekerjaanWali || ''}
                    onChange={(e) => handleInputChange('pekerjaanWali', e.target.value)}
                    placeholder="Pekerjaan Wali"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">42. Penghasilan Per Bulan Wali</Label>
                  <Input
                    value={formData.penghasilanWali || ''}
                    onChange={(e) => handleInputChange('penghasilanWali', e.target.value)}
                    placeholder="Penghasilan"
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">43. Alamat Lengkap & No. HP Wali</Label>
                  <Input
                    value={formData.alamatWali || ''}
                    onChange={(e) => handleInputChange('alamatWali', e.target.value)}
                    placeholder="Alamat wali"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB H, I, J: KEGEMARAN & PERKEMBANGAN */}
          {activeTab === 'H_I_J' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <div className="border-b border-slate-100 pb-2 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    H. Kegemaran Peserta Didik
                  </h3>
                  <p className="text-xs text-slate-500">Butir 49 s.d. 52 Lembar Buku Induk</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">44. Kesenian</Label>
                    <Input
                      value={formData.kesenian || ''}
                      onChange={(e) => handleInputChange('kesenian', e.target.value)}
                      placeholder="Contoh: Seni Musik / Kaligrafi / Tari"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">45. Olahraga</Label>
                    <Input
                      value={formData.olahraga || ''}
                      onChange={(e) => handleInputChange('olahraga', e.target.value)}
                      placeholder="Contoh: Futsal / Bulutangkis / Renang"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">46. Organisasi / Kemasyarakatan</Label>
                    <Input
                      value={formData.organisasi || ''}
                      onChange={(e) => handleInputChange('organisasi', e.target.value)}
                      placeholder="Contoh: IPM / HW / OSIS / Pramuka"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">47. Lain-lain</Label>
                    <Input
                      value={formData.lainLain || ''}
                      onChange={(e) => handleInputChange('lainLain', e.target.value)}
                      placeholder="Hobi / Minat lainnya"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="border-b border-slate-100 pb-2 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    I & J. Perkembangan & Rencana Masa Depan
                  </h3>
                  <p className="text-xs text-slate-500">Butir 53 s.d. 57 Lembar Buku Induk</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">48. Beasiswa yang Pernah Diterima</Label>
                    <Input
                      value={formData.beasiswa || ''}
                      onChange={(e) => handleInputChange('beasiswa', e.target.value)}
                      placeholder="Contoh: Beasiswa Prestasi / KIP / Lazismu"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">49. Rencana Melanjutkan Ke Perguruan Tinggi</Label>
                    <Input
                      value={formData.melanjutkanKe || ''}
                      onChange={(e) => handleInputChange('melanjutkanKe', e.target.value)}
                      placeholder="Contoh: Universitas Muhammadiyah Ponorogo / UB / ITS"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB FOTO: 4 PASFOTO PERIODE */}
          {activeTab === 'FOTO' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Pasfoto 4 Periode Buku Induk (3 × 4 cm)
                </h3>
                <p className="text-xs text-slate-500">
                  Foto saat diterima diambil dari foto profil sekolah. Siswa dapat memperbarui pasfoto resolusi jernih dengan seragam resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* 1. Foto Saat Mendaftar */}
                <div className="flex flex-col items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 mb-2">1. Waktu Mendaftar</span>
                  <div className="w-28 h-36 bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {formData.fotoMendaftar ? (
                      <img
                        src={formData.fotoMendaftar}
                        alt="Foto Mendaftar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400">Belum ada foto</span>
                      </div>
                    )}

                    {isUploading === 'fotoMendaftar' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="mt-3 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('fotoMendaftar', e)}
                      disabled={isUploading === 'fotoMendaftar'}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" /> Unggah Foto
                    </span>
                  </label>
                </div>

                {/* 2. Foto Saat Diterima */}
                <div className="flex flex-col items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs font-bold text-emerald-900">2. Waktu Diterima</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Utama</span>
                  </div>
                  <div className="w-28 h-36 bg-white rounded-xl border-2 border-emerald-300 overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {formData.fotoDiterima || student.user?.avatarUrl ? (
                      <img
                        src={formData.fotoDiterima || student.user?.avatarUrl || ''}
                        alt="Foto Diterima"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-emerald-300 mx-auto mb-1" />
                        <span className="text-[10px] text-emerald-600">Foto Profil Utama</span>
                      </div>
                    )}

                    {isUploading === 'fotoDiterima' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="mt-3 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('fotoDiterima', e)}
                      disabled={isUploading === 'fotoDiterima'}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" /> Ganti Foto
                    </span>
                  </label>
                </div>

                {/* 3. Foto Tamat Belajar */}
                <div className="flex flex-col items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 mb-2">3. Waktu Tamat</span>
                  <div className="w-28 h-36 bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {formData.fotoTamat ? (
                      <img
                        src={formData.fotoTamat}
                        alt="Foto Tamat"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400">Saat Kelulusan</span>
                      </div>
                    )}

                    {isUploading === 'fotoTamat' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="mt-3 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('fotoTamat', e)}
                      disabled={isUploading === 'fotoTamat'}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" /> Unggah Foto
                    </span>
                  </label>
                </div>

                {/* 4. Foto Meninggalkan Sekolah */}
                <div className="flex flex-col items-center bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 mb-2">4. Meninggalkan Sekolah</span>
                  <div className="w-28 h-36 bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {formData.fotoMeninggalkan ? (
                      <img
                        src={formData.fotoMeninggalkan}
                        alt="Foto Meninggalkan"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400">Opsional Pindahan</span>
                      </div>
                    )}

                    {isUploading === 'fotoMeninggalkan' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  <label className="mt-3 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('fotoMeninggalkan', e)}
                      disabled={isUploading === 'fotoMeninggalkan'}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
                      <Upload className="w-3.5 h-3.5" /> Unggah Foto
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Tombol Simpan */}
        <div className="bg-slate-50/80 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Perubahan data akan langsung tersinkronisasi ke basis data Buku Induk Sekolah.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsPrintOpen(true)}
              className="gap-2 flex-1 sm:flex-none border-slate-300"
            >
              <Eye className="w-4 h-4" /> Pratinjau Lembar F4
            </Button>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2 flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Perubahan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Cetak F4 Landscape */}
      {printData && (
        <BukuIndukPrintDialog
          open={isPrintOpen}
          onOpenChange={setIsPrintOpen}
          studentDataList={[printData]}
        />
      )}
    </div>
  )
}
