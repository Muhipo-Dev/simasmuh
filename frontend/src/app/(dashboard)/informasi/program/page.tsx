'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen, Globe, Cpu, Briefcase, Music, Microscope, Dumbbell, Heart, Moon,
  GraduationCap, Award, Layers, Compass, Rocket, Shield, Star,
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Edit3, Trash2,
  Plus, Check, X, RefreshCw, CheckCircle2, ChevronRight, UploadCloud, Image as ImageIcon
} from 'lucide-react'
import { useAuthenticatedQuery, useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { TablePagination } from '@/components/TablePagination'
import Swal from 'sweetalert2'
import { compressImageFile } from '@/utils/imageCompressor'

const AVAILABLE_ICONS: { name: string; label: string; icon: any }[] = [
  { name: 'BookOpen', label: 'Buku / Al-Quran', icon: BookOpen },
  { name: 'Globe', label: 'Global / Bahasa', icon: Globe },
  { name: 'Cpu', label: 'Teknologi / AI', icon: Cpu },
  { name: 'Briefcase', label: 'Bisnis / Wirausaha', icon: Briefcase },
  { name: 'Music', label: 'Seni / Musik', icon: Music },
  { name: 'Microscope', label: 'Sains / Riset', icon: Microscope },
  { name: 'Dumbbell', label: 'Olahraga / Atlet', icon: Dumbbell },
  { name: 'Heart', label: 'Inklusi / Sosial', icon: Heart },
  { name: 'Moon', label: 'Pesantren / Boarding', icon: Moon },
  { name: 'GraduationCap', label: 'Akademik / PTN', icon: GraduationCap },
  { name: 'Award', label: 'Prestasi / Juara', icon: Award },
  { name: 'Layers', label: 'Komprehensif / Modul', icon: Layers },
  { name: 'Compass', label: 'Bimbingan / Arah', icon: Compass },
  { name: 'Rocket', label: 'Inovasi / Akselerasi', icon: Rocket },
  { name: 'Shield', label: 'Karakter / Disiplin', icon: Shield },
  { name: 'Star', label: 'Program Unggulan', icon: Star },
]

const COLOR_OPTIONS: { key: string; label: string; bgClass: string; textClass: string }[] = [
  { key: 'blue', label: 'Biru', bgClass: 'bg-blue-100 dark:bg-blue-950', textClass: 'text-blue-700 dark:text-blue-300' },
  { key: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-100 dark:bg-indigo-950', textClass: 'text-indigo-700 dark:text-indigo-300' },
  { key: 'emerald', label: 'Hijau Emerald', bgClass: 'bg-emerald-100 dark:bg-emerald-950', textClass: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'orange', label: 'Oranye', bgClass: 'bg-orange-100 dark:bg-orange-950', textClass: 'text-orange-700 dark:text-orange-300' },
  { key: 'pink', label: 'Merah Muda', bgClass: 'bg-pink-100 dark:bg-pink-950', textClass: 'text-pink-700 dark:text-pink-300' },
  { key: 'cyan', label: 'Sian', bgClass: 'bg-cyan-100 dark:bg-cyan-950', textClass: 'text-cyan-700 dark:text-cyan-300' },
  { key: 'lime', label: 'Hijau Lime', bgClass: 'bg-lime-100 dark:bg-lime-950', textClass: 'text-lime-700 dark:text-lime-300' },
  { key: 'rose', label: 'Mawar', bgClass: 'bg-rose-100 dark:bg-rose-950', textClass: 'text-rose-700 dark:text-rose-300' },
  { key: 'violet', label: 'Violet', bgClass: 'bg-violet-100 dark:bg-violet-950', textClass: 'text-violet-700 dark:text-violet-300' },
  { key: 'amber', label: 'Kuning Amber', bgClass: 'bg-amber-100 dark:bg-amber-950', textClass: 'text-amber-700 dark:text-amber-300' },
]

export interface ProgramConfigItem {
  id: string
  code: string
  name: string
  defaultSpp: number
  defaultBeasiswa: number
  description: string | null
  subtitle: string | null
  fullContent: string | null
  features: string | null
  fasilitasList: string | null
  keunggulanList: string | null
  iconName: string | null
  logoUrl: string | null
  badgeColor: string | null
  order: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export default function ProgramInformasiPage() {
  const queryClient = useQueryClient()
  const authenticatedQuery = useAuthenticatedQuery()
  const authenticatedFetch = useAuthenticatedFetch()
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Data fetching
  const { data: programs = [], isLoading, refetch } = useQuery<ProgramConfigItem[]>({
    queryKey: ['program-configs'],
    queryFn: () => authenticatedQuery('/api-backend/settings/program-configs'),
  })

  // State search, filter, pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // State edit modal
  const [editingProgram, setEditingProgram] = useState<ProgramConfigItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    subtitle: '',
    description: '',
    fullContent: '',
    featuresText: '',
    fasilitasText: '',
    keunggulanText: '',
    iconName: 'BookOpen',
    logoUrl: '',
    badgeColor: 'blue',
    order: 0,
    isVisible: true,
  })

  const parseStringifiedArray = (raw?: string | null): string => {
    if (!raw) return ''
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.join('\n')
      return String(parsed)
    } catch {
      return raw
    }
  }

  // Open modal for adding new program
  const handleOpenAdd = () => {
    setEditingProgram(null)
    const nextOrder = programs.length > 0 ? Math.max(...programs.map((p) => p.order ?? 0)) + 1 : 1
    setFormData({
      code: '',
      name: '',
      subtitle: '',
      description: '',
      fullContent: '',
      featuresText: '',
      fasilitasText: '',
      keunggulanText: '',
      iconName: 'BookOpen',
      logoUrl: '',
      badgeColor: 'blue',
      order: nextOrder,
      isVisible: true,
    })
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (prog: ProgramConfigItem) => {
    setEditingProgram(prog)
    const featuresStr = parseStringifiedArray(prog.features)
    const fasilitasStr = parseStringifiedArray(prog.fasilitasList)
    const keunggulanStr = parseStringifiedArray(prog.keunggulanList)

    setFormData({
      code: prog.code,
      name: prog.name,
      subtitle: prog.subtitle || '',
      description: prog.description || '',
      fullContent: prog.fullContent || '',
      featuresText: featuresStr,
      fasilitasText: fasilitasStr,
      keunggulanText: keunggulanStr || featuresStr,
      iconName: prog.iconName || 'BookOpen',
      logoUrl: prog.logoUrl || '',
      badgeColor: prog.badgeColor || 'blue',
      order: prog.order ?? 0,
      isVisible: prog.isVisible ?? true,
    })
    setIsModalOpen(true)
  }

  // Handle Logo File Upload (Kompresi ke Base64)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingLogo(true)
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
      })
      setFormData((prev) => ({ ...prev, logoUrl: compressed.dataUrl }))
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Logo program berhasil dimuat',
        showConfirmButton: false,
        timer: 1500,
      })
    } catch (err: any) {
      Swal.fire('Gagal Unggah Logo', err.message || 'Format gambar tidak didukung', 'error')
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  // Mutation: create or update program
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toArray = (text: string) =>
        text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)

      const keunggulanArray = toArray(formData.keunggulanText || formData.featuresText)
      const fasilitassArray = toArray(formData.fasilitasText)

      const payload = {
        code: formData.code.trim().toLowerCase(),
        name: formData.name.trim(),
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        fullContent: formData.fullContent.trim() || null,
        features: JSON.stringify(keunggulanArray),
        keunggulanList: JSON.stringify(keunggulanArray),
        fasilitasList: JSON.stringify(fasilitassArray),
        iconName: formData.iconName,
        logoUrl: formData.logoUrl || null,
        badgeColor: formData.badgeColor,
        order: Number(formData.order),
        isVisible: formData.isVisible,
      }

      if (!payload.name) {
        throw new Error('Nama program wajib diisi.')
      }

      const isEdit = Boolean(editingProgram)
      const url = isEdit
        ? `/api-backend/settings/program-configs/${editingProgram!.id}`
        : '/api-backend/settings/program-configs'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Gagal menyimpan program')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      queryClient.invalidateQueries({ queryKey: ['public-programs'] })
      setIsModalOpen(false)
      Swal.fire({
        title: editingProgram ? 'Perubahan Disimpan!' : 'Program Ditambahkan!',
        text: 'Program unggulan berhasil diperbarui dan tersinkronisasi langsung dengan landing page portal.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
        timer: 1800,
        showConfirmButton: false,
      })
    },
    onError: (err: any) => {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error')
    },
  })

  // Handle Delete Program
  const handleDeleteProgram = (prog: ProgramConfigItem) => {
    Swal.fire({
      title: 'Hapus Program Unggulan?',
      text: `Apakah Anda yakin ingin menghapus program "${prog.name}"? Program tidak akan lagi tampil di portal web.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await authenticatedFetch(`/api-backend/settings/program-configs/${prog.id}`, {
            method: 'DELETE',
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.message || 'Gagal menghapus program')
          }
          queryClient.invalidateQueries({ queryKey: ['program-configs'] })
          queryClient.invalidateQueries({ queryKey: ['public-programs'] })
          Swal.fire({
            title: 'Terhapus!',
            text: `Program "${prog.name}" berhasil dihapus.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          })
        } catch (err: any) {
          Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem', 'error')
        }
      }
    })
  }

  // Mutation: Move up / down order
  const moveOrder = async (targetProg: ProgramConfigItem, direction: 'UP' | 'DOWN') => {
    const sorted = [...programs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const index = sorted.findIndex((p) => p.id === targetProg.id)
    if (index === -1) return

    const swapIndex = direction === 'UP' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    const otherProg = sorted[swapIndex]
    const updatedItems = [
      { id: targetProg.id, order: otherProg.order },
      { id: otherProg.id, order: targetProg.order === otherProg.order ? (direction === 'UP' ? otherProg.order + 1 : otherProg.order - 1) : targetProg.order },
    ]

    try {
      const res = await authenticatedFetch('/api-backend/settings/program-configs/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      })
      if (!res.ok) throw new Error('Gagal mengubah urutan')
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      queryClient.invalidateQueries({ queryKey: ['public-programs'] })
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Tidak dapat memperbarui posisi urutan', 'error')
    }
  }

  // Mutation: Toggle visibility
  const toggleVisibility = async (prog: ProgramConfigItem) => {
    try {
      const res = await authenticatedFetch(`/api-backend/settings/program-configs/${prog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !prog.isVisible }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status tampil')
      queryClient.invalidateQueries({ queryKey: ['program-configs'] })
      queryClient.invalidateQueries({ queryKey: ['public-programs'] })
    } catch (err: any) {
      Swal.fire('Gagal', err.message, 'error')
    }
  }

  // Filtered & Paginated items
  const filteredPrograms = useMemo(() => {
    return programs
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'VISIBLE' && p.isVisible) ||
          (statusFilter === 'HIDDEN' && !p.isVisible)

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [programs, searchQuery, statusFilter])

  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPrograms.slice(start, start + pageSize)
  }, [filteredPrograms, currentPage, pageSize])

  // Select all handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedPrograms.map((p) => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const isAllSelected = paginatedPrograms.length > 0 && paginatedPrograms.every((p) => selectedIds.includes(p.id))

  // Render icon helper
  const getIconComp = (iconName: string | null) => {
    const found = AVAILABLE_ICONS.find((i) => i.name === iconName)
    return found ? found.icon : BookOpen
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Manajemen Program Unggulan Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola publikasi, deskripsi, urutan posisi, icon, dan visibilitas program unggulan yang tampil di portal web.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-9 px-3.5 gap-1.5 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 px-3 gap-1.5 font-bold rounded-xl text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Kontrol Pencarian, Filter Popover, & Aksi Massal */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-xs bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Searchbar & Tombol Filter Terpusat Bersebelahan Sesuai Aturan AGENTS.md */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari program atau deskripsi..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-10 rounded-xl text-sm border-slate-200 dark:border-slate-800 focus-visible:ring-blue-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tombol Filter Terpusat Popover */}
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-10 px-3.5 gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold shrink-0 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs sm:text-sm"
                    >
                      <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">Filter</span>
                      {statusFilter !== 'ALL' && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  }
                />
                <PopoverContent className="w-64 p-4 rounded-2xl shadow-xl space-y-3" align="end">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Filter Visibilitas
                    </span>
                    {statusFilter !== 'ALL' && (
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Status Tampil</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(val: any) => {
                        setStatusFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">Semua Program ({programs.length})</SelectItem>
                        <SelectItem value="VISIBLE">Aktif Tampil ({programs.filter((p) => p.isVisible).length})</SelectItem>
                        <SelectItem value="HIDDEN">Disembunyikan ({programs.filter((p) => !p.isVisible).length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Total Data Count / Info */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 font-bold">
                {filteredPrograms.length} Program Terdaftar
              </span>
            </div>
          </div>

          {/* Bar Aksi Seleksi Massal Jika Ada Baris Terpilih */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 animate-in fade-in">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                {selectedIds.length} program terpilih
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    for (const id of selectedIds) {
                      await authenticatedFetch(`/api-backend/settings/program-configs/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isVisible: true }),
                      })
                    }
                    queryClient.invalidateQueries({ queryKey: ['program-configs'] })
                    queryClient.invalidateQueries({ queryKey: ['public-programs'] })
                    setSelectedIds([])
                    Swal.fire('Berhasil', 'Program terpilih diaktifkan', 'success')
                  }}
                  className="h-8 text-xs font-bold rounded-lg bg-white dark:bg-slate-900"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Tampilkan Semua
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    for (const id of selectedIds) {
                      await authenticatedFetch(`/api-backend/settings/program-configs/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isVisible: false }),
                      })
                    }
                    queryClient.invalidateQueries({ queryKey: ['program-configs'] })
                    queryClient.invalidateQueries({ queryKey: ['public-programs'] })
                    setSelectedIds([])
                    Swal.fire('Berhasil', 'Program terpilih disembunyikan', 'success')
                  }}
                  className="h-8 text-xs font-bold rounded-lg bg-white dark:bg-slate-900"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Sembunyikan Semua
                </Button>
              </div>
            </div>
          )}

          {/* Tabel Presisi Sesuai Aturan AGENTS.md: Checkbox, Width Terukur, Truncate, Pagination */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-extrabold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 w-16 text-center">Posisi</th>
                  <th className="p-3 w-48">Program (Master Data)</th>
                  <th className="p-3 min-w-[220px] max-w-[380px]">Deskripsi Singkat Portal</th>
                  <th className="p-3 w-28 text-center">Icon & Warna</th>
                  <th className="p-3 w-28 text-center">Status Portal</th>
                  <th className="p-3 w-36 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Memuat daftar program...
                    </td>
                  </tr>
                ) : paginatedPrograms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      Tidak ada program ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedPrograms.map((prog, idx) => {
                    const IconC = getIconComp(prog.iconName)
                    const colorDef = COLOR_OPTIONS.find((c) => c.key === (prog.badgeColor || 'blue')) || COLOR_OPTIONS[0]
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1

                    return (
                      <tr
                        key={prog.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${
                          selectedIds.includes(prog.id) ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(prog.id)}
                            onChange={(e) => handleSelectRow(prog.id, e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1 font-extrabold text-slate-700 dark:text-slate-300">
                            <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">
                              {prog.order ?? globalIdx}
                            </span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => moveOrder(prog, 'UP')}
                                title="Pindah ke Atas"
                                className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => moveOrder(prog, 'DOWN')}
                                title="Pindah ke Bawah"
                                className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${colorDef.bgClass}`}>
                              {prog.logoUrl ? (
                                <img src={prog.logoUrl} alt={prog.name} className="w-full h-full object-contain p-1" />
                              ) : (
                                <IconC className={`w-4 h-4 ${colorDef.textClass}`} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-extrabold">{prog.name}</div>
                              <div className="text-[11px] text-slate-400 font-normal truncate">
                                Kode: {prog.code}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="line-clamp-2 text-slate-600 dark:text-slate-400 text-xs" title={prog.description || '-'}>
                            {prog.description || <span className="italic text-slate-400">Belum ada deskripsi portal</span>}
                          </div>
                          {prog.subtitle && (
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate mt-0.5">
                              {prog.subtitle}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${colorDef.bgClass} ${colorDef.textClass}`}>
                            {colorDef.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleVisibility(prog)}
                            className="inline-flex items-center gap-1.5 cursor-pointer"
                            title="Klik untuk ubah visibilitas portal"
                          >
                            <Switch checked={prog.isVisible} onCheckedChange={() => toggleVisibility(prog)} />
                            <span className={`text-[11px] font-extrabold ${prog.isVisible ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {prog.isVisible ? 'Tampil' : 'Sembunyi'}
                            </span>
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(prog)}
                              className="h-8 px-2.5 rounded-lg font-bold gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteProgram(prog)}
                              className="h-8 px-2 rounded-lg font-bold gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              title="Hapus Program"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Hapus</span>
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

          {/* TablePagination Sesuai Aturan AGENTS.md (10/50/100 limit, nomor urut presisi) */}
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredPrograms.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 50, 100]}
            itemLabel="program"
          />
        </CardContent>
      </Card>

      {/* Modal Dialog Edit Program Portal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-7">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                {editingProgram ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingProgram ? `Edit Publikasi: ${formData.name}` : 'Tambah Program Unggulan Baru'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {editingProgram
                    ? `Kode unik: ${formData.code}. Sesuaikan konten dan publikasi landing page di bawah ini.`
                    : 'Tambahkan program baru ke dalam sistem dan atur tampilan pada landing page portal.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs sm:text-sm">
            {/* Baris 1: Kode Program (wajib saat tambah baru) & Posisi Urutan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="font-bold text-xs">
                  Judul Program <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Tahfidz Al-Quran / Robotika"
                  className="rounded-xl h-9 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Nomor Posisi Urutan</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            {/* Baris 1b: Kode Program / Identifier */}
            <div className="space-y-1">
              <Label className="font-bold text-xs">
                Kode / Identifier Program <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Contoh: tahfidz, robotika, enterpreneur (huruf kecil tanpa spasi)"
                disabled={Boolean(editingProgram)}
                className="rounded-xl h-9 text-xs font-mono"
              />
              {!editingProgram && (
                <p className="text-[10px] text-slate-400">
                  Kode unik digunakan sebagai pengenal sistem (contoh: tahfidz, mic, ai, robotika).
                </p>
              )}
            </div>

            {/* Baris 2: Subtitle Banner / Modal */}
            <div className="space-y-1">
              <Label className="font-bold text-xs">Tagline / Subtitle Program</Label>
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Contoh: Mencetak Generasi Berprestasi dan Berakhlak Mulia"
                className="rounded-xl h-9 text-xs"
              />
            </div>

            {/* Baris 3: Deskripsi Singkat Card Portal */}
            <div className="space-y-1">
              <Label className="font-bold text-xs">Deskripsi Singkat (Tampil pada Kartu Portal)</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi ringkas yang tampil di kartu depan landing page..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Baris 4: Konten Lengkap Modal Detail */}
            <div className="space-y-1">
              <Label className="font-bold text-xs">Deskripsi Lengkap Program (Tampil saat modal detail dibuka)</Label>
              <Textarea
                rows={3}
                value={formData.fullContent}
                onChange={(e) => setFormData({ ...formData, fullContent: e.target.value })}
                placeholder="Penjelasan komprehensif mengenai kurikulum, program pembinaan, mitra kerjasama, dsb..."
                className="rounded-xl text-xs"
              />
            </div>

            {/* Baris 5: Input Fasilitas & Keunggulan Program Terpisah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs text-blue-700 dark:text-blue-300">
                  Fasilitas Program (Pisahkan 1 baris per poin)
                </Label>
                <Textarea
                  rows={3}
                  value={formData.fasilitasText}
                  onChange={(e) => setFormData({ ...formData, fasilitasText: e.target.value })}
                  placeholder={"Contoh:\nStudio Seni Tari Khusus\nLaboratorium Komputer Modern\nAsrama Mahad Terpisah Putra-Putri"}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                  Keunggulan Utama (Pisahkan 1 baris per poin)
                </Label>
                <Textarea
                  rows={3}
                  value={formData.keunggulanText}
                  onChange={(e) => setFormData({ ...formData, keunggulanText: e.target.value })}
                  placeholder={"Contoh:\nDibimbing ustadz & praktisi tersertifikasi\nBimbingan intensif tembus PTN Favorit\nMitra Industri & Sertifikasi Resmi"}
                  className="rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Baris 6: Kustomisasi Logo / Gambar Program & Ikon */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Logo / Lambang Gambar Program
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Admin Web dapat mengunggah logo atau gambar kustom khusus program ini.
                  </p>
                </div>
                {formData.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Logo</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Preview Logo */}
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-900 shrink-0 overflow-hidden">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo Program" className="w-full h-full object-contain p-1" />
                  ) : (
                    (() => {
                      const IconItem = AVAILABLE_ICONS.find((i) => i.name === formData.iconName)?.icon || BookOpen
                      return <IconItem className="w-6 h-6 text-slate-400" />
                    })()
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="program-logo-file"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="h-8 rounded-xl text-xs font-bold gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isUploadingLogo ? 'Memproses...' : 'Unggah File Logo'}</span>
                    </Button>
                    <span className="text-[11px] text-slate-400">PNG, JPG, SVG, WebP (Maks. 2MB)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Baris 7: Icon Cadangan, Warna Badge, & Status Tampil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Ikon Alternatif</Label>
                <Select
                  value={formData.iconName || 'BookOpen'}
                  onValueChange={(val) => setFormData({ ...formData, iconName: val || 'BookOpen' })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Pilih Ikon" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {AVAILABLE_ICONS.map((ic) => {
                      const IconItem = ic.icon
                      return (
                        <SelectItem key={ic.name} value={ic.name} className="text-xs">
                          <div className="flex items-center gap-2">
                            <IconItem className="w-3.5 h-3.5 text-blue-600" />
                            <span>{ic.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-xs">Aksen Warna Tema</Label>
                <Select
                  value={formData.badgeColor || 'blue'}
                  onValueChange={(val) => setFormData({ ...formData, badgeColor: val || 'blue' })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Pilih Warna" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.key} value={c.key} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${c.bgClass} border`} />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-xs">Tampil di Portal</span>
                  <Switch
                    checked={formData.isVisible}
                    onCheckedChange={(val) => setFormData({ ...formData, isVisible: val })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl font-bold text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-xl font-bold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveMutation.isPending ? 'Menyimpan...' : (editingProgram ? 'Simpan Perubahan' : 'Tambah Program')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
