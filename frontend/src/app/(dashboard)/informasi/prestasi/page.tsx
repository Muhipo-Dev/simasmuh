'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { TablePagination } from '@/components/TablePagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Trophy, Award, Medal, Sparkles, Plus, Pencil, Trash2, Eye, 
  Search, Filter, Calendar, MapPin, Building, User, Users,
  CheckCircle2, AlertCircle, FileText, Upload, Image as ImageIcon,
  ChevronRight, ArrowUpRight, BarChart3, PieChart, Layers
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import Swal from 'sweetalert2'
import { compressImageFile } from '@/utils/imageCompressor'

// Kategori Bidang & Tingkat Kejuaraan
const KATEGORI_BIDANG = [
  { id: 'SAINS_TECH', label: 'Sains & Tech', color: 'bg-blue-500 text-white', border: 'border-blue-500' },
  { id: 'OLAHRAGA', label: 'Olahraga', color: 'bg-orange-500 text-white', border: 'border-orange-500' },
  { id: 'AGAMA', label: 'Agama', color: 'bg-teal-500 text-white', border: 'border-teal-500' },
  { id: 'BAHASA', label: 'Bahasa', color: 'bg-amber-700 text-white', border: 'border-amber-700' },
  { id: 'SENI', label: 'Seni', color: 'bg-pink-600 text-white', border: 'border-pink-600' },
  { id: 'PENGEMBANGAN_DIRI', label: 'Pengembangan Diri', color: 'bg-rose-500 text-white', border: 'border-rose-500' },
]

const TINGKAT_PRESTASI = [
  { id: 'KELAS', label: 'Tingkat Kelas', color: 'bg-slate-900 text-white' },
  { id: 'SEKOLAH', label: 'Tingkat Sekolah', color: 'bg-slate-500 text-white' },
  { id: 'KECAMATAN', label: 'Tingkat Kecamatan', color: 'bg-red-600 text-white' },
  { id: 'KABUPATEN', label: 'Tingkat Kabupaten', color: 'bg-blue-600 text-white' },
  { id: 'PROVINSI', label: 'Tingkat Provinsi', color: 'bg-green-700 text-white' },
  { id: 'NASIONAL', label: 'Tingkat Nasional', color: 'bg-purple-700 text-white' },
  { id: 'INTERNASIONAL', label: 'Tingkat Internasional', color: 'bg-amber-600 text-white' },
]

