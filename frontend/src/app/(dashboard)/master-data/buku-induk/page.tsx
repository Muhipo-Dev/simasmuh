'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { 
  Printer, Search, Filter, BookOpen, BookMarked, UserCheck, 
  CheckCircle2, AlertCircle, Image as ImageIcon, Users, 
  Sparkles, FileText, CheckSquare, Square, RefreshCw, Eye,
  Pencil, Upload, Loader2, Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { BukuIndukPrintDialog } from '@/components/academic/BukuIndukPrintDialog'
import { BukuIndukData } from '@/components/academic/BukuIndukSheet'
import { compressImageFile } from '@/utils/imageCompressor'
import Swal from 'sweetalert2'

interface StudentItem {
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

interface ClassItem {
  id: string
  name: string
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
  bahasa: 'Indonesia / Jawa',

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
  pekerjaanIbu: 'Ibu Rumah Tangga',
  pengeluaranIbu: '',
  penghasilanIbu: '',
  alamatIbu: '',
  telpIbu: '',
  statusIbu: 'Masih Hidup',

  // G. KETERANGAN TENTANG WALI
  namaWali: '',
  ttlWali: '',
  agamaWali: '',
  kewarganegaraanWali: 'WNI',
  pendidikanWali: '',
  pekerjaanWali: '',
  pengeluaranWali: '',
  alamatWali: '',
  telpWali: '',

  // H. KEGEMARAN PESERTA DIDIK
  kesenian: '',
  olahRaga: '',
  organisasi: '',
  kemasyarakatan: '',
  kegemaranLain: '',

  // I. KETERANGAN PERKEMBANGAN PESERTA DIDIK
  menerimaBeasiswa: '',
  tglMeninggalkanSekolah: '',
  alasanMeninggalkan: '',
  tamatBelajar: '',
  noIjazahLulus: '',
  sttbNomor: '',
  noStlLulus: '',
  nilaiRataRata: '',

  // J. KETERANGAN SETELAH SELESAI PENDIDIKAN
  melanjutkanDi: '',
  bekerja: '',
  tglMulaiBekerja: '',
  namaPerusahaan: '',
  penghasilanKerja: '',

  // 4 FOTO BUKU INDUK PERIODE
  fotoMendaftar: '',
  fotoDiterima: '',
  fotoLulus: '',
  fotoMeninggalkan: '',
}

export default function BukuIndukPage() {
  const { data: session } = useSession()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE'>('ALL')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Modal Print State
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [targetStudentsForPrint, setTargetStudentsForPrint] = useState<BukuIndukData[]>([])

  // Modal Edit Biodata State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'identitas' | 'tinggal_kesehatan' | 'pendidikan' | 'orangtua' | 'perkembangan_foto'>('identitas')
  const [isUploadingFoto, setIsUploadingFoto] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    nisn: string
    nis: string
    name: string
    gender: string
    classId: string
    program: string
    gelombang: string
    jalurPendaftaran: string
    bioData: typeof defaultBioData
  }>({
    nisn: '',
    nis: '',
    name: '',
    gender: 'L',
    classId: '',
    program: '',
    gelombang: 'Gelombang 1',
    jalurPendaftaran: 'Mandiri',
    bioData: { ...defaultBioData }
  })

  // Fetch Data Siswa
  const { 
    data: students = [], 
    isLoading: isLoadingStudents, 
    refetch: refetchStudents 
  } = useQuery<StudentItem[]>({
    queryKey: ['buku-induk-students'],
    queryFn: async () => {
      const res = await authenticatedQuery('/api-backend/students')
      return Array.isArray(res) ? res : res?.data || []
    },
    staleTime: 1000 * 30,
  })

