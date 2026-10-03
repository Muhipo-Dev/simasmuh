'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableSearch, filterDataBySearch } from '@/components/TableSearch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Sparkles, Users, UserCheck, Plus, Pencil, Trash2, Eye, 
  Search, Filter, Calendar, MapPin, Clock, Trophy, Award,
  ShieldCheck, CheckCircle2, UserPlus, X, Phone, UserSquare2,
  ChevronRight, Building
} from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

const KATEGORI_EKSKUL = [
  { id: 'WAJIB_MUHAMMADIYAH', label: 'Wajib Muhammadiyah', badge: 'bg-emerald-600 text-white' },
  { id: 'OLAHRAGA', label: 'Olahraga & Atletik', badge: 'bg-orange-500 text-white' },
  { id: 'SENI_BUDAYA', label: 'Seni & Budaya', badge: 'bg-pink-600 text-white' },
  { id: 'KEAGAMAAN', label: 'Keagamaan & Tahfidz', badge: 'bg-teal-600 text-white' },
  { id: 'AKADEMIK_SAINS', label: 'Sains & Robotika', badge: 'bg-blue-600 text-white' },
  { id: 'KEPANDUAN', label: 'Kepanduan & Bela Negara', badge: 'bg-indigo-600 text-white' },
  { id: 'KEORGANISASIAN', label: 'Organisasi Kesiswaan', badge: 'bg-purple-600 text-white' },
  { id: 'KESEHATAN_SOSIAL', label: 'Kesehatan & UKS', badge: 'bg-rose-600 text-white' },
  { id: 'UMUM', label: 'Umum / Minat Bakat', badge: 'bg-slate-600 text-white' },
]