export default function PrestasiSiswaPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const queryClient = useQueryClient()

  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTingkat, setSelectedTingkat] = useState<string>('ALL')
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL')
  const [selectedTahun, setSelectedTahun] = useState<string>('ALL')

  // State Modal Form & Detail
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [viewingItem, setViewingItem] = useState<any>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State Form State
  const [formData, setFormData] = useState({
    studentId: '',
    judul: '',
    kategoriBidang: 'SAINS_TECH',
    tingkat: 'KABUPATEN',
    peringkat: '',
    penyelenggara: '',
    tahun: new Date().getFullYear(),
    tanggal: new Date().toISOString().split('T')[0],
    tempat: '',
    deskripsi: '',
    sertifikatUrl: '',
    pembimbing: '',
    poinApresiasi: 10,
  })

  // User Profile & Roles Check
  const { data: userProfile } = useQuery<any>({
    queryKey: ['my-user-profile-prestasi'],
    queryFn: () => authenticatedQuery('/api-backend/users/me'),
  })

  const userRoles = [
    userProfile?.role,
    userProfile?.subRole,
    userProfile?.subRole2,
    userProfile?.subRole3,
    userProfile?.subRole4,
    userProfile?.subRole5,
    (session?.user as any)?.role,
    (session?.user as any)?.subRole,
  ].filter(Boolean)

  const isSuperadmin = userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_IT')
  const isKepalaSekolah = userRoles.includes('KEPALA_SEKOLAH')
  const isKesiswaan = userRoles.includes('KESISWAAN') || userRoles.includes('WAKA_KESISWAAN')
  const isHumas = userRoles.includes('HUMAS_SDM') || userRoles.includes('WAKA_HUMAS_SDM') || userRoles.includes('KEPEGAWAIAN') || userRoles.includes('SDM')
  const isWaka = isKesiswaan || isHumas || userRoles.some(r => r.startsWith('WAKA_') || r.includes('WAKA') || r === 'KURIKULUM' || r === 'SARPRAS' || r === 'ISMUBA')
  const isSiswa = userRoles.includes('SISWA')
  const isWaliMurid = userRoles.includes('WALI_MURID')

  // Yang dapat menginput: Kesiswaan, Humas, Kepala Sekolah, Waka, Superadmin
  const canInput = isKesiswaan || isHumas || isKepalaSekolah || isWaka || isSuperadmin
  // Yang dapat mengedit & melihat informasi statistika: Kepala Sekolah, Waka, Kesiswaan, Humas, Superadmin
  const canEdit = isKepalaSekolah || isWaka || isKesiswaan || isHumas || isSuperadmin
  const canViewStatistics = isKepalaSekolah || isWaka || isKesiswaan || isHumas || isSuperadmin || !isSiswa

  // Query Data Statistik Prestasi Riil
  const { data: statsData, isLoading: isStatsLoading } = useQuery<any>({
    queryKey: ['achievements-statistics', selectedTahun],
    queryFn: () => {
      const url = selectedTahun !== 'ALL' ? `/api-backend/achievements/statistics?tahun=${selectedTahun}` : '/api-backend/achievements/statistics'
      return authenticatedQuery(url)
    },
  })

  // Query Data Daftar Prestasi Riil
  const { data: achievementsResponse, isLoading: isListLoading } = useQuery<any>({
    queryKey: ['achievements-list', selectedTingkat, selectedKategori, selectedTahun],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedTingkat !== 'ALL') params.append('tingkat', selectedTingkat)
      if (selectedKategori !== 'ALL') params.append('kategoriBidang', selectedKategori)
      if (selectedTahun !== 'ALL') params.append('tahun', selectedTahun)
      params.append('limit', '200')
      return authenticatedQuery(`/api-backend/achievements?${params.toString()}`)
    },
  })

  // Query Daftar Siswa untuk dropdown form input (khusus staff/penginput)
  const { data: studentsList = [] } = useQuery<any[]>({
    queryKey: ['students-for-achievement'],
    queryFn: () => authenticatedQuery('/api-backend/students?limit=2000'),
    enabled: canInput,
  })

  // State Filter Siswa pada Form Modal
  const [formStudentSearch, setFormStudentSearch] = useState('')

  const achievementsList = achievementsResponse?.data || []

  // Filter Data Siswa untuk dropdown form input
  const filteredStudentsList = useMemo(() => {
    if (!formStudentSearch.trim()) return studentsList
    const q = formStudentSearch.toLowerCase()
    return studentsList.filter((st: any) =>
      st.name?.toLowerCase().includes(q) ||
      st.nisn?.toLowerCase().includes(q) ||
      st.nis?.toLowerCase().includes(q) ||
      st.class?.name?.toLowerCase().includes(q)
    )
  }, [studentsList, formStudentSearch])

  // Filter Data berdasarkan Search Query
  const filteredAchievements = useMemo(() => {
    return filterDataBySearch(achievementsList, searchQuery, [
      'judul',
      'peringkat',
      'penyelenggara',
      'tingkat',
      'kategoriBidang',
      'tempat',
      'deskripsi',
      'student.name',
      'student.nisn',
      'student.nis',
      'student.class.name',
    ])
  }, [achievementsList, searchQuery])

  // Rule 20 Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTingkat, selectedKategori, selectedTahun, pageSize])

  const paginatedAchievements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAchievements.slice(startIndex, startIndex + pageSize)
  }, [filteredAchievements, currentPage, pageSize])

  // Upload file sertifikat / piagam
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      const compressedBase64 = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 })
      const res = await authenticatedFetch('/api-backend/upload/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: compressedBase64,
          folder: 'prestasi-siswa',
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal mengunggah foto piagam/sertifikat.')
      }

      const resData = await res.json()
      setFormData(prev => ({ ...prev, sertifikatUrl: resData.url }))
      Swal.fire('Berhasil', 'Foto piagam/sertifikat berhasil diunggah', 'success')
    } catch (err: any) {
      Swal.fire('Gagal Upload', err.message || 'Terjadi kesalahan saat mengunggah.', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingItem ? `/api-backend/achievements/${editingItem.id}` : '/api-backend/achievements'
      const method = editingItem ? 'PATCH' : 'POST'
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Gagal menyimpan data prestasi.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements-list'] })
      queryClient.invalidateQueries({ queryKey: ['achievements-statistics'] })
      setIsModalOpen(false)
      setEditingItem(null)
      Swal.fire('Sukses', 'Data prestasi siswa berhasil disimpan.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menyimpan data prestasi.', 'error')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/achievements/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Gagal menghapus data prestasi.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements-list'] })
      queryClient.invalidateQueries({ queryKey: ['achievements-statistics'] })
      Swal.fire('Terhapus', 'Data prestasi berhasil dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Error', err.message || 'Gagal menghapus data.', 'error')
    },
  })

  const handleOpenAdd = () => {
    setEditingItem(null)
    setFormStudentSearch('')
    setFormData({
      studentId: '',
      judul: '',
      kategoriBidang: 'SAINS_TECH',
      tingkat: 'KABUPATEN',
      peringkat: 'Juara 1',
      penyelenggara: '',
      tahun: new Date().getFullYear(),
      tanggal: new Date().toISOString().split('T')[0],
      tempat: '',
      deskripsi: '',
      sertifikatUrl: '',
      pembimbing: '',
      poinApresiasi: 15,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setFormStudentSearch('')
    setFormData({
      studentId: item.studentId || '',
      judul: item.judul || '',
      kategoriBidang: item.kategoriBidang || 'SAINS_TECH',
      tingkat: item.tingkat || 'KABUPATEN',
      peringkat: item.peringkat || '',
      penyelenggara: item.penyelenggara || '',
      tahun: item.tahun || new Date().getFullYear(),
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tempat: item.tempat || '',
      deskripsi: item.deskripsi || '',
      sertifikatUrl: item.sertifikatUrl || '',
      pembimbing: item.pembimbing || '',
      poinApresiasi: item.poinApresiasi || 0,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (item: any) => {
    Swal.fire({
      title: 'Hapus Prestasi?',
      text: `Apakah Anda yakin ingin menghapus data prestasi "${item.judul}" atas nama ${item.student?.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(item.id)
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.studentId) {
      Swal.fire('Perhatian', 'Silakan pilih siswa yang meraih prestasi.', 'warning')
      return
    }
    if (!formData.judul.trim()) {
      Swal.fire('Perhatian', 'Judul / nama kejuaraan prestasi wajib diisi.', 'warning')
      return
    }

    saveMutation.mutate(formData)
  }

  const totalCount = statsData?.totalAchievements || 0
  const tingkatCounts = statsData?.tingkatCounts || {
    KELAS: 0,
    SEKOLAH: 0,
    KECAMATAN: 0,
    KABUPATEN: 0,
    PROVINSI: 0,
    NASIONAL: 0,
    INTERNASIONAL: 0,
  }

  const kategoriPercentages = statsData?.kategoriPercentages || {
    AGAMA: 0,
    OLAHRAGA: 0,
    SAINS_TECH: 0,
    BAHASA: 0,
    SENI: 0,
    PENGEMBANGAN_DIRI: 0,
  }

  const kategoriCounts = statsData?.kategoriCounts || {
    AGAMA: 0,
    OLAHRAGA: 0,
    SAINS_TECH: 0,
    BAHASA: 0,
    SENI: 0,
    PENGEMBANGAN_DIRI: 0,
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Utama Rekap Prestasi Siswa */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white p-4 sm:p-6 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Trophy className="w-7 h-7 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide">
                REKAP PRESTASI SISWA
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 font-medium">
                Pencatatan Rekam Jejak Prestasi, Kejuaraan & Penghargaan Siswa SMA Muhammadiyah 1 Ponorogo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canInput && (
              <Button
                onClick={handleOpenAdd}
                className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs sm:text-sm h-10 px-4 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Tambah Prestasi
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TAMPILAN STATISTIK PRESTASI (Sesuai Desain Banner Hero) */}
      <div className="space-y-4">
        {/* Banner Angka Total Prestasi */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-xs">
          <p className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">
            Jumlah Prestasi Siswa
          </p>
          <h2 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            {isStatsLoading ? '...' : totalCount}
          </h2>
        </div>

        {/* Baris Kotak Rekap Tingkat Kejuaraan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Tingkat Kelas */}
          <div className="bg-black text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-slate-300">Tingkat Kelas</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.KELAS}</p>
          </div>

          {/* Tingkat Sekolah */}
          <div className="bg-slate-500 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-slate-200">Tingkat Sekolah</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.SEKOLAH}</p>
          </div>

          {/* Tingkat Kecamatan */}
          <div className="bg-red-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-red-100">Tingkat Kecamatan</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.KECAMATAN}</p>
          </div>

          {/* Tingkat Kabupaten */}
          <div className="bg-blue-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-blue-100">Tingkat Kabupaten</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.KABUPATEN}</p>
          </div>

          {/* Tingkat Provinsi */}
          <div className="bg-green-700 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-green-100">Tingkat Provinsi</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.PROVINSI}</p>
          </div>

          {/* Tingkat Nasional */}
          <div className="bg-purple-700 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-purple-100">Tingkat Nasional</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.NASIONAL}</p>
          </div>

          {/* Tingkat Internasional */}
          <div className="bg-amber-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-amber-100">Tingkat Internasional</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{tingkatCounts.INTERNASIONAL}</p>
          </div>
        </div>

        {/* Baris Kotak Rekap Kategori Bidang & Persentase */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Bidang Agama */}
          <div className="bg-teal-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-teal-100">{kategoriCounts.AGAMA} Bidang Agama</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.AGAMA}%</p>
          </div>

          {/* Bidang Olahraga */}
          <div className="bg-orange-500 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-orange-100">{kategoriCounts.OLAHRAGA} Bidang Olahraga</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.OLAHRAGA}%</p>
          </div>

          {/* Bidang Sains & Tech */}
          <div className="bg-blue-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-blue-100">{kategoriCounts.SAINS_TECH} Bidang Sains & Tech</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.SAINS_TECH}%</p>
          </div>

          {/* Bidang Bahasa */}
          <div className="bg-amber-800 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-amber-100">{kategoriCounts.BAHASA} Bidang Bahasa</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.BAHASA}%</p>
          </div>

          {/* Bidang Seni */}
          <div className="bg-pink-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-pink-100">{kategoriCounts.SENI} Bidang Seni</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.SENI}%</p>
          </div>

          {/* Bidang Pengembangan Diri */}
          <div className="bg-rose-600 text-white rounded-xl p-3.5 sm:p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold text-rose-100">{kategoriCounts.PENGEMBANGAN_DIRI} Bidang Pengembangan Diri</p>
            <p className="text-2xl sm:text-3xl font-black mt-0.5">{kategoriPercentages.PENGEMBANGAN_DIRI}%</p>
          </div>
        </div>
      </div>

      {/* FILTER & TABEL DAFTAR PRESTASI LENGKAP */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                Daftar Prestasi & Rincian Informasi Kejuaraan
              </CardTitle>
              <CardDescription className="text-xs">
                Informasi selengkapnya mengenai siapa siswa peraih prestasi, jenis penghargaan, tingkat, dan penyelenggara
              </CardDescription>
            </div>

            {/* Filter Sederhana */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={selectedTingkat} onValueChange={(val) => setSelectedTingkat(val || 'ALL')}>
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <SelectValue placeholder="Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tingkat</SelectItem>
                  {TINGKAT_PRESTASI.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedKategori} onValueChange={(val) => setSelectedKategori(val || 'ALL')}>
                <SelectTrigger className="w-[140px] text-xs h-9">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {KATEGORI_BIDANG.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTahun} onValueChange={(val) => setSelectedTahun(val || 'ALL')}>
                <SelectTrigger className="w-[110px] text-xs h-9">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tahun</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-3">
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari nama siswa, NISN, kejuaraan, atau penyelenggara..."
              className="max-w-md"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="w-28 text-xs">Tanggal</TableHead>
                  <TableHead className="min-w-[180px] text-xs">Nama Siswa & Kelas</TableHead>
                  <TableHead className="min-w-[200px] text-xs">Kejuaraan / Prestasi</TableHead>
                  <TableHead className="w-32 text-xs">Tingkat</TableHead>
                  <TableHead className="w-32 text-xs">Kategori</TableHead>
                  <TableHead className="min-w-[140px] text-xs">Penyelenggara</TableHead>
                  <TableHead className="w-28 text-center text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isListLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-500">
                      Memuat data prestasi siswa...
                    </TableCell>
                  </TableRow>
                ) : filteredAchievements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Belum ada data prestasi tercatat
                      </p>
                      <p className="text-xs text-slate-400">
                        Gunakan tombol &quot;Tambah Prestasi&quot; untuk mencatat rekam jejak juara siswa.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAchievements.map((item: any, idx: number) => {
                    const tingkatObj = TINGKAT_PRESTASI.find(t => t.id === item.tingkat)
                    const kategoriObj = KATEGORI_BIDANG.find(k => k.id === item.kategoriBidang)

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <TableCell className="text-center text-xs font-semibold">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {item.tanggal ? format(new Date(item.tanggal), 'dd MMM yyyy', { locale: localeId }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.student?.name || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Kelas: {item.student?.class?.name || '-'} • NISN: {item.student?.nisn || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 line-clamp-1" title={item.judul}>
                            {item.judul}
                          </div>
                          {item.peringkat && (
                            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              🏆 {item.peringkat}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${tingkatObj?.color || 'bg-slate-700 text-white'}`}>
                            {tingkatObj?.label || item.tingkat}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${kategoriObj?.color || 'bg-slate-700 text-white'}`}>
                            {kategoriObj?.label || item.kategoriBidang}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[160px]" title={item.penyelenggara || '-'}>
                          {item.penyelenggara || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewingItem(item)
                                setIsDetailOpen(true)
                              }}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                              title="Lihat Detail Selengkapnya"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEdit(item)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-amber-600"
                                  title="Edit Data Prestasi"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(item)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-red-600"
                                  title="Hapus Data Prestasi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {filteredAchievements.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredAchievements.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="prestasi"
            />
          </div>
        )}
      </Card>

      {/* DIALOG FORM INPUT & EDIT PRESTASI */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {editingItem ? 'Edit Data Prestasi Siswa' : 'Tambah Prestasi Siswa'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Formulir pencatatan rekam jejak prestasi, kejuaraan, dan piagam penghargaan siswa
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Pilih Siswa dengan Kotak Input Pencarian Cepat */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Pilih Siswa Peraih Prestasi *</Label>
                {formStudentSearch && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Ditemukan: {filteredStudentsList.length} siswa
                  </span>
                )}
              </div>

              {/* Input Pencarian Cepat Siswa */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={formStudentSearch}
                  onChange={(e) => setFormStudentSearch(e.target.value)}
                  placeholder="Ketik nama siswa, NISN, NIS, atau kelas untuk mencari..."
                  className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Dropdown Select Siswa Hasil Filter Pencarian */}
              <Select
                value={formData.studentId}
                onValueChange={(val) => setFormData(prev => ({ ...prev, studentId: val || '' }))}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Pilih Siswa dari Hasil Pencarian" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredStudentsList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Tidak ada siswa ditemukan dengan kata kunci &quot;{formStudentSearch}&quot;.
                    </div>
                  ) : (
                    filteredStudentsList.map((st: any) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} ({st.class?.name || '-'} • NISN: {st.nisn})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Nama Kejuaraan / Prestasi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Kejuaraan / Prestasi *</Label>
              <Input
                value={formData.judul}
                onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                placeholder="Contoh: Juara 1 Lomba Robotika Nasional 2026"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tingkat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tingkat Kejuaraan *</Label>
                <Select
                  value={formData.tingkat}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, tingkat: val || 'KABUPATEN' }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TINGKAT_PRESTASI.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori Bidang */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kategori Bidang *</Label>
                <Select
                  value={formData.kategoriBidang}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, kategoriBidang: val || 'SAINS_TECH' }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_BIDANG.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Peringkat / Capaian */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Peringkat / Medali</Label>
                <Input
                  value={formData.peringkat}
                  onChange={(e) => setFormData(prev => ({ ...prev, peringkat: e.target.value }))}
                  placeholder="Contoh: Juara 1 / Medali Emas"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Penyelenggara */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Penyelenggara</Label>
                <Input
                  value={formData.penyelenggara}
                  onChange={(e) => setFormData(prev => ({ ...prev, penyelenggara: e.target.value }))}
                  placeholder="Contoh: Kemendikbudristek / ITS"
                  className="text-xs"
                />
              </div>

              {/* Tanggal */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tanggal Perolehan</Label>
                <Input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="text-xs"
                />
              </div>

              {/* Tahun */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tahun Perolehan</Label>
                <Input
                  type="number"
                  value={formData.tahun}
                  onChange={(e) => setFormData(prev => ({ ...prev, tahun: parseInt(e.target.value) || 2026 }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tempat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tempat / Lokasi</Label>
                <Input
                  value={formData.tempat}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempat: e.target.value }))}
                  placeholder="Contoh: Surabaya / Daring"
                  className="text-xs"
                />
              </div>

              {/* Pembimbing / Pelatih */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Guru Pembimbing / Pelatih</Label>
                <Input
                  value={formData.pembimbing}
                  onChange={(e) => setFormData(prev => ({ ...prev, pembimbing: e.target.value }))}
                  placeholder="Nama Guru Pembimbing"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Rincian / Deskripsi Lengkap */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Deskripsi & Informasi Selengkapnya</Label>
              <Textarea
                value={formData.deskripsi}
                onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                placeholder="Rincian informasi mengenai siapa siswa yang berpartisipasi dan apa bentuk capaian prestasinya..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Unggah Piagam / Sertifikat */}
            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Foto Piagam / Sertifikat / Bukti Prestasi</span>
                {formData.sertifikatUrl && (
                  <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terunggah
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-xs h-9"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploadingImage ? 'Mengompres & Mengunggah...' : 'Pilih Foto Piagam'}
                </Button>
                {formData.sertifikatUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, sertifikatUrl: '' }))}
                    className="text-xs text-red-600 h-9"
                  >
                    Hapus Foto
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || uploadingImage}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Prestasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG DETAIL INFORMASI SELENGKAPNYA TERKAIT SIAPA & APA PRESTASINYA */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Informasi Rinci Prestasi Siswa
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian lengkap siapa peraih dan apa capaian prestasinya
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 pt-2">
              {/* Box Siswa & Kejuaraan */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                      {viewingItem.tingkat}
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                      {viewingItem.judul}
                    </h3>
                    {viewingItem.peringkat && (
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        Capaian: {viewingItem.peringkat}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Tahun {viewingItem.tahun}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Nama Siswa:</p>
                    <p className="font-bold text-slate-900 dark:text-white">{viewingItem.student?.name || '-'}</p>
                    <p className="text-[11px] text-slate-500">NISN: {viewingItem.student?.nisn || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Kelas / Rombel:</p>
                    <p className="font-bold text-slate-900 dark:text-white">{viewingItem.student?.class?.name || '-'}</p>
                    <p className="text-[11px] text-slate-500">NIS: {viewingItem.student?.nis || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Rincian Penyelenggaraan */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Penyelenggara:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{viewingItem.penyelenggara || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Tempat / Lokasi:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{viewingItem.tempat || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Tanggal Perlombaan:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {viewingItem.tanggal ? format(new Date(viewingItem.tanggal), 'dd MMMM yyyy', { locale: localeId }) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Guru Pembimbing / Pelatih:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{viewingItem.pembimbing || '-'}</p>
                </div>
              </div>

              {/* Deskripsi Lengkap */}
              {viewingItem.deskripsi && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  <p className="text-[11px] font-bold text-slate-500 mb-1">Informasi / Keterangan Selengkapnya:</p>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {viewingItem.deskripsi}
                  </p>
                </div>
              )}

              {/* Piagam / Sertifikat */}
              {viewingItem.sertifikatUrl && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Foto Sertifikat / Piagam:</p>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingItem.sertifikatUrl}
                      alt="Sertifikat Piagam Prestasi"
                      className="object-contain max-h-64 w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="default"
              onClick={() => setIsDetailOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