  // Fetch Data Kelas
  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ['buku-induk-classes'],
    queryFn: async () => {
      const res = await authenticatedQuery('/api-backend/classes')
      return Array.isArray(res) ? res : res?.data || []
    },
    staleTime: 1000 * 60 * 5,
  })

  // Mutasi Update Data Siswa
  const updateStudentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch(`/api-backend/students/${editingStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.message || 'Gagal menyimpan perubahan biodata buku induk')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buku-induk-students'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setIsEditDialogOpen(false)
      Swal.fire({
        icon: 'success',
        title: 'Biodata Disimpan',
        text: 'Data buku induk siswa berhasil diperbarui.',
        timer: 1800,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    }
  })

  const handleOpenEdit = (st: StudentItem) => {
    let parsedBio: any = {}
    try {
      parsedBio = typeof st.bioData === 'string' ? JSON.parse(st.bioData) : st.bioData || {}
    } catch {
      parsedBio = {}
    }

    setEditingStudentId(st.id)
    setFormData({
      nisn: st.nisn || '',
      nis: st.nis || '',
      name: st.user?.name || '',
      gender: st.gender || 'L',
      classId: st.classId || '',
      program: st.program || '',
      gelombang: st.gelombang || 'Gelombang 1',
      jalurPendaftaran: st.jalurPendaftaran || 'Mandiri',
      bioData: {
        ...defaultBioData,
        ...parsedBio,
        alamat: parsedBio.alamat || st.user?.address || '',
        telp: parsedBio.telp || st.user?.phone || '',
      }
    })
    setActiveTab('identitas')
    setIsEditDialogOpen(true)
  }

  const updateBio = (field: keyof typeof defaultBioData, value: any) => {
    setFormData(prev => ({
      ...prev,
      bioData: {
        ...prev.bioData,
        [field]: value
      }
    }))
  }

  const handleUploadFoto = async (fotoKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingFoto(fotoKey)
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 800, quality: 0.8 })
      const formPayload = new FormData()
      formPayload.append('file', compressed.file)

      const uploadRes = await authenticatedFetch('/api-backend/upload', {
        method: 'POST',
        body: formPayload
      })

      if (!uploadRes.ok) throw new Error('Gagal mengunggah foto')
      const uploadData = await uploadRes.json()
      const uploadedUrl = uploadData.url || uploadData.filePath

      updateBio(fotoKey as any, uploadedUrl)
      Swal.fire({
        icon: 'success',
        title: 'Foto Terunggah',
        text: 'Pasfoto berhasil disimpan.',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (err: any) {
      Swal.fire('Gagal Unggah', err.message || 'Gagal mengunggah foto', 'error')
    } finally {
      setIsUploadingFoto(null)
      e.target.value = ''
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudentId) return
    updateStudentMutation.mutate({
      nisn: formData.nisn,
      nis: formData.nis,
      name: formData.name,
      gender: formData.gender,
      classId: formData.classId,
      program: formData.program || null,
      gelombang: formData.gelombang,
      jalurPendaftaran: formData.jalurPendaftaran,
      bioData: JSON.stringify(formData.bioData),
    })
  }

  // Helper Konversi Student ke BukuIndukData
  const convertStudentToBukuInduk = (st: StudentItem): BukuIndukData => {
    let bio: any = {}
    try {
      bio = typeof st.bioData === 'string' ? JSON.parse(st.bioData) : st.bioData || {}
    } catch {
      bio = {}
    }

    return {
      name: st.user?.name || '-',
      nisn: st.nisn || '-',
      nis: st.nis || '-',
      gender: st.gender || 'L',
      program: st.program || bio?.program || '',
      className: st.class?.name || '',
      userAvatar: st.user?.avatarUrl || null,

      // A. Diri
      namaPanggilan: bio?.namaPanggilan || '',
      tempatLahir: bio?.tempatLahir || '',
      tglLahir: bio?.tglLahir || '',
      agama: bio?.agama || 'Islam',
      kewarganegaraan: bio?.kewarganegaraan || 'WNI',
      anakKe: bio?.anakKe ?? '',
      jmlSaudaraKandung: bio?.jmlSaudaraKandung ?? '',
      jmlSaudaraTiri: bio?.jmlSaudaraTiri ?? '',
      jmlSaudaraAngkat: bio?.jmlSaudaraAngkat ?? '',
      statusYatim: bio?.statusYatim || '',
      bahasa: bio?.bahasa || 'Indonesia / Jawa',

      // B. Tempat Tinggal
      alamat: bio?.alamat || st.user?.address || '',
      telp: bio?.telp || st.user?.phone || '',
      tinggalDengan: bio?.tinggalDengan || 'Orang Tua',
      jarakSekolah: bio?.jarakSekolah || '',

      // C. Kesehatan
      golDarah: bio?.golDarah || '',
      penyakitPernah: bio?.penyakitPernah || 'Tidak Ada',
      kelainanJasmani: bio?.kelainanJasmani || 'Tidak Ada',
      tinggiBadan: bio?.tinggiBadan || '',
      beratBadan: bio?.beratBadan || '',

      // D. Pendidikan
      lulusanDari: bio?.lulusanDari || bio?.tamatanDari || '',
      tamatanDari: bio?.tamatanDari || bio?.lulusanDari || '',
      tglIjazahSmp: bio?.tglIjazahSmp || bio?.tglSttb || '',
      noIjazahSmp: bio?.noIjazahSmp || bio?.noSttb || '',
      noSttb: bio?.noSttb || bio?.noIjazahSmp || '',
      tglSttb: bio?.tglSttb || bio?.tglIjazahSmp || '',
      tglStlSmp: bio?.tglStlSmp || bio?.tglSkhun || '',
      noStlSmp: bio?.noStlSmp || bio?.noSkhun || '',
      noSkhun: bio?.noSkhun || bio?.noStlSmp || '',
      tglSkhun: bio?.tglSkhun || bio?.tglStlSmp || '',
      lamaBelajar: bio?.lamaBelajar || '3 Tahun',
      pindahanDariSekolah: bio?.pindahanDariSekolah || '',
      alasanPindah: bio?.alasanPindah || '',
      diterimaDiKelas: bio?.diterimaDiKelas || st.class?.name || '',
      kelompokProgStudi: bio?.kelompokProgStudi || st.program || '',
      tglDiterima: bio?.tglDiterima || '',

      // E. Ayah
      namaAyah: bio?.namaAyah || '',
      ttlAyah: bio?.ttlAyah || '',
      tempatLahirAyah: bio?.tempatLahirAyah || '',
      tglLahirAyah: bio?.tglLahirAyah || '',
      agamaAyah: bio?.agamaAyah || 'Islam',
      kewarganegaraanAyah: bio?.kewarganegaraanAyah || 'WNI',
      pendidikanAyah: bio?.pendidikanAyah || '',
      pekerjaanAyah: bio?.pekerjaanAyah || '',
      pengeluaranAyah: bio?.pengeluaranAyah || bio?.penghasilanAyah || '',
      penghasilanAyah: bio?.penghasilanAyah || '',
      alamatAyah: bio?.alamatAyah || '',
      telpAyah: bio?.telpAyah || '',
      statusAyah: bio?.statusAyah || 'Masih Hidup',

      // F. Ibu
      namaIbu: bio?.namaIbu || '',
      ttlIbu: bio?.ttlIbu || '',
      tempatLahirIbu: bio?.tempatLahirIbu || '',
      tglLahirIbu: bio?.tglLahirIbu || '',
      agamaIbu: bio?.agamaIbu || 'Islam',
      kewarganegaraanIbu: bio?.kewarganegaraanIbu || 'WNI',
      pendidikanIbu: bio?.pendidikanIbu || '',
      pekerjaanIbu: bio?.pekerjaanIbu || 'Ibu Rumah Tangga',
      pengeluaranIbu: bio?.pengeluaranIbu || bio?.penghasilanIbu || '',
      penghasilanIbu: bio?.penghasilanIbu || '',
      alamatIbu: bio?.alamatIbu || '',
      telpIbu: bio?.telpIbu || '',
      statusIbu: bio?.statusIbu || 'Masih Hidup',

      // G. Wali
      namaWali: bio?.namaWali || '',
      ttlWali: bio?.ttlWali || '',
      agamaWali: bio?.agamaWali || '',
      kewarganegaraanWali: bio?.kewarganegaraanWali || 'WNI',
      pendidikanWali: bio?.pendidikanWali || '',
      pekerjaanWali: bio?.pekerjaanWali || '',
      pengeluaranWali: bio?.pengeluaranWali || '',
      alamatWali: bio?.alamatWali || '',
      telpWali: bio?.telpWali || '',

      // H. Kegemaran
      kesenian: bio?.kesenian || '',
      olahRaga: bio?.olahRaga || '',
      organisasi: bio?.organisasi || bio?.kemasyarakatan || '',
      kemasyarakatan: bio?.kemasyarakatan || '',
      kegemaranLain: bio?.kegemaranLain || '',

      // I. Perkembangan
      menerimaBeasiswa: bio?.menerimaBeasiswa || '',
      tglMeninggalkanSekolah: bio?.tglMeninggalkanSekolah || '',
      alasanMeninggalkan: bio?.alasanMeninggalkan || '',
      tamatBelajar: bio?.tamatBelajar || '',
      noIjazahLulus: bio?.noIjazahLulus || bio?.sttbNomor || '',
      sttbNomor: bio?.sttbNomor || bio?.noIjazahLulus || '',
      noStlLulus: bio?.noStlLulus || '',
      nilaiRataRata: bio?.nilaiRataRata || '',

      // J. Pasca Pendidikan
      melanjutkanDi: bio?.melanjutkanDi || '',
      bekerja: bio?.bekerja || '',
      tglMulaiBekerja: bio?.tglMulaiBekerja || '',
      namaPerusahaan: bio?.namaPerusahaan || '',
      penghasilanKerja: bio?.penghasilanKerja || '',

      // Foto 4 Periode
      fotoMendaftar: bio?.fotoMendaftar || null,
      fotoDiterima: bio?.fotoDiterima || null,
      fotoLulus: bio?.fotoLulus || null,
      fotoMeninggalkan: bio?.fotoMeninggalkan || null,
    }
  }

  // Filter Data Siswa
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      // Filter Kelas
      if (selectedClassId !== 'ALL' && st.classId !== selectedClassId) {
        return false
      }

      // Filter Pencarian (Nama, NIS, NISN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = st.user?.name?.toLowerCase().includes(q)
        const matchNis = st.nis?.toLowerCase().includes(q)
        const matchNisn = st.nisn?.toLowerCase().includes(q)
        if (!matchName && !matchNis && !matchNisn) return false
      }

      // Filter Kelengkapan Biodata (Cek nama ayah, ibu, tempat lahir)
      if (statusFilter !== 'ALL') {
        let bio: any = {}
        try {
          bio = typeof st.bioData === 'string' ? JSON.parse(st.bioData) : st.bioData || {}
        } catch { bio = {} }
        const isComplete = !!(bio?.namaAyah && bio?.namaIbu && (bio?.tempatLahir || st.user?.address))
        if (statusFilter === 'COMPLETE' && !isComplete) return false
        if (statusFilter === 'INCOMPLETE' && isComplete) return false
      }

      return true
    })
  }, [students, selectedClassId, searchQuery, statusFilter])

  // Handlers Cetak
  const handlePrintSingle = (student: StudentItem) => {
    const formatted = convertStudentToBukuInduk(student)
    setTargetStudentsForPrint([formatted])
    setIsPrintDialogOpen(true)
  }

  const handlePrintSearchResults = () => {
    if (filteredStudents.length === 0) return
    const formatted = filteredStudents.map(convertStudentToBukuInduk)
    setTargetStudentsForPrint(formatted)
    setIsPrintDialogOpen(true)
  }

  const handlePrintBulk = () => {
    const selected = students.filter(s => selectedStudentIds.includes(s.id))
    if (selected.length === 0) return
    const formatted = selected.map(convertStudentToBukuInduk)
    setTargetStudentsForPrint(formatted)
    setIsPrintDialogOpen(true)
  }

  const handlePrintCurrentClass = () => {
    if (filteredStudents.length === 0) return
    const formatted = filteredStudents.map(convertStudentToBukuInduk)
    setTargetStudentsForPrint(formatted)
    setIsPrintDialogOpen(true)
  }

  // Checkbox Selection
  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id))
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Ringkasan Statistik
  const totalCount = filteredStudents.length
  const selectedCount = selectedStudentIds.length

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Cetak Buku Induk Siswa
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                K-Merdeka SMA (F4)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Modul Tata Usaha (TU) untuk input biodata lengkap (A-J, 57 butir) dan pencetakan fisik Lembar Buku Induk.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStudents()}
            className="text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingStudents ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>

          {/* Tombol Cetak Sesuai Kondisi */}
          {searchQuery.trim() && filteredStudents.length > 0 ? (
            <Button
              size="sm"
              onClick={handlePrintSearchResults}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs animate-pulse"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak Siswa yang Dicari ({filteredStudents.length})
            </Button>
          ) : selectedClassId !== 'ALL' && filteredStudents.length > 0 ? (
            <Button
              size="sm"
              onClick={handlePrintCurrentClass}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Cetak Rombel Ini ({filteredStudents.length})
            </Button>
          ) : null}
        </div>
      </div>

      {/* Control Bar: Pencarian Real-Time & Filter Kelas */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Kolom Kiri: Input Search & Filter Rombel */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Input Pencarian Siswa */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, NIS, atau NISN..."
                className="pl-9 pr-8 text-xs h-9.5 rounded-xl border-slate-200 dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Rombel Kelas */}
            <div className="w-full sm:w-48">
              <Select value={selectedClassId} onValueChange={(v) => setSelectedClassId(v || 'ALL')}>
                <SelectTrigger className="text-xs h-9.5">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kelas ({classes.length})</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Kelas {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status Biodata */}
            <div className="w-full sm:w-44">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="text-xs h-9.5">
                  <SelectValue placeholder="Status Biodata" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status Data</SelectItem>
                  <SelectItem value="COMPLETE">Biodata Terisi</SelectItem>
                  <SelectItem value="INCOMPLETE">Biodata Belum Lengkap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kolom Kanan: Tombol Aksi Serentak Pilihan Checkbox */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end bg-blue-50 dark:bg-blue-950/40 p-1.5 px-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shrink-0">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                {selectedCount} siswa dipilih
              </span>
              <Button
                size="sm"
                onClick={handlePrintBulk}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Cetak F4 Serentak ({selectedCount})
              </Button>
            </div>
          )}
        </div>

        {/* Info Pencarian Aktif */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Hasil pencarian untuk kata kunci <strong className="text-blue-600 dark:text-blue-400">"{searchQuery}"</strong> : {filteredStudents.length} siswa ditemukan.
              </span>
            </div>
            {filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={handlePrintSearchResults}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                Cetak hasil ini
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabel Data Siswa Siap Cetak */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300"
                  >
                    {selectedCount > 0 && selectedCount === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">NIS & NISN</th>
                <th className="p-3">Nama Lengkap Siswa</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Status Biodata</th>
                <th className="p-3">Foto Buku Induk</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {isLoadingStudents ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-600" />
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Tidak ditemukan data siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  let bio: any = {}
                  try {
                    bio = typeof st.bioData === 'string' ? JSON.parse(st.bioData) : st.bioData || {}
                  } catch { bio = {} }

                  const hasParent = !!(bio?.namaAyah || bio?.namaIbu)
                  const hasPhoto = !!(bio?.fotoMendaftar || bio?.fotoDiterima || st.user?.avatarUrl)
                  const isSelected = selectedStudentIds.includes(st.id)

                  return (
                    <tr 
                      key={st.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(st.id)}
                          className="flex items-center justify-center mx-auto"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div>{st.nis}</div>
                        <div className="text-[10px] text-slate-400 font-normal font-sans">
                          NISN: {st.nisn || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {st.user?.name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {st.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          {bio?.tempatLahir ? ` • ${bio.tempatLahir}` : ''}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                        {st.class?.name || '-'}
                      </td>
                      <td className="p-3">
                        {hasParent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            Biodata Terisi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                            <AlertCircle className="w-3 h-3" />
                            Sebagian Belum
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {hasPhoto ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                            <ImageIcon className="w-3 h-3" />
                            Ada Foto
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Belum Ada Foto
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(st)}
                            className="text-xs font-semibold h-8 border-slate-200 dark:border-slate-700"
                            title="Ubah Biodata Lengkap Buku Induk"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-300" />
                            Ubah Data
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePrintSingle(st)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Cetak F4
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Edit Biodata Buku Induk Lengkap (A s.d. J) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
          <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pr-12 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Ubah Data Buku Induk Siswa
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola data pokok, biodata lengkap A s.d. J (57 Butir), data orang tua, dan 4 pasfoto buku induk.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (5 Tab Compact & Jelas) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 px-4 pt-2 gap-1 overflow-x-auto text-xs font-semibold shrink-0 custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('identitas')}
                className={`py-2 px-3.5 rounded-t-lg transition-all shrink-0 ${
                  activeTab === 'identitas'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                1. Identitas Pokok & Diri
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tinggal_kesehatan')}
                className={`py-2 px-3.5 rounded-t-lg transition-all shrink-0 ${
                  activeTab === 'tinggal_kesehatan'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2. Tinggal & Kesehatan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pendidikan')}
                className={`py-2 px-3.5 rounded-t-lg transition-all shrink-0 ${
                  activeTab === 'pendidikan'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                3. Pendidikan Asal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orangtua')}
                className={`py-2 px-3.5 rounded-t-lg transition-all shrink-0 ${
                  activeTab === 'orangtua'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                4. Orang Tua & Wali
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('perkembangan_foto')}
                className={`py-2 px-3.5 rounded-t-lg transition-all shrink-0 ${
                  activeTab === 'perkembangan_foto'
                    ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold border-t-2 border-blue-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                5. Perkembangan & Pasfoto
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 custom-scrollbar min-h-0">
              {/* TAB 1: IDENTITAS POKOK & DIRI SISWA */}
              {activeTab === 'identitas' && (
                <div className="space-y-4.5">
                  {/* Blok Utama: Data Pokok Sekolah */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/60 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                        Identitas Pokok Siswa (Akun & Rombel)
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Dikelola oleh Tata Usaha / Admin
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Nama Lengkap Siswa *
                        </Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          placeholder="Nama Lengkap Siswa Sesuai Ijazah" 
                          required 
                          className="uppercase font-bold text-xs bg-white dark:bg-slate-900 h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Jenis Kelamin *
                        </Label>
                        <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v || 'L'})}>
                          <SelectTrigger className="text-xs bg-white dark:bg-slate-900 h-9">
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="L">Laki-laki (L)</SelectItem>
                            <SelectItem value="P">Perempuan (P)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          NIS (Nomor Induk) *
                        </Label>
                        <Input 
                          value={formData.nis} 
                          onChange={(e) => setFormData({...formData, nis: e.target.value})} 
                          placeholder="Contoh: 13555" 
                          required 
                          className="font-mono text-xs bg-white dark:bg-slate-900 h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          NISN
                        </Label>
                        <Input 
                          value={formData.nisn} 
                          onChange={(e) => setFormData({...formData, nisn: e.target.value})} 
                          placeholder="NISN Nasional" 
                          className="font-mono text-xs bg-white dark:bg-slate-900 h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Rombel / Kelas *
                        </Label>
                        <Select value={formData.classId} onValueChange={(v) => setFormData({...formData, classId: v || ''})}>
                          <SelectTrigger className="text-xs bg-white dark:bg-slate-900 h-9">
                            <SelectValue placeholder="Pilih Kelas">
                              {classes.find(c => c.id === formData.classId)?.name || 'Pilih Kelas'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map(c => (
                              <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Bagian A: Biodata Diri Peserta Didik */}
                  <div className="space-y-3 pt-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      A. KETERANGAN TENTANG DIRI PESERTA DIDIK
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">1. Nama Panggilan</Label>
                        <Input value={formData.bioData.namaPanggilan} onChange={e => updateBio('namaPanggilan', e.target.value)} placeholder="Contoh: Budi" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">4. Agama</Label>
                        <Select value={formData.bioData.agama} onValueChange={v => updateBio('agama', v)}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Agama" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Islam">Islam</SelectItem>
                            <SelectItem value="Kristen">Kristen</SelectItem>
                            <SelectItem value="Katolik">Katolik</SelectItem>
                            <SelectItem value="Hindu">Hindu</SelectItem>
                            <SelectItem value="Buddha">Buddha</SelectItem>
                            <SelectItem value="Khonghucu">Khonghucu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold">3. Tempat Lahir</Label>
                        <Input value={formData.bioData.tempatLahir} onChange={e => updateBio('tempatLahir', e.target.value)} placeholder="Ponorogo" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Tanggal Lahir</Label>
                        <Input type="date" value={formData.bioData.tglLahir} onChange={e => updateBio('tglLahir', e.target.value)} className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">5. Kewarganegaraan</Label>
                        <Input value={formData.bioData.kewarganegaraan} onChange={e => updateBio('kewarganegaraan', e.target.value)} placeholder="WNI" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">11. Bahasa Sehari-hari di Rumah</Label>
                        <div className="space-y-1.5">
                          <Select
                            value={(() => {
                              const b = (formData.bioData.bahasa || '').trim()
                              if (b === 'Bahasa Indonesia' || b === 'Bahasa Inggris' || b === 'Bahasa Arab') return b
                              if (b) return 'DAERAH'
                              return 'Bahasa Indonesia'
                            })()}
                            onValueChange={(val) => {
                              if (val === 'DAERAH') {
                                updateBio('bahasa', formData.bioData.bahasa && !['Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Arab'].includes(formData.bioData.bahasa) ? formData.bioData.bahasa : 'Bahasa Jawa')
                              } else {
                                updateBio('bahasa', val)
                              }
                            }}
                          >
                            <SelectTrigger className="text-xs h-9">
                              <SelectValue placeholder="Pilih Bahasa" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bahasa Indonesia">Bahasa Indonesia</SelectItem>
                              <SelectItem value="DAERAH">Bahasa Daerah (Dapat Diisi Manual)</SelectItem>
                              <SelectItem value="Bahasa Inggris">Bahasa Inggris</SelectItem>
                              <SelectItem value="Bahasa Arab">Bahasa Arab</SelectItem>
                            </SelectContent>
                          </Select>
                          {(!['Bahasa Indonesia', 'Bahasa Inggris', 'Bahasa Arab'].includes((formData.bioData.bahasa || '').trim())) && (
                            <Input
                              value={formData.bioData.bahasa || ''}
                              onChange={e => updateBio('bahasa', e.target.value)}
                              placeholder="Ketik bahasa daerah (contoh: Bahasa Jawa / Sunda)"
                              className="text-xs h-8.5 mt-1"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">6. Anak Ke</Label>
                        <Input type="number" min="1" value={formData.bioData.anakKe} onChange={e => updateBio('anakKe', e.target.value)} placeholder="1" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">7. Sdr Kandung</Label>
                        <Input type="number" min="0" value={formData.bioData.jmlSaudaraKandung} onChange={e => updateBio('jmlSaudaraKandung', e.target.value)} placeholder="0" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">8. Sdr Tiri</Label>
                        <Input type="number" min="0" value={formData.bioData.jmlSaudaraTiri} onChange={e => updateBio('jmlSaudaraTiri', e.target.value)} placeholder="0" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">9. Sdr Angkat</Label>
                        <Input type="number" min="0" value={formData.bioData.jmlSaudaraAngkat} onChange={e => updateBio('jmlSaudaraAngkat', e.target.value)} placeholder="0" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">10. Anak Yatim / Piatu / Yatim Piatu</Label>
                      <Select value={formData.bioData.statusYatim || '-'} onValueChange={v => updateBio('statusYatim', v)}>
                        <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">- (Orang Tua Lengkap)</SelectItem>
                          <SelectItem value="Yatim">Yatim (Ayah Meninggal)</SelectItem>
                          <SelectItem value="Piatu">Piatu (Ibu Meninggal)</SelectItem>
                          <SelectItem value="Yatim Piatu">Yatim Piatu (Kedua Orang Tua Meninggal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPAT TINGGAL & KESEHATAN */}
              {activeTab === 'tinggal_kesehatan' && (
                <div className="space-y-5">
                  {/* B. KETERANGAN TEMPAT TINGGAL */}
                  <div className="space-y-3.5">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      B. KETERANGAN TEMPAT TINGGAL
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">12. Alamat Lengkap Domisili</Label>
                      <Input value={formData.bioData.alamat} onChange={e => updateBio('alamat', e.target.value)} placeholder="Jl. Gajah Mada No. 45, Kel. Bangunsari, Ponorogo" className="text-xs h-9" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">13. No. Telepon / HP Siswa</Label>
                        <Input value={formData.bioData.telp} onChange={e => updateBio('telp', e.target.value)} placeholder="081234567890" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">14. Tinggal Bersama</Label>
                        <Select value={formData.bioData.tinggalDengan} onValueChange={v => updateBio('tinggalDengan', v)}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Tinggal dengan" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                            <SelectItem value="Saudara">Saudara</SelectItem>
                            <SelectItem value="Asrama">Asrama</SelectItem>
                            <SelectItem value="Kost">Kost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">15. Jarak ke Sekolah</Label>
                        <Input value={formData.bioData.jarakSekolah} onChange={e => updateBio('jarakSekolah', e.target.value)} placeholder="2 Km" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* C. KETERANGAN KESEHATAN */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      C. KETERANGAN KESEHATAN
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">16. Golongan Darah</Label>
                        <Select value={formData.bioData.golDarah} onValueChange={v => updateBio('golDarah', v)}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Golongan Darah" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">- (Belum Tahu)</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="AB">AB</SelectItem>
                            <SelectItem value="O">O</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">19. Tinggi Badan (Cm)</Label>
                        <Input type="number" value={formData.bioData.tinggiBadan} onChange={e => updateBio('tinggiBadan', e.target.value)} placeholder="160" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">19. Berat Badan (Kg)</Label>
                        <Input type="number" value={formData.bioData.beratBadan} onChange={e => updateBio('beratBadan', e.target.value)} placeholder="50" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">17. Penyakit yang Pernah Diderita</Label>
                        <Input value={formData.bioData.penyakitPernah} onChange={e => updateBio('penyakitPernah', e.target.value)} placeholder="Tidak Ada" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">18. Kelainan Jasmani</Label>
                        <Input value={formData.bioData.kelainanJasmani} onChange={e => updateBio('kelainanJasmani', e.target.value)} placeholder="Tidak Ada" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PENDIDIKAN ASAL */}
              {activeTab === 'pendidikan' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    D. KETERANGAN PENDIDIKAN SEBELUMNYA
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">20.a. Tamatan Dari (SMP/MTs)</Label>
                      <Input value={formData.bioData.lulusanDari} onChange={e => updateBio('lulusanDari', e.target.value)} placeholder="SMP Negeri 1 Ponorogo" className="text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">20.d. Lama Belajar (Tahun)</Label>
                      <Input type="number" value={formData.bioData.lamaBelajar} onChange={e => updateBio('lamaBelajar', e.target.value)} placeholder="3" className="text-xs h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">20.b. Tgl & Nomor Ijazah SMP</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={formData.bioData.tglIjazahSmp} onChange={e => updateBio('tglIjazahSmp', e.target.value)} className="text-xs h-9" />
                        <Input value={formData.bioData.noIjazahSmp} onChange={e => updateBio('noIjazahSmp', e.target.value)} placeholder="Nomor Ijazah" className="text-xs h-9" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">20.c. Tgl & Nomor STL/SKHUN</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={formData.bioData.tglStlSmp} onChange={e => updateBio('tglStlSmp', e.target.value)} className="text-xs h-9" />
                        <Input value={formData.bioData.noStlSmp} onChange={e => updateBio('noStlSmp', e.target.value)} placeholder="Nomor STL / SKHUN" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">21.a. Siswa Pindahan Dari Sekolah</Label>
                      <Input value={formData.bioData.pindahanDariSekolah} onChange={e => updateBio('pindahanDariSekolah', e.target.value)} placeholder="Nama Sekolah Asal Pindahan" className="text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">21.b. Alasan Pindah</Label>
                      <Input value={formData.bioData.alasanPindah} onChange={e => updateBio('alasanPindah', e.target.value)} placeholder="Alasan pindah sekolah" className="text-xs h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">22.a. Diterima di Kelas</Label>
                      <Input value={formData.bioData.diterimaDiKelas} onChange={e => updateBio('diterimaDiKelas', e.target.value)} placeholder="Contoh: X 1" className="text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">22.b. Kelompok / Prog. Studi</Label>
                      <Input value={formData.bioData.kelompokProgStudi} onChange={e => updateBio('kelompokProgStudi', e.target.value)} placeholder="Program Studi" className="text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">22.c. Tanggal Diterima</Label>
                      <Input type="date" value={formData.bioData.tglDiterima} onChange={e => updateBio('tglDiterima', e.target.value)} className="text-xs h-9" />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ORANG TUA & WALI */}
              {activeTab === 'orangtua' && (
                <div className="space-y-5">
                  {/* AYAH */}
                  <div className="space-y-3.5">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      E. KETERANGAN TENTANG AYAH KANDUNG
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">23. Nama Ayah Kandung</Label>
                        <Input value={formData.bioData.namaAyah} onChange={e => updateBio('namaAyah', e.target.value)} placeholder="BUDI SANTOSO" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">24. Tempat & Tanggal Lahir Ayah</Label>
                        <Input value={formData.bioData.ttlAyah} onChange={e => updateBio('ttlAyah', e.target.value)} placeholder="Ponorogo, 12-08-1975" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">25. Agama Ayah</Label>
                        <Input value={formData.bioData.agamaAyah} onChange={e => updateBio('agamaAyah', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">26. Kewarganegaraan</Label>
                        <Input value={formData.bioData.kewarganegaraanAyah} onChange={e => updateBio('kewarganegaraanAyah', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">27. Pendidikan Ayah</Label>
                        <Input value={formData.bioData.pendidikanAyah} onChange={e => updateBio('pendidikanAyah', e.target.value)} placeholder="S1 Teknik" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">28. Pekerjaan Ayah</Label>
                        <Input value={formData.bioData.pekerjaanAyah} onChange={e => updateBio('pekerjaanAyah', e.target.value)} placeholder="Wiraswasta" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">29. Pengeluaran Perbulan</Label>
                        <Input value={formData.bioData.pengeluaranAyah} onChange={e => updateBio('pengeluaranAyah', e.target.value)} placeholder="Rp 5.000.000" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">31. Status Ayah</Label>
                        <Select value={formData.bioData.statusAyah} onValueChange={v => updateBio('statusAyah', v)}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Status Ayah" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                            <SelectItem value="Meninggal">Meninggal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">30. Alamat Rumah Ayah</Label>
                        <Input value={formData.bioData.alamatAyah} onChange={e => updateBio('alamatAyah', e.target.value)} placeholder="Alamat Ayah" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">30. No. Telepon / HP Ayah</Label>
                        <Input value={formData.bioData.telpAyah} onChange={e => updateBio('telpAyah', e.target.value)} placeholder="085678901234" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* IBU */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      F. KETERANGAN TENTANG IBU KANDUNG
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">32. Nama Ibu Kandung</Label>
                        <Input value={formData.bioData.namaIbu} onChange={e => updateBio('namaIbu', e.target.value)} placeholder="SITI AMINAH" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">33. Tempat & Tanggal Lahir Ibu</Label>
                        <Input value={formData.bioData.ttlIbu} onChange={e => updateBio('ttlIbu', e.target.value)} placeholder="Madiun, 05-03-1980" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">34. Agama Ibu</Label>
                        <Input value={formData.bioData.agamaIbu} onChange={e => updateBio('agamaIbu', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">35. Kewarganegaraan</Label>
                        <Input value={formData.bioData.kewarganegaraanIbu} onChange={e => updateBio('kewarganegaraanIbu', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">36. Pendidikan Ibu</Label>
                        <Input value={formData.bioData.pendidikanIbu} onChange={e => updateBio('pendidikanIbu', e.target.value)} placeholder="SMA" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">37. Pekerjaan Ibu</Label>
                        <Input value={formData.bioData.pekerjaanIbu} onChange={e => updateBio('pekerjaanIbu', e.target.value)} placeholder="Ibu Rumah Tangga" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">38. Pengeluaran Perbulan</Label>
                        <Input value={formData.bioData.pengeluaranIbu} onChange={e => updateBio('pengeluaranIbu', e.target.value)} placeholder="-" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">40. Status Ibu</Label>
                        <Select value={formData.bioData.statusIbu} onValueChange={v => updateBio('statusIbu', v)}>
                          <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Status Ibu" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                            <SelectItem value="Meninggal">Meninggal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">39. Alamat Rumah Ibu</Label>
                        <Input value={formData.bioData.alamatIbu} onChange={e => updateBio('alamatIbu', e.target.value)} placeholder="Alamat Ibu" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">39. No. Telepon / HP Ibu</Label>
                        <Input value={formData.bioData.telpIbu} onChange={e => updateBio('telpIbu', e.target.value)} placeholder="08xxxxxxxx" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* WALI */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      G. KETERANGAN TENTANG WALI (OPSIONAL)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">41. Nama Wali</Label>
                        <Input value={formData.bioData.namaWali} onChange={e => updateBio('namaWali', e.target.value)} placeholder="Nama Lengkap Wali" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">42. Tempat & Tanggal Lahir Wali</Label>
                        <Input value={formData.bioData.ttlWali} onChange={e => updateBio('ttlWali', e.target.value)} placeholder="Kota, DD-MM-YYYY" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">43. Agama Wali</Label>
                        <Input value={formData.bioData.agamaWali} onChange={e => updateBio('agamaWali', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">44. Kewarganegaraan</Label>
                        <Input value={formData.bioData.kewarganegaraanWali} onChange={e => updateBio('kewarganegaraanWali', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">45. Pendidikan Wali</Label>
                        <Input value={formData.bioData.pendidikanWali} onChange={e => updateBio('pendidikanWali', e.target.value)} className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">46. Pekerjaan Wali</Label>
                        <Input value={formData.bioData.pekerjaanWali} onChange={e => updateBio('pekerjaanWali', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">47. Pengeluaran Perbulan Wali</Label>
                        <Input value={formData.bioData.pengeluaranWali} onChange={e => updateBio('pengeluaranWali', e.target.value)} placeholder="Rp 3.000.000" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">48. No. Telepon / HP Wali</Label>
                        <Input value={formData.bioData.telpWali} onChange={e => updateBio('telpWali', e.target.value)} className="text-xs h-9" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PERKEMBANGAN & PASFOTO */}
              {activeTab === 'perkembangan_foto' && (
                <div className="space-y-5">
                  {/* H. KEGEMARAN */}
                  <div className="space-y-3.5">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      H. KEGEMARAN PESERTA DIDIK
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">49. Kesenian</Label>
                        <Input value={formData.bioData.kesenian} onChange={e => updateBio('kesenian', e.target.value)} placeholder="Menyanyi / Musik" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">50. Olah Raga</Label>
                        <Input value={formData.bioData.olahRaga} onChange={e => updateBio('olahRaga', e.target.value)} placeholder="Bulu Tangkis / Futsal" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">51. Organisasi</Label>
                        <Input value={formData.bioData.organisasi} onChange={e => updateBio('organisasi', e.target.value)} placeholder="Pramuka / IPM / OSIS" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">52. Lain-lain</Label>
                        <Input value={formData.bioData.kegemaranLain} onChange={e => updateBio('kegemaranLain', e.target.value)} placeholder="Kegemaran lainnya" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* I. PERKEMBANGAN & KELULUSAN */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      I. KETERANGAN PERKEMBANGAN & KELULUSAN
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">53. Menerima Bea Siswa (Tahun / Kelas dari)</Label>
                      <Input value={formData.bioData.menerimaBeasiswa} onChange={e => updateBio('menerimaBeasiswa', e.target.value)} placeholder="Thn / Kls dari ..." className="text-xs h-9" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">54.a. Tgl Meninggalkan Sekolah</Label>
                        <Input type="date" value={formData.bioData.tglMeninggalkanSekolah} onChange={e => updateBio('tglMeninggalkanSekolah', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">54.b. Alasan Meninggalkan</Label>
                        <Input value={formData.bioData.alasanMeninggalkan} onChange={e => updateBio('alasanMeninggalkan', e.target.value)} placeholder="Pindah / Lulus / dll" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">55.a. Tamat Belajar / Lulus</Label>
                        <Input value={formData.bioData.tamatBelajar} onChange={e => updateBio('tamatBelajar', e.target.value)} placeholder="Tamat Belajar / Lulus" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">55.b. Nomor Ijazah</Label>
                        <Input value={formData.bioData.noIjazahLulus} onChange={e => updateBio('noIjazahLulus', e.target.value)} placeholder="Nomor Ijazah Kelulusan" className="text-xs h-9" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">55.c. Nomor STL</Label>
                        <Input value={formData.bioData.noStlLulus} onChange={e => updateBio('noStlLulus', e.target.value)} placeholder="Nomor STL" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">55.d. Nilai Rata-rata</Label>
                        <Input value={formData.bioData.nilaiRataRata} onChange={e => updateBio('nilaiRataRata', e.target.value)} placeholder="85.50" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* J. PASCA PENDIDIKAN */}
                  <div className="space-y-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      J. KETERANGAN SETELAH SELESAI PENDIDIKAN
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">56. Akan Melanjutkan Ke (PT / Instansi)</Label>
                      <Input value={formData.bioData.melanjutkanDi} onChange={e => updateBio('melanjutkanDi', e.target.value)} placeholder="Universitas / Institut / Akademi" className="text-xs h-9" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">57.a. Tgl Mulai Bekerja</Label>
                        <Input type="date" value={formData.bioData.tglMulaiBekerja} onChange={e => updateBio('tglMulaiBekerja', e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">57.b. Nama Perusahaan</Label>
                        <Input value={formData.bioData.namaPerusahaan} onChange={e => updateBio('namaPerusahaan', e.target.value)} placeholder="PT / Usaha" className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">57.c. Penghasilan (Rp)</Label>
                        <Input value={formData.bioData.penghasilanKerja} onChange={e => updateBio('penghasilanKerja', e.target.value)} placeholder="Rp 4.000.000" className="text-xs h-9" />
                      </div>
                    </div>
                  </div>

                  {/* PASFOTO 4 PERIODE */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300">
                      <p className="font-bold">4 Pasfoto Resmi Lembar Cetak Buku Induk</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Foto akan langsung tampil di sisi kanan hasil cetak Buku Induk F4.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* Foto 1: Waktu Mendaftar */}
                      <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">1. Waktu Mendaftar</span>
                        <div className="w-[78px] h-[98px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          {formData.bioData.fotoMendaftar ? (
                            <img src={formData.bioData.fotoMendaftar.startsWith('/uploads') ? `/api-backend${formData.bioData.fotoMendaftar}` : formData.bioData.fotoMendaftar} alt="Mendaftar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400 text-center p-1">Belum Ada Foto</div>
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <Button type="button" size="sm" variant="outline" className="text-[10.5px] h-7 px-2" disabled={isUploadingFoto === 'fotoMendaftar'}>
                            <Upload className="w-3 h-3 mr-1" />
                            {isUploadingFoto === 'fotoMendaftar' ? 'Mengunggah...' : 'Pilih Foto'}
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto('fotoMendaftar', e)} />
                        </label>
                      </div>

                      {/* Foto 2: Waktu Diterima */}
                      <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">2. Waktu Diterima</span>
                        <div className="w-[78px] h-[98px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          {formData.bioData.fotoDiterima ? (
                            <img src={formData.bioData.fotoDiterima.startsWith('/uploads') ? `/api-backend${formData.bioData.fotoDiterima}` : formData.bioData.fotoDiterima} alt="Diterima" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400 text-center p-1">Belum Ada Foto</div>
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <Button type="button" size="sm" variant="outline" className="text-[10.5px] h-7 px-2" disabled={isUploadingFoto === 'fotoDiterima'}>
                            <Upload className="w-3 h-3 mr-1" />
                            {isUploadingFoto === 'fotoDiterima' ? 'Mengunggah...' : 'Pilih Foto'}
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto('fotoDiterima', e)} />
                        </label>
                      </div>

                      {/* Foto 3: Waktu Lulus */}
                      <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">3. Waktu Lulus</span>
                        <div className="w-[78px] h-[98px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          {formData.bioData.fotoLulus ? (
                            <img src={formData.bioData.fotoLulus.startsWith('/uploads') ? `/api-backend${formData.bioData.fotoLulus}` : formData.bioData.fotoLulus} alt="Lulus" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400 text-center p-1">Belum Ada Foto</div>
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <Button type="button" size="sm" variant="outline" className="text-[10.5px] h-7 px-2" disabled={isUploadingFoto === 'fotoLulus'}>
                            <Upload className="w-3 h-3 mr-1" />
                            {isUploadingFoto === 'fotoLulus' ? 'Mengunggah...' : 'Pilih Foto'}
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto('fotoLulus', e)} />
                        </label>
                      </div>

                      {/* Foto 4: Waktu Meninggalkan */}
                      <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 text-center">4. Meninggalkan</span>
                        <div className="w-[78px] h-[98px] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center">
                          {formData.bioData.fotoMeninggalkan ? (
                            <img src={formData.bioData.fotoMeninggalkan.startsWith('/uploads') ? `/api-backend${formData.bioData.fotoMeninggalkan}` : formData.bioData.fotoMeninggalkan} alt="Meninggalkan" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-slate-400 text-center p-1">Belum Ada Foto</div>
                          )}
                        </div>
                        <label className="cursor-pointer">
                          <Button type="button" size="sm" variant="outline" className="text-[10.5px] h-7 px-2" disabled={isUploadingFoto === 'fotoMeninggalkan'}>
                            <Upload className="w-3 h-3 mr-1" />
                            {isUploadingFoto === 'fotoMeninggalkan' ? 'Mengunggah...' : 'Pilih Foto'}
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadFoto('fotoMeninggalkan', e)} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Form */}
            <DialogFooter className="p-4 mt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between sm:justify-between shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateStudentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {updateStudentMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cetak F4 Terpadu */}
      <BukuIndukPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        studentDataList={targetStudentsForPrint}
      />
    </div>
  )
}