export default function EkstrakurikulerPage() {
  const { data: session } = useSession()
  const authenticatedFetch = useAuthenticatedFetch()
  const queryClient = useQueryClient()

  const u = session?.user as any
  const userRolesList = [
    u?.role,
    u?.subRole,
    u?.subRole2,
    u?.subRole3,
    u?.subRole4,
    u?.subRole5,
    ...(Array.isArray(u?.subRoles) ? u.subRoles : []),
  ].filter(Boolean)

  // Wewenang Kelola Penuh: Waka Kesiswaan, Seluruh Waka, Kepala Sekolah, dan Superadmin
  const canManage = userRolesList.some((r: string) =>
    [
      'SUPERADMIN', 'ADMIN_IT', 'KEPALA_SEKOLAH', 'KESISWAAN', 'WAKA_KESISWAAN',
      'KETERTIBAN', 'WAKA_KURIKULUM', 'KURIKULUM', 'WAKA_HUMAS_SDM', 'HUMAS_SDM',
      'WAKA_SARPRAS', 'WAKA_ISMUBA', 'ISMUBA'
    ].includes(r) ||
    r.startsWith('WAKA_') ||
    r.includes('WAKA') ||
    r.includes('KESISWAAN')
  )

  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  // State Modals
  const [openFormModal, setOpenFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [openDetailModal, setOpenDetailModal] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [openAddMemberModal, setOpenAddMemberModal] = useState(false)

  // State Form Ekstrakurikuler
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formCategory, setFormCategory] = useState('WAJIB_MUHAMMADIYAH')
  const [formDescription, setFormDescription] = useState('')
  const [formScheduleDay, setFormScheduleDay] = useState('Jumat')
  const [formScheduleTime, setFormScheduleTime] = useState('15:30 - 17:00')
  const [formLocation, setFormLocation] = useState('')
  const [formPembinaName, setFormPembinaName] = useState('')
  const [formPembinaNip, setFormPembinaNip] = useState('')
  const [formPembinaContact, setFormPembinaContact] = useState('')
  const [formPembina2Name, setFormPembina2Name] = useState('')
  const [formPembina2Contact, setFormPembina2Contact] = useState('')
  const [formTargetPeserta, setFormTargetPeserta] = useState('Semua Tingkat (X, XI, XII)')
  const [formIsActive, setFormIsActive] = useState(true)

  // State Form Tambah Anggota Siswa
  const [formMemberStudentId, setFormMemberStudentId] = useState('')
  const [formMemberRole, setFormMemberRole] = useState('ANGGOTA')
  const [formMemberCatatan, setFormMemberCatatan] = useState('')

  // 1. Fetch Daftar Ekstrakurikuler
  const { data: rawEkskulList, isLoading: loadingEkskul } = useQuery<any[]>({
    queryKey: ['extracurricular-list', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory !== 'ALL'
        ? `/api-backend/extracurricular?category=${selectedCategory}`
        : '/api-backend/extracurricular'
      const res = await authenticatedFetch(url)
      if (!res.ok) return []
      return res.json()
    }
  })
  const ekskulList = Array.isArray(rawEkskulList) ? rawEkskulList : []

  // 2. Fetch Master Guru (Untuk Pilihan Pembina)
  const { data: rawTeachers } = useQuery<any[]>({
    queryKey: ['teachers-pembina-options'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/teachers')
      if (!res.ok) return []
      return res.json()
    }
  })
  const teachersList = Array.isArray(rawTeachers) ? rawTeachers : []

  // 3. Fetch Master Siswa (Untuk Pilihan Anggota)
  const { data: rawStudents } = useQuery<any[]>({
    queryKey: ['students-member-options'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api-backend/students')
      if (!res.ok) return []
      return res.json()
    }
  })
  const studentsList = Array.isArray(rawStudents) ? rawStudents : []

  // Filter Data Sesuai Search
  const filteredEkskul = useMemo(() => {
    return filterDataBySearch(ekskulList, searchQuery)
  }, [ekskulList, searchQuery])

  // Mutasi Simpan (Tambah / Edit Ekstrakurikuler)
  const saveEkskulMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingItem?.id
        ? `/api-backend/extracurricular/${editingItem.id}`
        : '/api-backend/extracurricular'
      const method = editingItem?.id ? 'PATCH' : 'POST'

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan data ekstrakurikuler.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-list'] })
      setOpenFormModal(false)
      resetForm()
      Swal.fire('Berhasil Disimpan', 'Data ekstrakurikuler & pembina berhasil diperbarui.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'error')
    }
  })

  // Mutasi Hapus Ekstrakurikuler
  const deleteEkskulMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api-backend/extracurricular/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus ekstrakurikuler.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-list'] })
      Swal.fire('Terhapus', 'Ekstrakurikuler berhasil dihapus.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'error')
    }
  })

  // Mutasi Tambah Anggota Siswa
  const addMemberMutation = useMutation({
    mutationFn: async ({ ekskulId, data }: { ekskulId: string; data: any }) => {
      const res = await authenticatedFetch(`/api-backend/extracurricular/${ekskulId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menambahkan anggota.')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-list'] })
      setOpenAddMemberModal(false)
      setFormMemberStudentId('')
      setFormMemberRole('ANGGOTA')
      setFormMemberCatatan('')
      Swal.fire('Anggota Ditambahkan', 'Siswa berhasil didaftarkan ke ekstrakurikuler.', 'success')
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menambahkan', err.message || 'Terjadi kesalahan.', 'error')
    }
  })

  // Mutasi Hapus Anggota
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await authenticatedFetch(`/api-backend/extracurricular/members/${memberId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Gagal menghapus anggota.')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracurricular-list'] })
      Swal.fire('Dihapus', 'Anggota telah dikeluarkan dari ekstrakurikuler.', 'success')
    }
  })

  const resetForm = () => {
    setEditingItem(null)
    setFormName('')
    setFormCode('')
    setFormCategory('WAJIB_MUHAMMADIYAH')
    setFormDescription('')
    setFormScheduleDay('Jumat')
    setFormScheduleTime('15:30 - 17:00')
    setFormLocation('')
    setFormPembinaName('')
    setFormPembinaNip('')
    setFormPembinaContact('')
    setFormPembina2Name('')
    setFormPembina2Contact('')
    setFormTargetPeserta('Semua Tingkat (X, XI, XII)')
    setFormIsActive(true)
  }

  const handleEditClick = (item: any) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormCode(item.code || '')
    setFormCategory(item.category || 'WAJIB_MUHAMMADIYAH')
    setFormDescription(item.description || '')
    setFormScheduleDay(item.scheduleDay || 'Jumat')
    setFormScheduleTime(item.scheduleTime || '15:30 - 17:00')
    setFormLocation(item.location || '')
    setFormPembinaName(item.pembinaName || '')
    setFormPembinaNip(item.pembinaNip || '')
    setFormPembinaContact(item.pembinaContact || '')
    setFormPembina2Name(item.pembina2Name || '')
    setFormPembina2Contact(item.pembina2Contact || '')
    setFormTargetPeserta(item.targetPeserta || 'Semua Tingkat (X, XI, XII)')
    setFormIsActive(item.isActive !== undefined ? item.isActive : true)
    setOpenFormModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-300" />
            Manajemen Ekstrakurikuler & Pembina
          </h1>
          <p className="text-blue-100 mt-1.5 text-xs sm:text-sm">
            Tata kelola kegiatan bakat minat, pembina/pelatih, jadwal latihan, dan keanggotaan siswa SMA Muhammadiyah 1 Ponorogo.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/informasi/prestasi">
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-bold h-10 px-3.5 shadow-xs">
              <Trophy className="w-4 h-4 mr-1.5" />
              Prestasi Siswa
            </Button>
          </Link>
          {canManage && (
            <Button
              onClick={() => {
                resetForm()
                setOpenFormModal(true)
              }}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-10 px-4 rounded-xl shadow-md gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Ekskul Baru
            </Button>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Ekstrakurikuler</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {ekskulList.length}
              </div>
              <span className="text-[10px] text-slate-500">Klub & Organisasi</span>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-blue-600">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Status Aktif Berjalan</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {ekskulList.filter(e => e.isActive).length}
              </div>
              <span className="text-[10px] text-slate-500">Kegiatan Terjadwal</span>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Anggota Siswa</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {ekskulList.reduce((acc, e) => acc + (e.members?.length || 0), 0)}
              </div>
              <span className="text-[10px] text-slate-500">Peserta Terdaftar</span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Pembina & Pelatih</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {new Set(ekskulList.map(e => e.pembinaName).filter(Boolean)).size}
              </div>
              <span className="text-[10px] text-slate-500">Pendidik & Instruktur</span>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-2xl text-amber-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Tabel Data Ekstrakurikuler */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Daftar Ekstrakurikuler & Pembina
            </CardTitle>
            <CardDescription className="text-xs">
              Seluruh unit kegiatan siswa di SMA Muhammadiyah 1 Ponorogo beserta nama pembina dan jadwal latihan.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 font-medium"
            >
              <option value="ALL">-- Semua Kategori --</option>
              {KATEGORI_EKSKUL.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
            <TableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari ekskul / pembina / tempat..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="pl-6 w-[50px]">No</TableHead>
                <TableHead>Nama Ekstrakurikuler</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Pembina / Pelatih</TableHead>
                <TableHead>Jadwal & Tempat</TableHead>
                <TableHead className="text-center">Anggota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEkskul.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-xs">Belum ada data ekstrakurikuler tercatat.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Silakan klik tombol &quot;Tambah Ekskul Baru&quot; untuk menambahkan data.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEkskul.map((item, idx) => {
                  const catObj = KATEGORI_EKSKUL.find(k => k.id === item.category)
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <TableCell className="pl-6 font-medium text-slate-500 text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        {item.code && (
                          <span className="text-[10px] text-blue-600 font-mono font-bold block">
                            Kode: {item.code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${catObj?.badge || 'bg-slate-600 text-white'} text-[10px] font-bold`}>
                          {catObj?.label || item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {item.pembinaName}
                        </div>
                        {item.pembinaNip && item.pembinaNip !== '-' && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            NIP/NBM. {item.pembinaNip}
                          </span>
                        )}
                        {item.pembina2Name && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Pendamping: {item.pembina2Name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>{item.scheduleDay || '-'}</span>
                          {item.scheduleTime && (
                            <span className="text-slate-400 font-mono text-[11px]">({item.scheduleTime})</span>
                          )}
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-rose-500" />
                            <span>{item.location}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {item.members?.length || 0} Siswa
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">
                            Non-Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDetail(item)
                              setOpenDetailModal(true)
                            }}
                            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(item)}
                                className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  Swal.fire({
                                    title: 'Hapus Ekstrakurikuler?',
                                    text: `Hapus kegiatan "${item.name}"? Seluruh data anggota terdaftar juga akan terhapus.`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#e11d48',
                                    confirmButtonText: 'Ya, Hapus',
                                    cancelButtonText: 'Batal'
                                  }).then(r => {
                                    if (r.isConfirmed) {
                                      deleteEkskulMutation.mutate(item.id)
                                    }
                                  })
                                }}
                                className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
        </CardContent>
      </Card>

      {/* MODAL FORM TAMBAH / EDIT EKSTRAKURIKULER */}
      <Dialog open={openFormModal} onOpenChange={setOpenFormModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              {editingItem ? 'Edit Data Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Isi data nama kegiatan, kategori, jadwal latihan, dan tentukan guru/pelatih pembinanya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold">Nama Ekstrakurikuler *</Label>
                <Input
                  placeholder="Contoh: Hizbul Wathan (HW), Tapak Suci, Futsal..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Kode / Singkatan</Label>
                <Input
                  placeholder="Contoh: HW, TS"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Kategori Bidang</Label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950"
                >
                  {KATEGORI_EKSKUL.map((k) => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Target Peserta</Label>
                <Input
                  placeholder="Contoh: Semua Tingkat / Wajib Kelas X"
                  value={formTargetPeserta}
                  onChange={(e) => setFormTargetPeserta(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Bagian Pembina / Pelatih Utama */}
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
              <div className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Data Pembina / Pelatih Utama *
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pilih dari Guru SIMASMUH (Opsional)</Label>
                <select
                  onChange={(e) => {
                    const val = e.target.value
                    const t = teachersList.find(x => x.id === val)
                    if (t) {
                      setFormPembinaName(t.user?.name || t.name || '')
                      setFormPembinaNip(t.nip && t.nip !== '-' ? t.nip : '')
                      setFormPembinaContact(t.user?.phone || '')
                    }
                  }}
                  className="w-full h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950"
                >
                  <option value="">-- Pilih Guru Sebagai Pembina --</option>
                  {teachersList.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.user?.name || t.name} {t.nip && t.nip !== '-' ? `(NIP. ${t.nip})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Pembina *</Label>
                  <Input
                    placeholder="Nama Pembina / Pelatih..."
                    value={formPembinaName}
                    onChange={(e) => setFormPembinaName(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">NIP / NBM / Kontak WA</Label>
                  <Input
                    placeholder="Contoh: 08123456789 atau NIP"
                    value={formPembinaContact || formPembinaNip}
                    onChange={(e) => {
                      setFormPembinaContact(e.target.value)
                      setFormPembinaNip(e.target.value)
                    }}
                    className="h-8 text-xs bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* Bagian Pembina Pendamping */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Pembina Pendamping / Asisten (Opsional)</Label>
                <Input
                  placeholder="Nama Pembina Pendamping..."
                  value={formPembina2Name}
                  onChange={(e) => setFormPembina2Name(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">No. Kontak Pendamping</Label>
                <Input
                  placeholder="No. WA / HP..."
                  value={formPembina2Contact}
                  onChange={(e) => setFormPembina2Contact(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Bagian Jadwal & Lokasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Hari Pelaksanaan</Label>
                <Input
                  placeholder="Contoh: Jumat, Sabtu"
                  value={formScheduleDay}
                  onChange={(e) => setFormScheduleDay(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Waktu Latihan</Label>
                <Input
                  placeholder="Contoh: 15:30 - 17:00"
                  value={formScheduleTime}
                  onChange={(e) => setFormScheduleTime(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Lokasi / Tempat</Label>
                <Input
                  placeholder="Contoh: Lapangan Utama, Aula"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Deskripsi & Profil Kegiatan</Label>
              <Textarea
                placeholder="Tuliskan tujuan kegiatan, prestasi yang ditargetkan, atau materi pokok..."
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenFormModal(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!formName.trim() || !formPembinaName.trim() || saveEkskulMutation.isPending}
              onClick={() => {
                saveEkskulMutation.mutate({
                  name: formName.trim(),
                  code: formCode.trim() || undefined,
                  category: formCategory,
                  description: formDescription.trim() || undefined,
                  scheduleDay: formScheduleDay.trim() || undefined,
                  scheduleTime: formScheduleTime.trim() || undefined,
                  location: formLocation.trim() || undefined,
                  pembinaName: formPembinaName.trim(),
                  pembinaNip: formPembinaNip.trim() || undefined,
                  pembinaContact: formPembinaContact.trim() || undefined,
                  pembina2Name: formPembina2Name.trim() || undefined,
                  pembina2Contact: formPembina2Contact.trim() || undefined,
                  targetPeserta: formTargetPeserta.trim() || undefined,
                  isActive: formIsActive,
                })
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
            >
              {saveEkskulMutation.isPending ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambahkan Ekskul'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL EKSTRAKURIKULER & DAFTAR ANGGOTA SISWA */}
      <Dialog open={openDetailModal} onOpenChange={setOpenDetailModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Detail Ekstrakurikuler & Keanggotaan
            </DialogTitle>
          </DialogHeader>

          {selectedDetail && (
            <div className="space-y-4 py-2 text-xs">
              {/* Card Profil Ekskul */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedDetail.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedDetail.description || 'Tidak ada deskripsi profil.'}
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                    {selectedDetail.category}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Pembina Utama:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedDetail.pembinaName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Jadwal:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedDetail.scheduleDay} ({selectedDetail.scheduleTime})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Lokasi:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedDetail.location || 'Kampus MUHIPO'}</strong>
                  </div>
                </div>
              </div>

              {/* Tabel Daftar Anggota Siswa */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Daftar Siswa Anggota ({selectedDetail.members?.length || 0} Siswa)
                  </h4>
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => setOpenAddMemberModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Tambah Anggota
                    </Button>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100/60 dark:bg-slate-800/60">
                      <TableRow>
                        <TableHead className="w-10">No</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jabatan</TableHead>
                        {canManage && <TableHead className="text-right pr-4">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!selectedDetail.members || selectedDetail.members.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                            Belum ada siswa yang didaftarkan pada ekstrakurikuler ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedDetail.members.map((m: any, mIdx: number) => (
                          <TableRow key={m.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-500 text-xs">{mIdx + 1}</TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                              {m.student?.name}
                              {m.student?.nis && (
                                <span className="text-[10px] text-slate-400 font-mono block">NIS. {m.student.nis}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {m.student?.class?.name || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {m.role}
                              </Badge>
                            </TableCell>
                            {canManage && (
                              <TableCell className="text-right pr-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    removeMemberMutation.mutate(m.id)
                                    setSelectedDetail((prev: any) => ({
                                      ...prev,
                                      members: prev.members.filter((x: any) => x.id !== m.id)
                                    }))
                                  }}
                                  className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setOpenDetailModal(false)} className="text-xs font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TAMBAH ANGGOTA SISWA KE EKSKUL */}
      <Dialog open={openAddMemberModal} onOpenChange={setOpenAddMemberModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Tambah Anggota Siswa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Pilih Siswa *</Label>
              <select
                value={formMemberStudentId}
                onChange={(e) => setFormMemberStudentId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950"
              >
                <option value="">-- Pilih Siswa --</option>
                {studentsList.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.class?.name || 'Siswa'}) - NIS. {s.nis || '-'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Jabatan / Peran</Label>
              <select
                value={formMemberRole}
                onChange={(e) => setFormMemberRole(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950"
              >
                <option value="ANGGOTA">Anggota</option>
                <option value="KETUA">Ketua / Pradana</option>
                <option value="WAKIL_KETUA">Wakil Ketua</option>
                <option value="SEKRETARIS">Sekretaris</option>
                <option value="BENDAHARA">Bendahara</option>
                <option value="KAPTEEN">Kapten Tim</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenAddMemberModal(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!formMemberStudentId || addMemberMutation.isPending}
              onClick={() => {
                if (selectedDetail?.id) {
                  addMemberMutation.mutate({
                    ekskulId: selectedDetail.id,
                    data: {
                      studentId: formMemberStudentId,
                      role: formMemberRole,
                      catatan: formMemberCatatan || undefined,
                    }
                  })
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {addMemberMutation.isPending ? 'Menambahkan...' : 'Daftarkan Siswa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
