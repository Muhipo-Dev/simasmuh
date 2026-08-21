'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  ShieldAlert, ShieldCheck, HeartHandshake, PlusCircle, Search, 
  Trash2, FileText, CheckCircle2, AlertTriangle, BookOpen, 
  Sparkles, Award, User, Clock, ArrowRight, Download, Filter,
  Phone, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAuthenticatedFetch, useAuthenticatedQuery } from '@/hooks/useAuthenticatedFetch'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

export function InteractiveCharacterAssessmentManagement({ defaultCategory = 'ALL' }: { defaultCategory?: string }) {
  const authenticatedFetch = useAuthenticatedFetch()
  const authenticatedQuery = useAuthenticatedQuery()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null)

  // Form State
  const [formState, setFormState] = useState({
    studentId: '',
    category: (defaultCategory === 'ALL' ? 'KEDISIPLINAN' : defaultCategory) as any,
    type: 'NEGATIF' as any,
    title: '',
    description: '',
    points: -5,
    date: new Date().toISOString().split('T')[0],
    actionTaken: '',
    status: 'SELESAI',
    notifyParent: true,
  })

  // 1. Ambil Siswa
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['students-list-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/students'),
  })

  // 2. Ambil Kelas
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['classes-list-assessment'],
    queryFn: () => authenticatedQuery('/api-backend/classes'),
  })

  // 3. Ambil Daftar Penilaian Real
  const { data: assessmentData, isLoading } = useQuery<any>({
    queryKey: ['character-assessments-list', selectedCategory, selectedClassId],
    queryFn: () => {
      let url = '/api-backend/character-assessments?limit=100'
      if (selectedCategory !== 'ALL') url += `&category=${selectedCategory}`
      if (selectedClassId !== 'ALL') url += `&classId=${selectedClassId}`
      return authenticatedQuery(url)
    },
  })

  // 4. Ambil Statistika Dashboard Tatib & BK
  const { data: tatibStats } = useQuery<any>({
    queryKey: ['character-assessments-stats'],
    queryFn: () => authenticatedQuery('/api-backend/character-assessments/dashboard-stats'),
  })

  const assessments = assessmentData?.data || []

  // Filter Search
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item: any) => {
      const q = searchQuery.toLowerCase()
      const studentName = item.student?.name?.toLowerCase() || ''
      const studentNis = item.student?.nis?.toLowerCase() || ''
      const title = item.title?.toLowerCase() || ''
      const desc = item.description?.toLowerCase() || ''
      return studentName.includes(q) || studentNis.includes(q) || title.includes(q) || desc.includes(q)
    })
  }, [assessments, searchQuery])

  // Mutation Tambah Catatan / Penilaian
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authenticatedFetch('/api-backend/character-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal menyimpan penilaian')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard-etika'] })
      queryClient.invalidateQueries({ queryKey: ['executive-statistics'] })
      setIsFormOpen(false)
      setFormState({
        studentId: '',
        category: 'KEDISIPLINAN',
        type: 'NEGATIF',
        title: '',
        description: '',
        points: -5,
        date: new Date().toISOString().split('T')[0],
        actionTaken: '',
        status: 'SELESAI',
        notifyParent: true,
      })
      Swal.fire({
        icon: 'success',
        title: 'Penilaian Berhasil Disimpan',
        text: `Data evaluasi untuk "${data.student?.name || 'Siswa'}" berhasil direkam & notifikasi otomatis terkirim.`,
        timer: 2500,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Terjadi Kesalahan', err.message, 'error')
    },
  })

  // Mutation Hapus Catatan
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/character-assessments/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus data')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character-assessments-list'] })
      queryClient.invalidateQueries({ queryKey: ['character-assessments-stats'] })
      Swal.fire({
        icon: 'success',
        title: 'Data Dihapus',
        timer: 1500,
        showConfirmButton: false,
      })
    },
  })

  const handleSubmit = () => {
    if (!formState.studentId) {
      Swal.fire('Pilih Siswa', 'Silakan pilih siswa yang akan dievaluasi.', 'warning')
      return
    }
    if (!formState.title) {
      Swal.fire('Judul Wajib Diisi', 'Silakan masukkan judul/kasus penilaian.', 'warning')
      return
    }

    createMutation.mutate(formState)
  }

  const handleDelete = (id: string, name: string) => {
    Swal.fire({
      title: 'Hapus Catatan Penilaian?',
      text: `Anda akan menghapus catatan penilaian untuk ${name}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(id)
      }
    })
  }

  const handleExportExcel = () => {
    if (filteredAssessments.length === 0) return
    const exportData = filteredAssessments.map((a: any, idx: number) => ({
      No: idx + 1,
      Tanggal: new Date(a.date).toLocaleDateString('id-ID'),
      'Nama Siswa': a.student?.name || '-',
      NIS: a.student?.nis || '-',
      Kelas: a.student?.class?.name || '-',
      Kategori: a.category,
      Tipe: a.type,
      'Judul Evaluasi': a.title,
      'Deskripsi / Catatan': a.description || '-',
      'Poin Delta': a.points,
      'Tindak Lanjut': a.actionTaken || '-',
      'Guru Penilai / Pembina': a.evaluator?.name || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi Adab Tatib')
    XLSX.writeFile(wb, `Rekap_Adab_Tatib_BK_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Helper Preset Poin Kategori
  const handleCategoryChange = (cat: string) => {
    let type = formState.type
    let points = formState.points
    if (cat === 'PELANGGARAN') {
      type = 'NEGATIF'
      points = -10
    } else if (cat === 'PRESTASI_PENGHARGAAN') {
      type = 'POSITIF'
      points = 10
    } else if (cat === 'IBADAH') {
      type = 'POSITIF'
      points = 5
    } else if (cat === 'ADAB_ETIKA') {
      type = 'POSITIF'
      points = 5
    }
    setFormState({ ...formState, category: cat, type, points })
  }

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Total Pelanggaran</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {tatibStats?.totalPelanggaran ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Catatan Kedisiplinan</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Prestasi & Karakter</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {tatibStats?.totalPrestasi ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Apresiasi Teladan</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Amalan Ibadah</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {tatibStats?.totalIbadah ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Sholat & Kedisiplinan Agama</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200/60 dark:from-slate-900 dark:to-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Sesi Konseling BP/BK</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {tatibStats?.totalKonseling ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Bimbingan Karir & Pribadi</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <HeartHandshake className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Cari nama siswa, NIS, atau pelanggaran..."
              className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'ALL')}>
            <SelectTrigger className="w-[170px] h-10 text-xs rounded-xl">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              <SelectItem value="PELANGGARAN">Pelanggaran</SelectItem>
              <SelectItem value="KEDISIPLINAN">Kedisiplinan</SelectItem>
              <SelectItem value="ADAB_ETIKA">Adab & Etika</SelectItem>
              <SelectItem value="IBADAH">Amalan Ibadah</SelectItem>
              <SelectItem value="PRESTASI_PENGHARGAAN">Prestasi / Reward</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || 'ALL')}>
            <SelectTrigger className="w-[160px] h-10 text-xs rounded-xl">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kelas</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-10 text-xs gap-1.5 rounded-xl border-slate-200 dark:border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </Button>

          <Button
            onClick={() => setIsFormOpen(true)}
            size="sm"
            className="h-10 text-xs gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Catatan Adab & Tatib</span>
          </Button>
        </div>
      </div>

      {/* 3. Tabel Data Evaluasi & Rekam Jejak */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                Daftar Rekam Jejak Karakter, Ibadah & Tata Tertib Siswa
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Terintegrasi dengan notifikasi WhatsApp Orang Tua & akumulasi rapor karakter siswa.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total: <strong>{filteredAssessments.length}</strong> catatan
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs font-bold">No</TableHead>
                  <TableHead className="text-xs font-bold">Tanggal</TableHead>
                  <TableHead className="text-xs font-bold">Siswa & Rombel</TableHead>
                  <TableHead className="text-xs font-bold">Kategori & Poin</TableHead>
                  <TableHead className="text-xs font-bold">Judul & Keterangan</TableHead>
                  <TableHead className="text-xs font-bold">Tindak Lanjut</TableHead>
                  <TableHead className="text-xs font-bold">Penilai / Pembina</TableHead>
                  <TableHead className="w-16 text-center text-xs font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                      Memuat data penilaian karakter...
                    </TableCell>
                  </TableRow>
                ) : filteredAssessments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-sm">
                      Belum ada catatan penilaian yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssessments.map((item: any, idx: number) => {
                    const isNeg = item.points < 0 || item.category === 'PELANGGARAN' || item.type === 'NEGATIF'
                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs">
                        <TableCell className="text-center font-medium text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {new Date(item.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 dark:text-white">{item.student?.name}</div>
                          <div className="text-[11px] text-slate-400">
                            NIS: {item.student?.nis} • {item.student?.class?.name || 'Tanpa Kelas'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isNeg
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                  : item.category === 'IBADAH'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {item.category.replace('_', ' ')}
                            </Badge>
                            <span className={`font-black text-xs ${isNeg ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.points > 0 ? `+${item.points}` : item.points}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description || '-'}</p>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="text-slate-600 dark:text-slate-300 line-clamp-2">
                            {item.actionTaken || 'Dipantau dan dibina'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate max-w-[140px]">
                            {item.evaluator?.name || 'Tim Pembina'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {item.evaluator?.subRole || item.evaluator?.role || 'TATIB/BK'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id, item.student?.name)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Modal Dialog Input Evaluasi Adab & Tatib */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Input Catatan Adab, Ibadah & Tata Tertib Siswa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Catatan ini akan tersinkronisasi ke rekap rapor kepribadian dan otomatis mengirim notifikasi WhatsApp ke Wali Murid.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-xs sm:text-sm">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">Pilih Siswa *</Label>
              <Select
                value={formState.studentId}
                onValueChange={(val) => setFormState({ ...formState, studentId: val || '' })}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="-- Cari & Pilih Siswa --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {students.map((st: any) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} ({st.nis}) - {st.class?.name || 'Tanpa Kelas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kategori Penilaian *</Label>
              <Select
                value={formState.category}
                onValueChange={(val) => handleCategoryChange(val || 'KEDISIPLINAN')}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PELANGGARAN">Pelanggaran Tata Tertib</SelectItem>
                  <SelectItem value="KEDISIPLINAN">Kedisiplinan & Kerapian</SelectItem>
                  <SelectItem value="ADAB_ETIKA">Adab & Kesantunan</SelectItem>
                  <SelectItem value="IBADAH">Amalan & Sholat Berjamaah</SelectItem>
                  <SelectItem value="PRESTASI_PENGHARGAAN">Prestasi / Penghargaan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tipe Catatan *</Label>
              <Select
                value={formState.type}
                onValueChange={(val) => setFormState({ ...formState, type: (val as any) || 'NEGATIF' })}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEGATIF">Pelanggaran (Poin Negatif)</SelectItem>
                  <SelectItem value="POSITIF">Apresiasi (Poin Positif)</SelectItem>
                  <SelectItem value="RUTIN">Catatan Rutin / Monitoring</SelectItem>
                  <SelectItem value="CATATAN_KONSELING">Sesi Konseling BP/BK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">Judul / Peristiwa *</Label>
              <Input
                placeholder="Misal: Terlambat Masuk Sekolah / Teladan Sholat Berjamaah / Seragam Tidak Lengkap"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Poin Delta (- / +)</Label>
              <Input
                type="number"
                placeholder="-10 atau 10"
                value={formState.points}
                onChange={(e) => setFormState({ ...formState, points: Number(e.target.value) })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tanggal Peristiwa</Label>
              <Input
                type="date"
                value={formState.date}
                onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">Deskripsi / Kronologi Kejadian</Label>
              <Textarea
                rows={2}
                placeholder="Keterangan rinci peristiwa, tempat, atau hasil pembinaan..."
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold">Tindak Lanjut / Sanksi / Tindakan Pembinaan</Label>
              <Input
                placeholder="Misal: Diberikan teguran lisan & dibimbing piket sholat dhuha"
                value={formState.actionTaken}
                onChange={(e) => setFormState({ ...formState, actionTaken: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold gap-1.5"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan & Kirim Notifikasi WA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
